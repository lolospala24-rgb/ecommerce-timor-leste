'use client';

import { MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface StickyBuyBarProps {
  onAddToCart: () => void;
  onBuyNow: () => void;
  disabled: boolean;
}

// Chat has no backing feature anywhere in this codebase yet (see the
// "no messaging feature" note in ProductDetail.tsx's trustItems) — mirrors
// SearchAiBar.tsx's handleCameraClick pattern: a real, tappable button that
// honestly says "coming soon" instead of doing nothing or faking a chat.
function handleChatClick() {
  toast('Chat ho vendedor sei disponível lalais 💬', { id: 'seller-chat-soon' });
}

export function StickyBuyBar({ onAddToCart, onBuyNow, disabled }: StickyBuyBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DDE3DE] bg-white lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <button
          type="button"
          onClick={handleChatClick}
          aria-label="Chat ho vendedor"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#DDE3DE] text-[#17703F]"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onAddToCart}
          disabled={disabled}
          className="h-12 flex-1 rounded-2xl border border-[#17703F] text-sm font-bold text-[#17703F] disabled:opacity-50"
        >
          Tau ba karreta
        </button>
        <button
          type="button"
          onClick={onBuyNow}
          disabled={disabled}
          className="h-12 flex-1 rounded-2xl bg-[#17703F] text-sm font-bold text-white disabled:opacity-50"
        >
          Sosa agora
        </button>
      </div>
    </div>
  );
}
