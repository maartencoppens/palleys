import Image from "next/image";
import { useMessages } from "@/core/locale/client";

type CartLinePhotoProps = {
  photoUrl: string | null;
  /** Rendered width in px, for next/image's `sizes`. */
  size: number;
  className?: string;
};

/* The shopper's own photo for a cart line, or an example Palley when the signed URL is unavailable. */
export default function CartLinePhoto({ photoUrl, size, className = "" }: CartLinePhotoProps) {
  const { cart } = useMessages();
  return (
    <div className={`relative shrink-0 overflow-hidden bg-light-yellow ${className}`}>
      {photoUrl ? (
        // Short-lived signed R2 URL of the customer's own photo: not for next/image's optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={cart.photoAlt} className="size-full object-cover" />
      ) : (
        <Image
          src="/images/products/golden-retriever.png"
          alt=""
          fill
          sizes={`${size}px`}
          className="object-contain p-2"
        />
      )}
    </div>
  );
}
