import type { DesignTokens } from '@/lib/generation/kit/tokens';
import { renderPage, SITE_SCRIPT, type PageSpec, type SiteSpec } from '@/lib/generation/kit/page';
import { renderStylesheet } from '@/lib/generation/kit/stylesheet';
import type { Section, SectionKind } from '@/lib/generation/kit/sections';
import { blueprintDesign } from './index';
import { sampleFor } from './sample';
import type { Blueprint, BlueprintPage, BlueprintStyle } from './types';

/**
 * A blueprint, rendered as an actual website.
 *
 * Through the real renderer, the real stylesheet and the real design system —
 * so what somebody sees before they spend a credit is the thing they will get,
 * with a stand-in business in it. Anything less honest than that (a screenshot,
 * a mockup, boxes labelled "Heading") is the difference between choosing a
 * template and gambling on one.
 *
 * The palette is the one part a preview cannot be truthful about, because the
 * real one is written for the real business. Each style gets a fixed palette in
 * the spirit of the blueprint's brief, and the preview page says so.
 */

const PREVIEW_PALETTES: Record<BlueprintStyle, DesignTokens['palette']> = {
  clinical: {
    bg: '#FBFCFD', surface: '#FFFFFF', surfaceAlt: '#F1F5F8', ink: '#16222E',
    inkMuted: '#5E7183', accent: '#0E7C86', accentInk: '#FFFFFF', border: 'rgba(22,34,46,0.12)',
  },
  premium: {
    bg: '#12100E', surface: '#1B1815', surfaceAlt: '#221E19', ink: '#F3EDE4',
    inkMuted: '#A3968A', accent: '#C9A227', accentInk: '#17130C', border: 'rgba(243,237,228,0.12)',
  },
  editorial: {
    bg: '#FAF8F4', surface: '#FFFFFF', surfaceAlt: '#F1EDE5', ink: '#1A1814',
    inkMuted: '#6E6659', accent: '#8A4B2A', accentInk: '#FFFFFF', border: 'rgba(26,24,20,0.12)',
  },
  minimal: {
    bg: '#FFFFFF', surface: '#FAFAF9', surfaceAlt: '#F3F3F1', ink: '#121212',
    inkMuted: '#6B6B6B', accent: '#1F4D3D', accentInk: '#FFFFFF', border: 'rgba(18,18,18,0.10)',
  },
  bold: {
    bg: '#0A0A0A', surface: '#141414', surfaceAlt: '#1C1C1C', ink: '#F5F5F3',
    inkMuted: '#8E8E88', accent: '#C9F227', accentInk: '#0A0A0A', border: 'rgba(245,245,243,0.12)',
  },
  modern: {
    bg: '#0B1020', surface: '#141B31', surfaceAlt: '#1B2440', ink: '#EEF1FB',
    inkMuted: '#8E97B5', accent: '#5B8CFF', accentInk: '#060A16', border: 'rgba(238,241,251,0.12)',
  },
  warm: {
    bg: '#FDF8F1', surface: '#FFFFFF', surfaceAlt: '#F6EDE0', ink: '#2A211A',
    inkMuted: '#7A6A5A', accent: '#C2612F', accentInk: '#FFFFFF', border: 'rgba(42,33,26,0.12)',
  },
  playful: {
    bg: '#FFFDF7', surface: '#FFFFFF', surfaceAlt: '#FFF3DE', ink: '#1F1B2E',
    inkMuted: '#6A6480', accent: '#7A4BFF', accentInk: '#FFFFFF', border: 'rgba(31,27,46,0.12)',
  },
};

export function previewTokens(blueprint: Blueprint): DesignTokens {
  const design = blueprintDesign(blueprint);
  return {
    palette: PREVIEW_PALETTES[blueprint.style],
    fonts: design.shape.fonts,
    radius: design.shape.radius,
    radiusLarge: design.shape.radiusLarge,
    density: design.shape.density,
    texture: design.shape.texture,
    mood: blueprint.note,
  };
}

