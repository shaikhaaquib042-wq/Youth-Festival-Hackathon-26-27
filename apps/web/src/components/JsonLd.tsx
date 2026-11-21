/** Server-rendered JSON-LD. Escapes "<" so the payload cannot close the script tag. */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, String.fromCharCode(92) + "u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
