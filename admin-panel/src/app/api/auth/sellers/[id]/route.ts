import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'auth/sellers/[id] GET' });
}

export async function PUT() {
  return NextResponse.json({ message: 'auth/sellers/[id] PUT' });
}

export async function DELETE() {
  return NextResponse.json({ message: 'auth/sellers/[id] DELETE' });
}
