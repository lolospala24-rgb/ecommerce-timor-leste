'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { SocialButtons } from './SocialButtons';
import { QRCode } from './QRCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Copy, Link2, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
  image?: string;
}

export function ShareModal({
  isOpen,
  onClose,
  url,
  title,
  description,
  image,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'The link has been copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share"
      description={`Share "${title}" with your friends`}
      size="md"
    >
      <div className="space-y-6">
        {/* Social Buttons */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wider">
            Share via
          </p>
          <SocialButtons url={url} title={title} onShare={onClose} />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[rgba(255,255,255,0.05)]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-[#151515] text-[#A3A3A3]">or copy link</span>
          </div>
        </div>

        {/* Copy Link */}
        <div className="flex gap-2">
          <Input
            value={url}
            readOnly
            className="bg-[#0B0B0D] border-[rgba(255,255,255,0.08)] text-white"
          />
          <Button
            variant="outline"
            className="flex-shrink-0"
            onClick={handleCopyLink}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center pt-4 border-t border-[rgba(255,255,255,0.05)]">
          <p className="text-xs text-[#A3A3A3] mb-3">Scan QR Code</p>
          <QRCode url={url} size={120} />
        </div>
      </div>
    </Modal>
  );
}