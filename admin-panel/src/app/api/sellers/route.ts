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
    const isVerified = searchParams.get('isVerified');

    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (search) params.append('search', search);
    if (isVerified !== null) params.append('isVerified', isVerified);

    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sellers?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Sellers fetched successfully',
    });
  } catch (error: any) {
    console.error('Get sellers error:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to fetch sellers';

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

    const body = await request.json();
    const {
      email,
      password,
      name,
      phone,
      storeName,
      storePhone,
      storeEmail,
      storeAddress,
      storeLogo,
      storeBanner,
      description,
    } = body;

    // Validation
    if (!email || !password || !name || !storeName || !storePhone || !storeAddress) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields: email, password, name, storeName, storePhone, storeAddress are required' 
        },
        { status: 400 }
      );
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sellers/register`,
      {
        email,
        password,
        name,
        phone,
        storeName,
        storePhone,
        storeEmail,
        storeAddress,
        storeLogo,
        storeBanner,
        description,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Seller registered successfully. Awaiting verification.',
    });
  } catch (error: any) {
    console.error('Create seller error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Failed to register seller';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}