type ChoiceChipsProps<T extends string> = {
  legend: string;
  name: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  /** Extra line under the chips, e.g. the product size. */
  hint?: string;
  error?: string;
};

/* Figma: chip / chip/selected. A radio group, so it works with arrow keys and screen readers. */
export default function ChoiceChips<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  hint,
  error,
}: ChoiceChipsProps<T>) {
  const errorId = `${name}-error`;

  return (
    <fieldset className="flex flex-col gap-3.5" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-3.5 font-label text-lg font-semibold text-text-primary md:text-xl">{legend}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="block rounded-full border-[1.5px] border-medium-green bg-white px-6 py-3 font-label text-lg leading-[normal] font-medium text-medium-green transition-colors peer-checked:bg-medium-green peer-checked:text-off-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-highlights hover:bg-off-white peer-checked:hover:bg-medium-green">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="text-base leading-[1.5] text-text-primary">{hint}</p>}
      {error && (
        <p id={errorId} className="font-label text-base font-semibold text-[#a3341a]">
          {error}
        </p>
      )}
    </fieldset>
  );
}
