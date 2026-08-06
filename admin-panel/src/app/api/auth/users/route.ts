import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'auth/users GET' });
}

export async function POST() {
  return NextResponse.json({ message: 'auth/users POST' });
}
