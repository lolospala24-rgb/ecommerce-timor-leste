import type { Product, ProductVariant } from '@/types/product.types';

export interface ProductTypeFieldDefinition {
  key: string;
  label: string;
}

export function parseJsonRecord(value: unknown): Record<string, string> {
  if (!value) return {};

  let record: unknown = value;
  if (typeof value === 'string') {
    try {
      record = JSON.parse(value);
    } catch {
      return {};
    }
  }

  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, entryValue]) => [key, String(entryValue)]),
  );
}

/** Normalize product type fields from admin (object, string array, or field objects). */
export function parseProductTypeFields(value: unknown): ProductTypeFieldDefinition[] {
  if (!value) return [];

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => {
        if (typeof entry === 'string' && entry.trim()) {
          return { key: entry.trim(), label: entry.trim() };
        }
        if (entry && typeof entry === 'object') {
          const item = entry as Record<string, unknown>;
          const key = String(item.key ?? item.name ?? item.label ?? '').trim();
          if (!key) return null;
          const label = String(item.label ?? item.name ?? key).trim();
          return { key, label };
        }
        return null;
      })
      .filter((entry): entry is ProductTypeFieldDefinition => entry !== null);
  }

  if (typeof parsed === 'object' && parsed !== null) {
    return Object.entries(parsed as Record<string, unknown>).map(([key, value]) => ({
      key,
      label: String(value ?? key),
    }));
  }

  return [];
}

export function getProductTypeFieldMap(
  fields: unknown,
): Record<string, string> {
  return parseProductTypeFields(fields).reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.label;
    return acc;
  }, {});
}

export function normalizeProductVariant(raw: unknown): ProductVariant | null {
  if (!raw || typeof raw !== 'object') return null;

  const variant = raw as ProductVariant;
  return {
    ...variant,
    price: Number(variant.price) || 0,
    comparePrice: variant.comparePrice != null ? Number(variant.comparePrice) : null,
    stock: Number(variant.stock) || 0,
    images: Array.isArray(variant.images) ? variant.images : [],
    attributes: parseJsonRecord(variant.attributes),
    isActive: variant.isActive !== false,
  };
}

export function normalizeProduct(raw: unknown): Product {
  const product = (raw ?? {}) as Product;
  const variants = Array.isArray(product.variants)
    ? product.variants
        .map((raw) => {
          const variant = normalizeProductVariant(raw);
          if (!variant || !variant.isActive) return null;
          return {
            ...variant,
            attributes: alignAttributesWithTypeFields(
              variant.attributes,
              product.type?.fields,
            ),
          };
        })
        .filter((variant): variant is ProductVariant => variant !== null)
    : [];

  const typeFields = product.type ? getProductTypeFieldMap(product.type.fields) : {};

  return {
    ...product,
    price: Number(product.price) || 0,
    comparePrice: product.comparePrice != null ? Number(product.comparePrice) : null,
    stock: Number(product.stock) || 0,
    images: Array.isArray(product.images) ? product.images : [],
    variants,
    hasVariants: variants.length > 0 || Boolean(product.hasVariants),
    type: product.type
      ? {
          ...product.type,
          fields: typeFields,
        }
      : undefined,
  };
}

export function getVariantAttributeKeys(
  variants: ProductVariant[],
  typeFields?: Record<string, string> | unknown,
): string[] {
  const keys: string[] = [];
  const addKey = (key: string) => {
    if (key && !keys.includes(key)) keys.push(key);
  };

  parseProductTypeFields(typeFields).forEach((field) => addKey(field.key));
  variants.forEach((variant) => {
    Object.keys(variant.attributes ?? {}).forEach((key) => addKey(key));
  });

  return keys;
}

export function getVariantAttributeLabels(
  attributeKeys: string[],
  typeFields?: Record<string, string> | unknown,
): Record<string, string> {
  const labels = getProductTypeFieldMap(typeFields);
  return attributeKeys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = labels[key] ?? key;
    return acc;
  }, {});
}

export function getVariantAttributeOptions(
  variants: ProductVariant[],
  attributeKeys: string[],
): Record<string, string[]> {
  const options: Record<string, string[]> = {};
  attributeKeys.forEach((key) => {
    const values = variants
      .map((variant) => variant.attributes?.[key])
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    options[key] = Array.from(new Set(values));
  });
  return options;
}

