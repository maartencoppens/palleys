import type { CollectibleView } from "@/core/modules/collectibles/types";
import ProductCard from "@/components/functional/shop/home/ProductCard";

export function CollectibleCard({ collectible }: { collectible: CollectibleView }) {
  return (
    <ProductCard
      slug={collectible.slug}
      brand="Palleys"
      name={collectible.name}
      price={collectible.priceCents / 100}
      image={collectible.imageUrl!}
      tag={collectible.soldOut ? "Uitverkocht" : (collectible.tag ?? undefined)}
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
