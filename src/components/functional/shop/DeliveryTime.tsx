import { connection } from "next/server";
import { Suspense } from "react";
import { getLocale, getSiteContent } from "@/core/locale/server";
import { DEFAULT_SITE_CONTENT } from "@/data/site-content";

async function LiveDeliveryTime() {
  await connection();
  const content = await getSiteContent();
  return content.deliveryTime;
}

/* The delivery time from the settings, for static sentences. Shows the starting value until it has loaded. */
export default async function DeliveryTime() {
  const locale = await getLocale();
  return (
    <Suspense fallback={DEFAULT_SITE_CONTENT[locale].deliveryTime}>
      <LiveDeliveryTime />
    </Suspense>
  );
}
