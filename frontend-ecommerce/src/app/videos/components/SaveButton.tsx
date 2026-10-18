'use client';

import { Bookmark } from 'lucide-react';
import { Video } from '@/types/video';
import { useVideoSave } from '@/hooks/video/useVideoSave';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { formatCompactNumber as formatCount } from '@/lib/formatters';

export function SaveButton({ video }: { video: Video }) {
  const { toggleSave, isToggling } = useVideoSave(video);
  const { t } = useTranslation();

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={toggleSave}
        disabled={isToggling}
        aria-label={video.isSaved ? 'Remove from saved videos' : 'Save video'}
        aria-pressed={video.isSaved}
        className="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-95 lg:bg-white/90 lg:shadow-sm lg:backdrop-blur lg:hover:bg-white lg:h-11 lg:w-11"
      >
        <Bookmark
          className={`h-6 w-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] lg:h-5 lg:w-5 lg:drop-shadow-none ${
            video.isSaved ? 'fill-amber-500 text-amber-500' : 'text-white lg:text-neutral-800'
          }`}
        />
      </button>
      <span className="text-[11px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] lg:text-xs">
        <span className="lg:hidden">{t('video.save')}</span>
        <span className="hidden lg:inline">{formatCount(video.savesCount)}</span>
      </span>
    </div>
  );
}
