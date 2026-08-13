'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface CommentInputProps {
  onSubmit: (content: string) => void;
  isPosting: boolean;
}

export function CommentInput({ onSubmit, isPosting }: CommentInputProps) {
  const [value, setValue] = useState('');
  const { isAuthenticated } = useAuthStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value);
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-neutral-100 p-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={isAuthenticated ? 'Add a comment...' : 'Log in to comment'}
        disabled={!isAuthenticated || isPosting}
        aria-label="Add a comment"
        className="flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm outline-none transition focus:border-neutral-400 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={!isAuthenticated || isPosting || !value.trim()}
        aria-label="Post comment"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:bg-neutral-700 disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
