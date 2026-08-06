import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;
    logger.debug('[proxy][GET /api/cart] access_token present:', !!accessToken);
    logger.debug('[proxy][GET /api/cart] incoming headers:', Object.fromEntries(request.headers.entries()));

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/carts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    logger.debug('[proxy][GET /api/cart] backend response status:', response.status);
    logger.debug('[proxy][GET /api/cart] backend response data preview:', JSON.stringify(response.data).slice(0, 500));

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Cart fetched successfully',
    });
  } catch (error: any) {
    logger.error('Get cart error:', error.response?.data || error.message);

    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to fetch cart';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let accessToken = request.cookies.get('access_token')?.value;

    // If cookie missing, check Authorization header as fallback (some clients may send it)
    if (!accessToken) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.slice(7);
        logger.debug('[proxy][POST /api/cart] Using Authorization header as fallback.');
      }
    }

    logger.debug('[proxy][POST /api/cart] access_token present:', !!accessToken);

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Read raw request text for better debugging in development
    let rawText: string | null = null;
    let body: any = {};
    try {
      rawText = await request.text();
      logger.debug('[proxy][POST /api/cart] raw body preview:', rawText ? rawText.slice(0, 500) : rawText);
      if (rawText) {
        try {
          body = JSON.parse(rawText);
        } catch (parseErr) {
          logger.warn('[proxy][POST /api/cart] Failed to parse JSON body, falling back to empty object', parseErr);
          body = {};
        }
      }
    } catch (readErr) {
      logger.warn('[proxy][POST /api/cart] Failed to read request text, will attempt request.json()', readErr);
      try {
        body = await request.json();
      } catch (jsonErr) {
        logger.error('[proxy][POST /api/cart] Failed to parse request.json()', jsonErr);
        body = {};
      }
    }

    logger.debug('[proxy][POST /api/cart] incoming body parsed:', body);

    // accept productId in several shapes (productId, id, product.id)
    let rawProductId = body?.productId ?? body?.id ?? undefined;
    if ((rawProductId === undefined || rawProductId === null) && body?.product && (body.product.id || body.product.productId)) {
      rawProductId = body.product.id || body.product.productId;
    }
    const rawQuantity = body?.quantity ?? body?.qty ?? 1;
    const rawVariantId = body?.variantId ?? body?.variant?.id ?? undefined;

    // Coerce to numbers and validate
    const productId = rawProductId !== undefined ? Number(rawProductId) : undefined;
    const quantity = rawQuantity !== undefined ? Number(rawQuantity) : 1;
    const variantId = rawVariantId !== undefined ? Number(rawVariantId) : undefined;

    if (!productId || isNaN(productId) || productId <= 0) {
      logger.error('Add to cart: invalid productId', { rawProductId, productId, rawText });
      return NextResponse.json(
        { success: false, message: 'Product ID is required and must be a positive number' },
        { status: 400 }
      );
    }

    try {
      const payload: any = { productId, quantity };
      if (variantId && !isNaN(variantId) && variantId > 0) {
        payload.variantId = variantId;
      }
      logger.debug('[proxy][POST /api/cart] Proxying add-to-cart payload:', payload);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/carts/add`,
        payload,
        {
          headers: {
            Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.debug('[proxy][POST /api/cart] backend response status:', response.status);
      logger.debug('[proxy][POST /api/cart] backend response data preview:', JSON.stringify(response.data).slice(0, 500));

      return NextResponse.json({
        success: true,
        data: response.data.data || response.data,
        message: 'Item added to cart successfully',
      });
    } catch (err: any) {
      logger.error('[proxy][POST /api/cart] Backend add-to-cart error:', err.response?.data || err.message);
      const status = err.response?.status || 400;
      const message = err.response?.data?.message || 'Failed to add item to cart';
      return NextResponse.json({ success: false, message }, { status });
    }
  } catch (error: any) {
    logger.error('Add to cart error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Failed to add item to cart';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, quantity, variantId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    const payload: any = { productId, quantity };
    if (variantId !== undefined && variantId !== null) {
      payload.variantId = variantId;
    }

    const response = await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/carts/update`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Cart updated successfully',
    });
  } catch (error: any) {
    logger.error('Update cart error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Failed to update cart';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const variantId = searchParams.get('variantId');

    if (!productId) {
      return NextResponse.json(
        { success: false, message: 'Product ID is required' },
        { status: 400 }
      );
    }

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/carts/item/${productId}${variantId ? `?variantId=${variantId}` : ''}`;
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: response.data.data || response.data,
      message: 'Item removed from cart successfully',
    });
  } catch (error: any) {
    logger.error('Remove from cart error:', error.response?.data || error.message);

    const status = error.response?.status || 400;
    const message = error.response?.data?.message || 'Failed to remove item from cart';

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}