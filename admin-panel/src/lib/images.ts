/** Normalize Cloudinary and other remote image URLs for next/image. */
export function normalizeImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://res.cloudinary.com/')) {
    return url.replace('http://', 'https://');
  }
  return url;
}
