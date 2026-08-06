'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Product, ProductVariant } from '@/types/product.types';
import {
  buildThumbnailGallery,
  findMatchingVariant,
  formatVariantLabel,
  getVariantAttributeKeys,
  getVariantAttributeLabels,
  getVariantAttributeOptions,
} from '@/lib/product';
import type { GalleryThumbnailItem } from '@/lib/product';

export function useProductVariantSelection(product: Product) {
  const variants = useMemo(
    () => (Array.isArray(product.variants) ? product.variants : []),
    [product.variants],
  );
  const hasVariants = variants.length > 0;

  const attributeKeys = useMemo(
    () => getVariantAttributeKeys(variants, product.type?.fields),
    [variants, product.type?.fields],
  );

  const attributeOptions = useMemo(
    () => getVariantAttributeOptions(variants, attributeKeys),
    [variants, attributeKeys],
  );

  const attributeLabels = useMemo(
    () => getVariantAttributeLabels(attributeKeys, product.type?.fields),
    [attributeKeys, product.type?.fields],
  );

  const defaultVariant = useMemo<ProductVariant | null>(() => {
    if (!hasVariants) return null;
    return variants.find((variant) => variant.isActive) ?? variants[0] ?? null;
  }, [hasVariants, variants]);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [hasChosenVariant, setHasChosenVariant] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);

  const baseProductImages = useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images;
    }
    if (product.thumbnail) {
      return [product.thumbnail];
    }
    return [];
  }, [product.images, product.thumbnail]);

  useEffect(() => {
    setHasChosenVariant(false);
    setActiveImageUrl(null);

    if (!defaultVariant) {
      setSelectedVariantId(null);
      setSelectedAttributes({});
      return;
    }

    const initialAttributes: Record<string, string> = {};
    attributeKeys.forEach((key) => {
      const value = defaultVariant.attributes?.[key];
      if (value) initialAttributes[key] = value;
    });

    setSelectedAttributes(initialAttributes);
    setSelectedVariantId(defaultVariant.id);
  }, [product.id, defaultVariant?.id, attributeKeys.join(',')]);

  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (!hasVariants) return null;

    const explicitVariant = variants.find((variant) => variant.id === selectedVariantId);
    if (explicitVariant) return explicitVariant;

    return findMatchingVariant(variants, selectedAttributes) ?? defaultVariant;
  }, [hasVariants, variants, selectedVariantId, selectedAttributes, defaultVariant]);

  const selectedVariantLabel = selectedVariant
    ? formatVariantLabel(selectedVariant, attributeKeys, attributeLabels)
    : null;

  const selectAttribute = (attribute: string, value: string) => {
    setHasChosenVariant(true);
    const nextAttributes = { ...selectedAttributes, [attribute]: value };
    setSelectedAttributes(nextAttributes);

    const matchedVariant = findMatchingVariant(variants, nextAttributes);
    if (matchedVariant) {
      setSelectedVariantId(matchedVariant.id);
      const firstImage = matchedVariant.images?.[0];
      if (firstImage) setActiveImageUrl(firstImage);
    }
  };

  const selectVariant = (variant: ProductVariant) => {
    setHasChosenVariant(true);
    const nextAttributes: Record<string, string> = {};
    attributeKeys.forEach((key) => {
      const value = variant.attributes?.[key];
      if (value) nextAttributes[key] = value;
    });
    setSelectedAttributes(nextAttributes);
    setSelectedVariantId(variant.id);
    const firstImage = variant.images?.[0];
    setActiveImageUrl(firstImage ?? null);
  };

  const selectProductGallery = () => {
    setHasChosenVariant(false);
    setActiveImageUrl(baseProductImages[0] ?? null);
  };

  const selectThumbnail = (item: GalleryThumbnailItem) => {
    setActiveImageUrl(item.url);

    if (item.type === 'variant' && item.variantId) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (variant) {
        setHasChosenVariant(true);
        const nextAttributes: Record<string, string> = {};
        attributeKeys.forEach((key) => {
          const value = variant.attributes?.[key];
          if (value) nextAttributes[key] = value;
        });
        setSelectedAttributes(nextAttributes);
        setSelectedVariantId(variant.id);
      }
      return;
    }

    setHasChosenVariant(false);
  };

  const setMainImageUrl = (url: string) => {
    setActiveImageUrl(url);
  };

  const isAttributeValueAvailable = (attribute: string, value: string) =>
    variants.some((variant) => {
      if (variant.attributes?.[attribute] !== value) return false;
      return Object.entries(selectedAttributes).every(([currentKey, currentValue]) =>
        currentKey === attribute ? true : variant.attributes?.[currentKey] === currentValue,
      );
    });

  const displayPrice = selectedVariant?.price ?? product.price;
  const displayComparePrice = selectedVariant?.comparePrice ?? product.comparePrice;
  const displayStock = selectedVariant?.stock ?? product.stock;
  const displaySku = selectedVariant?.sku ?? product.sku;

  const galleryImages =
    hasChosenVariant && selectedVariant?.images?.length
      ? selectedVariant.images
      : baseProductImages;

  const thumbnailGallery = useMemo(
    () => buildThumbnailGallery(baseProductImages, variants, attributeKeys, attributeLabels),
    [baseProductImages, variants, attributeKeys, attributeLabels],
  );

  const mainImageUrl =
    activeImageUrl ??
    galleryImages[0] ??
    baseProductImages[0] ??
    product.thumbnail ??
    null;

  return {
    variants,
    hasVariants,
    attributeKeys,
    attributeOptions,
    attributeLabels,
    selectedVariant,
    selectedVariantLabel,
    selectedAttributes,
    hasChosenVariant,
    selectAttribute,
    selectVariant,
    selectThumbnail,
    selectProductGallery,
    setMainImageUrl,
    isAttributeValueAvailable,
    displayPrice,
    displayComparePrice,
    displayStock,
    displaySku,
    baseProductImages,
    galleryImages,
    thumbnailGallery,
    mainImageUrl,
    activeImageUrl,
    productImages: galleryImages,
  };
}
