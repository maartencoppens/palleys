import type { CollectibleView } from "@/core/modules/collectibles/types";
import ProductCard from "@/components/functional/shop/home/ProductCard";
import { getMessages } from "@/core/locale/server";

export async function CollectibleCard({ collectible }: { collectible: CollectibleView }) {
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
    />
  );
}

export function CollectibleCardSkeleton() {
  return <div className="h-[382px] animate-pulse rounded-2xl bg-card" aria-hidden />;
}

export function CollectibleGrid({ collectibles }: { collectibles: CollectibleView[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {collectibles.map((collectible) => (
        <li key={collectible.id}>
          <CollectibleCard collectible={collectible} />
        </li>
      ))}
    </ul>
  );
}
