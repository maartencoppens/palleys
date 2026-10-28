import Image from "next/image";
import { PALLEY_PRICE } from "@/data/options";
import { formatPrice } from "@/core/utils/format";

type OrderSummaryProps = {
  pet: string | null;
  edition: string | null;
  /** File name for one photo, "3 photos" for several. */
  photos: string | null;
  previewUrl: string | null;
};

/* Figma: order-summary. Shows the visitor's own photo once uploaded, an example Palley before that. */
export default function OrderSummary({
  pet,
  edition,
  photos,
  previewUrl,
}: OrderSummaryProps) {
  const rows = [
    { label: "Huisdier", value: pet },
    { label: "Palley", value: edition },
    { label: "Foto’s", value: photos },
  ];

  return (
    <aside
      aria-labelledby="summary-title"
      className="flex flex-col gap-5 rounded-3xl bg-white p-5 md:rounded-[32px] md:p-8"
    >
      <h2
        id="summary-title"
        className="font-display text-2xl leading-[1.2] font-bold text-medium-green md:text-[32px]"
      >
        Jouw Palley
      </h2>

      <div className="relative grid h-[220px] place-items-center overflow-hidden rounded-3xl bg-light-yellow md:h-[260px]">
        {previewUrl ? (
          // A local object URL of the visitor's own photo, so a plain img is used.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Je geüploade foto"
            className="size-full object-cover"
          />
        ) : (
          <Image
            className="h-[200px] w-auto object-contain md:h-[240px]"
            src="/images/products/golden-retriever.png"
            width={300}
            height={240}
            alt="Voorbeeld: een Palley-sleutelhanger van een golden retriever"
            sizes="300px"
          />
        )}
      </div>
      <p className="text-sm leading-[1.5] text-text-primary">
        {previewUrl
          ? "Een voorbeeld van je foto. Ons team maakt er een 3D-model van voor we printen."
          : "Een voorbeeld-Palley. Upload je foto om hem hier te zien."}
      </p>

      <dl className="flex flex-col gap-5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 text-lg text-text-primary"
          >
            <dt>{row.label}</dt>
            <dd
              className={`min-w-0 truncate font-label font-semibold ${row.value ? "" : "text-placeholder"}`}
            >
              {row.value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>

      <hr className="border-text-primary" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-medium-green">
          <p className="font-display text-2xl leading-[1.2] font-medium">
            Totaal
          </p>
          <p className="font-label text-[32px] leading-[normal] font-extrabold">
            {formatPrice(PALLEY_PRICE)}
          </p>
        </div>
        <p className="text-sm leading-[1.5] text-text-primary">
          Incl. btw · verzendkosten bij het afrekenen
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-[20px] bg-light-yellow p-4">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-coral"
          aria-hidden
        >
          <Image
            src="/images/create/heart.svg"
            width={16.5}
            height={15}
            alt=""
          />
        </span>
        <p className="text-[15px] leading-[1.5] text-text-primary">
          Met je Palley help je ook andere dieren: 50% van onze winst gaat naar
          de bescherming van dieren en hun leefgebied.
        </p>
      </div>
    </aside>
  );
}
