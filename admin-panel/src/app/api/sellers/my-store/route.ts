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

    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sellers/my-store`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Store fetched successfully',
    });
  } catch (error: any) {
    console.error('Get my store error:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to fetch store';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
      storeName,
      storePhone,
      storeEmail,
      storeAddress,
      description,
    } = body;

    const response = await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sellers/my-store`,
      {
        storeName,
        storePhone,
        storeEmail,
        storeAddress,
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
      message: 'Store updated successfully',
    });
  } catch (error: any) {
    console.error('Update my store error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Failed to update store';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}