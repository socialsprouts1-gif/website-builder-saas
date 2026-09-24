import { SiteMock, MOCK_SIZE } from '@/components/ideas/SiteMock';
import type { Idea } from '@/lib/ideas';

/**
 * The idea's miniature, filling whatever column it is given.
 *
 * Scaling, not reflowing: the mock is drawn at a fixed design width and its
 * proportions are what the page is showing off. `.lumen-scale-frame` in
 * globals.css does the scaling from container query units; the width and the
 * aspect ratio are set here because both come from the mock's own dimensions.
 *
 * Static markup, no iframe and no JavaScript, so a crawler sees it too.
 */
export function MockFrame({ idea }: { idea: Idea }) {
  return (
    <div
      className="lumen-scale-frame rounded-card border border-hairline"
      style={{
        aspectRatio: `${MOCK_SIZE.width} / ${MOCK_SIZE.height}`,
        ['--frame-width' as string]: `${MOCK_SIZE.width}px`,
      }}
    >
      <div style={{ width: MOCK_SIZE.width, height: MOCK_SIZE.height }}>
        <SiteMock idea={idea} />
      </div>
    </div>
  );
}
