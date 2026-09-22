import Link from 'next/link';
import { anchorFor, type Block, type LegalDocument } from '@/lib/legal';
import { missingCompanyDetails } from '@/lib/legal/company';

/**
 * One legal document, rendered.
 *
 * Long-form reading, so: a measured line length, generous leading, real
 * headings that can be linked to, and a contents list at the top — because
 * somebody arriving at a privacy policy almost always wants one clause rather
 * than the whole thing.
 */
export function LegalDocumentView({ document }: { document: LegalDocument }) {
  const missing = missingCompanyDetails();

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <Link href="/legal" className="text-[13px] text-ink-muted transition hover:text-ink-primary">
        ← All policies
      </Link>

      <h1 className="mt-5 font-display text-[34px] leading-tight text-ink-primary sm:text-[40px]">
        {document.title}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">{document.summary}</p>
      <p className="mt-4 text-[12.5px] text-ink-muted">
        Last updated{' '}
        <time dateTime={document.updated}>
          {new Date(document.updated).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </time>
      </p>

      {missing.length > 0 ? (
        // Said out loud rather than printed as though it were a fact. A policy
        // naming the wrong registered office is worse than one that admits it
        // has not been filled in.
        <p className="mt-6 rounded-card border border-[#e5a15a]/30 bg-[#e5a15a]/10 px-4 py-3 text-[12.5px] leading-relaxed text-[#e5a15a]">
          This document is not finished: the business&apos;s {missing.join(', ')}{' '}
          {missing.length === 1 ? 'has' : 'have'} not been filled in yet.
        </p>
      ) : null}

      {document.intro.length > 0 ? (
        <div className="mt-8 space-y-4 border-l-2 border-accent/30 pl-5">
          {document.intro.map((paragraph, index) => (
            <p key={index} className="text-[15px] leading-relaxed text-ink-secondary">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {document.sections.length > 2 ? (
        <nav aria-label="Contents" className="mt-10 rounded-card border border-hairline bg-raised p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Contents</p>
          <ol className="mt-3 space-y-1.5">
            {document.sections.map((section, index) => (
              <li key={section.heading} className="text-[13.5px]">
                <a
                  href={`#${anchorFor(section.heading)}`}
                  className="text-ink-secondary transition hover:text-accent"
                >
                  <span className="mr-2 text-ink-muted">{index + 1}.</span>
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="mt-12 space-y-10">
        {document.sections.map((section, index) => (
          <section key={section.heading} id={anchorFor(section.heading)} className="scroll-mt-24">
            <h2 className="font-display text-[22px] leading-snug text-ink-primary">
              <span className="mr-2 text-ink-muted">{index + 1}.</span>
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4">
              {section.blocks.map((block, blockIndex) => (
                <BlockView key={blockIndex} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-14 border-t border-hairline pt-6 text-[12.5px] leading-relaxed text-ink-muted">
        Something here unclear, or not matching what the product does? Tell us — a policy that does
        not describe the real thing is a bug.
      </p>
    </article>
  );
}

function BlockView({ block }: { block: Block }) {
  if ('p' in block) {
    return <p className="text-[15px] leading-relaxed text-ink-secondary">{block.p}</p>;
  }
  if ('ul' in block) {
    return (
      <ul className="space-y-2.5">
        {block.ul.map((item, index) => (
          <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-ink-secondary">
            <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-pill bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ol className="space-y-2.5">
      {block.ol.map((item, index) => (
        <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-ink-secondary">
          <span aria-hidden className="shrink-0 text-ink-muted">{index + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}
