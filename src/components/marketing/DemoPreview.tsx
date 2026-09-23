import type { DemoSite } from '@/lib/marketing/demo';

/**
 * The site inside the demo, rendered from state.
 *
 * Every colour, size and section comes from the `DemoSite` object, so when the
 * chat says it changed the palette, this is what changes. Inline styles rather
 * than classes on purpose: the whole point is that these values are data.
 */
export function DemoPreview({ site, device }: { site: DemoSite; device: 'desktop' | 'mobile' }) {
  const p = site.palette;
  const narrow = device === 'mobile';
  const pad = site.density === 'airy' ? (narrow ? 20 : 40) : narrow ? 16 : 28;

  return (
    <div
      className="min-h-full transition-colors duration-500"
      style={{ background: p.bg, color: p.ink, fontFamily: 'var(--font-sans)' }}
    >
      <header
        className="flex items-center justify-between border-b transition-all duration-500"
        style={{ borderColor: `${p.muted}33`, padding: `12px ${pad}px` }}
      >
        <span style={{ fontFamily: site.display, fontSize: 14 }}>{site.name}</span>
        <span className="flex items-center gap-3" style={{ fontSize: 10, color: p.muted }}>
          {/* At phone width a real site collapses its nav rather than wrapping
              four labels into two lines beside the button. */}
          {narrow
            ? null
            : site.sections
                .slice(1, 4)
                .map((section) => <span key={section.id}>{section.label}</span>)}
          <span
            className="rounded-pill transition-colors duration-500"
            style={{ background: p.accent, color: p.accentInk, padding: '4px 10px', fontSize: 10 }}
          >
            {site.cta}
          </span>
        </span>
      </header>

      <div style={{ padding: pad }} className="transition-all duration-500">
        {site.sections.map((section) => (
          <Section key={section.id} kind={section.kind} site={site} narrow={narrow} />
        ))}
      </div>
    </div>
  );
}

function Section({
  kind,
  site,
  narrow,
}: {
  kind: DemoSite['sections'][number]['kind'];
  site: DemoSite;
  narrow: boolean;
}) {
  const p = site.palette;
  const gap = site.density === 'airy' ? 28 : 16;

  if (kind === 'hero') {
    return (
      <div style={{ marginBottom: gap }}>
        <h3
          className="transition-all duration-500"
          style={{
            fontFamily: site.display,
            fontSize: narrow ? Math.round(site.headlineSize * 0.62) : site.headlineSize,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: 0,
            maxWidth: narrow ? '100%' : '75%',
          }}
        >
          {site.headline}
        </h3>
        <p
          className="transition-all duration-500"
          style={{
            color: p.muted,
            fontSize: 11,
            lineHeight: 1.6,
            marginTop: site.density === 'airy' ? 14 : 8,
            maxWidth: narrow ? '100%' : '55%',
          }}
        >
          {site.tagline}
        </p>
        <div
          className="transition-colors duration-500"
          style={{
            marginTop: site.density === 'airy' ? 22 : 14,
            height: narrow ? 96 : 132,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${p.surface}, ${p.accent}22)`,
          }}
        />
      </div>
    );
  }

  if (kind === 'menu') {
    return (
      <Band title="Tonight" site={site} gap={gap}>
        <div style={{ display: 'grid', gap: 6, gridTemplateColumns: narrow ? '1fr' : '1fr 1fr' }}>
          {['Oyster, apple, dill', 'Duck, cherry, farro', 'Burnt honey tart', 'Amaro, orange'].map(
            (line, index) => (
              <div
                key={line}
                className="transition-colors duration-500"
                style={{
                  background: p.surface,
                  borderRadius: 6,
                  padding: '8px 10px',
                  fontSize: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{line}</span>
                <span style={{ color: p.muted }}>₹{[640, 1180, 520, 480][index]}</span>
              </div>
            ),
          )}
        </div>
      </Band>
    );
  }

  if (kind === 'pricing') {
    return (
      <Band title="Set menus" site={site} gap={gap}>
        <div style={{ display: 'grid', gap: 6, gridTemplateColumns: narrow ? '1fr' : '1fr 1fr 1fr' }}>
          {[
            ['Four courses', '₹1,800'],
            ['Seven courses', '₹2,900'],
            ['With pairing', '₹4,400'],
          ].map(([label, price], index) => (
            <div
              key={label}
              className="transition-colors duration-500"
              style={{
                background: index === 1 ? p.accent : p.surface,
                color: index === 1 ? p.accentInk : p.ink,
                borderRadius: 6,
                padding: '10px',
                fontSize: 10,
              }}
            >
              <div style={{ opacity: 0.7 }}>{label}</div>
              <div style={{ fontFamily: site.display, fontSize: 16, marginTop: 4 }}>{price}</div>
            </div>
          ))}
        </div>
      </Band>
    );
  }

  if (kind === 'gallery') {
    return (
      <Band title="The room" site={site} gap={gap}>
        <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="transition-colors duration-500"
              style={{
                height: 52,
                borderRadius: 6,
                background: `linear-gradient(${140 + index * 30}deg, ${p.surface}, ${p.accent}1f)`,
              }}
            />
          ))}
        </div>
      </Band>
    );
  }

  return (
    <Band title="Find us" site={site} gap={gap}>
      <p style={{ fontSize: 10, color: p.muted, margin: 0, lineHeight: 1.7 }}>
        24 Chapel Road, Bandra West · Tuesday to Sunday, 7pm till late · +91 98XXX XXXXX
      </p>
    </Band>
  );
}

function Band({
  title,
  site,
  gap,
  children,
}: {
  title: string;
  site: DemoSite;
  gap: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: gap }}>
      <p
        style={{
          fontSize: 9,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: site.palette.muted,
          margin: '0 0 8px',
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}
