import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params;

  if (!code) {
    return NextResponse.json({ error: "Session code is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Calculate expiration
  const expiration = new Date(data.created_at);
  expiration.setHours(expiration.getHours() + data.length_hours);

  // Auto-close if expired
  if (new Date() >= expiration) {
    data.status = "closed";
  }

  return NextResponse.json(data);
}

