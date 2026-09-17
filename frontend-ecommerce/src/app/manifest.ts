import type { MetadataRoute } from 'next';

const DEFAULT_NAME = 'Lolospala';
const DEFAULT_DESCRIPTION = 'Platform kompras online ba Timor-Leste';
const THEME_COLOR = '#ffffff';

// Same server-side settings fetch as layout.tsx's generateMetadata — kept
// as its own small copy (not imported from there) since manifest.ts is a
// separate Next.js route convention file and can't import route-level
// exports from layout.tsx.
async function getPublicSettings(): Promise<{ siteName?: string; siteDescription?: string; logoUrl?: string | null } | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    // Deliberately no-store, unlike layout.tsx's identical helper — a
    // manifest generated at build time (ISR) would permanently bake in
    // whatever the backend happened to return during that one build,
    // including a transient failure's hardcoded-default fallback. A
    // browser fetches this rarely (only when considering installing), so
    // there's no real cost to resolving it fresh every time.
    const res = await fetch(`${apiUrl}/api/v1/settings/public`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.data ?? json?.data ?? null;
  } catch {
    return null;
  }
}

// Cloudinary serves resized/padded variants of whatever logo the admin
// uploaded on the fly via URL transform params — no local icon files to
// keep in sync by hand whenever Settings → General's logo changes.
function cloudinaryIcon(logoUrl: string, size: number): string {
  const marker = '/upload/';
  const idx = logoUrl.indexOf(marker);
  if (idx === -1) return logoUrl;
  const transform = `w_${size},h_${size},c_pad,b_white`;
  return `${logoUrl.slice(0, idx + marker.length)}${transform}/${logoUrl.slice(idx + marker.length)}`;
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getPublicSettings();
  const name = settings?.siteName || DEFAULT_NAME;
  const description = settings?.siteDescription || DEFAULT_DESCRIPTION;
  const logoUrl = settings?.logoUrl;

  const icons: MetadataRoute.Manifest['icons'] = logoUrl
    ? [
        { src: cloudinaryIcon(logoUrl, 192), sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: cloudinaryIcon(logoUrl, 512), sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: cloudinaryIcon(logoUrl, 192), sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: cloudinaryIcon(logoUrl, 512), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]
    : [{ src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' }];

  return {
    name,
    short_name: name.length > 12 ? 'Lolospala' : name,
    description,
    start_url: '/',
    display: 'standalone',
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    orientation: 'portrait-primary',
    lang: 'tet',
    categories: ['shopping', 'business'],
    icons,
  };
}
