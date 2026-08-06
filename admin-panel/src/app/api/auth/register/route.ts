import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone, role } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`,
      { email, password, name, phone, role }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error: any) {
    console.error('Register error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Registration failed';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}