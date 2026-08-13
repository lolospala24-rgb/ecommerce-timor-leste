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

  // Deliberately does NOT auto-pick a "default" variant (first/active/index
  // 0) — doing that only to have something to show a price for was exactly
  // the bug: the customer would see a variant's price before choosing
  // anything. A fresh product (including navigating from one product to
  // another) always starts with nothing selected.
  useEffect(() => {
    setHasChosenVariant(false);
    setActiveImageUrl(null);
    setSelectedVariantId(null);
    setSelectedAttributes({});
  }, [product.id]);

  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (!hasVariants) return null;

    if (attributeKeys.length > 0) {
      // Attribute-driven products: the selected attributes are the single
      // source of truth. findMatchingVariant only returns non-null once
      // every attribute key has a value AND that combination matches a
      // real variant — never for a partial selection or an unavailable
      // combination, and never a stale variant left over from a previous,
      // now-superseded selection.
      return findMatchingVariant(variants, selectedAttributes, attributeKeys);
    }

    // Flat variant list with no distinguishing attributes (e.g. a single
    // "which one" choice) — each tile click sets a complete, unambiguous
    // choice, so matching by id is safe and can't go stale.
    return variants.find((variant) => variant.id === selectedVariantId) ?? null;
  }, [hasVariants, variants, selectedVariantId, selectedAttributes, attributeKeys]);

  // True once the customer has supplied a value for every attribute this
  // product varies by, whether or not that combination actually matches a
  // real variant — lets the UI distinguish "still choosing" from "chose
  // something that doesn't exist" (Section 5's "this combination is
  // unavailable" case) instead of collapsing both into "no variant".
  const isSelectionComplete =
    attributeKeys.length === 0 || attributeKeys.every((key) => Boolean(selectedAttributes[key]));
  const hasInvalidCombination = hasChosenVariant && isSelectionComplete && !selectedVariant;

  const selectedVariantLabel = selectedVariant
    ? formatVariantLabel(selectedVariant, attributeKeys, attributeLabels)
    : null;

  const selectAttribute = (attribute: string, value: string) => {
    setHasChosenVariant(true);
    const nextAttributes = { ...selectedAttributes, [attribute]: value };
    setSelectedAttributes(nextAttributes);

    const matchedVariant = findMatchingVariant(variants, nextAttributes, attributeKeys);
    if (matchedVariant) {
      setSelectedVariantId(matchedVariant.id);
      const firstImage = matchedVariant.images?.[0];
      if (firstImage) setActiveImageUrl(firstImage);
    } else {
      // Incomplete selection or a combination that doesn't exist — don't
      // leave selectedVariantId pointing at whatever was matched before;
      // that would keep showing a stale variant's price/stock/image as if
      // it were still the current selection.
      setSelectedVariantId(null);
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

  // Gated on hasChosenVariant, matching how galleryImages already behaves —
  // a matched selectedVariant only counts as "the customer's choice" once
  // they've actually interacted with the selector. Until then, every one
  // of these must reflect the base product, never a variant.
  const hasActiveVariantSelection = hasChosenVariant && Boolean(selectedVariant);
  const displayPrice = hasActiveVariantSelection ? selectedVariant!.price : product.price;
  const displayComparePrice = hasActiveVariantSelection
    ? selectedVariant!.comparePrice
    : product.comparePrice;
  const displayStock = hasActiveVariantSelection ? selectedVariant!.stock : product.stock;
  const displaySku = hasActiveVariantSelection ? selectedVariant!.sku : product.sku;

  const galleryImages =
    hasChosenVariant && selectedVariant?.images?.length
      ? selectedVariant.images
      : baseProductImages;

  const thumbnailGallery = useMemo(
    () => buildThumbnailGallery(baseProductImages, variants, attributeKeys, attributeLabels, product.videoUrl),
    [baseProductImages, variants, attributeKeys, attributeLabels, product.videoUrl],
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
    isSelectionComplete,
    hasInvalidCombination,
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
