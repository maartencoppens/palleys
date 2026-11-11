import type { NextConfig } from "next";

const securityHeaders = [
  // No page of ours may be framed: stops clickjacking of the admin and the checkout.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Answers about one visitor (signed photo URLs, order status) must never end up in a shared cache.
const noStore = [{ key: "Cache-Control", value: "no-store" }];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Same navigation behaviour as before the upgrade to 16.4; turning this on is a choice of its own.
  partialPrefetching: false,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/cart", headers: noStore },
      { source: "/api/checkout/:path*", headers: noStore },
      { source: "/api/checkout", headers: noStore },
      { source: "/api/orders/:path*", headers: noStore },
      { source: "/api/uploads", headers: noStore },
      { source: "/api/admin/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
