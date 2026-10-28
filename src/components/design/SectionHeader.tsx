type SectionHeaderProps = {
  /** Small orange label above the title, e.g. "How it works". */
  tag: string;
  title: string;
  /** Optional line under the title (Figma: property1="subtitle"). */
  subtitle?: string;
  /** Id for the title, so the section can reference it with `aria-labelledby`. */
  titleId?: string;
};

/* Shared "section-header" component from Figma: orange tag above a green DynaPuff title, centred. */
export default function SectionHeader({ tag, title, subtitle, titleId }: SectionHeaderProps) {
  return (
    <header data-animate="fade-up" className="flex flex-col items-center gap-s text-center">
      <p className="font-label text-xl leading-[19.5px] font-semibold text-accent-highlights md:text-2xl">{tag}</p>
      <h2
        id={titleId}
        className="font-display text-[clamp(2rem,1.4rem+1.8vw,3rem)] leading-[1.22] font-medium text-medium-green"
      >
        {title}
      </h2>
      {subtitle && (
        <p className="font-label text-[clamp(1.125rem,0.85rem+0.9vw,2rem)] leading-[1.3] font-medium text-medium-green">
          {subtitle}
        </p>
      )}
    </header>
  );
}
