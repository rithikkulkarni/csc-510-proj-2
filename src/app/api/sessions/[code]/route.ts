import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET: Fetch a session by its code
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> } // Next.js expects a Promise
) {
  try {
    const { code } = await context.params;

    if (!code) {
      return NextResponse.json({ error: 'Missing session code' }, { status: 400 });
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}

// POST: Optionally, create a new session
export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const body = await request.json();
    const code = body?.code;

    if (!code) {
      return NextResponse.json({ error: 'Missing session code' }, { status: 400 });
    }

    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({ code })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session: newSession }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
