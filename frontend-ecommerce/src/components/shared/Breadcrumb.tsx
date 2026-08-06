'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumb() {
  const pathname = usePathname();
  
  // Skip if on homepage
  if (pathname === '/') {
    return null;
  }

  const paths = pathname.split('/').filter(Boolean);
  
  // Skip if no breadcrumbs
  if (paths.length === 0) {
    return null;
  }

  // Breadcrumb label mapping
  const labels: Record<string, string> = {
    products: 'Products',
    categories: 'Categories',
    sellers: 'Sellers',
    cart: 'Cart',
    checkout: 'Checkout',
    orders: 'Orders',
    account: 'Account',
    profile: 'Profile',
    addresses: 'Addresses',
    wishlist: 'Wishlist',
    reviews: 'Reviews',
    settings: 'Settings',
    search: 'Search',
    about: 'About',
  };

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        
        {paths.map((path, index) => {
          const href = '/' + paths.slice(0, index + 1).join('/');
          const isLast = index === paths.length - 1;
          
          // Check if path is a number (dynamic ID)
          const isId = /^\d+$/.test(path);
          let label = labels[path] || path.charAt(0).toUpperCase() + path.slice(1);
          
          // If it's an ID, show a simplified label
          if (isId) {
            label = `#${path}`;
          }

          return (
            <li key={href} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
              {isLast ? (
                <span className="font-medium text-foreground truncate max-w-[150px] sm:max-w-[200px]">
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-[150px]"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}