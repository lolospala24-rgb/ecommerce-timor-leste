import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '10';

    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/featured?limit=${limit}`
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Featured products fetched successfully',
    });
  } catch (error: any) {
    console.error('Get featured products error:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to fetch featured products';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}