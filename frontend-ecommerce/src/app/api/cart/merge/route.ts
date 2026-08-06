import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

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
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, message: 'Invalid items payload' },
        { status: 400 }
      );
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/carts/merge`,
      { items },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Carts merged successfully',
    });
  } catch (error: any) {
    console.error('Merge cart error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Failed to merge cart';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}
