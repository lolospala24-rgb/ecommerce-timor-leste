/**
 * One-time backfill: mirrors existing Product.specifications into the
 * ProductAttribute EAV table, which powers category dynamic-filter facets
 * (CategoriesService.buildFilterFacets). Going forward, ProductsService
 * keeps the two in sync on every create/update — this script only needs
 * to run once to catch up products that existed before that sync landed.
 *
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/backfill-product-attributes.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toAttributeEntries(specifications: unknown) {
  return Object.entries((specifications as Record<string, unknown>) ?? {})
    .map(([key, value]) => ({ key: key.trim(), value: String(value ?? '').trim() }))
    .filter((entry) => entry.key && entry.value);
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, specifications: true },
  });

  let touched = 0;
  let attributesWritten = 0;

  for (const product of products) {
    const entries = toAttributeEntries(product.specifications);
    if (entries.length === 0) continue;

    await prisma.$transaction([
      prisma.productAttribute.deleteMany({ where: { productId: product.id } }),
      prisma.productAttribute.createMany({
        data: entries.map((entry) => ({ productId: product.id, ...entry })),
      }),
    ]);

    touched += 1;
    attributesWritten += entries.length;
    console.log(`  #${product.id} ${product.name}: ${entries.length} attribute(s)`);
  }

  console.log(
    `\nBackfill complete: ${touched}/${products.length} products had specifications, ${attributesWritten} attribute rows written.`,
  );
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
