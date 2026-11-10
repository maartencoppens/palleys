/*
 * Structured data for search engines (schema.org as JSON-LD): who Palleys is, the products with price and availability,
 * the FAQ and the breadcrumbs. "<" is escaped, so text from the backoffice can never close the script tag.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(Array.isArray(data) ? { "@context": "https://schema.org", "@graph": data } : { "@context": "https://schema.org", ...data });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json.replace(/</g, "\\u003c") }} />;
}
