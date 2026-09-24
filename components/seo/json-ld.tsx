/**
 * Renders one or more schema.org graphs as <script type="application/ld+json">.
 *
 * Listing titles and descriptions are seller-supplied, so `<` is escaped before
 * the JSON reaches the DOM — otherwise a title containing `</script>` would
 * break out of the tag.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const graphs = Array.isArray(data) ? data : [data];
  return (
    <>
      {graphs.map((graph, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
