'use client';

import { Share2, Link2, Check } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { copyToClipboard } from '@/lib/utils';

// Same minimal-SVG pattern already used in ReferralShareModal.tsx — lucide
// has no brand icons.
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14c-.25.7-1.22 1.29-2.06 1.42-.55.08-1.26.15-3.66-.78-3.07-1.19-5.05-4.31-5.2-4.51-.15-.2-1.24-1.65-1.24-3.15s.78-2.23 1.06-2.53c.27-.3.6-.37.8-.37h.58c.19 0 .43-.07.68.52.25.6.87 2.1.94 2.25.08.15.13.32.03.52-.11.2-.16.32-.31.5-.15.18-.32.4-.46.53-.15.15-.31.31-.13.61.18.3.79 1.31 1.7 2.11 1.17 1.04 2.15 1.37 2.45 1.52.3.15.48.13.65-.07.18-.2.76-.88.96-1.18.2-.3.4-.25.68-.15.27.1 1.75.82 2.05.97.3.15.5.22.58.35.08.13.08.75-.17 1.45Z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.94 5.36 18.6 20.24c-.25 1.1-.9 1.37-1.83.86l-5.06-3.73-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.15 9.37-8.47c.41-.36-.09-.56-.63-.2L6.4 12.6l-5.02-1.57c-1.09-.34-1.1-1.09.23-1.61L20.6 4.06c.91-.34 1.7.21 1.34 1.3Z" />
    </svg>
  );
}

interface ProductShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productUrl: string;
}

// Explicit WhatsApp/Facebook/Telegram deep links (same pattern as
// ReferralShareModal.tsx) cover the platforms with a stable web share-intent
// URL. TikTok has no such public intent for arbitrary links, so it's not
// faked as its own icon here — "Seluk" instead calls the real Web Share API
// (navigator.share), which hands off to the phone's actual OS share sheet
// and genuinely includes TikTok, Instagram, Messages, etc. when installed.
export function ProductShareSheet({ open, onOpenChange, productName, productUrl }: ProductShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const shareText = `Haree ${productName} iha Lolóspala`;

  const handleCopy = async () => {
    const ok = await copyToClipboard(productUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    toast[ok ? 'success' : 'error'](ok ? 'Link kopia ona' : 'La konsege kopia link');
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: productName, text: shareText, url: productUrl });
      } else {
        await handleCopy();
      }
    } catch {
      // User cancelled the native share sheet — not an error.
    }
  };

  const shareTargets = [
    {
      label: 'WhatsApp',
      icon: WhatsAppIcon,
      className: 'bg-[#25D366]',
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${productUrl}`)}`,
    },
    {
      label: 'Facebook',
      icon: FacebookIcon,
      className: 'bg-[#1877F2]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`,
    },
    {
      label: 'Telegram',
      icon: TelegramIcon,
      className: 'bg-[#26A5E4]',
      href: `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`,
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[28px]">
        <DrawerTitle className="sr-only">Fahe produtu</DrawerTitle>
        <div className="space-y-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
          <p className="text-center text-sm font-bold text-[#142019]">Fahe produtu ne'e</p>

          <div className="grid grid-cols-4 gap-3">
            {shareTargets.map((target) => (
              <a
                key={target.label}
                href={target.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${target.className}`}>
                  <target.icon className="h-5 w-5" />
                </span>
                <span className="text-xs text-[#56635B]">{target.label}</span>
              </a>
            ))}
            <button type="button" onClick={handleNativeShare} className="flex flex-col items-center gap-1.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F6F3] text-[#142019]">
                <Share2 className="h-5 w-5" />
              </span>
              <span className="text-xs text-[#56635B]">Seluk</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#DDE3DE] text-sm font-semibold text-[#142019]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {copied ? 'Kopia ona' : 'Kopia link'}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
