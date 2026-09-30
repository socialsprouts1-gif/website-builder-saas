import { cn } from '@/components/ui/cn';

/**
 * A rendered page, as a picture of itself.
 *
 * A real render of the real thing, scaled into whatever box it is given, rather
 * than a screenshot somebody has to remember to retake — a change to a section
 * renderer shows up here the moment it lands, and a template can never be shown
 * as something it is not.
 *
 * `.lumen-scale-frame` is what makes that safe. A miniature written the obvious
 * way — a 1000px iframe with a scale on it — still occupies 1000px of layout,
 * because a transform does not change the box; on a 393px phone its column
 * inherits that width and the whole page pans sideways. The frame takes the
 * child out of flow so it contributes no width at all, and scales it to the
 * column it lands in.
 *
 * Inert on purpose: pointer events go to whatever the card put around it, the
 * frame is out of the tab order, and it is loaded lazily so a page of them
 * costs one render rather than forty.
 */
export function PageThumb({
  src,
  title,
  className,
  frameWidth = 1280,
  frameHeight,
}: {
  src: string;
  title: string;
  className?: string;
  frameWidth?: number;
  frameHeight?: number;
}) {
  return (
    <span
      className={cn('lumen-scale-frame block bg-[var(--bg-base-deep)]', className)}
      style={{ ['--frame-width' as string]: `${frameWidth}px` }}
    >
      <iframe
        src={src}
        title={title}
        loading="lazy"
        tabIndex={-1}
        aria-hidden
        sandbox="allow-scripts"
        className="pointer-events-none border-0"
        style={{ width: frameWidth, height: frameHeight ?? Math.round(frameWidth * 0.75) }}
      />
    </span>
  );
}