/** Sample content for one section, in the shape the renderer expects. */
function sampleSection(kind: SectionKind, index: number, blueprint: Blueprint): Section {
  const sample = sampleFor(blueprint);
  const design = blueprintDesign(blueprint);
  const base: Section = { id: `s${index}`, kind, layout: design.layouts[kind] };
  const cta = { label: blueprint.action, href: 'contact.html' };
  const photos = (count: number, label: string) =>
    Array.from({ length: count }, (_, i) => ({ title: `${label} ${i + 1}` }));

  switch (kind) {
    case 'announcement':
      return { ...base, body: `Now taking bookings in ${sample.city}`, primaryCta: { label: 'See times', href: 'contact.html' } };
    case 'hero':
      return {
        ...base,
        heading: sample.name,
        subheading: sample.tagline,
        primaryCta: cta,
        secondaryCta: { label: 'See what we do', href: 'index.html' },
      };
    case 'about':
      return { ...base, heading: 'About us', body: `${sample.tagline}. ${sample.claim.body}` };
    case 'logos':
      return { ...base, heading: 'Accredited and trusted', items: sample.marks };
    case 'split':
      return {
        ...base,
        heading: sample.claim.heading,
        body: sample.claim.body,
        items: sample.claim.points,
        primaryCta: cta,
      };
    case 'features':
      return { ...base, heading: 'What you get', items: sample.claim.points.concat(sample.claim.points[0]) };
    case 'services':
    case 'menu':
      return { ...base, heading: kind === 'menu' ? 'On the menu' : 'What we do', items: sample.offers };
    case 'pricing':
      return { ...base, heading: 'Prices', items: sample.offers.slice(0, 3) };
    case 'steps':
      return {
        ...base,
        heading: 'How it works',
        items: [
          { title: 'Get in touch', body: 'Call, message or use the form. We reply the same day.' },
          { title: 'We talk it through', body: 'Fifteen minutes, so nobody is guessing what is needed.' },
          { title: 'We get started', body: 'Agreed in writing, with a date, before anything begins.' },
        ],
      };
    case 'gallery':
      return { ...base, heading: 'A look around', items: photos(6, 'Photograph') };
    case 'beforeafter':
      return {
        ...base,
        heading: 'Recent work',
        items: sample.offers.slice(0, 3).map((offer) => ({
          title: offer.title,
          body: offer.body,
          meta: offer.meta,
        })),
      };
    case 'team':
      return {
        ...base,
        heading: 'The people here',
        items: [
          { title: 'Dr. Anaya Rao', meta: 'Founder', body: 'Eighteen years, and still takes the first appointment.' },
          { title: 'Vikram Shetty', meta: 'Senior', body: 'Trained in Manipal, here since 2019.' },
          { title: 'Priya Nair', meta: 'Front desk', body: 'Knows every regular by name.' },
          { title: 'Imran Qureshi', meta: 'Specialist', body: 'Handles the complicated cases.' },
        ],
      };
    case 'testimonials':
      return {
        ...base,
        heading: 'What people say',
        items: [
          { title: 'Meera K.', body: 'Straightforward, and the price at the end was the price at the start.', meta: '5' },
          { title: 'Rahul D.', body: 'I have been going for four years and sent my whole family.', meta: '5' },
          { title: 'Sana P.', body: 'They fitted me in the same morning. That mattered more than anything.', meta: '5' },
        ],
      };
    case 'stats':
      return { ...base, items: sample.stats };
    case 'faq':
      return { ...base, heading: 'Questions people ask', items: sample.faq };
    case 'hours':
      return {
        ...base,
        heading: 'Where and when',
        body: `24 Chapel Road, ${sample.city}`,
        primaryCta: { label: 'Get directions', href: 'contact.html' },
        items: [
          { title: 'Monday to Friday', meta: '10am – 8pm' },
          { title: 'Saturday', meta: '10am – 6pm' },
          { title: 'Sunday', meta: 'Closed' },
        ],
      };
    case 'contact':
      return {
        ...base,
        heading: 'Get in touch',
        items: [
          { title: 'Phone', body: '+91 98XXX XXXXX', href: 'tel:+9198000' },
          { title: 'WhatsApp', body: 'Message us', href: 'https://wa.me/' },
          { title: 'Email', body: `hello@${blueprint.id}.example`, href: 'mailto:hello@example.com' },
          { title: 'Address', body: `24 Chapel Road, ${sample.city}` },
        ],
      };
    case 'cta':
      return { ...base, heading: blueprint.action, subheading: sample.tagline, primaryCta: cta };
    default:
      return { ...base, heading: 'Section' };
  }
}

function previewPage(blueprint: Blueprint, page: BlueprintPage): PageSpec {
  const sample = sampleFor(blueprint);
  return {
    path: page.path,
    title: page.path === 'index.html' ? `${sample.name} — ${page.title}` : `${page.title} — ${sample.name}`,
    description: blueprint.seoDescription,
    sections: page.sections.map((kind, index) => sampleSection(kind, index, blueprint)),
  };
}

export function previewSite(blueprint: Blueprint): { site: SiteSpec; pages: PageSpec[] } {
  const sample = sampleFor(blueprint);
  const visible = blueprint.pages.filter((page) => !page.hidden);

  const site: SiteSpec = {
    businessName: sample.name,
    tagline: sample.tagline,
    pages: visible.map((page) => ({ path: page.path, title: page.title })),
    contact: { address: `24 Chapel Road, ${sample.city}`, phone: '+91 98XXX XXXXX' },
    footerNote: 'Template preview — the words and colours are a stand-in for yours.',
    tokens: previewTokens(blueprint),
  };

  return { site, pages: visible.map((page) => previewPage(blueprint, page)) };
}

/** The one file the preview route is asked for, rendered on demand. */
export function previewFile(blueprint: Blueprint, path: string): { body: string; type: string } | null {
  if (path === 'styles.css') {
    return {
      body: renderStylesheet(previewTokens(blueprint), blueprintDesign(blueprint)),
      type: 'text/css; charset=utf-8',
    };
  }
  if (path === 'script.js') return { body: SITE_SCRIPT, type: 'text/javascript; charset=utf-8' };

  const { site, pages } = previewSite(blueprint);
  const wanted = path === '' || path === '/' ? 'index.html' : path;
  const page = pages.find((entry) => entry.path === wanted);
  if (!page) return null;
  return { body: renderPage(site, page), type: 'text/html; charset=utf-8' };
}
