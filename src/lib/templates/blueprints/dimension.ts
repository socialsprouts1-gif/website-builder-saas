import type { Blueprint } from '../types';
import { CONTACT, SHOP_HOME_SLOTS, SHOP_PAGES, VISIT, home, page } from '../parts';

/**
 * The 3D blueprints — Lumen 3D Studio, as five real websites.
 *
 * Studio is not a second product. It is these: blueprints whose pages open on
 * a `scene3d` section instead of a photograph, built on the designs with depth
 * and motion already in them. Choosing "3D portfolio" in Studio builds through
 * exactly the same pipeline as choosing a dental clinic, which is why it works
 * at all rather than being a second half-finished builder.
 *
 * Every one of them names its own palette. A 3D section draws itself from the
 * site's accent, so the palette brief is the whole difference between a violet
 * game landing page and a champagne-and-glass showroom — and the reason none of
 * these comes out the same electric green as the Lumen dashboard.
 */
export const DIMENSION_BLUEPRINTS: Blueprint[] = [
  {
    id: 'parallax',
    name: 'Parallax',
    industry: 'creative',
    businessTypes: ['Designer', 'Photographer', 'Studio', 'Illustrator'],
    style: 'bold',
    note: 'Work standing in space, turned rather than scrolled past.',
    design: 'circuit',
    vertical: 'photography',
    action: 'Start a project',
    features: ['three_d', 'portfolio', 'enquiries', 'multipage'],
    motion: 'lively',
    depth: 'dimensional',
    paletteBrief:
      'Deep indigo to near-black, with a cold electric blue that only appears on the work itself. No green.',
    layouts: {
      scene3d: 'float',
      hero: 'editorial',
      gallery: 'mosaic',
      features: 'bento',
      about: 'statement',
      cta: 'full',
    },
    seoDescription: 'An interactive 3D portfolio: selected work, in depth, with the story behind each piece.',
    pages: [
      home('hero', 'scene3d', 'about', 'turntable', 'gallery', 'features', 'split', 'logos', 'testimonials', 'cta'),
      page('work.html', 'Work', 'hero', 'scene3d', 'gallery', 'split', 'beforeafter', 'cta'),
      page('about.html', 'About', 'hero', 'about', 'stats', 'steps', 'logos', 'cta'),
      CONTACT,
    ],
  },
  {
    id: 'orbit',
    name: 'Orbit',
    industry: 'retail',
    businessTypes: ['Product brand', 'Hardware', 'Jewellery', 'Footwear'],
    style: 'premium',
    note: 'One object, lit properly, that a customer can turn over before buying.',
    design: 'atelier',
    vertical: 'retail',
    action: 'Buy it',
    features: ['three_d', 'listings', 'landing'],
    motion: 'subtle',
    depth: 'dimensional',
    paletteBrief:
      'Warm champagne and bone on charcoal, with a brushed-gold accent. Expensive and quiet.',
    layouts: {
      scene3d: 'float',
      hero: 'centre',
      features: 'checks',
      split: 'points',
      pricing: 'cards',
      cta: 'panel',
    },
    seoDescription: 'See it from every angle, in 3D, before you buy.',
    pages: [
      home('hero', 'scene3d', 'turntable', 'split', 'features', 'gallery', 'stats', 'testimonials', 'pricing', 'faq', 'cta'),
      page('product.html', 'The product', 'hero', 'turntable', 'features', 'split', 'beforeafter', 'pricing', 'faq', 'cta'),
      CONTACT,
    ],
  },
  {
    id: 'arcade',
    name: 'Arcade',
    industry: 'agency',
    businessTypes: ['Game studio', 'Esports team', 'App launch', 'Event'],
    style: 'bold',
    note: 'A landing page with a world behind it. Environment, characters, a trailer.',
    design: 'forge',
    vertical: 'agency',
    action: 'Play it',
    features: ['three_d', 'landing', 'enquiries'],
    motion: 'lively',
    depth: 'dimensional',
    paletteBrief:
      'Near-black, hot violet and a magenta edge light. Loud, saturated, nothing like a corporate site.',
    layouts: {
      scene3d: 'float',
      hero: 'fullbleed',
      features: 'bento',
      steps: 'numbered',
      stats: 'band',
      cta: 'full',
    },
    seoDescription: 'The world, the characters and the release date — in an interactive 3D landing page.',
    pages: [
      home('announcement', 'hero', 'scene3d', 'features', 'gallery', 'split', 'stats', 'steps', 'testimonials', 'faq', 'cta'),
      page('world.html', 'The world', 'hero', 'scene3d', 'turntable', 'split', 'gallery', 'team', 'faq', 'cta'),
      CONTACT,
    ],
  },
  {
    id: 'pavilion',
    name: 'Pavilion',
    industry: 'retail',
    businessTypes: ['Showroom', 'Furniture', 'Gallery', 'Car dealer'],
    style: 'minimal',
    note: 'A floor somebody can move around, with the stock standing on it.',
    design: 'vitrine',
    vertical: 'retail',
    action: 'Book a viewing',
    features: ['three_d', 'listings', 'enquiries', 'multipage'],
    motion: 'subtle',
    depth: 'raised',
    paletteBrief:
      'Gallery white and pale concrete, with one deep oxblood accent. Light, airy, almost no colour.',
    layouts: {
      scene3d: 'float',
      hero: 'split',
      gallery: 'grid',
      services: 'index',
      hours: 'location',
      cta: 'band',
    },
    seoDescription: 'Walk the showroom in 3D, then come and see it in person.',
    pages: [
      home('hero', 'scene3d', 'about', 'services', 'gallery', 'split', 'features', 'testimonials', 'hours', 'cta'),
      page('collection.html', 'Collection', 'hero', 'scene3d', 'turntable', 'gallery', 'services', 'logos', 'faq', 'cta'),
      VISIT,
    ],
  },
  {
    id: 'vitrine3d',
    name: 'Cabinet',
    industry: 'retail',
    businessTypes: ['Online store', 'Boutique', 'Jewellery', 'Fragrance'],
    style: 'premium',
    note: 'A shop where the stock turns. Catalogue, basket and checkout, with the product in 3D above it.',
    design: 'atelier',
    vertical: 'retail',
    action: 'Buy it',
    // A real shop: the catalogue, basket and checkout are rendered from the
    // products in the database, not written as sections. The 3D is what sits
    // over them rather than a replacement for them.
    features: ['three_d', 'shop', 'multipage', 'enquiries'],
    motion: 'subtle',
    depth: 'dimensional',
    paletteBrief:
      'Deep ink and bone with a warm brass accent. Expensive, quiet, and nothing neon.',
    layouts: {
      scene3d: 'float',
      hero: 'centre',
      features: 'checks',
      gallery: 'mosaic',
      split: 'points',
      cta: 'panel',
    },
    seoDescription: 'Browse the collection, turn each piece in 3D, and buy it.',
    pages: [
      {
        ...home('announcement', 'hero', 'scene3d', 'split', 'turntable', 'features', 'gallery', 'testimonials', 'faq', 'cta'),
        shopBands: SHOP_HOME_SLOTS,
      },
      ...SHOP_PAGES,
      page('about.html', 'Our story', 'hero', 'about', 'steps', 'stats', 'gallery', 'cta'),
      page('delivery.html', 'Delivery & returns', 'hero', 'split', 'steps', 'faq', 'cta'),
      CONTACT,
    ],
  },
  {
    id: 'prism',
    name: 'Prism',
    industry: 'software',
    businessTypes: ['SaaS', 'Device', 'Startup', 'Agency'],
    style: 'modern',
    note: 'The product on a screen, at an angle, taken apart in mid-air.',
    design: 'circuit',
    vertical: 'agency',
    action: 'Book a demo',
    features: ['three_d', 'landing', 'enquiries'],
    motion: 'lively',
    depth: 'dimensional',
    paletteBrief:
      'Slate and graphite with a cool cyan accent and a thin coral highlight. Technical, not neon.',
    layouts: {
      scene3d: 'float',
      hero: 'split',
      features: 'bento',
      split: 'points',
      steps: 'timeline',
      pricing: 'table',
      cta: 'full',
    },
    seoDescription: 'See the product work, in 3D, before you book a demo.',
    pages: [
      home('hero', 'scene3d', 'split', 'features', 'logos', 'steps', 'testimonials', 'pricing', 'faq', 'cta'),
      page('product.html', 'Product', 'hero', 'turntable', 'features', 'split', 'faq', 'cta'),
      page('pricing.html', 'Pricing', 'hero', 'pricing', 'faq', 'cta'),
      CONTACT,
    ],
  },
];
