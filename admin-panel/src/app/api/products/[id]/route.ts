import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
        { success: false, message: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Product fetched successfully',
    });
  } catch (error: any) {
    console.error('Get product error:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to fetch product';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
        { success: false, message: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let data: any;
    let headers: any = {
      Authorization: `Bearer ${accessToken}`,
    };

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      data = formData;
      headers['Content-Type'] = 'multipart/form-data';
    } else {
      const body = await request.json();
      data = body;
      headers['Content-Type'] = 'application/json';
    }

    const response = await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${id}`,
      data,
      { headers }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Product updated successfully',
    });
  } catch (error: any) {
    console.error('Update product error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Failed to update product';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
        { success: false, message: 'Invalid product ID' },
        { status: 400 }
      );
    }

    await axios.delete(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete product error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Failed to delete product';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}