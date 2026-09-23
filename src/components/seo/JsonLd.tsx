import { jsonLdText } from '@/lib/structured-data';

/** One <script type="application/ld+json"> holding everything a page declares. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // The content is escaped by jsonLdText, which is the reason this is
      // allowed to be set as HTML at all.
      dangerouslySetInnerHTML={{ __html: jsonLdText(data) }}
    />
  );
}
