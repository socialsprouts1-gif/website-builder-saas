'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Scene } from '@/components/studio/Scene';
import { cn } from '@/components/ui/cn';
import {
  STUDIO_BLURB,
  STUDIO_HINTS,
  STUDIO_NAME,
  STUDIO_STATUS,
  STUDIO_TAGLINE,
} from '@/lib/studio';

/**
 * The preview at the top, which the cursor moves.
 *
 * It tilts toward the pointer rather than playing a canned loop, because the
 * whole claim of the section is that these pages answer the person reading
 * them — a hero that ignores the mouse argues against its own copy. On a touch
 * screen there is no pointer, so it keeps its slow drift and the hints still
 * describe what the real editor will do.
 */
export function StudioHero() {
  const frame = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function onMove(event: PointerEvent) {
      const box = node!.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      setTilt({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
    }

    function onLeave() {
      setTilt({ x: 0, y: 0 });
    }

    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerleave', onLeave);
    return () => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <section className="mx-auto max-w-shell px-6 pb-14 pt-14">
      <div className="mx-auto max-w-2xl text-center">
        <Badge tone="accent" className="mb-6">{STUDIO_STATUS}</Badge>
        <h1 className="font-display text-[44px] leading-[1.05] text-ink-primary sm:text-[62px]">
          {STUDIO_NAME.replace('Lumen ', '')}{' '}
          <em className="italic text-accent">by Lumen</em>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[19px] font-medium leading-snug text-ink-primary">
          {STUDIO_TAGLINE}
        </p>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink-secondary">
          {STUDIO_BLURB}
        </p>
      </div>

      <div
        ref={frame}
        className="mt-12 overflow-hidden rounded-card border border-hairline bg-raised"
        style={{ perspective: '1400px' }}
      >
        {/* A browser frame, because the claim is that this is a website and
            not a video — the chrome is the part that says so. */}
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <span className="flex gap-1.5" aria-hidden>
            {['#e5735a', '#e3c05c', '#8fbf6a'].map((colour) => (
              <span key={colour} className="h-2.5 w-2.5 rounded-full" style={{ background: colour }} />
            ))}
          </span>
          <span className="ml-2 flex-1 truncate rounded-pill bg-black/40 px-3 py-1 text-[13px] text-ink-muted">
            studio.lumensite.in / sneaker-launch
          </span>
          <span className="hidden text-[13px] text-ink-muted sm:block">60 fps</span>
        </div>

        <div
          className="relative transition-transform duration-300 ease-out"
          style={{
            transform: `rotateY(${tilt.x * 7}deg) rotateX(${-tilt.y * 5}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          <Scene shape="orbit" className="h-[300px] sm:h-[460px]" tint={['#d7ff3e', '#4f6616']} />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-7">
            <div className="max-w-xs">
              <p className="font-display text-[26px] leading-tight text-ink-primary sm:text-[32px]">
                Floats. Turns. Changes colour.
              </p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-secondary">
                One scene, driven by the scroll.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {STUDIO_HINTS.map((hint) => (
                <li
                  key={hint}
                  className={cn(
                    'rounded-pill border border-white/15 bg-black/50 px-3 py-1.5',
                    'text-[13px] font-medium text-ink-primary backdrop-blur-[2px]',
                  )}
                >
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
