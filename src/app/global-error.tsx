'use client';

/**
 * The last resort.
 *
 * This replaces the whole document, including the root layout, so it cannot
 * use anything from it — no fonts, no tokens, no components. Everything here
 * is inline on purpose: if the layout is what broke, a screen that depends on
 * the layout breaks with it, and the person gets a blank page instead of a
 * sentence.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0b0a',
          color: '#f4f4ef',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '26rem', textAlign: 'center' }}>
          {/* Straight from /public: this boundary replaces the root layout, so
              the fewer moving parts between here and the mark, the better. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lumen-mark.png" alt="" width={44} height={44} style={{ width: 44, height: 44 }} />
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8a8a80', margin: '0.6rem 0 0' }}>
            Lumen
          </p>
          <h1 style={{ fontSize: '1.9rem', lineHeight: 1.2, margin: '0.75rem 0 0' }}>
            Something went badly wrong
          </h1>
          <p style={{ color: '#b9b9b0', lineHeight: 1.6, margin: '0.75rem 0 0', fontSize: '0.95rem' }}>
            The page could not be rendered at all. Your sites and everything in them are unaffected.
          </p>
          {error.digest ? (
            <p style={{ color: '#8a8a80', fontSize: '0.8rem', margin: '0.75rem 0 0' }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              border: 0,
              borderRadius: '999px',
              padding: '0.7rem 1.4rem',
              background: '#d7ff3e',
              color: '#15150f',
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          <p style={{ margin: '1rem 0 0' }}>
            {/* A plain anchor, deliberately. This boundary replaces the root
                layout, so the router may be exactly what failed; a full page
                load is the one navigation that cannot also be broken. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: '#8a8a80', fontSize: '0.85rem' }}>
              Back to lumensite.in
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
