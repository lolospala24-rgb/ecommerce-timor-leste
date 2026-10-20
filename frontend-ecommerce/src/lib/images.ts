/** Normalize Cloudinary and other remote image URLs for next/image. */
export function normalizeImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://res.cloudinary.com/')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

// For native <img>/<video poster> usage that bypasses next/image's own
// optimizer entirely (e.g. a <video poster> attribute isn't a next/image
// component — the browser fetches it at full, un-transcoded resolution).
// Mirrors lib/video.ts's getOptimizedVideoUrl for images: f_auto picks the
// best format per-browser (WebP/AVIF), q_auto picks a sensible quality.
export function getOptimizedImageUrl(url?: string | null): string | null {
  const normalized = normalizeImageUrl(url);
  if (!normalized || !normalized.includes('res.cloudinary.com')) return normalized;

  const uploadMarker = '/upload/';
  const markerIndex = normalized.indexOf(uploadMarker);
  if (markerIndex === -1) return normalized;

  const insertAt = markerIndex + uploadMarker.length;
  const rest = normalized.slice(insertAt);
  if (/^(q_auto|f_auto)/.test(rest)) return normalized;

  return `${normalized.slice(0, insertAt)}q_auto,f_auto/${rest}`;
}
