import {
  cartPage,
  categoryTiles,
  checkoutPage,
  escapeHtml,
  featuredProducts,
  productPage,
  shopGrid,
  type ShopLinks,
} from './render';
import type { Product, ShippingRate } from './catalogue';

/**
 * Putting the shop into the page, where the page is served.
 *
 * Nothing about a shop is baked into a generated file. The build writes an
 * empty marker — `<div data-lumen-shop="shop">` — and the grid, the basket and
 * the checkout are rendered into it on every request from the database as it
 * stands right now. That is the difference between a catalogue and a shop: a
 * price change, a sold-out size or a new product is live the moment it is
 * saved, with nothing regenerated and nothing republished.
 *
 * It also means a site built before any of this existed gains a working shop
 * the moment one is switched on, because its pages can be built from its own
 * home page's shell.
 */

export interface ShopView {
  products: Product[];
  rates: ShippingRate[];
  codEnabled: boolean;
  paymentUrl: string | null;
  paymentNote: string | null;
  /** Where the browser posts an order. */
  endpoint: string;
  links: ShopLinks;
  /** Distinguishes one site's basket from another's in shared storage. */
  storageKey: string;
  /**
   * Inline the stylesheet and script instead of linking to them.
   *
   * The preview frame is sandboxed into an opaque origin and sends no cookies
   * with its subresource requests, so it cannot load a file of its own; its
   * policy allows inline instead. A published site is the other way round: its
   * policy is `script-src 'self'`, which forbids inline and allows the file.
   */
  inline: boolean;
}

/**
 * Everywhere a shop renders into a page.
 *
 * The first three are pages of their own. The last two are bands that sit on
 * a page the shop does not own — the home page, almost always — because an
 * e-commerce home page with no products on it and a link to a Shop page is a
 * brochure with a shop bolted to the side.
 */
export type ShopSlot = 'shop' | 'cart' | 'checkout' | 'featured' | 'categories';

/** The slots that are whole pages, and what those pages are called. */
export const SHOP_PAGES: Record<'shop' | 'cart' | 'checkout', { path: string; title: string }> = {
  shop: { path: 'shop.html', title: 'Shop' },
  cart: { path: 'cart.html', title: 'Your basket' },
  checkout: { path: 'checkout.html', title: 'Checkout' },
};

/** The empty marker a generated page carries where the shop goes. */
export function shopMarker(slot: ShopSlot): string {
  return `<div data-lumen-shop="${slot}"></div>`;
}

/**
 * The marker, wrapped in a section so it sits in the page's own rhythm.
 *
 * This is what a build writes into shop.html, cart.html and checkout.html. The
 * heading is real markup in the file, so the owner can edit "Your basket" to
 * "Your bag" in the visual editor like any other heading, and only the grid
 * underneath it is rendered fresh on each request.
 */
export function shopSection(slot: ShopSlot, heading?: string): string {
  const title = heading
    ? `<h1 data-lumen-id="shop-${slot}-heading">${escapeHtml(heading)}</h1>`
    : '';
  return `<section class="section" data-section="shop" data-lumen-id="shop-${slot}">
  <div class="shell">
    ${title}
    ${shopMarker(slot)}
  </div>
</section>`;
}

