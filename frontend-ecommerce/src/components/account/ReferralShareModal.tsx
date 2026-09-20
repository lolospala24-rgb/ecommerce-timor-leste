'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';
import { MessageCircle, Mail, Link2, Share2 } from 'lucide-react';
import { trackShareReferral } from '@/lib/analytics';

// lucide-react has no brand icons — same minimal-SVG pattern already used
// for WhatsApp/Telegram in ProductDetail.tsx.
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.13 2 11.5c0 2.9 1.31 5.5 3.42 7.28V22l3.19-1.75c.77.21 1.58.32 2.39.32 5.52 0 10-4.13 10-9.5S17.52 2 12 2Zm1.01 12.8-2.55-2.72-4.98 2.72 5.48-5.82 2.61 2.72 4.92-2.72-5.48 5.82Z" />
    </svg>
  );
}

interface ReferralShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode: string;
  referralLink: string;
}

export function ReferralShareModal({ open, onOpenChange, referralCode, referralLink }: ReferralShareModalProps) {
  const shareText = `Join Lolospala and get a welcome wallet credit — use my referral link:`;

  const handleCopy = async () => {
    const ok = await copyToClipboard(referralLink);
    toast[ok ? 'success' : 'error'](ok ? 'Referral link copied!' : 'Could not copy link');
    if (ok) trackShareReferral('copy_link');
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Join Lolospala', text: shareText, url: referralLink });
        trackShareReferral('native_share');
      } else {
        await handleCopy();
      }
    } catch {
      // User cancelled the native share sheet — not an error, and not
      // counted as a completed share.
    }
  };

  const shareTargets = [
    {
      label: 'WhatsApp',
      method: 'whatsapp',
      icon: MessageCircle,
      className: 'bg-[#25D366] text-white hover:bg-[#1fbd5a]',
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${referralLink}`)}`,
    },
    {
      label: 'Facebook',
      method: 'facebook',
      icon: FacebookIcon,
      className: 'bg-[#1877F2] text-white hover:bg-[#1466d2]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    },
    {
      label: 'Messenger',
      method: 'messenger',
      icon: MessengerIcon,
      className: 'bg-[#00B2FF] text-white hover:bg-[#009ee0]',
      href: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(referralLink)}&app_id=0&redirect_uri=${encodeURIComponent(referralLink)}`,
    },
    {
      label: 'Email',
      method: 'email',
      icon: Mail,
      className: 'bg-muted text-foreground hover:bg-muted/70',
      href: `mailto:?subject=${encodeURIComponent('Join Lolospala')}&body=${encodeURIComponent(`${shareText} ${referralLink}`)}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your Referral Code
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-primary">
              {referralCode}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {shareTargets.map((target) => (
              <a
                key={target.label}
                href={target.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackShareReferral(target.method)}
                className="flex flex-col items-center gap-1.5"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${target.className}`}>
                  <target.icon className="h-5 w-5" />
                </span>
                <span className="text-xs text-muted-foreground">{target.label}</span>
              </a>
            ))}
            <button type="button" onClick={handleNativeShare} className="flex flex-col items-center gap-1.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70">
                <Share2 className="h-5 w-5" />
              </span>
              <span className="text-xs text-muted-foreground">More</span>
            </button>
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={handleCopy}>
            <Link2 className="h-4 w-4" />
            Copy Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
