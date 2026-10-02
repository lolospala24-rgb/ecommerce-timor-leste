import { Prisma } from '@prisma/client';

// Shared product-card `include` shape — standalone (no service imports) so
// HomepageService and PromotionsService can both use it without creating a
// circular import between their two modules (HomepageService already
// depends on PromotionsService for pricing; the reverse edge used to go
// through homepage.service.ts, which crashed Nest's DI at boot).
export const PRODUCT_CARD_INCLUDE = {
  seller: {
    select: {
      id: true,
      storeName: true,
      originMunicipality: true,
      originPostoAdmin: true,
      originSuco: true,
      originAldeia: true,
    },
  },
  category: { select: { id: true, name: true, slug: true } },
  reviews: { where: { isApproved: true }, select: { rating: true } },
} satisfies Prisma.ProductInclude;
