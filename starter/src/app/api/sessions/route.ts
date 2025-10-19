import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { generateCode } from "@/lib/sessionCode";

type CreateBody = {
  expiresAt: string; // ISO string from client (UTC recommended)
  payload?: Record<string, unknown>; // optional metadata
};

export async function POST(req: Request) {
  const body = (await req.json()) as CreateBody;
  if (!body?.expiresAt) {
    return NextResponse.json({ error: "expiresAt required" }, { status: 400 });
  }

  const expiresAt = new Date(body.expiresAt);
  const now = new Date();
  const ttlSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

  if (Number.isNaN(ttlSeconds) || ttlSeconds <= 0) {
    return NextResponse.json({ error: "expiresAt must be in the future" }, { status: 400 });
  }

  // Try a few times in case of collisions (26^4 = 456,976 total)
  for (let attempts = 0; attempts < 8; attempts++) {
    const code = generateCode(4);
    const key = `session:${code}`;

    // Value can include any metadata you want; store expiresAt for debugging
    const value = {
      code,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      payload: body.payload ?? null,
    };

    // NX = set only if not exists, EX = expire in N seconds
    const ok = await redis.set(key, value, { nx: true, ex: ttlSeconds });
    if (ok === "OK") {
      return NextResponse.json({ code, expiresAt: value.expiresAt });
    }
  }

  return NextResponse.json({ error: "Could not allocate code, try again" }, { status: 503 });
}