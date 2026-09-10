// The single place a product's local origin gets resolved — used by both
// ProductsService (GET /products, /products/:id, /products/slug/:slug) and
// HomepageService (homepage LOCAL section), so there is exactly one
// resolution algorithm rather than one per call site. Deliberately
// conservative: returns null whenever there's nothing real to show, rather
// than inventing a municipality. CUSTOM_ORIGIN uses the product's own
// origin* fields; SELLER_ORIGIN (the default) falls back to the seller's
// declared origin, which itself may be unset — that's not an error, it
// just means this product has no known origin yet.
export interface ResolvedOrigin {
  municipality: string;
  postoAdmin: string | null;
  suco: string | null;
  aldeia: string | null;
}

export interface OriginSourceProduct {
  isLocallyMade: boolean;
  originMode: string;
  originMunicipality: string | null;
  originPostoAdmin: string | null;
  originSuco: string | null;
  originAldeia: string | null;
}

export interface OriginSourceSeller {
  originMunicipality?: string | null;
  originPostoAdmin?: string | null;
  originSuco?: string | null;
  originAldeia?: string | null;
}

export function resolveProductOrigin(
  product: OriginSourceProduct,
  seller: OriginSourceSeller | null | undefined,
): ResolvedOrigin | null {
  if (!product.isLocallyMade) return null;

  if (product.originMode === 'CUSTOM_ORIGIN') {
    if (!product.originMunicipality) return null;
    return {
      municipality: product.originMunicipality,
      postoAdmin: product.originPostoAdmin,
      suco: product.originSuco,
      aldeia: product.originAldeia,
    };
  }

  // SELLER_ORIGIN
  if (!seller?.originMunicipality) return null;
  return {
    municipality: seller.originMunicipality,
    postoAdmin: seller.originPostoAdmin ?? null,
    suco: seller.originSuco ?? null,
    aldeia: seller.originAldeia ?? null,
  };
}
