import "server-only";
import { adminQuery, ShopifyError } from "@/core/networking/external/shopify-client";

// Admin API calls. Needs the app scopes read_orders + write_orders.

/** Adds tags to an order (by its GID, e.g. gid://shopify/Order/123), so it stands out in the Shopify admin. */
export async function addOrderTags(orderGid: string, tags: string[]) {
  const data = await adminQuery<{
    tagsAdd: { userErrors: { field: string[] | null; message: string }[] };
  }>(
    `mutation TagsAdd($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) { userErrors { field message } }
    }`,
    { id: orderGid, tags },
  );
  if (data.tagsAdd.userErrors.length > 0) {
    throw new ShopifyError(
      `Shopify tagsAdd failed: ${data.tagsAdd.userErrors.map((e) => e.message).join("; ")}`,
    );
  }
}
