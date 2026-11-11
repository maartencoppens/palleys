import type { ReactNode } from "react";
import { fillNodes } from "@/core/locale/fill";
import type { LegalBlock, LegalSection } from "@/core/modules/legal/types";

type Values = Record<string, ReactNode>;

function List({ items, values }: { items: readonly string[]; values: Values }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{fillNodes(item, values)}</li>
      ))}
    </ul>
  );
}

/* Scrolls sideways on a phone rather than squeezing three columns into it. */
function LegalTable({ head, rows, values }: { head: readonly string[]; rows: readonly (readonly string[])[]; values: Values }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm leading-[1.5] md:text-base">
        <thead>
          <tr>
            {head.map((cell, index) => (
              <th key={index} scope="col" className="border-b-2 border-medium-green/30 py-2 pr-4 font-label font-bold text-medium-green">
                {fillNodes(cell, values)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="align-top">
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

function BlockView({ block, values }: { block: LegalBlock; values: Values }) {
  if (block.type === "paragraph") return <p>{fillNodes(block.text, values)}</p>;
  if (block.type === "table") return <LegalTable head={block.head} rows={block.rows} values={values} />;
  return <List items={block.items} values={values} />;
}

/* The sections of a legal page. `values` fills in what's only known here, like the company's details. */
export default function LegalText({ sections, values }: { sections: readonly LegalSection[]; values: Values }) {
  return sections.map((section, index) => (
    <section key={index} className="contents">
      <h2>{fillNodes(section.title, values)}</h2>
      {section.blocks.map((block, blockIndex) => (
        <BlockView key={blockIndex} block={block} values={values} />
      ))}
    </section>
  ));
}
