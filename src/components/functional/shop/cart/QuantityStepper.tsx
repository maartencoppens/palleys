import { MAX_LINE_QUANTITY } from "@/data/shopify";

type QuantityStepperProps = {
  quantity: number;
  onChange: (quantity: number) => void;
  disabled?: boolean;
  /** Names the product for screen readers, e.g. "Palley · Hond". */
  label: string;
  size?: "default" | "small";
};

const sizes = {
  default: { wrapper: "h-10", button: "size-10 text-xl", value: "min-w-8 text-base" },
  small: { wrapper: "h-8", button: "size-8 text-lg", value: "min-w-6 text-sm" },
} as const;

/*
 * − 2 + pill for copies of the same Palley, styled like an unselected chip (ChoiceChips). It stops at 1:
 * removing the Palley is the separate "Verwijder" action, so a mistap never empties the cart.
 */
export default function QuantityStepper({
  quantity,
  onChange,
  disabled = false,
  label,
  size = "default",
}: QuantityStepperProps) {
  const styles = sizes[size];
  const buttonClassName = `grid shrink-0 place-items-center rounded-full font-label leading-none font-bold text-medium-green transition-colors hover:bg-light-green/40 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent ${styles.button}`;

  return (
    <div
      role="group"
      aria-label={`Aantal ${label}`}
      className={`inline-flex items-center rounded-pill border-[1.5px] border-medium-green bg-white ${styles.wrapper}`}
    >
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={disabled || quantity <= 1}
        className={buttonClassName}
        aria-label="Eén minder"
      >
        −
      </button>
      <span
        className={`text-center font-label font-extrabold text-text-primary tabular-nums ${styles.value}`}
        aria-live="polite"
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={disabled || quantity >= MAX_LINE_QUANTITY}
        className={buttonClassName}
        aria-label="Eén meer"
      >
        +
      </button>
    </div>
  );
}
