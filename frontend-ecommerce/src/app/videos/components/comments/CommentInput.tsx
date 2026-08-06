'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmojiPicker } from './EmojiPicker';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { Smile, Send, X, Image as ImageIcon, AtSign } from 'lucide-react';

interface CommentInputProps {
  videoId: string;
  placeholder?: string;
  onSubmit: (content: string) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export function CommentInput({
  videoId,
  placeholder = 'Write a comment...',
  onSubmit,
  isSubmitting = false,
  onCancel,
  className,
  autoFocus = false,
}: CommentInputProps) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;
    await onSubmit(content.trim());
    setContent('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isDisabled = !content.trim() || isSubmitting;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-xl bg-[#151515] border border-[rgba(255,255,255,0.05)] transition-all duration-200',
        isFocused && 'border-[#6366F1]/50 shadow-[0_0_30px_-10px_rgba(99,102,241,0.15)]',
        className
      )}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Avatar */}
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={user?.avatar} alt={user?.name} />
          <AvatarFallback className="bg-gradient-to-br from-[#FF3B5C] to-[#6366F1] text-white text-xs">
            {user?.name ? getInitials(user.name) : 'U'}
          </AvatarFallback>
        </Avatar>

        {/* Input */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={inputRef}
            rows={content.split('\n').length > 3 ? 3 : 1}
            placeholder={placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full bg-transparent text-sm text-white placeholder:text-[#A3A3A3] resize-none outline-none leading-relaxed min-h-[24px] max-h-[120px]"
            style={{ height: 'auto' }}
            disabled={isSubmitting}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <AnimatePresence>
            {content.length > 0 && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => setContent('')}
                className="text-[#A3A3A3] hover:text-white transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-[#A3A3A3] hover:text-white transition-colors p-1"
          >
            <Smile className="h-4 w-4" />
          </button>

          <button
            className="text-[#A3A3A3] hover:text-white transition-colors p-1"
          >
            <ImageIcon className="h-4 w-4" />
          </button>

          <button
            className="text-[#A3A3A3] hover:text-white transition-colors p-1"
          >
            <AtSign className="h-4 w-4" />
          </button>

          <Button
            size="icon"
            variant="ghost"
            className={cn(
              'h-8 w-8 rounded-full transition-all duration-200',
              !isDisabled
                ? 'bg-[#FF3B5C] text-white hover:bg-[#FF3B5C]/90'
                : 'text-[#A3A3A3] hover:text-white hover:bg-[#1C1C1C]'
            )}
            onClick={handleSubmit}
            disabled={isDisabled}
          >
            {isSubmitting ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Cancel Button */}
      {onCancel && content.length === 0 && (
        <div className="px-3 pb-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#A3A3A3] hover:text-white"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 z-50"
          >
            <EmojiPicker onSelect={handleEmojiSelect} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}