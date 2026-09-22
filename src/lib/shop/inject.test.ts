import { describe, expect, it } from 'vitest';
import {
  fillShopMarkers,
  hasShopMarker,
  pageFromShell,
  productSlugFromPath,
  shopMarker,
  withShopHead,
  withShopNav,
  withShopScript,
  type ShopView,
} from './inject';
import type { Product } from './catalogue';

const product: Product = {
  id: 'p1',
  slug: 'kurta',
  title: 'Kurta',
  description: null,
  summary: null,
  pricePaise: 49900,
  compareAtPaise: null,
  category: null,
  images: [],
  stock: null,
  active: true,
  position: 0,
};

const view = (over: Partial<ShopView> = {}): ShopView => ({
  products: [product],
  rates: [],
  codEnabled: true,
  paymentUrl: null,
  paymentNote: null,
  endpoint: '/api/shop/kits/orders',
  links: { base: '/s/kits/' },
  storageKey: 'kits',
  inline: false,
  ...over,
});

const SHELL = `<!doctype html><html><head><title>Home</title>
<meta property="og:title" content="Home" /></head><body>
<header class="nav"><div class="shell nav__inner"><nav class="nav__links" id="site-nav"><a href="index.html">Home</a></nav></div></header>
<main id="main"><section>Hero</section></main>
<footer class="footer">bye</footer></body></html>`;

describe('shop markers', () => {
  it('finds the marker a build leaves behind', () => {
    expect(hasShopMarker(shopMarker('shop'))).toBe(true);
    expect(hasShopMarker('<div>nothing</div>')).toBe(false);
  });

  it('fills each slot with its own page', () => {
    expect(fillShopMarkers(shopMarker('shop'), view(), null)).toContain('data-shop-add="p1"');
    expect(fillShopMarkers(shopMarker('cart'), view(), null)).toContain('data-shop-cart');
    expect(fillShopMarkers(shopMarker('checkout'), view(), null)).toContain('data-shop-order');
  });

  it('passes the chosen category through to the grid', () => {
    const html = fillShopMarkers(
      shopMarker('shop'),
      view({
        products: [
          { ...product, id: 'a', title: 'A thing', category: 'Alpha' },
          { ...product, id: 'b', title: 'B thing', category: 'Beta' },
        ],
      }),
      'Beta',
    );
    expect(html).toContain('B thing');
    expect(html).not.toContain('A thing');
  });

  it('leaves a page with no marker exactly as it was', () => {
    expect(fillShopMarkers(SHELL, view(), null)).toBe(SHELL);
  });
});

describe('withShopHead', () => {
  const assets = { css: '.shop{}', js: 'void 0;' };

  it('names the basket and links the stylesheet on a published site', () => {
    const html = withShopHead(SHELL, view(), assets);
    expect(html).toContain('name="lumen-shop" content="kits"');
    expect(html).toContain('href="/s/kits/shop.css"');
    expect(html).not.toContain('<style>');
  });

  /** The preview frame has no origin of its own to load a file from. */
  it('inlines the stylesheet in the preview instead', () => {
    const html = withShopHead(SHELL, view({ inline: true }), assets);
    expect(html).toContain('<style>.shop{}</style>');
    expect(html).not.toContain('shop.css');
  });

  it('does nothing twice', () => {
    const once = withShopHead(SHELL, view(), assets);
    expect(withShopHead(once, view(), assets)).toBe(once);
  });

  it('leaves a fragment with no head alone', () => {
    expect(withShopHead('<div>bare</div>', view(), assets)).toBe('<div>bare</div>');
  });
});

describe('withShopScript', () => {
  it('links the script on a published site and inlines it in the preview', () => {
    expect(withShopScript(SHELL, view(), 'CART')).toContain('src="/s/kits/shop.js"');
    expect(withShopScript(SHELL, view({ inline: true }), 'CART')).toContain('>CART</script>');
  });

  it('does nothing twice', () => {
    const once = withShopScript(SHELL, view(), 'CART');
    expect(withShopScript(once, view(), 'CART')).toBe(once);
  });
});

describe('withShopNav', () => {
  it('adds Shop and Basket to the site’s own header', () => {
    const html = withShopNav(SHELL, view());
    expect(html).toContain('href="/s/kits/shop.html"');
    expect(html).toContain('data-shop-count');
    expect(html).toContain('href="/s/kits/cart.html"');
  });

  it('does not add a second Shop link to a site that already has one', () => {
    const already = SHELL.replace('<a href="index.html">Home</a>', '<a href="index.html">Home</a><a href="shop.html">Shop</a>');
    const html = withShopNav(already, view());
    expect(html.match(/>Shop</g)).toHaveLength(1);
  });

  it('does nothing twice', () => {
    const once = withShopNav(SHELL, view());
    expect(withShopNav(once, view())).toBe(once);
  });

  /** A header is the one part of a site nobody forgives you for breaking. */
  it('leaves a header it does not recognise alone', () => {
    const odd = '<header><nav class="something-else"><a href="/">Home</a></nav></header>';
    expect(withShopNav(odd, view())).toBe(odd);
  });
});

describe('pageFromShell', () => {
  it('keeps the header and footer and swaps the middle', () => {
    const html = pageFromShell(SHELL, '<section>Shop</section>', 'Shop')!;
    expect(html).toContain('nav__links');
    expect(html).toContain('<footer class="footer">bye</footer>');
    expect(html).toContain('<section>Shop</section>');
    expect(html).not.toContain('Hero');
  });

  it('retitles the page it built', () => {
    const html = pageFromShell(SHELL, '<p>x</p>', 'Your basket')!;
    expect(html).toContain('<title>Your basket</title>');
    expect(html).toContain('og:title" content="Your basket"');
  });

  it('escapes a title rather than trusting it', () => {
    const html = pageFromShell(SHELL, '<p>x</p>', '</title><script>bad()</script>')!;
    expect(html).not.toContain('<script>bad()');
  });

  it('gives up on a page with no main element', () => {
    expect(pageFromShell('<html><body>no main</body></html>', '<p>x</p>', 'T')).toBeNull();
  });
});

describe('productSlugFromPath', () => {
  it('recognises a product address', () => {
    expect(productSlugFromPath('shop/cotton-kurta')).toBe('cotton-kurta');
    expect(productSlugFromPath('/shop/cotton-kurta')).toBe('cotton-kurta');
    expect(productSlugFromPath('shop/cotton-kurta.html')).toBe('cotton-kurta');
    expect(productSlugFromPath('shop/KURTA')).toBe('kurta');
  });

  it('is not fooled into reading anything else as a product', () => {
    expect(productSlugFromPath('shop.html')).toBeNull();
    expect(productSlugFromPath('shop/')).toBeNull();
    expect(productSlugFromPath('shop/../../etc/passwd')).toBeNull();
    expect(productSlugFromPath('shop/a/b')).toBeNull();
    expect(productSlugFromPath('about.html')).toBeNull();
    expect(productSlugFromPath(`shop/${'a'.repeat(200)}`)).toBeNull();
  });
});
