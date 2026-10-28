import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import axios, { type AxiosInstance } from "axios";
import { env } from "@/core/utils/env";

/*
 * Server-only Shopify clients. Two APIs, two kinds of credentials:
 * - Storefront API (cart, products): private token, plus the buyer's IP on buyer traffic
 *   so Shopify's bot protection and rate limits work per buyer instead of per server.
 * - Admin API (orders, tags, fulfillment): short-lived token from the client credentials
 *   grant (Dev Dashboard app in the same org as the store). Valid ~24h, no refresh token:
 *   we cache it per server instance and fetch a new one shortly before it expires.
 * Webhooks are signed with the same app client secret.
 */

// Accepts "palleys", "palleys.myshopify.com" or "https://palleys.myshopify.com/".
// Must be the permanent *.myshopify.com domain: a custom domain or an admin.shopify.com URL won't work,
// and the handle in the admin URL isn't always the same as the myshopify subdomain.
const shopDomain = (() => {
  const raw = env.SHOPIFY_STORE_DOMAIN.trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  const domain = raw.includes(".") ? raw : `${raw}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) {
    throw new Error(
      `SHOPIFY_STORE_DOMAIN must be the store's *.myshopify.com domain, got "${env.SHOPIFY_STORE_DOMAIN}"`,
    );
  }
  return domain;
})();

const TIMEOUT_MS = 15_000;

export class ShopifyError extends Error {}
export class ShopifyWebhookAuthError extends Error {}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

function toShopifyError(error: unknown, api: string) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? "no response";
    const body = error.response?.data;
    const message =
      (typeof body === "object" && body && ("errors" in body || "error" in body)
        ? JSON.stringify(body.errors ?? body.error)
        : error.message) ?? error.message;
    return new ShopifyError(`Shopify ${api} request to ${shopDomain} failed (${status}): ${message}`);
  }
  return error;
}

async function postGraphQL<T>(
  client: AxiosInstance,
  api: string,
  query: string,
  variables: Record<string, unknown> | undefined,
  headers?: Record<string, string>,
): Promise<T> {
  try {
    const { data } = await client.post<GraphQLResponse<T>>(
      "/graphql.json",
      { query, variables },
      { headers },
    );
    if (data.errors?.length) {
      throw new ShopifyError(
        `Shopify ${api} GraphQL error: ${data.errors.map((e) => e.message).join("; ")}`,
      );
    }
    if (!data.data) throw new ShopifyError(`Shopify ${api} returned no data`);
    return data.data;
  } catch (error) {
    throw toShopifyError(error, api);
  }
}

// ---------- Storefront API ----------

const storefront = axios.create({
  baseURL: `https://${shopDomain}/api/${env.SHOPIFY_API_VERSION}`,
  headers: {
    "Content-Type": "application/json",
    "Shopify-Storefront-Private-Token": env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN,
  },
  timeout: TIMEOUT_MS,
});

/**
 * Storefront GraphQL call. Pass `buyerIp` whenever the call is caused by a shopper's request
 * (cart actions); leave it out for background work like resolving variant IDs.
 */
export function storefrontQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  options: { buyerIp?: string | null } = {},
) {
  // Header name is case-sensitive according to Shopify's docs.
  const headers = options.buyerIp
    ? { "Shopify-Storefront-Buyer-IP": options.buyerIp }
    : undefined;
  return postGraphQL<T>(storefront, "Storefront", query, variables, headers);
}

// ---------- Admin API ----------

let adminToken: { value: string; expiresAt: number } | null = null;
let pendingToken: Promise<string> | null = null;

async function fetchAdminToken(): Promise<string> {
  try {
    const { data } = await axios.post<{ access_token: string; expires_in: number }>(
      `https://${shopDomain}/admin/oauth/access_token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: env.SHOPIFY_CLIENT_ID,
        client_secret: env.SHOPIFY_CLIENT_SECRET,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: TIMEOUT_MS,
      },
    );
    adminToken = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  } catch (error) {
    throw toShopifyError(error, "Admin token");
  }
}

async function getAdminToken() {
  // Renew a minute early so a request never goes out with a token that expires mid-flight.
  if (adminToken && Date.now() < adminToken.expiresAt - 60_000) return adminToken.value;
  // Concurrent requests share one token request instead of each fetching their own.
  pendingToken ??= fetchAdminToken().finally(() => {
    pendingToken = null;
  });
  return pendingToken;
}

const admin = axios.create({
  baseURL: `https://${shopDomain}/admin/api/${env.SHOPIFY_API_VERSION}`,
  headers: { "Content-Type": "application/json" },
  timeout: TIMEOUT_MS,
});

export async function adminQuery<T>(query: string, variables?: Record<string, unknown>) {
  const token = await getAdminToken();
  return postGraphQL<T>(admin, "Admin", query, variables, {
    "X-Shopify-Access-Token": token,
  });
}

// ---------- Webhooks ----------

/** Checks X-Shopify-Hmac-Sha256 against the raw request body. Throws when it doesn't match. */
export function assertValidWebhook(rawBody: string, hmacHeader: string | null) {
  if (!hmacHeader) throw new ShopifyWebhookAuthError("Missing HMAC header");
  const expected = createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
    .update(rawBody, "utf8")
    .digest();
  const received = Buffer.from(hmacHeader, "base64");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new ShopifyWebhookAuthError("Invalid HMAC");
  }
}
