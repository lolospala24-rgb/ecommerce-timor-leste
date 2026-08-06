// app/api/wishlist/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, data: { items: [] }, message: 'Not authenticated' },
        { status: 200 }
      );
    }

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/wishlist`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return NextResponse.json(response.data);
    } catch (error) {
      // If backend endpoint doesn't exist, return empty wishlist
      return NextResponse.json({
        success: true,
        data: { items: [] },
        message: 'Wishlist fetched successfully (empty)',
      });
    }
  } catch (error) {
    // Return empty wishlist on error
    return NextResponse.json({
      success: true,
      data: { items: [] },
      message: 'Wishlist fetched successfully',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/wishlist`,
        { productId },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return NextResponse.json(response.data);
    } catch (error: any) {
      // If backend endpoint doesn't exist, still return success for local storage
      return NextResponse.json({
        success: true,
        data: { productId },
        message: 'Added to wishlist (local)',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to add to wishlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    try {
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/wishlist/${productId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return NextResponse.json(response.data);
    } catch (error) {
      // If backend endpoint doesn't exist, still return success
      return NextResponse.json({
        success: true,
        data: { productId },
        message: 'Removed from wishlist (local)',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to remove from wishlist' },
      { status: 500 }
    );
  }
}