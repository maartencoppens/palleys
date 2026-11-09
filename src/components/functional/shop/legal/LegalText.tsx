import type { ReactNode } from "react";
import { fillNodes } from "@/core/locale/fill";

type Table = { head: readonly string[]; rows: readonly (readonly string[])[] };
type Block = string | readonly string[] | Table;

/**
 * A section of a legal text. `text` and `items` for a short one; `blocks` for a longer one in its own order, like the
 * terms: a string is a paragraph (2.1, 2.2, ...), a list of strings a bulleted list, `{ head, rows }` a table.
 */
type Section = { title: string; text?: string; items?: readonly string[]; blocks?: readonly Block[] };

type Values = Record<string, ReactNode>;

function List({ items, values }: { items: readonly string[]; values: Values }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{fillNodes(item, values)}</li>
      ))}
    </ul>
  );
}

/* Scrolls sideways on a phone rather than squeezing three columns into it. */
function LegalTable({ table, values }: { table: Table; values: Values }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm leading-[1.5] md:text-base">
        <thead>
          <tr>
            {table.head.map((cell) => (
              <th key={cell} scope="col" className="border-b-2 border-medium-green/30 py-2 pr-4 font-label font-bold text-medium-green">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row[0]} className="align-top">
              {row.map((cell, index) => (
                <td key={index} className="border-b border-off-white-dark py-2 pr-4">
                  {fillNodes(cell, values)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockView({ block, values }: { block: Block; values: Values }) {
  if (typeof block === "string") return <p>{fillNodes(block, values)}</p>;
  if ("head" in block) return <LegalTable table={block} values={values} />;
  return <List items={block} values={values} />;
}

/* The sections of a legal page, from the messages. `values` fills in what's only known here, like the company's details. */
export default function LegalText({ sections, values }: { sections: readonly Section[]; values: Values }) {
  return sections.map((section) => (
    <section key={section.title} className="contents">
      <h2>{section.title}</h2>
      {section.text && <p>{fillNodes(section.text, values)}</p>}
      {section.items && <List items={section.items} values={values} />}
      {section.blocks?.map((block, index) => <BlockView key={index} block={block} values={values} />)}
    </section>
  ));
}
