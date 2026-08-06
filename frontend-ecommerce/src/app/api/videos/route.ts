import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

function mapVideo(item: any) {
  const product = item?.product;

  return {
    id: item?.id ?? 0,
    title: item?.title ?? product?.name ?? 'Untitled video',
    description: item?.description ?? product?.description ?? '',
    videoUrl: item?.videoUrl ?? '',
    thumbnail: item?.thumbnailUrl ?? item?.thumbnail ?? product?.thumbnail ?? null,
    thumbnailUrl: item?.thumbnailUrl ?? item?.thumbnail ?? product?.thumbnail ?? null,
    productId: item?.productId ?? product?.id ?? null,
    price: item?.price ?? product?.price ?? null,
    discount: item?.discount ?? null,
    rating: item?.rating ?? null,
    sold: item?.sold ?? item?.views ?? 0,
    seller: item?.seller ?? null,
    views: item?.views ?? 0,
    likes: item?.likes ?? 0,
    shares: item?.shares ?? 0,
    isActive: item?.isActive ?? true,
    sellerInfo: product
      ? {
          id: product?.seller?.id ?? null,
          storeName: product?.seller?.storeName ?? product?.storeName ?? null,
          isVerified: Boolean(product?.seller?.isVerified ?? product?.isVerified ?? false),
          followers: product?.followers ?? 128,
          logo: product?.seller?.storeLogo ?? product?.storeLogo ?? null,
        }
      : null,
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
    product: product
      ? {
          id: product.id,
          name: product.name,
          slug: product.slug,
          thumbnail: product.thumbnail,
          price: product.price,
        }
      : null,
  };
}

function mapProductToVideo(product: any) {
  const videoUrl = product?.videoUrl;
  if (!videoUrl) return null;

  return {
    id: product?.id ?? 0,
    title: product?.name ?? 'Product video',
    description: product?.description ?? '',
    videoUrl,
    thumbnail: product?.thumbnail ?? product?.images?.[0] ?? null,
    thumbnailUrl: product?.thumbnail ?? product?.images?.[0] ?? null,
    productId: product?.id ?? null,
    price: product?.price ?? null,
    discount: null,
    rating: product?.rating ?? null,
    sold: product?.totalReviews ?? 0,
    seller: product?.seller?.storeName ?? null,
    views: 0,
    likes: 0,
    shares: 0,
    isActive: product?.isActive ?? true,
    sellerInfo: {
      id: product?.seller?.id ?? null,
      storeName: product?.seller?.storeName ?? product?.storeName ?? null,
      isVerified: Boolean(product?.seller?.isVerified ?? product?.isVerified ?? false),
      followers: product?.followers ?? 128,
      logo: product?.seller?.storeLogo ?? product?.storeLogo ?? null,
    },
    createdAt: product?.createdAt,
    updatedAt: product?.updatedAt,
    product: {
      id: product?.id,
      name: product?.name,
      slug: product?.slug,
      thumbnail: product?.thumbnail ?? product?.images?.[0] ?? null,
      price: product?.price ?? null,
    },
  };
}

function unwrapArrayPayload(payload: any): any[] {
  if (Array.isArray(payload)) return payload;

  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;

  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data.data)) return payload.data.data;
    if (Array.isArray(payload.data.items)) return payload.data.items;
  }

  return [];
}

export async function GET(request: NextRequest) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { success: false, message: 'Backend API URL is not configured' },
      { status: 500 },
    );
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || '20');
    const videoResponse = await axios.get(`${apiBaseUrl}/api/v1/videos/feed`, {
      params: {
        limit,
        filter: 'latest',
      },
    });

    const videoPayload = unwrapArrayPayload(videoResponse.data);
    const videos = videoPayload.map(mapVideo).filter(Boolean);

    if (videos.length > 0) {
      return NextResponse.json(videos);
    }

    const productsResponse = await axios.get(`${apiBaseUrl}/api/v1/products`, {
      params: {
        limit,
        isActive: true,
      },
    });

    const productsPayload = unwrapArrayPayload(productsResponse.data);
    const products = productsPayload;
    const fallbackVideos = products
      .map(mapProductToVideo)
      .filter(Boolean);

    return NextResponse.json(fallbackVideos);
  } catch (error: any) {
    console.error('Get videos error:', error.response?.data || error.message);
    return NextResponse.json(
      { success: false, message: error.response?.data?.message || 'Failed to load videos' },
      { status: error.response?.status || 502 },
    );
  }
}
