'use client';

import Link from 'next/link';
import { MessageCircle, Send, Camera, PlayCircle, Mail, Phone, MapPin, Heart } from 'lucide-react';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { useTranslation } from '@/lib/i18n/LanguageContext';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();
  const { data: settings } = usePublicSettings();
  const siteName = settings?.siteName || 'E-commerce Timor-Leste';
  const address = settings?.address || 'Dili, Timor-Leste';
  const contactPhone = settings?.contactPhone || '+670 1234 5678';
  const contactEmail = settings?.contactEmail || 'support@ecommercetimor.com';

  return (
    <footer className="border-t bg-muted/30">
      <div className="container-custom py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="font-bold text-lg">
                <span className="text-primary">E-</span>Commerce
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-3">
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Send className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Camera className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <PlayCircle className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/products" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.products')}
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.categories')}
                </Link>
              </li>
              <li>
                <Link href="/sellers" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.sellers')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.aboutUs')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-semibold mb-4">{t('footer.customerService')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.helpCenter')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.faq')}
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.returnsPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.contactUs')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">{t('footer.contact')}</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{address}</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{contactPhone}</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{contactEmail}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>
            &copy; {currentYear} {siteName}. {t('footer.rightsReserved')}
          </p>
          <p className="flex items-center gap-1">
            {t('footer.madeWithLoveFor')} <Heart className="h-3 w-3 text-red-600" />
          </p>
        </div>
      </div>
    </footer>
  );
}