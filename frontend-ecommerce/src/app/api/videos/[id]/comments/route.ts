import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    return NextResponse.json({ success: false, message: 'Backend API URL is not configured' }, { status: 500 });
  }

  const { id } = await params;
  try {
    const response = await axios.get(`${apiBaseUrl}/api/v1/videos/${id}/comments`);
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.response?.data?.message || 'Failed to load comments' }, { status: error.response?.status || 502 });
  }
}
