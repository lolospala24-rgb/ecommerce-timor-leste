import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/categories/tree`
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Category tree fetched successfully',
    });
  } catch (error: any) {
    console.error('Get category tree error:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to fetch category tree';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}