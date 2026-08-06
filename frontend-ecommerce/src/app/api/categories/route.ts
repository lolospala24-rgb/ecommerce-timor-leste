import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '100';
    const search = searchParams.get('search') || '';
    const parentId = searchParams.get('parentId') || '';
    const includeProducts = searchParams.get('includeProducts') || '';

    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (search) params.append('search', search);
    if (parentId) params.append('parentId', parentId);
    if (includeProducts === 'true') params.append('includeProducts', 'true');

    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/categories?${params.toString()}`
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Categories fetched successfully',
    });
  } catch (error: any) {
    console.error('Get categories error:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to fetch categories';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}