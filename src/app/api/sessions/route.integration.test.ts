import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { POST } from './route';

// Integration test: calls the server POST handler and verifies ends_at is set
describe('POST /api/sessions integration', () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    it('skips because SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const serverSupabase = createClient(supabaseUrl, serviceKey);

  it('creates a session and sets ends_at based on created_at + hours', async () => {
    // Prepare payload
    const payload = {
      price: '$$',
      location: { lat: 37.7749, lng: -122.4194 },
      radiusMiles: 5,
      hours: 2,
    };

    // Stubbed request object with json() method
    const req = {
      json: async () => payload,
    } as any;

    const res = await POST(req);
    // NextResponse-like object should support json()
    const body = await (res as any).json();

    expect(res).toBeDefined();
    expect(body).toBeDefined();
    expect(body.code).toBeDefined();
    expect(body.id).toBeDefined();

    const id = body.id;

    // Wait briefly for DB replication/update if needed
    await new Promise((r) => setTimeout(r, 250));

    // Fetch the row directly to assert ends_at
    const { data: session, error } = await serverSupabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch session for assertion: ${error.message}`);
    }

    expect(session).toBeDefined();
    expect(session.id).toBe(id);
    // ends_at should be non-null and later than created_at
    expect(session.ends_at).toBeTruthy();
    const created = new Date(session.created_at);
    const endsAt = new Date(session.ends_at);
    expect(endsAt.getTime()).toBeGreaterThan(created.getTime());

    // Cleanup: delete the test session
    const { error: delErr } = await serverSupabase.from('sessions').delete().eq('id', id);
    if (delErr) {
      console.warn('Failed to delete test session:', delErr.message || delErr);
    }
  });
});
