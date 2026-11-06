import type { ReactNode } from "react";
import { fillNodes } from "@/core/locale/fill";

type Section = { title: string; text?: string; items?: string[] };

/* The sections of a legal page, from the messages. `values` fills in what's only known here, like the company's details. */
export default function LegalText({ sections, values }: { sections: Section[]; values: Record<string, ReactNode> }) {
  return sections.map((section) => (
    <section key={section.title} className="contents">
      <h2>{section.title}</h2>
      {section.text && <p>{fillNodes(section.text, values)}</p>}
      {section.items && (
        <ul>
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  ));
}
