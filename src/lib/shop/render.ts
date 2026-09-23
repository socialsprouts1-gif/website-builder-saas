import {
  categoriesOf,
  discountPercent,
  inCategory,
  inStock,
  isReduced,
  maxQuantity,
  offeredRates,
  sellableProducts,
  type Product,
  type ShippingRate,
} from './catalogue';
import { formatRupees } from './money';

/**
 * The shop, as HTML.
 *
 * Rendered here rather than written by the model, for the same reason sections
 * are: a product card is a thing with a price, a stock state and a button, and
 * every one of them in every shop should behave identically. It also means the
 * grid can be re-rendered from the database on every request — which is what
 * makes a price change take effect immediately instead of when somebody
 * remembers to rebuild the site.
 *
 * Markup reuses the site's own classes (`shell`, `section`, `btn`, `card`), so
 * a shop inherits whatever look the site was built with, plus a small
 * stylesheet of its own for the parts a brochure site has no equivalent of.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

/**
 * A picture we are willing to put on someone's shop.
 *
 * Product images are URLs an owner typed or uploaded, and they end up in a src
 * on a page served from Lumen's own domain. http(s) and root-relative only —
 * a `javascript:` or `data:` src here would be a stored cross-site scripting
 * hole with a price tag on it.
 */
export function safeImage(value: string | undefined | null): string | null {
  const text = (value ?? '').trim();
  if (!text || text.length > 2000) return null;
  return /^(https?:\/\/|\/)/i.test(text) ? escapeHtml(text) : null;
}

/** Where the shop's own links point, given where the site is being served. */
export interface ShopLinks {
  /** `/s/<slug>/` or `/preview/<id>/`. Always ends in a slash. */
  base: string;
}

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23e8e6df'/%3E%3Cpath d='M280 520l90-120 78 92 58-66 114 154H280z' fill='%23c9c6bb'/%3E%3Ccircle cx='320' cy='330' r='42' fill='%23c9c6bb'/%3E%3C/svg%3E";

function image(product: Product, index = 0): string {
  return safeImage(product.images[index]) ?? PLACEHOLDER_IMAGE;
}

function priceBlock(product: Product): string {
  const now = `<span class="shop-price__now">${escapeHtml(formatRupees(product.pricePaise))}</span>`;
  if (!isReduced(product)) return `<p class="shop-price">${now}</p>`;

  const was = `<s class="shop-price__was">${escapeHtml(formatRupees(product.compareAtPaise!))}</s>`;
  const off = discountPercent(product);
  const badge = off ? `<span class="shop-price__off">${off}% off</span>` : '';
  return `<p class="shop-price">${now} ${was} ${badge}</p>`;
}

/**
 * The button, and what it carries.
 *
 * Everything the cart needs to draw a line without asking the server again —
 * and nothing the server will believe later. The price in this attribute is
 * for display in the basket; the order is priced from the database.
 */
function addButton(product: Product, label = 'Add to basket'): string {
  // `image()` has already escaped what it returns. Escaping it a second time
  // here turned every `&` in a storage URL into `&amp;amp;`, which the basket
  // then requested literally and drew as a broken picture.
  if (!inStock(product)) {
    return `<button class="btn btn--ghost" type="button" disabled>Sold out</button>`;
  }
  return `<button
    class="btn shop-add"
    type="button"
    data-shop-add="${escapeHtml(product.id)}"
    data-shop-title="${escapeHtml(product.title)}"
    data-shop-price="${product.pricePaise}"
    data-shop-image="${image(product)}"
    data-shop-slug="${escapeHtml(product.slug)}"
    data-shop-max="${maxQuantity(product)}"
  >${escapeHtml(label)}</button>`;
}

export function productCard(product: Product, links: ShopLinks): string {
  const href = `${links.base}shop/${encodeURIComponent(product.slug)}`;
  const soldOut = !inStock(product) ? `<span class="shop-card__flag">Sold out</span>` : '';

  return `<article class="shop-card" data-lumen-id="product-${escapeHtml(product.slug)}">
  <a class="shop-card__image" href="${href}">
    <img src="${image(product)}" alt="${escapeHtml(product.title)}" loading="lazy" />
    ${soldOut}
  </a>
  <div class="shop-card__body">
    <h3 class="shop-card__title"><a href="${href}">${escapeHtml(product.title)}</a></h3>
    ${product.summary ? `<p class="shop-card__note">${escapeHtml(product.summary)}</p>` : ''}
    ${priceBlock(product)}
    ${addButton(product, 'Add')}
  </div>
</article>`;
}

