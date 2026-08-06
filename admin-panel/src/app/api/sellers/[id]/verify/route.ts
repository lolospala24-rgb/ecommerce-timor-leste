import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;
    const { id } = await params;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { success: false, message: 'Invalid seller ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isApproved, rejectionReason } = body;

    if (isApproved === undefined) {
      return NextResponse.json(
        { success: false, message: 'isApproved field is required' },
        { status: 400 }
      );
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sellers/${id}/verify`,
      { isApproved, rejectionReason },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const message = isApproved 
      ? 'Seller approved successfully' 
      : 'Seller rejected successfully';

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message,
    });
  } catch (error: any) {
    console.error('Verify seller error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Failed to verify seller';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}