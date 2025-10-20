export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = (params.code || '').toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }
  const data = await redis.get(`session:${code}`);
  if (!data) return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
  return NextResponse.json(data);
}