/**
 * The products a shop leads with, on its own home page.
 *
 * An e-commerce home page that shows no products and offers a link to a Shop
 * page is a brochure with a shop bolted to the side. Every real one — every
 * one worth copying — puts stock on the first screen, because the whole job of
 * that page is to get somebody looking at something they might buy.
 *
 * Rendered from the live catalogue like everything else, so a price change or
 * a new arrival shows on the home page immediately.
 */
export function featuredProducts(
  products: Product[],
  options: { links: ShopLinks; limit?: number; heading?: string },
): string {
  const shown = sellableProducts(products).slice(0, options.limit ?? 8);
  if (shown.length === 0) return '';

  const cards = shown.map((product) => productCard(product, options.links)).join('\n');

  return `<div class="shop-featured">
  <div class="shop-featured__head">
    <h2 data-lumen-id="featured-heading">${escapeHtml(options.heading ?? 'Shop the collection')}</h2>
    <a class="shop-featured__all" href="${options.links.base}shop.html">See everything →</a>
  </div>
  <div class="shop-grid">${cards}</div>
</div>`;
}

/**
 * The departments, as something to press.
 *
 * A picture and a name each, taken from the first product in that category, so
 * the tiles are of real stock rather than of an icon somebody drew. This is how
 * a customer who does not yet know what they want gets into the shop.
 */
export function categoryTiles(
  products: Product[],
  options: { links: ShopLinks; heading?: string },
): string {
  const all = sellableProducts(products);
  const names = categoriesOf(all);
  if (names.length < 2) return '';

  const tiles = names
    .slice(0, 8)
    .map((category) => {
      const inIt = all.filter((product) => inCategory(product, category));
      const cover = inIt.map((product) => safeImage(product.images[0])).find(Boolean);
      const href = `${options.links.base}shop.html?category=${encodeURIComponent(category)}`;

      return `<a class="shop-cat" href="${href}" data-lumen-id="category-${escapeHtml(category.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}">
      <span class="shop-cat__image">${cover ? `<img src="${cover}" alt="" loading="lazy" />` : ''}</span>
      <span class="shop-cat__body">
        <span class="shop-cat__name">${escapeHtml(category)}</span>
        <span class="shop-cat__count">${inIt.length} item${inIt.length === 1 ? '' : 's'}</span>
      </span>
    </a>`;
    })
    .join('');

  return `<div class="shop-cats">
  <div class="shop-featured__head">
    <h2 data-lumen-id="categories-heading">${escapeHtml(options.heading ?? 'Shop by department')}</h2>
    <a class="shop-featured__all" href="${options.links.base}shop.html">All departments →</a>
  </div>
  <div class="shop-cats__grid">${tiles}</div>
</div>`;
}

/** The row of categories above the grid. Absent when a shop has only one. */
export function categoryBar(products: Product[], active: string | null, links: ShopLinks): string {
  const categories = categoriesOf(products);
  if (categories.length < 2) return '';

  const chip = (label: string, href: string, on: boolean) =>
    `<a class="shop-chip${on ? ' shop-chip--on' : ''}" href="${href}"${on ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`;

  const all = chip('Everything', `${links.base}shop.html`, !active);
  const rest = categories
    .map((category) =>
      chip(
        category,
        `${links.base}shop.html?category=${encodeURIComponent(category)}`,
        Boolean(active) && category.toLowerCase() === active!.toLowerCase(),
      ),
    )
    .join('');

  return `<nav class="shop-chips" aria-label="Product categories">${all}${rest}</nav>`;
}

/** The shop itself: categories, then everything in them. */
export function shopGrid(
  products: Product[],
  options: { category?: string | null; links: ShopLinks },
): string {
  const all = sellableProducts(products);
  const active = options.category?.trim() || null;
  const shown = active ? all.filter((product) => inCategory(product, active)) : all;

  if (all.length === 0) {
    return `<div class="shop-empty">
  <p>This shop has no products in it yet.</p>
</div>`;
  }

  const bar = categoryBar(all, active, options.links);

  if (shown.length === 0) {
    return `${bar}<div class="shop-empty"><p>Nothing in ${escapeHtml(active ?? 'this category')} just now.</p>
<p><a class="btn btn--ghost" href="${options.links.base}shop.html">See everything</a></p></div>`;
  }

  const cards = shown.map((product) => productCard(product, options.links)).join('\n');
  return `${bar}<div class="shop-grid">${cards}</div>`;
}

