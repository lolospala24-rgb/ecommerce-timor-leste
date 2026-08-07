'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '☺️', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬'],
  },
  {
    name: 'Gestures',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👣', '👀', '👁️', '👅', '👄', '🫦', '👶', '👧', '👦', '👩', '👨', '🧑', '👩‍🦰', '👨‍🦰', '👩‍🦱', '👨‍🦱', '👩‍🦳', '👨‍🦳', '👩‍🦲', '👨‍🦲'],
  },
  {
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️'],
  },
  {
    name: 'Objects',
    emojis: ['💋', '💌', '💍', '💎', '💐', '🌸', '🌺', '🌻', '🌹', '🥀', '🌷', '🌼', '🌞', '🌝', '🌚', '🌛', '🌜', '🌟', '⭐', '🌠', '🌌', '☄️', '💫', '✨', '⚡', '🔥', '💥', '💦', '💨', '🌊', '💧', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨'],
  },
  {
    name: 'Food',
    emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥝', '🍅', '🍆', '🥑', '🫑', '🌽', '🥕', '🧅', '🧄', '🥬', '🥦', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥠', '🥟', '🥨', '🥯', '🍞'],
  },
];

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div
      className={cn(
        'w-72 max-h-80 bg-[#151515] rounded-xl shadow-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden',
        className
      )}
    >
      {/* Categories */}
      <div className="flex gap-1 px-3 pt-3 pb-2 border-b border-[rgba(255,255,255,0.05)]">
        {EMOJI_CATEGORIES.map((category, index) => (
          <button
            key={category.name}
            onClick={() => setActiveCategory(index)}
            className={cn(
              'px-2 py-1 text-xs rounded-md transition-all',
              activeCategory === index
                ? 'bg-[#FF3B5C] text-white'
                : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Emojis Grid */}
      <div className="p-3 overflow-y-auto max-h-[260px] scrollbar-thin scrollbar-thumb-[#1C1C1C]">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSelect(emoji)}
              className="p-1.5 text-xl rounded-md hover:bg-[#1C1C1C] transition-all"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}