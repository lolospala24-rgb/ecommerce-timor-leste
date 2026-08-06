'use client';

import { Button } from '@/components/ui/button';
import {
  Globe2,
  Share2,
  Send,
  MessageCircle,
  Mail,
  Copy,
} from 'lucide-react';

interface SocialButtonsProps {
  url: string;
  title: string;
  onShare?: () => void;
}

export function SocialButtons({ url, title, onShare }: SocialButtonsProps) {
  const shareData = {
    url: encodeURIComponent(url),
    title: encodeURIComponent(title),
  };

  const shareLinks = [
    {
      icon: Globe2,
      label: 'Twitter',
      color: 'bg-[#1DA1F2] hover:bg-[#1DA1F2]/90',
      url: `https://twitter.com/intent/tweet?url=${shareData.url}&text=${shareData.title}`,
    },
    {
      icon: Share2,
      label: 'Facebook',
      color: 'bg-[#1877F2] hover:bg-[#1877F2]/90',
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareData.url}`,
    },
    {
      icon: MessageCircle,
      label: 'Instagram',
      color: 'bg-gradient-to-r from-[#E4405F] to-[#F56040] hover:opacity-90',
      url: `https://www.instagram.com/`,
    },
    {
      icon: Mail,
      label: 'LinkedIn',
      color: 'bg-[#0A66C2] hover:bg-[#0A66C2]/90',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareData.url}`,
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      color: 'bg-[#25D366] hover:bg-[#25D366]/90',
      url: `https://wa.me/?text=${shareData.title}%20${shareData.url}`,
    },
    {
      icon: Send,
      label: 'Telegram',
      color: 'bg-[#0088CC] hover:bg-[#0088CC]/90',
      url: `https://t.me/share/url?url=${shareData.url}&text=${shareData.title}`,
    },
  ];

  const handleShare = (shareUrl: string) => {
    window.open(shareUrl, '_blank', 'width=600,height=500');
    onShare?.();
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {shareLinks.map((link) => {
        const Icon = link.icon;
        return (
          <Button
            key={link.label}
            className={`${link.color} text-white transition-all duration-200 hover:scale-105`}
            onClick={() => handleShare(link.url)}
            title={link.label}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{link.label}</span>
          </Button>
        );
      })}
    </div>
  );
}