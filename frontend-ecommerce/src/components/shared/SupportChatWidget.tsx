'use client';

import { useState } from 'react';
import type { SVGProps } from 'react';
import { MessageCircle, Mail, X } from 'lucide-react';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { useTranslation } from '@/lib/i18n/LanguageContext';

// Not in lucide-react — a plain filled brand mark at the same visual weight
// as the other icons used here.
function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.02c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.8-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.8-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.15.31-.3.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.15.46.13.63-.08.17-.21.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.7.8 1.99.95.29.15.48.22.55.34.07.13.07.73-.17 1.41z" />
    </svg>
  );
}

// A floating "contact support" bubble — WhatsApp deep link + mailto,
// sourced from the admin's own SystemSettings.contactPhone/contactEmail
// (same fields the /contact page already uses), not a hardcoded number.
// Real agent-backed live chat would need a backend of its own; this is the
// practical, zero-new-infrastructure version of "reach a human" that fits
// how support already works here (phone/email, no ticketing system).
export function SupportChatWidget() {
  const { data: settings } = usePublicSettings();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const phoneDigits = settings?.contactPhone?.replace(/[^\d]/g, '');
  const email = settings?.contactEmail;

  if (!phoneDigits && !email) return null;

  const waLink = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(t('support.greeting'))}`
    : null;
  const mailLink = email ? `mailto:${email}` : null;

  return (
    // bottom-24 on mobile clears the ~68px sticky "Place Order"/"Add to
    // Cart" bars used on checkout and product pages; bottom-6 on desktop
    // where there's no sticky bottom bar to clash with.
    <div className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6">
      {open && (
        <div className="mb-3 w-64 rounded-2xl border border-border bg-card p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{t('support.title')}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground transition hover:text-foreground"
              aria-label={t('support.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-medium text-green-800 transition hover:bg-green-100"
              >
                <WhatsAppIcon className="h-5 w-5 shrink-0" />
                {t('support.whatsapp')}
              </a>
            )}
            {mailLink && (
              <a
                href={mailLink}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted/70"
              >
                <Mail className="h-5 w-5 shrink-0 text-primary" />
                {t('support.email')}
              </a>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={t('support.title')}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 hover:bg-primary/90"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
