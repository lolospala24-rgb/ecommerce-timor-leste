import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const accessToken = request.cookies.get('access_token')?.value;

    if (accessToken) {
      // Call backend logout endpoint
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      ).catch((error) => {
        // Cookies are cleared unconditionally below regardless of this
        // outcome — still worth a warning if the backend session wasn't
        // actually invalidated server-side.
        console.warn('Backend logout call failed (cookies cleared anyway):', error);
      });
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear cookies
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);

    // Still clear cookies even if backend call fails
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');

    return response;
  }
}