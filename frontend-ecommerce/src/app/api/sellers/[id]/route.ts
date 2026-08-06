import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    return NextResponse.json({ success: false, message: 'Backend API URL is not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const response = await axios.get(`${apiBaseUrl}/api/v1/sellers/${id}`);
    const payload = response.data?.data ?? response.data;

    return NextResponse.json({ success: true, data: payload });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.response?.data?.message || 'Failed to load seller profile' },
      { status: error.response?.status || 502 },
    );
  }
}
