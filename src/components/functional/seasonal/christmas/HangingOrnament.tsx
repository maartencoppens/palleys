import { Ornament, type OrnamentVariant } from "@/components/design/seasonal/christmas/Art";

/*
 * A bauble on a string from the top edge of its container. Position it with `className` (e.g. "left-[20%]"); the
 * string length and bauble size are classes too, so they can change per breakpoint.
 */
export function HangingOrnament({
  className = "",
  stringClassName = "h-10",
  sizeClassName = "w-10",
  variant = "red",
  stringColour = "bg-off-white/70",
}: {
  className?: string;
  stringClassName?: string;
  sizeClassName?: string;
  variant?: OrnamentVariant;
  stringColour?: string;
}) {
  return (
    <span className={`pointer-events-none absolute top-0 flex flex-col items-center ${className}`} aria-hidden>
      <span className={`w-0.5 ${stringColour} ${stringClassName}`} />
      <Ornament variant={variant} className={`-mt-0.5 h-auto ${sizeClassName}`} />
    </span>
  );
}
