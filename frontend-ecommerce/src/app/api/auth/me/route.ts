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
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'User fetched successfully',
    });
  } catch (error: any) {
    console.error('Get user error:', error.response?.data || error.message);

    const status = error.response?.status || 401;
    const message = error.response?.data?.message || 'Failed to fetch user';

    // Clear cookies on auth failure
    const response = NextResponse.json(
      { success: false, message },
      { status }
    );

    if (status === 401) {
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
    }

    return response;
  }
}