import Image from "next/image";

/* A tiny version of the photo, shown blurred while the real one loads (generated from kerst-palley.webp). */
const BLUR =
  "data:image/webp;base64,UklGRm4AAABXRUJQVlA4IGIAAAAwAgCdASoQAAkAAsBMJYgCdAYstmxi+QyHiAD+yra0K6dPZ8HtzE9ux/P+/CDD+si+Q4bQlelnZnItCoWFoGpRRuL+c7oHsKblMBDjMSKKrHAX0VvHt1WHh+dyjcwI0wJAAA==";

type PalleyPhotoProps = {
  alt: string;
  /** Rendered widths, as for next/image; it serves a matching size in a modern format from the 1280px source. */
  sizes: string;
  className?: string;
};

/*
 * The Christmas Palley (a golden retriever with a Santa hat, clipped onto a tree), filling its container. The source is
 * a 1280px WebP (public/images/kerst); the dog sits just right of centre, so crops keep it in view.
 */
export function ChristmasPalleyPhoto({ alt, sizes, className = "" }: PalleyPhotoProps) {
  return (
    <Image
      src="/images/kerst/kerst-palley.webp"
      alt={alt}
      fill
      sizes={sizes}
      placeholder="blur"
      blurDataURL={BLUR}
      className={`object-cover ${className}`}
    />
  );
}
