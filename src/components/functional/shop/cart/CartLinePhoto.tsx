import Image from "next/image";
import { useMessages } from "@/core/locale/client";

type CartLinePhotoProps = {
  photoUrl: string | null;
  /** Rendered width in px, for next/image's `sizes`. */
  size: number;
  /** A collectible's product shot is a cut-out with room around it: shown whole. The shopper's photo fills the tile. */
  kind?: "personalized" | "collectible";
  className?: string;
};

/* The shopper's own photo or the collectible's image for a cart line, or an example Palley when there is none. */
export default function CartLinePhoto({ photoUrl, size, kind = "personalized", className = "" }: CartLinePhotoProps) {
  const { cart } = useMessages();
  return (
    <div className={`relative shrink-0 overflow-hidden bg-light-yellow ${className}`}>
      {photoUrl ? (
        // Short-lived signed R2 URL of the customer's own photo: not for next/image's optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={cart.photoAlt}
          className={`size-full ${kind === "collectible" ? "object-contain p-1.5" : "object-cover"}`}
        />
      ) : (
        <Image
          src="/images/products/golden-retriever.webp"
          alt=""
          fill
          sizes={`${size}px`}
          className="object-contain p-2"
        />
      )}
    </div>
  );
}
