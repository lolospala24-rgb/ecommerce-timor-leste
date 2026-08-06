import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: 'auth/products/bulk POST' });
}
