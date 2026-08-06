import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

function unwrapPayload(payload: any) {
  if (!payload || typeof payload !== 'object') return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return payload.data ?? payload;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    return NextResponse.json({ success: false, message: 'Backend API URL is not configured' }, { status: 500 });
  }

  const { id } = await params;
  try {
    const response = await axios.get(`${apiBaseUrl}/api/v1/videos/${id}`);
    return NextResponse.json(unwrapPayload(response.data));
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.response?.data?.message || 'Failed to load video' }, { status: error.response?.status || 502 });
  }
}
