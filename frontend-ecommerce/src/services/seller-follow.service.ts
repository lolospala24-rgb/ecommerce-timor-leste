import api from '@/lib/api';

export interface FollowStatus {
  isFollowing: boolean;
  followersCount: number;
}

// See the matching comment in video.service.ts — the real payload is
// `response.data.data`, not `response.data`.
function unwrapItem(response: any): any {
  return response?.data?.data;
}

class SellerFollowService {
  private static instance: SellerFollowService;

  static getInstance(): SellerFollowService {
    if (!SellerFollowService.instance) {
      SellerFollowService.instance = new SellerFollowService();
    }
    return SellerFollowService.instance;
  }

  async getStatus(sellerId: number): Promise<FollowStatus> {
    const response = await api.get(`/sellers/${sellerId}/follow-status`);
    return unwrapItem(response) ?? { isFollowing: false, followersCount: 0 };
  }

  async follow(sellerId: number): Promise<FollowStatus> {
    const response = await api.post(`/sellers/${sellerId}/follow`);
    return unwrapItem(response) ?? { isFollowing: true, followersCount: 0 };
  }

  async unfollow(sellerId: number): Promise<FollowStatus> {
    const response = await api.delete(`/sellers/${sellerId}/follow`);
    return unwrapItem(response) ?? { isFollowing: false, followersCount: 0 };
  }
}

export const sellerFollowService = SellerFollowService.getInstance();
