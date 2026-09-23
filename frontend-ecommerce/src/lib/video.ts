// Cloudinary video URLs are served verbatim from the DB (the raw
// secure_url from upload) — this inserts q_auto/f_auto delivery
// transforms at render time instead, so every existing video benefits
// immediately without re-uploading anything. Mirrors how next/image
// already optimizes images automatically; video has no such built-in
// optimizer, so this is the manual equivalent.
export function getOptimizedVideoUrl(url?: string | null): string | null {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com')) return url;

  const uploadMarker = '/upload/';
  const markerIndex = url.indexOf(uploadMarker);
  if (markerIndex === -1) return url;

  const insertAt = markerIndex + uploadMarker.length;
  const rest = url.slice(insertAt);
  // Already has a transformation string (e.g. re-rendered, or the URL was
  // pre-transformed some other way) — don't stack a second one.
  if (/^(q_auto|f_auto)/.test(rest)) return url;

  return `${url.slice(0, insertAt)}q_auto,f_auto/${rest}`;
}
