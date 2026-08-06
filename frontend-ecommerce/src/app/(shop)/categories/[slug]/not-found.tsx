import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CategoryNotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-2xl font-bold">Category not found</h1>
      <p className="text-muted-foreground mt-2">The category you are looking for does not exist.</p>
      <Button className="mt-6" asChild>
        <Link href="/categories">Browse categories</Link>
      </Button>
    </div>
  );
}
