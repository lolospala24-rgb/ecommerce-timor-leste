import { PageHeader } from '@/components/shared/PageHeader';
import { ProductForm } from '@/components/products/ProductForm';

export default function NewProductPage() {
  return (
    <div>
      <PageHeader title="Add Product" description="Create a new listing for your store." />
      <ProductForm />
    </div>
  );
}
