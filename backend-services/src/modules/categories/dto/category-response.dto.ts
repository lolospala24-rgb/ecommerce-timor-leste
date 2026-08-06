// placeholder for src/modules/categories/dto/category-response.dto.ts
export class CategoryResponseDto {
  id: number;
  name: string;
  nameTetum: string | null;
  description: string | null;
  image: string | null;
  slug: string;
  parentId: number | null;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  parent?: {
    id: number;
    name: string;
    slug: string;
  };
  
  children?: CategoryResponseDto[];
  
  _count?: {
    products: number;
  };
  
  productCount?: number;
}