import { describe, expect, it } from 'vitest';
import {
  cleanName,
  diagnose,
  extractPhone,
  listingIsThin,
  mergeListing,
  nameFromUrl,
  normaliseMapsUrl,
  parseListing,
  splitDescription,
} from './scrape';
import type { PlaceProfile } from './places';

/**
 * Reading a Google listing off the page.
 *
 * The fixtures are shaped like the pages Google serves rather than like a page
 * anyone would write, because that is the whole difficulty: the facts are in
 * attributes and escaped blobs, and this environment cannot reach Google to
 * check against the real thing.
 */

const page = (kinds: string[]) => kinds.join('');

describe('cleanName', () => {
  it('strips the Google suffix a page title carries', () => {
    expect(cleanName('Sharma Dental Clinic - Google Maps')).toBe('Sharma Dental Clinic');
    expect(cleanName('Sharma Dental Clinic — Google Search')).toBe('Sharma Dental Clinic');
    expect(cleanName('Sharma Dental Clinic | Google')).toBe('Sharma Dental Clinic');
  });

  // A share link does not always land on a listing. When it lands on a search
  // page, the title is Google's own — and taking it produced a real business
  // called "Google Search".
  it.each(['Google Search', 'Google Maps', 'Google', 'google search', '  Google   Search  '])(
    'refuses %j, which is Google and not a business',
    (title) => {
      expect(cleanName(title)).toBeNull();
    },
  );

  it('keeps a business that merely contains the word', () => {
    expect(cleanName('Google Cafe Akola')).toBe('Google Cafe Akola');
  });

  it('has nothing to say about nothing', () => {
    expect(cleanName('')).toBeNull();
    expect(cleanName(null)).toBeNull();
  });
});

describe('nameFromUrl', () => {
  it('reads the name Maps spells out in the path', () => {
    expect(nameFromUrl('https://www.google.com/maps/place/Sharma+Dental+Clinic/@20.7,77.0,17z')).toBe(
      'Sharma Dental Clinic',
    );
    expect(nameFromUrl('https://www.google.com/maps/place/Caf%C3%A9%20Nine/data=!3m1')).toBe('Café Nine');
  });

  it('reads a share link that resolved to a search', () => {
    expect(nameFromUrl('https://www.google.com/search?q=sharma+dental+clinic+akola&hl=en')).toBe(
      'Sharma Dental Clinic Akola',
    );
  });

  it('leaves a name that is already capitalised alone', () => {
    expect(nameFromUrl('https://www.google.com/search?q=Sharma+DENTAL+Clinic')).toBe('Sharma DENTAL Clinic');
  });

  it.each([
    ['coordinates', 'https://www.google.com/maps/place/20.7096,77.0026'],
    ['a place id', 'https://www.google.com/maps/search/?q=place_id:ChIJxyz'],
    ['a bare cid', 'https://maps.google.com/?cid=12345'],
    ['something that is not a url', 'not a url'],
  ])('is not fooled by %s', (_label, url) => {
    expect(nameFromUrl(url)).toBeNull();
  });
});

describe('normaliseMapsUrl', () => {
  // This makes a server-side request with a string a stranger supplied, so the
  // allowlist is the only thing standing between it and an internal address.
  it.each([
    'https://share.google/ys45upPnp3XpjJUbB',
    'https://maps.app.goo.gl/abc',
    'https://www.google.co.in/maps/place/X',
  ])('allows Google’s own host %s', (url) => {
    expect(normaliseMapsUrl(url)).toBeTruthy();
  });

  it.each([
    'https://evil.example.com/google.com',
    'http://127.0.0.1:8080/',
    'https://notgoogle.com/maps',
    'file:///etc/passwd',
  ])('refuses %s', (url) => {
    expect(normaliseMapsUrl(url)).toBeNull();
  });

  it('asks for the English page, which parses predictably', () => {
    expect(normaliseMapsUrl('https://www.google.com/maps/place/X')).toContain('hl=en');
  });
});

describe('splitDescription', () => {
  it('pulls rating, category and address out of the middot line', () => {
    expect(splitDescription('★★★★★ · Dentist · 12 Hill Road, Mumbai')).toEqual({
      rating: 5,
      category: 'Dentist',
      address: '12 Hill Road, Mumbai',
    });
  });

  // Served when the link lands on a search page. It is Google's boilerplate,
  // and it was being read as a business's address.
  it('ignores Google’s own boilerplate', () => {
    expect(splitDescription("Search the world's information, including webpages.")).toEqual({
      rating: null,
      category: null,
      address: null,
    });
  });
});

describe('extractPhone', () => {
  it('finds a number the listing publishes', () => {
    expect(extractPhone('<a href="tel:+91 98765 43210">call</a>')).toBe('+91 98765 43210');
  });

  it('does not invent one from noise', () => {
    expect(extractPhone('<p>open 9 to 5</p>')).toBeNull();
  });
});

