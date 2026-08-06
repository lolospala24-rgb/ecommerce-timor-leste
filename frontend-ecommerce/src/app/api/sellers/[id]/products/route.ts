import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    return NextResponse.json({ success: false, message: 'Backend API URL is not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '12';

    const response = await axios.get(`${apiBaseUrl}/api/v1/sellers/${id}/products`, {
      params: { page, limit },
    });

    const payload = response.data ?? {};
    const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.items) ? payload.items : [];

    return NextResponse.json({
      success: true,
      data: items,
      total: payload?.total ?? items.length,
      page: payload?.page ?? Number(page),
      limit: payload?.limit ?? Number(limit),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.response?.data?.message || 'Failed to load seller products' },
      { status: error.response?.status || 502 },
    );
  }
}
