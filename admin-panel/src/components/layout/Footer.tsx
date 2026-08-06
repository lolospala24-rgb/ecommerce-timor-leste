'use client';

import Link from 'next/link';
import { Heart, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Admin Panel</h3>
            <p className="text-sm text-muted-foreground">
              Complete e-commerce management solution for Timor-Leste.
            </p>
            <div className="flex gap-3 mt-4">
              <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Facebook
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Twitter
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Instagram
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                GitHub
              </Link>
            </div>
          </div>

          {/* Rest of footer */}
          {/* ... */}
        </div>
      </div>
    </footer>
  );
}