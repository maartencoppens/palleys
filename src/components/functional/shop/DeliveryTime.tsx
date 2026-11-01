import { connection } from "next/server";
import { Suspense } from "react";
import { getSiteSettings } from "@/core/modules/settings/service";
import { DEFAULT_SITE_CONTENT } from "@/data/site-content";

async function LiveDeliveryTime() {
  await connection();
  const { content } = await getSiteSettings();
  return content.deliveryTime;
}

/* The delivery time from the settings, for static sentences. Shows the starting value until it has loaded. */
export default function DeliveryTime() {
  return (
    <Suspense fallback={DEFAULT_SITE_CONTENT.deliveryTime}>
      <LiveDeliveryTime />
    </Suspense>
  );
}
