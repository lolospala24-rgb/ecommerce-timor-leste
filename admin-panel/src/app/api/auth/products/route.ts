import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'auth/products GET' });
}

export async function POST() {
  return NextResponse.json({ message: 'auth/products POST' });
}
