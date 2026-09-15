export interface ProductType {
  id: number;
  name: string;
  nameTetum: string | null;
  description: string | null;
  slug: string;
  // `{ fieldName: "select" }` — the key is the actual field name, the value
  // is always the literal type marker "select" (see admin-panel's
  // buildFieldsPayload). Suggested Variant attribute names for this type.
  fields: Record<string, string> | null;
  // Same `{ fieldName: "select" }` shape — suggested Specification field
  // names for this type, kept separate from `fields` since a type's
  // variant options (e.g. Size) aren't always the same as its spec sheet
  // (e.g. Material, Gender).
  specFields: Record<string, string> | null;
  isActive: boolean;
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  price: number;
  comparePrice: number | null;
  cost: number | null;
  stock: number;
  attributes: Record<string, string> | null;
  images: string[];
  isActive: boolean;
}

export interface SellerProduct {
  id: number;
  name: string;
  nameTetum: string | null;
  description: string;
  descriptionTetum: string | null;
  price: number;
  comparePrice: number | null;
  cost: number | null;
  stock: number;
  sku: string | null;
  barcode: string | null;
  images: string[];
  thumbnail: string | null;
  videoUrl: string | null;
  weight: number | null;
  brand: string | null;
  specifications: Record<string, unknown> | null;
  hasVariants: boolean;
  isActive: boolean;
  isFeatured: boolean;
  isLocallyMade: boolean;
  originMode: 'SELLER_ORIGIN' | 'CUSTOM_ORIGIN' | null;
  originMunicipality: string | null;
  slug: string;
  sellerId: number;
  categoryId: number;
  typeId: number | null;
  lowStockThreshold: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  shippingClass: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string[] | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  _count: { orderItems: number; reviews: number };
  rating: number;
}

export type ProductStatusFilter = 'active' | 'inactive' | 'out-of-stock';

export interface CreateProductPayload {
  name: string;
  nameTetum?: string;
  description: string;
  descriptionTetum?: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  stock: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  brand?: string;
  categoryId: number;
  typeId?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  images?: string[];
  lowStockThreshold?: number;
  specifications?: Record<string, unknown>;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface StockUpdatePayload {
  quantity: number;
  type: 'add' | 'subtract' | 'set';
}
