/**
 * The shop's own stylesheet.
 *
 * Written entirely in the site's tokens, with the older token names as
 * fallbacks, so a shop added to a site generated months ago looks like that
 * site rather than like a default browser stylesheet. Served as its own file
 * on a published site — the content security policy there allows scripts and
 * styles from the site's own origin and nothing else — and inlined in the
 * preview, where the frame has no origin of its own to load a file from.
 */
export const SHOP_CSS = `/* Lumen shop */
.shop-chips { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0 0 2rem; }
.shop-chip {
  display: inline-block; padding: .45rem 1rem; border-radius: 999px; text-decoration: none;
  border: 1px solid var(--border, rgba(0,0,0,.12)); color: var(--ink-muted, #6a6a60);
  font-size: .9rem; line-height: 1.3; transition: border-color .15s, color .15s;
}
.shop-chip:hover { color: var(--ink, #15150f); border-color: var(--accent, #15150f); }
.shop-chip--on { background: var(--accent, #15150f); border-color: var(--accent, #15150f); color: var(--accent-ink, #fff); }

.shop-grid {
  display: grid; gap: var(--gap, 1.5rem);
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
}
@media (max-width: 480px) { .shop-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; } }

.shop-card { display: flex; flex-direction: column; background: var(--surface, #fff); border: 1px solid var(--border, rgba(0,0,0,.12)); border-radius: var(--radius, 14px); overflow: hidden; }
.shop-card__image { position: relative; display: block; aspect-ratio: 1 / 1; background: var(--surface-alt, #f4f3ee); }
.shop-card__image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.shop-card__flag {
  position: absolute; inset: auto .6rem .6rem auto; padding: .2rem .6rem; border-radius: 999px;
  background: var(--ink, #15150f); color: var(--surface, #fff); font-size: .72rem; letter-spacing: .04em; text-transform: uppercase;
}
.shop-card__body { display: flex; flex-direction: column; gap: .45rem; padding: .9rem 1rem 1.1rem; flex: 1; }
.shop-card__title { margin: 0; font-size: 1rem; line-height: 1.35; }
.shop-card__title a { color: inherit; text-decoration: none; }
.shop-card__title a:hover { text-decoration: underline; }
.shop-card__note { margin: 0; font-size: .85rem; color: var(--ink-muted, #6a6a60); }
.shop-card .btn { margin-top: auto; width: 100%; text-align: center; }

.shop-price { display: flex; align-items: baseline; flex-wrap: wrap; gap: .5rem; margin: 0; }
.shop-price__now { font-weight: 600; }
.shop-price__was { color: var(--ink-muted, #6a6a60); font-size: .9em; }
.shop-price__off { font-size: .75rem; letter-spacing: .04em; text-transform: uppercase; color: var(--accent, #15150f); }

.shop-empty { padding: 3rem 0; text-align: center; color: var(--ink-muted, #6a6a60); }

.shop-crumbs { font-size: .85rem; color: var(--ink-muted, #6a6a60); margin: 0 0 1.5rem; }
.shop-crumbs a { color: inherit; }
.shop-detail__grid { display: grid; gap: 2.5rem; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
@media (max-width: 820px) { .shop-detail__grid { grid-template-columns: minmax(0, 1fr); gap: 1.75rem; } }
.shop-detail__image { border-radius: var(--radius-lg, 20px); overflow: hidden; background: var(--surface-alt, #f4f3ee); aspect-ratio: 1 / 1; }
.shop-detail__image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.shop-thumbs { display: flex; gap: .5rem; margin-top: .75rem; flex-wrap: wrap; }
.shop-thumb { width: 70px; height: 70px; padding: 0; border-radius: var(--radius, 12px); overflow: hidden; border: 1px solid var(--border, rgba(0,0,0,.12)); background: none; cursor: pointer; }
.shop-thumb--on { border-color: var(--accent, #15150f); }
.shop-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.shop-detail__buy h1 { margin: 0 0 .75rem; }
.shop-detail__copy { color: var(--ink-muted, #6a6a60); margin: 1.25rem 0; }
.shop-low { color: var(--accent, #15150f); font-size: .9rem; margin: .5rem 0 0; }
.shop-buy { display: flex; align-items: center; gap: .75rem; margin: 1.5rem 0 1rem; flex-wrap: wrap; }
.shop-qty { display: inline-flex; align-items: center; gap: .5rem; font-size: .9rem; color: var(--ink-muted, #6a6a60); }
.shop-qty input, .shop-line__qty input {
  width: 4.5rem; padding: .55rem .6rem; border-radius: var(--radius, 10px);
  border: 1px solid var(--border, rgba(0,0,0,.12)); background: var(--surface, #fff); color: var(--ink, #15150f); font: inherit;
}
.shop-detail__back { font-size: .9rem; }
.shop-more { margin-top: 4rem; }

.shop-cart__full, .shop-checkout__form { display: grid; gap: 2.5rem; grid-template-columns: minmax(0, 1fr) 320px; align-items: start; }
@media (max-width: 900px) { .shop-cart__full, .shop-checkout__form { grid-template-columns: minmax(0, 1fr); gap: 1.75rem; } }

.shop-line { display: grid; grid-template-columns: 80px minmax(0, 1fr) auto; gap: 1rem; align-items: center; padding: 1rem 0; border-bottom: 1px solid var(--border, rgba(0,0,0,.12)); }
.shop-line__image { width: 80px; height: 80px; border-radius: var(--radius, 12px); overflow: hidden; background: var(--surface-alt, #f4f3ee); }
.shop-line__image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.shop-line__title { margin: 0 0 .25rem; font-size: 1rem; }
.shop-line__title a { color: inherit; text-decoration: none; }
.shop-line__qty { display: flex; align-items: center; gap: .6rem; font-size: .85rem; color: var(--ink-muted, #6a6a60); }
.shop-line__drop { background: none; border: 0; padding: 0; color: var(--ink-muted, #6a6a60); font: inherit; font-size: .85rem; cursor: pointer; text-decoration: underline; }
.shop-line__money { text-align: right; font-weight: 600; white-space: nowrap; }

.shop-summary { background: var(--surface, #fff); border: 1px solid var(--border, rgba(0,0,0,.12)); border-radius: var(--radius-lg, 18px); padding: 1.5rem; position: sticky; top: 1.5rem; }
.shop-summary h2 { margin: 0 0 1rem; font-size: 1.1rem; }
.shop-summary__row { display: flex; justify-content: space-between; gap: 1rem; margin: .5rem 0; }
.shop-summary__row--total { border-top: 1px solid var(--border, rgba(0,0,0,.12)); margin-top: 1rem; padding-top: 1rem; font-weight: 600; font-size: 1.1rem; }
.shop-summary__note { font-size: .85rem; color: var(--ink-muted, #6a6a60); margin: 1rem 0; }
.shop-summary__go { display: block; width: 100%; text-align: center; margin-top: 1rem; }
.shop-summary__line { display: flex; justify-content: space-between; gap: 1rem; font-size: .88rem; color: var(--ink-muted, #6a6a60); margin: .35rem 0; }

.shop-field { display: block; margin: 0 0 1rem; }
.shop-field > span { display: block; font-size: .85rem; color: var(--ink-muted, #6a6a60); margin-bottom: .35rem; }
.shop-field em { font-style: normal; opacity: .7; }
.shop-field input, .shop-field textarea {
  width: 100%; padding: .7rem .85rem; border-radius: var(--radius, 10px); font: inherit;
  border: 1px solid var(--border, rgba(0,0,0,.12)); background: var(--surface, #fff); color: var(--ink, #15150f);
}
.shop-field input:focus, .shop-field textarea:focus { outline: 2px solid var(--accent, #15150f); outline-offset: 1px; }
.shop-field__pair { display: grid; gap: 1rem; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.shop-ship { border: 1px solid var(--border, rgba(0,0,0,.12)); border-radius: var(--radius, 12px); padding: 1rem 1.25rem; margin: 1.5rem 0 0; }
.shop-ship legend { padding: 0 .4rem; font-size: .85rem; color: var(--ink-muted, #6a6a60); }
.shop-ship__row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: .75rem; align-items: center; padding: .6rem 0; cursor: pointer; }
.shop-ship__label { display: flex; flex-direction: column; }
.shop-ship__note { font-size: .82rem; color: var(--ink-muted, #6a6a60); }
.shop-ship__price { font-size: .85rem; color: var(--ink-muted, #6a6a60); white-space: nowrap; }
.shop-status { font-size: .88rem; margin: .75rem 0 0; min-height: 1.2em; }
.shop-done { max-width: 34rem; margin: 0 auto; text-align: center; padding: 2rem 0; }

/* The basket count beside the shop link in the header. */
.shop-count {
  display: inline-block; min-width: 1.35em; margin-left: .35em; padding: 0 .4em;
  border-radius: 999px; background: var(--accent, #15150f); color: var(--accent-ink, #fff);
  font-size: .72em; line-height: 1.5; text-align: center; vertical-align: .1em;
}
.shop-count[hidden] { display: none; }
`;
