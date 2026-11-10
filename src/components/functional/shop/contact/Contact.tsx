import SectionHeader from "@/components/design/SectionHeader";
import { getMessages } from "@/core/locale/server";
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
 * - The orange tag sits on an off-white pill: orange text straight on the light green was hard to read.
 * - The empty band at the bottom of the Figma frame is left out; it's where the CTA card overlaps the
 *   footer, which isn't built yet.
 */
export default async function Contact() {
  const { contact: m } = await getMessages();
  return (
    <section
      id="contact"
      className="flex min-h-svh flex-col items-center justify-center stack rounded-tr-section bg-light-green section-x section-y"
      aria-labelledby="contact-title"
    >
      <SectionHeader
        tag={m.tag}
        title={m.title}
        subtitle={m.subtitle}
        titleId="contact-title"
        tagClassName="rounded-pill bg-off-white px-4 py-2 text-orange"
      />
      <ContactForm />
    </section>
  );
}
