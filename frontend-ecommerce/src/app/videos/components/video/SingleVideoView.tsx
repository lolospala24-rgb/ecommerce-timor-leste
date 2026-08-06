'use client';

import { useEffect } from 'react';
import { VideoLayout } from '../layout/VideoLayout';
import { useVideo } from '@/hooks/useVideo';
import { VideoPlayer } from '../player/VideoPlayer';

export function SingleVideoView({
  videoId,
  onBack,
}: {
  videoId: string;
  onBack: () => void;
}) {
  const { video } = useVideo(videoId);

  useEffect(() => {
    // no-op: keeps component client-only and allows future enhancements
  }, [videoId]);

  return (
    <VideoLayout>
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[#A3A3A3] hover:text-white"
        >
          ← Back
        </button>
      </div>

      {/* Render the actual player if we have the video object */}
      {video ? (
        <VideoPlayer src={video.url} />
      ) : (
        <div className="text-[#A3A3A3]">Loading video...</div>
      )}
    </VideoLayout>
  );
}

