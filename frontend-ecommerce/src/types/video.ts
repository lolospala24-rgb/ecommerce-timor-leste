// Shapes here mirror what backend-services/src/modules/videos actually
// returns (Video model + product/seller relations + per-viewer engagement
// state) — see VideosRepository.videoInclude/attachViewerState. Raw API
// payloads are normalized into these via `normalizeVideo` in
// services/video.service.ts; nothing here is fabricated.

export interface VideoCreator {
  id: number;
  storeName: string;
  storeLogo: string | null;
  isVerified: boolean;
  followersCount: number;
}

export interface VideoProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  thumbnail: string | null;
  images: string[];
  stock: number;
  seller: VideoCreator | null;
}

export interface Video {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  views: number;
  likes: number;
  shares: number;
  commentsCount: number;
  savesCount: number;
  createdAt: string;
  updatedAt: string;
  product: VideoProduct | null;
  // Per-viewer state — always false/false/false for a signed-out visitor,
  // since the backend can't know "did I like this" without a user.
  isLiked: boolean;
  isSaved: boolean;
  isFollowingCreator: boolean;
  // Per-video moderation toggles, set by the admin (Video Shop → video
  // detail panel). The backend also enforces these server-side on the
  // like/comment/save/share mutations — hiding the button here is a UX
  // nicety, not the actual security boundary.
  allowComments: boolean;
  allowLikes: boolean;
  allowSharing: boolean;
  allowSave: boolean;
  enableShopping: boolean;
}

export interface VideoListResult {
  items: Video[];
  total: number;
}

export interface VideoFeedFilters {
  filter?: 'popular' | 'trending' | 'latest' | 'following';
  categoryId?: number;
  limit?: number;
}