describe('parseListing', () => {
  const SEARCH = page([
    '<html><head><title>Google Search</title>',
    '<meta property="og:title" content="Google Search">',
    '<meta property="og:description" content="Search the world\'s information.">',
    '</head><body></body></html>',
  ]);

  it('refuses to build a business out of a search page', () => {
    expect(parseListing(SEARCH, 'https://www.google.com/search?hl=en')).toBeNull();
  });

  it('falls back to the name in the link when the page has none', () => {
    const listing = parseListing(SEARCH, 'https://www.google.com/search?q=sharma+dental+clinic+akola');
    expect(listing?.name).toBe('Sharma Dental Clinic Akola');
    expect(listing?.address).toBeNull();
  });

  it('reads a real listing', () => {
    const html = page([
      '<html><head><title>Sharma Dental Clinic - Google Maps</title>',
      '<meta property="og:description" content="4.8 · Dentist · 12 Hill Road, Bandra West, Mumbai">',
      '</head><body><a href="tel:+91 98765 43210">call</a></body></html>',
    ]);
    const listing = parseListing(html, 'https://www.google.com/maps/place/Sharma+Dental+Clinic/');
    expect(listing).toMatchObject({
      name: 'Sharma Dental Clinic',
      category: 'Dentist',
      address: '12 Hill Road, Bandra West, Mumbai',
      phone: '+91 98765 43210',
      rating: 4.8,
    });
  });
});

describe('mergeListing', () => {
  const base: PlaceProfile = {
    placeId: '',
    name: 'Google Search',
    category: null,
    summary: null,
    address: 'akola',
    phone: null,
    website: 'https://unrelated.example',
    mapsUrl: 'https://maps.google.com/x',
    rating: null,
    reviewCount: null,
    hours: [],
    services: [],
    reviews: [],
    photos: [{ name: 'p1', width: 1600, height: 1200, attributions: [], url: 'https://lh5.googleusercontent.com/p1' }],
  };

  const read = {
    name: 'Sadori',
    address: 'Tower Chowk, Akola',
    phone: '+91 98765 43210',
    website: 'https://sadori.in',
    services: ['Prescription glasses'],
  };

  it('lets the model’s reading win every fact it found', () => {
    const merged = mergeListing(base, read);
    expect(merged.name).toBe('Sadori');
    expect(merged.address).toBe('Tower Chowk, Akola');
    expect(merged.phone).toBe('+91 98765 43210');
    expect(merged.website).toBe('https://sadori.in');
    expect(merged.services).toEqual(['Prescription glasses']);
  });

  // The URLs were read off the page. A language model reproducing them from
  // memory is the one thing that would quietly break the pictures.
  it('never lets the model replace the photographs', () => {
    expect(mergeListing(base, { ...read, photos: [] }).photos).toEqual(base.photos);
  });

  it('keeps what the patterns found where the model found nothing', () => {
    expect(mergeListing(base, { name: 'Sadori' }).address).toBe('akola');
  });

  it('does nothing at all without a reading', () => {
    expect(mergeListing(base, null)).toEqual(base);
  });

  it('rejects a junk name from the model too', () => {
    expect(mergeListing(base, { name: 'Google Maps' }).name).toBe('Google Search');
  });
});

describe('diagnose', () => {
  const shell = '<html><head><title>Google Maps</title></head><body><div id="app"></div></body></html>';
  const real = `<html>${'x'.repeat(500_000)}<button data-item-id="address">a</button><img src="https://lh5.googleusercontent.com/p">`;

  // Whether Google sent a real page or an empty application shell is the
  // difference between a bug worth fixing and a limit worth explaining. Both
  // used to look identical: a site with a name and no facts.
  it('names an application shell for what it is', () => {
    expect(diagnose(shell, 'https://www.google.com/maps/place/x', 0)).toMatch(/application shell/);
  });

  it('does not call a real page a shell', () => {
    expect(diagnose(real, 'https://www.google.com/maps/place/x', 3)).not.toMatch(/application shell/);
  });

  it('says where the link landed', () => {
    expect(diagnose(shell, 'https://www.google.com/maps/place/x', 0)).toMatch(/Maps page/);
    expect(diagnose(shell, 'https://www.google.com/search?q=x', 0)).toMatch(/Search results page/);
  });
});

describe('listingIsThin', () => {
  const nothing: PlaceProfile = {
    placeId: '',
    name: 'Sadori',
    category: null,
    summary: null,
    address: null,
    phone: null,
    website: null,
    mapsUrl: null,
    rating: null,
    reviewCount: null,
    hours: [],
    services: [],
    reviews: [],
    photos: [],
  };

  it('knows a name with no facts behind it', () => {
    expect(listingIsThin(nothing)).toBe(true);
  });

  it.each([
    ['an address', { address: 'Tower Chowk' }],
    ['services', { services: ['Glasses'] }],
    ['one review', { reviews: [{ author: 'A', rating: 5, text: 'Good', relativeTime: '' }] }],
  ])('is satisfied by %s', (_label, extra: Partial<PlaceProfile>) => {
    expect(listingIsThin({ ...nothing, ...extra })).toBe(false);
  });
});
