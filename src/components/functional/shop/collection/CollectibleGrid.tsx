import type { ReactNode } from "react";
import type { CollectibleView } from "@/core/modules/collectibles/types";
import ProductCard from "@/components/functional/shop/home/ProductCard";
import { getMessages } from "@/core/locale/server";
import Seasonal from "@/components/functional/seasonal/Seasonal";

export async function CollectibleCard({ collectible, decoration }: { collectible: CollectibleView; decoration?: ReactNode }) {
  const { collection: m } = await getMessages();
  return (
    <ProductCard
      slug={collectible.slug}
      brand={m.brand}
      name={collectible.name}
      price={collectible.priceCents / 100}
      image={collectible.imageUrl!}
      tag={collectible.soldOut ? m.soldOut : (collectible.tag ?? undefined)}
      soldOut={collectible.soldOut}
      stock={collectible.stock}
      decoration={decoration}
    />
  );
}

export function CollectibleCardSkeleton() {
  return <div className="h-[382px] animate-pulse rounded-2xl bg-card" aria-hidden />;
}

export function CollectibleGrid({ collectibles }: { collectibles: CollectibleView[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {collectibles.map((collectible, index) => (
        <li key={collectible.id}>
          <CollectibleCard collectible={collectible} decoration={<Seasonal slot="shopCardCorner" index={index} />} />
        </li>
      ))}
    </ul>
  );
}
