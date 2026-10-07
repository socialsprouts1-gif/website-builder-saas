/**
 * The two functions that decide what a generated page is allowed to contain.
 *
 * They live in their own module because every renderer needs them and the 3D
 * module needs them too — importing them from the section catalogue, which
 * imports the 3D module, would make a cycle out of the one pair of functions
 * that must never be skipped.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Only links we are willing to put in someone's website. A javascript: or
 * data: URL in a generated page is a stored cross-site scripting hole, and the
 * content it came from was written by a language model from a stranger's prompt.
 */
export function safeHref(value: string | undefined): string {
  const text = (value ?? '').trim();
  if (!text) return '#';
  if (/^(https?:\/\/|mailto:|tel:|#|\/|\.\/)/i.test(text)) return escapeHtml(text);
  // A bare page name like "about.html" is fine; anything with a scheme is not.
  if (/^[\w.-]+\.html(#[\w-]+)?$/i.test(text)) return escapeHtml(text);
  return '#';
}
