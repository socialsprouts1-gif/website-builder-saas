import 'server-only';
import {
  fillShopMarkers,
  hasShopMarker,
  pageFromShell,
  productSlugFromPath,
  renderProductPage,
  SHOP_PAGES,
  shopMarker,
  withShopHead,
  withShopFooter,
  withShopNav,
  withShopScript,
  type ShopSlot,
  type ShopView,
  stripShopMarkers,
} from './inject';
import { SHOP_CSS } from './styles';
import { SHOP_SCRIPT } from './script';
import { categoriesOf, sellableProducts } from './catalogue';
import type { ShopData } from './load';

/**
 * Answering a request for part of a shop.
 *
 * One place decides all of it, so the preview and the published site cannot
 * drift apart: the same grid, the same basket, the same checkout, differing
 * only in where the links point and whether the two assets are files or
 * inline. Everything it returns is already final — the caller sets headers
 * and sends it.
 */

export interface ShopRequest {
  shop: ShopData;
  /** `/s/<slug>/` or `/preview/<id>/`, always with the trailing slash. */
  base: string;
  /** Where an order is posted. */
  endpoint: string;
  /** Keeps one site's basket out of another's in the same browser. */
  storageKey: string;
  /** The preview cannot load its own files; a published site cannot inline. */
  inline: boolean;
  /** This shop has a gateway connected, so the checkout can say so. */
  takesPayments?: boolean;
}

export function viewOf(request: ShopRequest): ShopView {
  return {
    products: request.shop.products,
    rates: request.shop.rates,
    codEnabled: request.shop.codEnabled,
    paymentUrl: request.shop.paymentUrl,
    paymentNote: request.shop.paymentNote,
    endpoint: request.endpoint,
    links: { base: request.base },
    storageKey: request.storageKey,
    inline: request.inline,
    takesPayments: Boolean(request.takesPayments),
  };
}

/** The two files a published shop loads for itself. */
export const SHOP_ASSETS: Record<string, { body: string; type: string }> = {
  'shop.css': { body: SHOP_CSS, type: 'text/css; charset=utf-8' },
  'shop.js': { body: SHOP_SCRIPT, type: 'text/javascript; charset=utf-8' },
};

/**
 * Everything a shop page needs, added to a page that is otherwise finished.
 *
 * Applied to every page of the site, not only the shop's own: the basket
 * count belongs in the header wherever you are, and an Add button can sit on
 * a home page.
 */
export function decorateWithShop(
  html: string,
  request: ShopRequest | null,
  category: string | null,
): string {
  // No shop to serve. The markers are left behind as empty sections with
  // headings and nothing under them, so they come out rather than being shown
  // as holes — see stripShopMarkers.
  if (!request || !request.shop.enabled) return stripShopMarkers(html);

  const view = viewOf(request);
  const filled = fillShopMarkers(html, view, category);
  const navved = withShopFooter(
    withShopNav(filled, view),
    view,
    categoriesOf(request.shop.products),
  );

  // The assets are only worth loading on a page that actually uses them —
  // which, because of the basket count in the header, is every page.
  return withShopScript(
    withShopHead(navved, view, { css: SHOP_CSS, js: SHOP_SCRIPT }),
    view,
    SHOP_SCRIPT,
  );
}

/**
 * A shop page for a site whose files do not have one.
 *
 * Switching a shop on should not require rebuilding a site that is already
 * live, so the three shop pages can be assembled out of the home page's own
 * shell. A site built with the shop pages in it never reaches this — it has
 * real files with markers in them, which is the better path because the owner
 * can edit everything around the marker.
 */
export function improvisedPage(
  slot: PageSlot,
  indexHtml: string,
  request: ShopRequest,
  category: string | null,
): string | null {
  const page = pageFromShell(indexHtml, shopMarker(slot), SHOP_PAGES[slot].title);
  if (!page) return null;
  return decorateWithShop(page, request, category);
}

/** The page for one product, or null when nothing of that name is for sale. */
export function productResponse(
  slug: string,
  indexHtml: string,
  request: ShopRequest,
): string | null {
  const view = viewOf(request);
  const onSale = sellableProducts(request.shop.products);
  const product = onSale.find((candidate) => candidate.slug.toLowerCase() === slug.toLowerCase());
  if (!product) return null;

  // Things from the same category first — the useful kind of "related", not
  // four things picked at random from the whole shop.
  const related = [
    ...onSale.filter(
      (candidate) =>
        candidate.id !== product.id &&
        (candidate.category ?? '').toLowerCase() === (product.category ?? '').toLowerCase(),
    ),
    ...onSale.filter(
      (candidate) =>
        candidate.id !== product.id &&
        (candidate.category ?? '').toLowerCase() !== (product.category ?? '').toLowerCase(),
    ),
  ];

  const page = renderProductPage(indexHtml, product, related, view);
  return page ? decorateWithShop(page, request, null) : null;
}

/**
 * The slots that are whole pages.
 *
 * Featured products and category tiles are bands on somebody else's page, so
 * they can never be the answer to a request for a page.
 */
export type PageSlot = 'shop' | 'cart' | 'checkout';

/** Which shop page a path is asking for, if any. */
export function shopSlotFor(path: string): PageSlot | null {
  const wanted = path.replace(/^\/+/, '').toLowerCase();
  for (const [slot, page] of Object.entries(SHOP_PAGES)) {
    if (wanted === page.path) return slot as PageSlot;
  }
  return null;
}

export { productSlugFromPath, hasShopMarker };
