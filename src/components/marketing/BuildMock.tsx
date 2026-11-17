import { SiteMock, MOCK_SIZE } from '@/components/ideas/SiteMock';
import { ideaBySlug } from '@/lib/ideas';

/**
 * The picture on a "what it builds" card.
 *
 * A window with a real page in it, drawn from the same catalogue the Ideas
 * gallery uses — the palette, the type and the layout are the ones the
 * generator would actually produce for that trade. A stock photograph of a
 * laptop would say nothing about what this tool makes; six paragraphs asking
 * people to imagine six kinds of website, which is what these cards were,
 * said less.
 *
 * The window is shorter than the page, and pointing at the card moves the page
 * up by exactly the part that was cut off. The gesture is the point: a still
 * picture of a website cannot say that there is more below the fold.
 */

/** How much of the mock is on screen at rest. The rest is the scrub. */
const VISIBLE = 420;

export function BuildMock({ slug }: { slug: string }) {
  const idea = ideaBySlug(slug);
  // A slug that no longer matches an idea loses the picture, not the card.
  if (!idea) return null;

  const scrub = MOCK_SIZE.height - VISIBLE;

  return (
    <div className="border-b border-hairline bg-[var(--bg-base-deep)]">
      {/* Enough chrome to read as a window and not a photograph. */}
      <div className="flex items-center gap-1.5 px-3 py-2" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-white/20" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/10" />
      </div>
      <div
        className="lumen-scale-frame lumen-scrub"
        style={{
          aspectRatio: `${MOCK_SIZE.width} / ${VISIBLE}`,
          ['--frame-width' as string]: `${MOCK_SIZE.width}px`,
          // In the mock's own pixels; the frame's scale applies to it too.
          ['--scrub' as string]: `${scrub}px`,
        }}
      >
        <div style={{ width: MOCK_SIZE.width, height: MOCK_SIZE.height }}>
          <SiteMock idea={idea} />
        </div>
      </div>
    </div>
  );
}
