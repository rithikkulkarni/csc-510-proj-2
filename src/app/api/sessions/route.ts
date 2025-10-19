import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { generateCode } from '@/lib/sessionCode'

export async function POST(req: Request) {
  const { expiresAt, payload } = await req.json()
  const exp = new Date(expiresAt)
  const now = new Date()
  const ttlSeconds = Math.floor((exp.getTime() - now.getTime()) / 1000)
  if (Number.isNaN(ttlSeconds) || ttlSeconds <= 0) {
    return NextResponse.json({ error: 'expiresAt must be in the future' }, { status: 400 })
  }

  for (let i = 0; i < 8; i++) {
    const code = generateCode(4)
    const key = `session:${code}`
    const value = { code, createdAt: now.toISOString(), expiresAt: exp.toISOString(), payload: payload ?? null }
    const ok = await redis.set(key, value, { nx: true, ex: ttlSeconds })
    if (ok === 'OK') {
      return NextResponse.json({ code, expiresAt: value.expiresAt })
    }
  }
  return NextResponse.json({ error: 'Could not allocate code' }, { status: 503 })
}