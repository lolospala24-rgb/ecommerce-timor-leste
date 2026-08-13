import { VideoSkeleton } from './components/VideoSkeleton';

export default function VideoShopLoading() {
  return (
    <div className="h-[100dvh] w-full">
      <VideoSkeleton />
    </div>
  );
}
