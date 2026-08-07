import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

interface VideoApiErrorResponse {
  message?: string;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };

    const response = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/videos/${id}`, formData, { headers });

    return NextResponse.json({ success: true, data: response.data.data || response.data });
  } catch (error: unknown) {
    const axiosError = error as AxiosError<VideoApiErrorResponse>;
    return NextResponse.json(
      { success: false, message: axiosError.response?.data?.message || 'Failed to update video' },
      { status: axiosError.response?.status || 400 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/videos/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ success: true, data: response.data });
  } catch (error: unknown) {
    const axiosError = error as AxiosError<VideoApiErrorResponse>;
    return NextResponse.json(
      { success: false, message: axiosError.response?.data?.message || 'Failed to delete video' },
      { status: axiosError.response?.status || 400 },
    );
  }
}
