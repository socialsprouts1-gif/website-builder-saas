import { escapeHtml } from '@/lib/generation/kit/sections';

/**
 * Taking a booking, which for most of these businesses is the whole point.
 *
 * A salon, a clinic and a coaching centre do not need a shopping cart — they
 * need someone to say "Tuesday, 10am, haircut" and for that to reach the owner
 * before the slot is gone. So a booking is an enquiry with a service and a date
 * on it, in the same inbox, rather than a second system with its own calendar
 * to keep in sync.
 *
 * Added where the site is served, like everything else after the build, so
 * turning it on does not regenerate the site and turning it off takes it away.
 */

export interface BookingConfig {
  enabled: boolean;
  services: string[];
  note: string | null;
}

export const NO_BOOKING: BookingConfig = { enabled: false, services: [], note: null };

/** At most a dozen, trimmed, deduplicated, and never empty strings. */
export function cleanServices(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const value = item.trim().slice(0, 80);
    if (value) seen.add(value);
  }
  return [...seen].slice(0, 12);
}

/**
 * The form, as markup the site's own stylesheet already knows how to draw.
 *
 * Deliberately plain: it uses the classes the generated pages use, so it looks
 * like part of the design rather than a widget dropped on top of it.
 */
export function bookingSection(config: BookingConfig): string {
  const options = config.services
    .map((service) => `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`)
    .join('');

  // A date the customer cannot choose in the past, without any script: the
  // browser enforces it, and the server is not relying on it either way.
  const today = new Date().toISOString().slice(0, 10);

  return `<section id="book" class="section section--surface" data-section="booking" data-lumen-id="booking">
  <div class="shell">
    <p class="eyebrow">Booking</p>
    <h2>Book a time</h2>
    ${config.note ? `<p class="lead">${escapeHtml(config.note)}</p>` : ''}
    <form data-lumen-form data-lumen-booking class="form">
      ${options ? `<label>What for?<select name="service" required>${options}</select></label>` : ''}
      <label>Your name<input type="text" name="name" required autocomplete="name" /></label>
      <label>Phone or WhatsApp<input type="tel" name="phone" required autocomplete="tel" /></label>
      <label>Preferred day<input type="date" name="preferred_date" min="${today}" required /></label>
      <label>Preferred time<input type="time" name="preferred_time" required /></label>
      <label>Anything else?<textarea name="message" rows="3"></textarea></label>
      <button class="btn" type="submit">Request this booking</button>
      <p data-lumen-form-status role="status" aria-live="polite"></p>
    </form>
    <p class="muted">A request, not a confirmed slot — we will message you back to confirm.</p>
  </div>
</section>`;
}

/**
 * Puts the booking section on the page, once.
 *
 * On the contact page if there is one, because that is where someone goes to
 * get in touch; otherwise at the end of the home page, which is better than
 * nowhere.
 */
export function withBooking(html: string, config: BookingConfig, isContactPage: boolean): string {
  if (!config.enabled) return html;
  if (html.includes('data-lumen-booking')) return html;
  if (!isContactPage && !html.includes('data-section="hero"')) return html;

  const section = bookingSection(config);
  if (/<\/main>/i.test(html)) return html.replace(/<\/main>/i, `${section}\n</main>`);
  return html.includes('</body>') ? html.replace(/<\/body>/i, `${section}\n</body>`) : html + section;
}