/** One product, in full. */
export function productPage(
  product: Product,
  related: Product[],
  links: ShopLinks,
): string {
  const gallery = product.images
    .slice(0, 6)
    .map((raw, index) => {
      const src = safeImage(raw);
      if (!src) return '';
      return `<button class="shop-thumb${index === 0 ? ' shop-thumb--on' : ''}" type="button" data-shop-thumb="${escapeHtml(src)}">
  <img src="${src}" alt="" loading="lazy" /></button>`;
    })
    .join('');

  const others = sellableProducts(related)
    .filter((candidate) => candidate.id !== product.id)
    .slice(0, 4);

  return `<section class="section shop-detail">
  <div class="shell">
    <p class="shop-crumbs">
      <a href="${links.base}shop.html">Shop</a>
      ${product.category ? ` / <a href="${links.base}shop.html?category=${encodeURIComponent(product.category)}">${escapeHtml(product.category)}</a>` : ''}
    </p>

    <div class="shop-detail__grid">
      <div>
        <div class="shop-detail__image">
          <img src="${image(product)}" alt="${escapeHtml(product.title)}" data-shop-main />
        </div>
        ${gallery ? `<div class="shop-thumbs">${gallery}</div>` : ''}
      </div>

      <div class="shop-detail__buy">
        <h1 data-lumen-id="product-title">${escapeHtml(product.title)}</h1>
        ${priceBlock(product)}
        ${product.stock !== null && product.stock > 0 && product.stock <= 5 ? `<p class="shop-low">Only ${product.stock} left</p>` : ''}
        ${product.description ? `<div class="shop-detail__copy"><p>${escapeHtml(product.description).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br />')}</p></div>` : ''}
        <div class="shop-buy">
          ${inStock(product) ? `<label class="shop-qty"><span>Qty</span><input type="number" min="1" max="${maxQuantity(product)}" value="1" data-shop-qty /></label>` : ''}
          ${addButton(product)}
        </div>
        <p class="shop-detail__back"><a href="${links.base}shop.html">← Keep shopping</a></p>
      </div>
    </div>

    ${
      others.length > 0
        ? `<div class="shop-more">
      <h2>You might also like</h2>
      <div class="shop-grid">${others.map((item) => productCard(item, links)).join('\n')}</div>
    </div>`
        : ''
    }
  </div>
</section>`;
}

/**
 * The basket.
 *
 * Drawn by the browser from what is in the browser, because that is where a
 * basket lives when the shopper has no account. The server never sees it until
 * checkout, and then it prices it again from scratch.
 */
export function cartPage(links: ShopLinks): string {
  return `<div class="shop-cart" data-shop-cart>
  <div class="shop-cart__empty" data-shop-cart-empty hidden>
    <p>Your basket is empty.</p>
    <p><a class="btn" href="${links.base}shop.html">Start shopping</a></p>
  </div>

  <div class="shop-cart__full" data-shop-cart-full hidden>
    <div class="shop-cart__lines" data-shop-cart-lines></div>

    <aside class="shop-summary">
      <h2>Summary</h2>
      <p class="shop-summary__row"><span>Items</span><span data-shop-subtotal>—</span></p>
      <p class="shop-summary__note">Delivery is added at checkout.</p>
      <a class="btn shop-summary__go" href="${links.base}checkout.html">Checkout</a>
      <p class="shop-detail__back"><a href="${links.base}shop.html">← Keep shopping</a></p>
    </aside>
  </div>
</div>`;
}

/** Checkout: what it costs, where it is going, and how it is being paid for. */
export function checkoutPage(options: {
  rates: ShippingRate[];
  codEnabled: boolean;
  paymentUrl: string | null;
  paymentNote: string | null;
  endpoint: string;
  links: ShopLinks;
}): string {
  const rates = offeredRates(options.rates);

  const shipping =
    rates.length > 0
      ? `<fieldset class="shop-ship">
  <legend>Delivery</legend>
  ${rates
    .map(
      (rate, index) => `<label class="shop-ship__row">
    <input type="radio" name="shipping" value="${escapeHtml(rate.id)}"${index === 0 ? ' checked' : ''} data-shop-ship data-shop-ship-price="${rate.pricePaise}" data-shop-ship-free="${rate.freeOverPaise ?? ''}" />
    <span class="shop-ship__label">
      <strong>${escapeHtml(rate.label)}</strong>
      ${rate.note ? `<span class="shop-ship__note">${escapeHtml(rate.note)}</span>` : ''}
    </span>
    <span class="shop-ship__price">${rate.freeOverPaise !== null ? `${escapeHtml(formatRupees(rate.pricePaise))} · free over ${escapeHtml(formatRupees(rate.freeOverPaise))}` : escapeHtml(formatRupees(rate.pricePaise))}</span>
  </label>`,
    )
    .join('')}
</fieldset>`
      : '<p class="shop-summary__note">Delivery will be arranged with you after the order.</p>';

  // What the customer is told about paying. Never a promise the shop cannot
  // keep: with no payment link configured, this is an order, not a payment.
  const payment = options.paymentUrl
    ? `<p class="shop-summary__note">${escapeHtml(options.paymentNote ?? 'You will be taken to a secure payment page after placing the order.')}</p>`
    : options.codEnabled
      ? `<p class="shop-summary__note">Pay on delivery. We will call you to confirm before we send it.</p>`
      : `<p class="shop-summary__note">We will contact you to arrange payment.</p>`;

  return `<div class="shop-checkout" data-shop-checkout data-shop-endpoint="${escapeHtml(options.endpoint)}">
  <div class="shop-cart__empty" data-shop-cart-empty hidden>
    <p>There is nothing to check out.</p>
    <p><a class="btn" href="${options.links.base}shop.html">Back to the shop</a></p>
  </div>

  <form class="shop-checkout__form" data-shop-order hidden novalidate>
    <div class="shop-checkout__fields">
      <h2>Where is it going?</h2>
      <label class="shop-field"><span>Your name</span><input name="name" required autocomplete="name" /></label>
      <label class="shop-field"><span>Phone</span><input name="phone" required inputmode="tel" autocomplete="tel" /></label>
      <label class="shop-field"><span>Email <em>(optional)</em></span><input name="email" type="email" autocomplete="email" /></label>
      <label class="shop-field"><span>Address</span><textarea name="address" rows="3" required autocomplete="street-address"></textarea></label>
      <div class="shop-field__pair">
        <label class="shop-field"><span>Town or city</span><input name="city" required autocomplete="address-level2" /></label>
        <label class="shop-field"><span>PIN code</span><input name="postcode" required inputmode="numeric" autocomplete="postal-code" /></label>
      </div>
      <label class="shop-field"><span>Anything we should know? <em>(optional)</em></span><textarea name="note" rows="2"></textarea></label>
      ${shipping}
    </div>

    <aside class="shop-summary">
      <h2>Your order</h2>
      <div data-shop-checkout-lines></div>
      <p class="shop-summary__row"><span>Items</span><span data-shop-subtotal>—</span></p>
      <p class="shop-summary__row"><span>Delivery</span><span data-shop-shipping>—</span></p>
      <p class="shop-summary__row shop-summary__row--total"><span>Total</span><span data-shop-total>—</span></p>
      ${payment}
      <button class="btn shop-summary__go" type="submit">Place order</button>
      <p class="shop-status" data-shop-status role="status"></p>
      <p class="shop-detail__back"><a href="${options.links.base}cart.html">← Back to basket</a></p>
    </aside>
  </form>

  <div class="shop-done" data-shop-done hidden>
    <h2>Thank you — your order is placed</h2>
    <p>Your order number is <strong data-shop-reference></strong>. Please keep it to hand.</p>
    <p data-shop-done-note></p>
    <p><a class="btn" data-shop-pay hidden>Pay now</a></p>
    <!-- Sent by the customer, not by us: no API, no business account, and the
         owner ends up in a real conversation with the person who ordered. The
         order is already recorded, so this is a confirmation rather than the
         thing that delivers it. -->
    <p><a class="btn btn--ghost" data-shop-whatsapp target="_blank" rel="noopener" hidden>Send this order on WhatsApp</a></p>
    <p><a class="btn btn--ghost" href="${options.links.base}shop.html">Back to the shop</a></p>
  </div>
</div>`;
}
