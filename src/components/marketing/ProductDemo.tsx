'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DemoPreview } from './DemoPreview';
import { Button, ButtonLink } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { DEMO_PALETTES, INITIAL_SITE, SCRIPT, type DemoSite } from '@/lib/marketing/demo';

type Turn = { role: 'you' | 'lumen'; text: string };

const OPENING: Turn[] = [
  { role: 'you', text: 'A candlelit French bistro in Bandra with online reservations.' },
  {
    role: 'lumen',
    text: 'Built it — four sections, a serif display face, and a booking form that emails you the request.',
  },
];

/**
 * The Lumen editor, running a scripted session.
 *
 * It is a demo of the real thing rather than a recording of it: the preview on
 * the right is rendered from state, and each instruction in the chat is a pure
 * function that changes that state. Click a prompt yourself, change the
 * palette, switch to the phone — it all works, because there is nothing to
 * fake. Nothing here calls a model, and the panel says so.
 *
 * It starts when it scrolls into view, not on load, so a visitor who never gets
 * this far pays nothing for it and one who does arrives as it begins.
 */
export function ProductDemo() {
  const [site, setSite] = useState<DemoSite>(INITIAL_SITE);
  const [turns, setTurns] = useState<Turn[]>(OPENING);
  const [done, setDone] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [touched, setTouched] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [started, setStarted] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const after = useCallback((ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  }, []);

  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );

  const run = useCallback(
    (stepId: string) => {
      const step = SCRIPT.find((entry) => entry.id === stepId);
      if (!step || pending) return;

      setPending(step.id);
      setTurns((current) => [...current, { role: 'you', text: step.prompt }]);
      setTouched(step.touches);

      // Long enough to read the instruction, short enough not to wait on it.
      after(900, () => {
        setSite((current) => step.apply(current));
        setTurns((current) => [...current, { role: 'lumen', text: step.reply }]);
        setDone((current) => (current.includes(step.id) ? current : [...current, step.id]));
        setPending(null);
        after(700, () => setTouched([]));
      });
    },
    [after, pending],
  );

  // The next thing the script would do, so autoplay and the buttons agree.
  const next = useMemo(() => SCRIPT.find((step) => !done.includes(step.id)), [done]);

  /**
   * On a phone the preview pane is already phone-width, so showing the desktop
   * layout inside it wrapped the headline over three lines and squeezed the nav
   * — the opposite of the impression the section is meant to give. The toggle
   * still works; this only picks the honest starting point. Set after mount so
   * the server and the client render the same thing.
   */
  useEffect(() => {
    if (window.innerWidth < 1024) setDevice('mobile');
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || started) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || pending || !next) return;
    const timer = setTimeout(() => run(next.id), done.length === 0 ? 1200 : 2600);
    return () => clearTimeout(timer);
  }, [started, pending, next, done.length, run]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [turns]);

  function reset() {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
    setSite(INITIAL_SITE);
    setTurns(OPENING);
    setDone([]);
    setPending(null);
    setTouched([]);
    setPublished(false);
  }

  return (
    <div ref={rootRef} className="overflow-hidden rounded-window border border-hairline bg-raised">
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-4 py-3">
        <span className="hidden gap-1.5 sm:flex" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-pill bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-pill bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-pill bg-white/15" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          Lumen / bistro-lunaire
        </span>
        <span className="ml-auto flex items-center gap-2">
          <DeviceToggle device={device} onChange={setDevice} />
          <Button
            size="sm"
            onClick={() => setPublished(true)}
            disabled={published}
            aria-live="polite"
          >
            {published ? 'Published ✓' : 'Publish'}
          </Button>
        </span>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr]">
        {/* The chat is first in the DOM because it is what drives everything,
            but on a phone the preview goes on top: the point of the section is
            watching the site change, and nobody scrolls past a chat log to
            find out that it did. */}
        <div className="order-2 flex flex-col border-t border-hairline lg:order-1 lg:border-r lg:border-t-0">
          <div
            ref={logRef}
            className="max-h-[220px] min-h-[180px] space-y-3 overflow-y-auto p-4 lg:max-h-[420px] lg:min-h-[420px]"
          >
            {turns.map((turn, index) => (
              <div key={`${turn.role}-${index}`} className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  {turn.role === 'you' ? 'You' : 'Lumen'}
                </p>
                <p
                  className={cn(
                    'rounded-[10px] px-3 py-2 text-[12.5px] leading-relaxed',
                    turn.role === 'you'
                      ? 'bg-[var(--bg-base-deep)] text-ink-primary'
                      : 'border border-hairline text-ink-secondary',
                  )}
                >
                  {turn.text}
                </p>
              </div>
            ))}
            {pending ? (
              <p className="flex items-center gap-2 px-1 text-[12px] text-ink-muted">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-pill bg-accent" />
                Lumen is editing…
              </p>
            ) : null}
          </div>

          <div className="space-y-2 border-t border-hairline p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">Try one</p>
            <div className="flex flex-wrap gap-1.5">
              {SCRIPT.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => run(step.id)}
                  disabled={Boolean(pending) || done.includes(step.id)}
                  className={cn(
                    'rounded-pill border px-3 py-1.5 text-left text-[11.5px] transition',
                    done.includes(step.id)
                      ? 'border-hairline text-ink-muted'
                      : 'border-hairline text-ink-secondary hover:border-white/25 hover:text-ink-primary',
                    pending && 'opacity-60',
                  )}
                >
                  {step.prompt}
                </button>
              ))}
              {done.length > 0 ? (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-pill border border-hairline px-3 py-1.5 text-[11.5px] text-ink-muted transition hover:text-ink-primary"
                >
                  Start over
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="order-1 flex flex-col lg:order-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 py-2.5">
            <span className="flex flex-wrap items-center gap-1.5">
              {site.sections.map((section) => (
                <span
                  key={section.id}
                  className={cn(
                    'rounded-pill border px-2.5 py-1 text-[11px] transition-colors duration-300',
                    touched.includes(section.id)
                      ? 'border-accent/60 bg-accent-soft text-ink-primary'
                      : 'border-hairline text-ink-muted',
                  )}
                >
                  {section.label}
                </span>
              ))}
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">Theme</span>
              {DEMO_PALETTES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  title={option.label}
                  onClick={() => setSite((current) => ({ ...current, palette: option.palette }))}
                  className={cn(
                    'h-5 w-5 rounded-[6px] border transition',
                    site.palette.accent === option.palette.accent
                      ? 'border-white/50'
                      : 'border-white/12 hover:border-white/30',
                  )}
                  style={{ background: option.palette.bg }}
                >
                  <span
                    className="mx-auto block h-1.5 w-1.5 rounded-pill"
                    style={{ background: option.palette.accent }}
                  />
                  <span className="sr-only">{option.label}</span>
                </button>
              ))}
            </span>
          </div>

          <div className="bg-[var(--bg-base-deep)] p-4">
            {/* A preview is a viewport, so it scrolls rather than shrinking to
                fit — a visitor can look down the page the same way they would
                in the real editor. */}
            <div
              className="lumen-demo-viewport mx-auto overflow-y-auto rounded-[10px] border border-hairline transition-[max-width] duration-500"
              style={{ maxWidth: device === 'mobile' ? 320 : '100%', height: 392 }}
            >
              <DemoPreview site={site} device={device} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-hairline px-4 py-3">
            {published ? (
              <p className="text-[12px] text-ink-secondary">
                Live at{' '}
                <span style={{ color: site.palette.accent }}>bistro-lunaire.lumensite.in</span> — point
                your own domain at it whenever you like.
              </p>
            ) : (
              <p className="text-[12px] text-ink-muted">
                A demo of the editor, not a recording — the preview is drawn from the same state the
                chat is changing. No model is called on this page.
              </p>
            )}
            <ButtonLink href="/signup" size="sm" className="ml-auto">
              Build yours →
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceToggle({
  device,
  onChange,
}: {
  device: 'desktop' | 'mobile';
  onChange: (next: 'desktop' | 'mobile') => void;
}) {
  return (
    <span className="flex rounded-pill border border-hairline p-0.5" role="group" aria-label="Preview width">
      {(['desktop', 'mobile'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={device === option}
          className={cn(
            'rounded-pill px-3 py-1 text-[11px] capitalize transition',
            device === option ? 'bg-white/10 text-ink-primary' : 'text-ink-muted hover:text-ink-secondary',
          )}
        >
          {option}
        </button>
      ))}
    </span>
  );
}