const MARKER = /<div\s+data-lumen-shop=["'](shop|cart|checkout|featured|categories)["']\s*>\s*<\/div>/gi;

export function hasShopMarker(html: string): boolean {
  MARKER.lastIndex = 0;
  return MARKER.test(html);
}

/**
 * A page that was built for a shop, served without one.
 *
 * The markers are empty divs waiting to be filled on each request. Left in
 * place with nothing to fill them, they render as sections with padding,
 * headings and nothing underneath — holes in the page, which is what a
 * clothing site looked like when it was built against a database that had no
 * product tables.
 *
 * A site without a working shop should read as a finished site that does not
 * sell online, not as a broken one. So the whole band goes, heading and all.
 */
const SHOP_SECTION =
  /<section[^>]*data-section=["']shop["'][\s\S]*?<div\s+data-lumen-shop=["'](?:shop|cart|checkout|featured|categories)["']\s*><\/div>[\s\S]*?<\/section>/gi;

export function stripShopMarkers(html: string): string {
  return html.replace(SHOP_SECTION, '').replace(MARKER, '');
}

/** What a marker becomes. */
function slotHtml(slot: ShopSlot, view: ShopView, category: string | null): string {
  if (slot === 'featured') return featuredProducts(view.products, { links: view.links });
  if (slot === 'categories') return categoryTiles(view.products, { links: view.links });
  if (slot === 'cart') return cartPage(view.links);
  if (slot === 'checkout') {
    return checkoutPage({
      rates: view.rates,
      codEnabled: view.codEnabled,
      paymentUrl: view.paymentUrl,
      paymentNote: view.paymentNote,
      endpoint: view.endpoint,
      links: view.links,
    });
  }
  return shopGrid(view.products, { category, links: view.links });
}

/** Fills every marker on the page. */
export function fillShopMarkers(html: string, view: ShopView, category: string | null): string {
  return html.replace(MARKER, (_whole, slot: string) =>
    slotHtml(slot as ShopSlot, view, category),
  );
}

/**
 * The head the shop needs: who this basket belongs to, and its two assets.
 *
 * Idempotent, because a page can be decorated more than once on its way out
 * and a second stylesheet is a second set of rules to fight with.
 */
export function withShopHead(html: string, view: ShopView, assets: { css: string; js: string }): string {
  if (!/<\/head>/i.test(html)) return html;
  if (/name=["']lumen-shop["']/i.test(html)) return html;

  const meta = `<meta name="lumen-shop" content="${escapeHtml(view.storageKey)}" data-base="${escapeHtml(view.links.base)}" />`;
  const style = view.inline
    ? `<style>${assets.css}</style>`
    : `<link rel="stylesheet" href="${escapeHtml(view.links.base)}shop.css" />`;

  return html.replace(/<\/head>/i, `${meta}\n${style}\n</head>`);
}

/** And the script, at the end, after the markup it drives. */
export function withShopScript(html: string, view: ShopView, js: string): string {
  if (/data-lumen-shop-script/i.test(html)) return html;

  const tag = view.inline
    ? `<script data-lumen-shop-script>${js}</script>`
    : `<script data-lumen-shop-script src="${escapeHtml(view.links.base)}shop.js" defer></script>`;

  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${tag}\n</body>`) : html + tag;
}

/**
 * A link to the basket in the site's own header, with what is in it.
 *
 * Added rather than generated, so it appears on every page of every site the
 * moment a shop is switched on — including the pages that were written before
 * there was one. Skipped when the nav already has it.
 */
export function withShopNav(html: string, view: ShopView): string {
  if (/data-shop-count/i.test(html)) return html;

  const shop = `<a href="${escapeHtml(view.links.base)}shop.html">Shop</a>`;
  const basket = `<a href="${escapeHtml(view.links.base)}cart.html" data-lumen-basket>Basket<span class="shop-count" data-shop-count hidden>0</span></a>`;

  // The generated nav is a known shape. Anything else is left alone rather
  // than guessed at — a header is the one part of a site nobody forgives you
  // for breaking.
  return html.replace(
    /(<nav class="nav__links"[^>]*>)([\s\S]*?)(<\/nav>)/i,
    (_whole, open: string, inner: string, close: string) => {
      const withShop = /href=["'][^"']*shop\.html["']/i.test(inner) ? inner : inner + shop;
      return `${open}${withShop}${basket}${close}`;
    },
  );
}

/**
 * The shop's categories, in the site's own footer.
 *
 * A footer with the pages in it and nothing else is a footer that tells a
 * customer nothing about what is for sale. The column is inserted rather than
 * generated, so it stays correct as categories come and go — and it is left
 * out entirely when a shop has no categories, because an empty column is worse
 * than none.
 */
export function withShopFooter(html: string, view: ShopView, categories: string[]): string {
  if (categories.length === 0) return html;
  if (/data-lumen-shop-footer/i.test(html)) return html;

  const links = categories
    .slice(0, 8)
    .map(
      (category) =>
        `<p><a href="${escapeHtml(view.links.base)}shop.html?category=${encodeURIComponent(category)}">${escapeHtml(category)}</a></p>`,
    )
    .join('');

  const column = `<div data-lumen-shop-footer><p class="nav__brand">Shop</p>${links}<p><a href="${escapeHtml(view.links.base)}shop.html">Everything</a></p></div>`;

  // The generated footer is a known shape. Anything else is left alone.
  return html.replace(/(<div class="shell footer__grid"[^>]*>)/i, `$1${column}`);
}

/**
 * A shop page built out of the site's own home page.
 *
 * For a site whose files predate the shop: the header, the footer, the
 * stylesheet and the fonts all come from `index.html`, and only what is
 * between `<main>` and `</main>` is replaced. The result is a page that
 * belongs to the site rather than one that merely sits on the same domain.
 */
export function pageFromShell(indexHtml: string, inner: string, title: string): string | null {
  const open = indexHtml.search(/<main\b[^>]*>/i);
  const close = indexHtml.search(/<\/main>/i);
  if (open === -1 || close === -1 || close < open) return null;

  const openTagEnd = indexHtml.indexOf('>', open) + 1;
  const head = indexHtml.slice(0, openTagEnd);
  const tail = indexHtml.slice(close);

  const titled = head.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  // The home page's own hero would otherwise be announced as this page's.
  const described = titled.replace(
    /(<meta\s+property=["']og:title["']\s+content=)["'][^"']*["']/i,
    `$1"${escapeHtml(title)}"`,
  );

  return `${described}\n${inner}\n${tail}`;
}

/**
 * The URL of a product page, decided.
 *
 * `shop/<slug>` and nothing else. Returned as the slug so the caller can look
 * it up; null means this request was not for a product.
 */
export function productSlugFromPath(path: string): string | null {
  const match = /^shop\/([a-z0-9][a-z0-9-]{0,59})(?:\.html)?$/i.exec(path.replace(/^\/+/, ''));
  return match ? match[1].toLowerCase() : null;
}

/** The page for one product, in the site's shell. */
export function renderProductPage(
  indexHtml: string,
  product: Product,
  related: Product[],
  view: ShopView,
): string | null {
  return pageFromShell(indexHtml, productPage(product, related, view.links), product.title);
}
