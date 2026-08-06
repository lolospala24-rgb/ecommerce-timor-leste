import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const sellerId = searchParams.get('sellerId') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const inStock = searchParams.get('inStock');
    const isActive = searchParams.get('isActive');
    const minRating = searchParams.get('minRating') || '';

    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);
    if (sellerId) params.append('sellerId', sellerId);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    if (inStock !== null) params.append('inStock', inStock);
    if (isActive !== null) params.append('isActive', isActive);
    if (minRating) params.append('minRating', minRating);

    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Products fetched successfully',
    });
  } catch (error: any) {
    console.error('Get products error:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to fetch products';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
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

    // Check if request is multipart/form-data (file upload)
    const contentType = request.headers.get('content-type') || '';
    let data: any;
    let headers: any = {
      Authorization: `Bearer ${accessToken}`,
    };

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      data = formData;
      headers['Content-Type'] = 'multipart/form-data';
    } else {
      // Handle JSON data
      const body = await request.json();
      data = body;
      headers['Content-Type'] = 'application/json';
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products`,
      data,
      { headers }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Product created successfully',
    });
  } catch (error: any) {
    console.error('Create product error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Failed to create product';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}