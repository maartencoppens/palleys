import SectionHeader from "@/components/design/SectionHeader";
import ContactForm from "./ContactForm";

/*
 * "Still got a question?" (Figma: contact-section, 1440 wide, light green).
 *
 * Differences from Figma, on purpose:
 * - A large rounded top-right corner (like Made in Gent and Charity) so the cream FAQ above flows into
 *   the green instead of meeting it in a hard line.
 * - Calmer form spacing: labels sit 12px above their field instead of 29px, the header is closer to the
 *   form, and field text is 22px instead of 32px so typed text and placeholders fit comfortably.
 * - Name and email share the row equally (Figma: 469px and 436px).
 * - The empty band at the bottom of the Figma frame is left out; it's where the CTA card overlaps the
 *   footer, which isn't built yet.
 */
export default function Contact() {
  return (
    <section
      id="contact"
      className="flex min-h-svh flex-col items-center justify-center stack rounded-tr-section bg-light-green section-x section-y"
      aria-labelledby="contact-title"
    >
      <SectionHeader
        tag="Zeg het maar"
        title="Nog een vraag?"
        subtitle="We helpen je graag op weg naar jouw perfecte Palley"
        titleId="contact-title"
      />
      <ContactForm />
    </section>
  );
}
