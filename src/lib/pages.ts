/**
 * How a page is named to the person who owns the site.
 *
 * `services.html` is a filename. The people this is built for did not ask for
 * files, they asked for a website, and nowhere in the product should they have
 * to read an extension to know which page they are looking at.
 */

const KNOWN: Record<string, string> = {
  'index.html': 'Home',
  'index.htm': 'Home',
  'about.html': 'About',
  'contact.html': 'Contact',
  'services.html': 'Services',
  'menu.html': 'Menu',
  'gallery.html': 'Gallery',
  'pricing.html': 'Pricing',
  'team.html': 'Team',
  'faq.html': 'FAQ',
  'booking.html': 'Booking',
  'classes.html': 'Classes',
  'rooms.html': 'Rooms',
  'shop.html': 'Shop',
};

export function pageLabel(path: string): string {
  const file = path.split('/').pop() ?? path;
  const known = KNOWN[file.toLowerCase()];
  if (known) return known;

  const stem = file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (!stem) return 'Page';

  // "our-work" reads as "Our work" — sentence case, not Title Case, because a
  // nav is a list of things rather than a set of proper nouns.
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

/** Page paths ordered the way a visitor meets them: home first, then the rest. */
export function orderPages(paths: string[]): string[] {
  return [...paths].sort((a, b) => {
    const home = (path: string) => (path === 'index.html' ? 0 : 1);
    if (home(a) !== home(b)) return home(a) - home(b);
    return pageLabel(a).localeCompare(pageLabel(b));
  });
}
