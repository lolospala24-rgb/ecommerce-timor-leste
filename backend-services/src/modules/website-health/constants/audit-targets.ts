// Fixed, developer-defined set of route templates an admin can pick from
// when starting an audit (spec §8) — deliberately NOT free-form URL input,
// so every URL this system ever fetches is `${baseUrl}${route}`, never
// anything an admin (or a compromised admin session) typed by hand. This
// is the first layer of SSRF defense; ssrf-guard.util.ts is the second.
//
// Checkout/Account are intentionally excluded from this phase — they
// require an authenticated session to render meaningfully, and building a
// safe authenticated-audit session (spec §8's "must support authenticated
// audit sessions safely, never log credentials") is real additional work
// deferred out of this MVP. Auditing them today would either 401 or show a
// login redirect, producing misleading scores.
export interface AuditTargetTemplate {
  id: string;
  label: string;
  route: string;
  pageType: string;
}

export const AUDIT_TARGET_TEMPLATES: AuditTargetTemplate[] = [
  { id: 'home', label: 'Homepage', route: '/', pageType: 'HOME' },
  { id: 'products', label: 'Product Listing', route: '/products', pageType: 'LISTING' },
  { id: 'local-products', label: 'Local Products', route: '/local-products', pageType: 'LISTING' },
  { id: 'categories', label: 'Categories', route: '/categories', pageType: 'LISTING' },
  { id: 'search', label: 'Search', route: '/search?q=produtu', pageType: 'SEARCH' },
  { id: 'cart', label: 'Cart', route: '/cart', pageType: 'CART' },
  { id: 'login', label: 'Login', route: '/login', pageType: 'AUTH' },
  { id: 'register', label: 'Register', route: '/register', pageType: 'AUTH' },
  // Product Detail needs a real slug, resolved at audit time (see
  // WebsiteHealthService.resolveProductDetailRoute) rather than hard-coded
  // here, since a hard-coded slug would eventually 404 as the catalog
  // changes.
  { id: 'product-detail', label: 'Product Detail (sample)', route: '', pageType: 'DETAIL' },
];

export const DEFAULT_AUDIT_SCOPE = ['home', 'products', 'product-detail', 'search', 'cart', 'local-products'];
