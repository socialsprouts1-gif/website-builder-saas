'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/ui/cn';

/**
 * Fades a section in as it arrives.
 *
 * The children are rendered on the server and handed through untouched, so
 * nothing on the page becomes client-rendered by being wrapped in this — the
 * text is in the HTML whether or not the script runs, which matters for both a
 * crawler and a slow connection.
 *
 * It starts visible and is hidden by the effect, not the other way round: if
 * the JavaScript never arrives, the page reads normally instead of being a
 * column of blank space. Anyone who has asked for less motion skips it
 * entirely.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle');

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Already on screen on first paint? Leave it alone; fading in what somebody
    // is already looking at reads as a glitch.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85) return;

    setState('hidden');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState('shown');
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        state === 'hidden' && 'translate-y-4 opacity-0',
        className,
      )}
      style={state === 'hidden' ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