export function findMatchingVariant(
  variants: ProductVariant[],
  selectedAttributes: Record<string, string>,
): ProductVariant | null {
  const selectedEntries = Object.entries(selectedAttributes).filter(([, value]) => value);
  if (selectedEntries.length === 0) return null;

  const matches = variants.filter((variant) =>
    selectedEntries.every(([key, value]) => variant.attributes?.[key] === value),
  );

  if (matches.length === 0) return null;
  return matches.find((variant) => variant.isActive) ?? matches[0];
}

export function formatVariantLabel(
  variant: ProductVariant,
  attributeKeys: string[],
  attributeLabels?: Record<string, string>,
): string {
  const label = attributeKeys
    .map((key) => variant.attributes?.[key])
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' / ');

  if (label) return label;

  const entries = Object.entries(variant.attributes ?? {});
  if (entries.length > 0) {
    return entries
      .map(([key, value]) => `${attributeLabels?.[key] ?? key}: ${value}`)
      .join(' / ');
  }

  return variant.sku || `Variant ${variant.id}`;
}

export function getVariantThumbnail(
  variant: ProductVariant,
  fallback?: string | null,
): string {
  const image = Array.isArray(variant.images) ? variant.images[0] : null;
  return image || fallback || '/images/placeholder.png';
}

export function getProductThumbnail(
  product: Product,
): string {
  // Prefer explicit thumbnail, then first image, then placeholder
  if (product.thumbnail) return product.thumbnail;
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }
  return '/images/placeholder.png';
}

export function getVariantImageForOption(
  variants: ProductVariant[],
  attribute: string,
  value: string,
  selectedAttributes: Record<string, string>,
  fallback?: string | null,
): string | null {
  const matches = variants.filter((variant) => {
    if (variant.attributes?.[attribute] !== value) return false;
    return Object.entries(selectedAttributes).every(([key, val]) =>
      key === attribute ? true : variant.attributes?.[key] === val,
    );
  });

  for (const variant of matches) {
    const image = Array.isArray(variant.images) ? variant.images[0] : null;
    if (image) return image;
  }

  return fallback ?? null;
}

export function alignAttributesWithTypeFields(
  attributes: Record<string, string>,
  typeFields: unknown,
): Record<string, string> {
  const fieldDefs = parseProductTypeFields(typeFields);
  if (fieldDefs.length === 0) return attributes;

  const aligned: Record<string, string> = {};
  Object.entries(attributes).forEach(([key, value]) => {
    const match = fieldDefs.find((field) => field.key.toLowerCase() === key.toLowerCase());
    aligned[match?.key ?? key] = value;
  });
  return aligned;
}

export function unwrapApiData<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    return payload as T;
  }

  const obj = payload as Record<string, unknown>;
  if ('data' in obj && obj.data !== undefined && obj.data !== null) {
    return unwrapApiData<T>(obj.data);
  }

  return payload as T;
}

export function buildFieldsPayload(fieldNames: string[]): Record<string, string> {
  return fieldNames.reduce<Record<string, string>>((acc, name) => {
    const trimmed = name.trim();
    if (trimmed) acc[trimmed] = 'select';
    return acc;
  }, {});
}

export function fieldsToNameList(fields?: Record<string, unknown> | unknown): string[] {
  return parseProductTypeFields(fields).map((field) => field.key);
}

export interface GalleryThumbnailItem {
  id: string;
  url: string;
  type: 'product' | 'variant' | 'video';
  variantId?: number;
  variantLabel?: string;
  /** Only set when type === 'video' — the actual video source; `url` above
   *  stays a real image so the thumbnail button renders exactly like every
   *  other thumbnail (same <Image>, same sizing), just with a Play icon
   *  layered on top. */
  videoUrl?: string;
}

export function buildThumbnailGallery(
  baseProductImages: string[],
  variants: ProductVariant[],
  attributeKeys: string[],
  attributeLabels?: Record<string, string>,
  productVideoUrl?: string | null,
): GalleryThumbnailItem[] {
  const items: GalleryThumbnailItem[] = [];

  if (productVideoUrl && baseProductImages[0]) {
    items.push({
      id: 'product-video',
      url: baseProductImages[0],
      type: 'video',
      videoUrl: productVideoUrl,
    });
  }

  baseProductImages.forEach((url, index) => {
    items.push({
      id: `product-${index}`,
      url,
      type: 'product',
    });
  });

  variants.forEach((variant) => {
    if (!Array.isArray(variant.images) || variant.images.length === 0) return;

    const variantLabel = formatVariantLabel(variant, attributeKeys, attributeLabels);
    variant.images.forEach((url, index) => {
      items.push({
        id: `variant-${variant.id}-${index}`,
        url,
        type: 'variant',
        variantId: variant.id,
        variantLabel,
      });
    });
  });

  return items;
}
