import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: 'auth/users/[id]/block POST' });
}
