import Image from "next/image";
import Button from "@/components/design/Button";
import { formatPrice } from "@/core/utils/format";

export type Product = {
  slug: string;
  brand: string;
  name: string;
  /** Price in euros, formatted on render, e.g. 25.95 → "€ 25,95". */
  price: number;
  image: string;
  tag?: string;
};

/* Figma: featured-product-card, 313×382. */
export default function ProductCard({
  slug,
  brand,
  name,
  price,
  image,
  tag,
}: Product) {
  return (
    // `relative` keeps the absolutely positioned sr-only text inside the card (and inside the scroll row on phones).
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-card transition-transform duration-300 hover:-translate-y-1.5 hover:-rotate-1">
      <div className="relative isolate flex h-[220px] flex-col items-start gap-2 overflow-hidden rounded-2xl bg-light-green p-s">
        {/* Cream wave behind the product, rotated exactly as in Figma. */}
        <div
          className="pointer-events-none absolute top-[-13px] left-[-70px] -z-10 flex h-[442.673px] w-[430.578px] items-center justify-center"
          aria-hidden
        >
          <Image
            className="max-w-none rotate-[32.15deg]"
            src="/images/products/card-wave.svg"
            width={297.442}
            height={335.899}
            alt=""
          />
        </div>

        {tag && (
          <span className="rounded-pill bg-background-default px-s py-1 text-sm leading-[21px] text-text-primary">
            {tag}
          </span>
        )}

        <div className="relative w-full flex-1">
          <Image
            className="object-contain"
            src={image}
            alt={`${name} sleutelhanger`}
            fill
            sizes="289px"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-8 px-s pt-s pb-m">
        <div className="flex flex-col gap-1">
          <p className="text-sm leading-[21px] text-medium-green">{brand}</p>
          <h3 className="text-2xl leading-8 font-bold text-text-primary">
            {name}
          </h3>
        </div>

        <div className="flex items-center justify-between gap-s">
          <p className="text-xl leading-[27px] font-semibold text-text-primary">
            {formatPrice(price)}
          </p>
          <Button href={`/shop/${slug}`} variant="arrow">
            Shop<span className="sr-only"> {name}</span>
          </Button>
        </div>
      </div>
    </article>
  );
}
