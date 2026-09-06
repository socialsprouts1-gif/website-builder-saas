import type { CSSProperties } from 'react';
import type { Idea, Palette, ShowcaseItem } from '@/lib/ideas';

/**
 * A miniature of the site an idea would produce.
 *
 * It is drawn at a fixed 1000px design width and scaled down by the caller, so
 * the proportions are the proportions of a real page rather than a shrunken
 * card. Every colour comes from the idea's palette, so what the client sees
 * here is what the prompt asks the generator for.
 *
 * Server-rendered on purpose: it is static markup, so the gallery costs no
 * JavaScript and no iframes.
 */

const WIDTH = 1000;
const HEIGHT = 620;

export function SiteMock({ idea }: { idea: Idea }) {
  const { direction } = idea;
  const p = direction.palette;

  const style: CSSProperties = {
    width: WIDTH,
    height: HEIGHT,
    background: p.bg,
    color: p.ink,
    fontFamily: direction.body,
  };

  return (
    <div style={style} className="relative overflow-hidden">
      <Chrome idea={idea} />
      {direction.archetype === 'editorial' ? <Editorial idea={idea} /> : null}
      {direction.archetype === 'grid' ? <Grid idea={idea} /> : null}
      {direction.archetype === 'split' ? <Split idea={idea} /> : null}
      {direction.archetype === 'poster' ? <Poster idea={idea} /> : null}
      {direction.archetype === 'catalog' ? <Catalog idea={idea} /> : null}
      {direction.archetype === 'directory' ? <Directory idea={idea} /> : null}
    </div>
  );
}

export const MOCK_SIZE = { width: WIDTH, height: HEIGHT };

/** The nav every one of them shares, so the layouts differ where it matters. */
function Chrome({ idea }: { idea: Idea }) {
  const p = idea.direction.palette;
  return (
    <div className="flex items-center justify-between px-14 py-7" style={{ fontSize: 15 }}>
      <span style={{ fontFamily: idea.direction.display, fontSize: 21, letterSpacing: '-0.01em' }}>
        {idea.business.split(' ')[0]}
      </span>
      <div className="flex items-center gap-8" style={{ color: p.muted }}>
        {idea.nav.map((item) => (
          <span key={item}>{item}</span>
        ))}
        <span
          className="rounded-full px-5 py-2"
          style={{ background: p.accent, color: p.accentInk, fontSize: 14 }}
        >
          {idea.cta}
        </span>
      </div>
    </div>
  );
}

/** A stand-in for photography: a tinted field, never a grey box. */
function Media({ p, height, className = '' }: { p: Palette; height: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        height,
        background: `linear-gradient(140deg, ${p.accent}38, ${p.surface} 55%, ${p.accent}14)`,
        border: `1px solid ${p.accent}26`,
      }}
    />
  );
}

/**
 * A grid or list cell. Falls back to the section list so a new idea renders
 * something sensible before anyone writes its showcase rows.
 */
function pick(showcase: ShowcaseItem[] | undefined, index: number): ShowcaseItem {
  if (showcase && showcase.length > 0) return showcase[index % showcase.length];
  return { label: '—' };
}

