import Button from "@/components/design/Button";
import SectionHeader from "@/components/design/SectionHeader";
import ProductCard, { type Product } from "./ProductCard";

// Placeholder data: Figma shows the same Golden Retriever four times. Swap in real products later.
const products: Product[] = [1, 2, 3, 4].map((n) => ({
  slug: `golden-retriever-${n}`,
  brand: "Palleys",
  name: "Golden Retriever",
  price: 25.95,
  image: "/images/products/golden-retriever.png",
  tag: "Bestseller",
}));

/*
 * "Explore our collectables" (Figma: featured-products-section, 1440×730). Same page background as
 * the section above, so it flows on without a seam.
 * From 1280px: four 313px cards, 31px apart. Below that the cards become a swipeable row
 * that snaps per card, which keeps the section within one screen on tablets and phones.
 */
export default function FeaturedProducts() {
  return (
    <section
      id="collectables"
      className="flex min-h-svh flex-col items-center justify-center stack bg-page section-y xl:gap-[50px] xl:py-[104px]"
      aria-labelledby="collectables-title"
    >
      <SectionHeader
        tag="Klaar om mee te nemen"
        title="Ontdek onze collectie"
        titleId="collectables-title"
      />

      <ul
        data-animate="stagger"
        className="flex w-full max-w-[1440px] snap-x snap-mandatory scroll-px-[var(--space-section-x)] gap-[31px] overflow-x-auto section-x pb-2 [scrollbar-width:none] xl:grid xl:grid-cols-4 xl:overflow-visible xl:px-[clamp(16px,3.26vw,47px)] xl:pb-0"
      >
        {products.map((product) => (
          <li
            key={product.slug}
            className="w-[min(313px,80vw)] shrink-0 snap-start xl:w-auto"
          >
            <ProductCard {...product} />
          </li>
        ))}
      </ul>

      {/* Leads to the full collection page (to be built). */}
      <div data-animate="fade-up">
        <Button href="/shop" size="large">
          Bekijk de hele collectie
        </Button>
      </div>
    </section>
  );
}
