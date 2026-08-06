import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'auth/users/[id] GET' });
}

export async function PUT() {
  return NextResponse.json({ message: 'auth/users/[id] PUT' });
}

export async function DELETE() {
  return NextResponse.json({ message: 'auth/users/[id] DELETE' });
}
