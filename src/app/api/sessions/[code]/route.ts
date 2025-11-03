import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * GET /api/sessions/[code]
 *
 * Fetch an existing session by its unique join code.
 *
 * Path Param:
 * - code: string (required)
 *
 * Response Example:
 * { session: {...} }
 *
 * Errors:
 * - 400 missing code
 * - 500 session lookup failure
 */
export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
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

/**
 * POST /api/sessions/[code]
 *
 * Create a new session with a specific pre-generated code.
 * Useful in scenarios where the session code is not automatically assigned
 * and needs to be explicitly controlled by the client or backend workflow.
 *
 * Body:
 * - code: string (required)
 *
 * Response: 201 created
 * { session: {...} }
 *
 * Errors:
 * - 400 missing code
 * - 500 insert failure
 */
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
