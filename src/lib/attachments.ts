/**
 * What can be attached to a message, and how big it is allowed to be.
 *
 * Shared by the browser and the route that signs the upload, so the file picker
 * offers exactly what the server will accept — a file rejected after it has
 * finished uploading is the worst version of this.
 */

export type AttachmentKind = "image" | "video" | "reference";

export const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
] as const;

export const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  // What an iPhone produces.
  "video/quicktime",
] as const;

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** The `accept` attribute for a file input of this kind. */
export const acceptFor = (kind: "image" | "video"): string =>
  (kind === "image" ? IMAGE_TYPES : VIDEO_TYPES).join(",");

export function kindForType(contentType: string): "image" | "video" | null {
  if ((IMAGE_TYPES as readonly string[]).includes(contentType)) return "image";
  if ((VIDEO_TYPES as readonly string[]).includes(contentType)) return "video";
  return null;
}

/** Why a file cannot be attached, in words the person can act on. */
export function rejectReason(file: {
  type: string;
  size: number;
  name: string;
}): string | null {
  const kind = kindForType(file.type);
  if (!kind) return `${file.name} is not an image or a video Lumen can use.`;
  if (file.size === 0) return `${file.name} is empty.`;

  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > limit) {
    return `${file.name} is too big — ${kind === "image" ? "images" : "videos"} must be under ${Math.round(
      limit / (1024 * 1024),
    )}MB.`;
  }
  return null;
}

/**
 * A reference site, as a URL Lumen will actually try to look at.
 *
 * Only http(s), and never an address inside a private network: this string is
 * handed to the model and may be fetched server-side later, so it must not
 * become a way to point Lumen at something on the inside.
 */
export function normaliseReference(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".local")) return null;
  if (host === "localhost" || host.endsWith(".localhost")) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31)
    ) {
      return null;
    }
    if (a === 169 && b === 254) return null;
  }
  if (host.includes(":")) return null;

  return url.toString();
}

/** The short label shown on the chip. */
export function referenceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
