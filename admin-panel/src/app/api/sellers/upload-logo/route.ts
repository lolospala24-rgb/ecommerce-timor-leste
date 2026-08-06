import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Logo file is required' },
        { status: 400 }
      );
    }

    // Create new FormData for backend
    const backendFormData = new FormData();
    backendFormData.append('logo', file);

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sellers/upload-logo`,
      backendFormData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Logo uploaded successfully',
    });
  } catch (error: any) {
    console.error('Upload logo error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Failed to upload logo';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}