/**
 * Whether a URL is one Lumen itself issued.
 *
 * Used before an owner-supplied picture is written into an <img> that renders
 * on their customers' browsers. Anything else — a data: URL, a link to a
 * tracker, a javascript: scheme — is refused rather than sanitised, because
 * the set of things that belong here is small and knowable: an asset in the
 * project's own storage bucket.
 */
export function isOwnAsset(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  // Supabase storage, which is where uploadAsset puts everything. The host is
  // whatever this deployment's project is, so it is matched by shape rather
  // than by a literal nobody would remember to update.
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabase) {
    try {
      if (url.host === new URL(supabase).host) return true;
    } catch {
      /* a malformed env var is not a reason to accept the URL */
    }
  }
  return /\.supabase\.(co|in)$/i.test(url.host);
}
