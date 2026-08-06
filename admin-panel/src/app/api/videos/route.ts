import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

interface VideoApiErrorResponse {
  message?: string;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/videos/feed`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: { page, limit },
    });

    const payload = response.data?.data ?? response.data ?? [];
    const data = Array.isArray(payload) ? payload : payload?.items ?? [];

    return NextResponse.json({
      success: true,
      data,
      total: response.data?.total || 0,
    });
  } catch (error: unknown) {
    const axiosError = error as AxiosError<VideoApiErrorResponse>;
    console.error('Get admin videos error:', axiosError.response?.data || axiosError.message);
    return NextResponse.json(
      { success: false, message: axiosError.response?.data?.message || 'Failed to fetch videos' },
      { status: axiosError.response?.status || 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 },
      );
    }

    const contentType = request.headers.get('content-type') || '';
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
    const data = contentType.includes('multipart/form-data')
      ? await request.formData()
      : await request.json();

    if (contentType.includes('multipart/form-data')) {
      headers['Content-Type'] = 'multipart/form-data';
    } else {
      headers['Content-Type'] = 'application/json';
    }

    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/videos`, data, { headers });

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
    });
  } catch (error: unknown) {
    const axiosError = error as AxiosError<VideoApiErrorResponse>;
    console.error('Create video error:', axiosError.response?.data || axiosError.message);
    return NextResponse.json(
      { success: false, message: axiosError.response?.data?.message || 'Failed to create video' },
      { status: axiosError.response?.status || 400 },
    );
  }
}