function Lines({ p, count, width = 100 }: { p: Palette; count: number; width?: number }) {
  return (
    <div className="flex flex-col gap-2.5" style={{ width: `${width}%` }}>
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          style={{
            height: 7,
            borderRadius: 4,
            background: p.muted,
            opacity: 0.32,
            width: index === count - 1 ? '62%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

function Editorial({ idea }: { idea: Idea }) {
  const p = idea.direction.palette;
  return (
    <>
      <div className="grid grid-cols-[1.55fr_1fr] items-end gap-12 px-14 pb-10 pt-8">
        <h1
          style={{
            fontFamily: idea.direction.display,
            fontSize: 74,
            lineHeight: 0.98,
            letterSpacing: '-0.03em',
          }}
        >
          {idea.headline}
        </h1>
        <div className="flex flex-col gap-4 pb-3">
          <p style={{ color: p.muted, fontSize: 17, lineHeight: 1.5 }}>{idea.tagline}</p>
          <Lines p={p} count={3} />
        </div>
      </div>
      <Media p={p} height={200} className="mx-14" />
      <div className="grid grid-cols-3 gap-10 px-14 pt-9">
        {idea.sections.slice(0, 3).map((section) => (
          <div key={section} className="flex flex-col gap-3">
            <span style={{ fontFamily: idea.direction.display, fontSize: 19 }}>{section}</span>
            <Lines p={p} count={2} />
          </div>
        ))}
      </div>
    </>
  );
}

function Grid({ idea }: { idea: Idea }) {
  const p = idea.direction.palette;
  return (
    <>
      <div className="flex flex-col items-center gap-5 px-24 pb-9 pt-10 text-center">
        <h1 style={{ fontFamily: idea.direction.display, fontSize: 56, lineHeight: 1.03, letterSpacing: '-0.02em' }}>
          {idea.headline}
        </h1>
        <p style={{ color: p.muted, fontSize: 18 }}>{idea.tagline}</p>
        <span
          className="rounded-full px-8 py-3"
          style={{ background: p.accent, color: p.accentInk, fontSize: 15 }}
        >
          {idea.cta}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-6 px-14">
        {idea.sections.slice(0, 3).map((section) => (
          <div key={section} className="flex flex-col gap-4 p-6" style={{ background: p.surface, borderRadius: 14 }}>
            <span style={{ height: 34, width: 34, borderRadius: 9, background: p.accent, opacity: 0.85 }} />
            <span style={{ fontSize: 18 }}>{section}</span>
            <Lines p={p} count={2} />
          </div>
        ))}
      </div>
      <div className="mt-9 grid grid-cols-4 px-14">
        {['12 yrs', '4.9★', '2 400', '24 hr'].map((stat) => (
          <span key={stat} style={{ fontFamily: idea.direction.display, fontSize: 30, color: p.accent }}>
            {stat}
          </span>
        ))}
      </div>
    </>
  );
}

function Split({ idea }: { idea: Idea }) {
  const p = idea.direction.palette;
  return (
    <>
      <div className="grid grid-cols-2 items-center gap-12 px-14 pb-8 pt-6">
        <div className="flex flex-col gap-6">
          <h1 style={{ fontFamily: idea.direction.display, fontSize: 58, lineHeight: 1.02, letterSpacing: '-0.02em' }}>
            {idea.headline}
          </h1>
          <p style={{ color: p.muted, fontSize: 18, lineHeight: 1.5 }}>{idea.tagline}</p>
          <span
            className="w-fit rounded-full px-7 py-3"
            style={{ background: p.accent, color: p.accentInk, fontSize: 15 }}
          >
            {idea.cta}
          </span>
        </div>
        <Media p={p} height={290} />
      </div>
      <div className="grid grid-cols-2 items-center gap-12 px-14 pt-6">
        <Media p={p} height={150} />
        <div className="flex flex-col gap-3">
          <span style={{ fontFamily: idea.direction.display, fontSize: 26 }}>{idea.sections[0]}</span>
          <Lines p={p} count={3} />
        </div>
      </div>
    </>
  );
}

function Poster({ idea }: { idea: Idea }) {
  const p = idea.direction.palette;
  return (
    <>
      <div className="flex flex-col items-center gap-7 px-16 pb-10 pt-12 text-center">
        <h1
          style={{
            fontFamily: idea.direction.display,
            fontSize: 96,
            lineHeight: 0.9,
            letterSpacing: '-0.045em',
            textTransform: 'uppercase',
            fontWeight: 800,
          }}
        >
          {idea.headline}
        </h1>
        <p style={{ color: p.muted, fontSize: 19 }}>{idea.tagline}</p>
        <span
          className="rounded-full px-10 py-4"
          style={{ background: p.accent, color: p.accentInk, fontSize: 17, fontWeight: 600 }}
        >
          {idea.cta}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-5 px-14">
        {idea.sections.slice(0, 4).map((section) => (
          <div key={section} className="flex flex-col gap-3 p-5" style={{ background: p.surface, borderRadius: 12 }}>
            <span style={{ fontSize: 15, color: p.accent }}>{section}</span>
            <Lines p={p} count={2} />
          </div>
        ))}
      </div>
    </>
  );
}

function Catalog({ idea }: { idea: Idea }) {
  const p = idea.direction.palette;
  return (
    <>
      <div className="flex items-end justify-between px-14 pb-8 pt-6">
        <h1 style={{ fontFamily: idea.direction.display, fontSize: 50, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {idea.headline}
        </h1>
        <p style={{ color: p.muted, fontSize: 17 }}>{idea.tagline}</p>
      </div>
      {[0, 1].map((row) => (
        <div key={row} className="grid grid-cols-4 gap-5 px-14 pb-6">
          {[0, 1, 2, 3].map((cell) => {
            const item = pick(idea.showcase, row * 4 + cell);
            return (
              <div key={cell} className="flex flex-col gap-2.5">
                <Media p={p} height={row === 0 ? 168 : 120} />
                <span style={{ fontSize: 15 }}>{item.label}</span>
                {item.meta ? <span style={{ fontSize: 14, color: p.accent }}>{item.meta}</span> : null}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

function Directory({ idea }: { idea: Idea }) {
  const p = idea.direction.palette;
  return (
    <>
      <div className="flex items-end justify-between px-14 pb-7 pt-6">
        <h1 style={{ fontFamily: idea.direction.display, fontSize: 46, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {idea.headline}
        </h1>
        <p style={{ color: p.muted, fontSize: 17 }}>{idea.tagline}</p>
      </div>
      <div className="flex flex-col gap-4 px-14">
        {[0, 1, 2, 3].map((index) => {
          const item = pick(idea.showcase, index);
          return (
            <div
              key={index}
              className="flex items-center gap-6 p-5"
              style={{ background: p.surface, borderRadius: 12 }}
            >
              <Media p={p} height={84} className="w-[150px] shrink-0 rounded-[8px]" />
              <div className="flex flex-1 flex-col gap-3">
                <span style={{ fontFamily: idea.direction.display, fontSize: 22 }}>{item.label}</span>
                <Lines p={p} count={2} width={80} />
              </div>
              {item.meta ? <span style={{ fontSize: 19, color: p.accent }}>{item.meta}</span> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
