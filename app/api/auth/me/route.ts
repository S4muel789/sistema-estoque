import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, user });
}
