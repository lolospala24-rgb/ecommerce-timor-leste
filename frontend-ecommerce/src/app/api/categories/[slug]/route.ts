import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface RouteParams {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Category slug is required' },
        { status: 400 }
      );
    }

    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/categories/slug/${slug}`
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Category fetched successfully',
    });
  } catch (error: any) {
    console.error('Get category error:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to fetch category';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}