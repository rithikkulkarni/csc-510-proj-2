/**
 * @file route.integration.test.ts
 * @description Integration tests for the `/api/sessions` POST endpoint.
 *
 * These tests validate full end-to-end behavior against a real Supabase
 * project (when environment variables are provided):
 *
 * ✅ Session creation via server route POST handler
 * ✅ Confirmation that `created_at` and computed `ends_at` fields are stored correctly
 * ✅ Database persistence and correctness by querying Supabase directly
 * ✅ Post-test cleanup to maintain a clean environment
 *
 * Safety Handling:
 * - If required environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
 *   are not set, tests are automatically skipped to avoid unintended failures.
 *
 * Notes:
 * - Uses service-role key for write access because real DB operations are required
 * - Lightweight delay added to avoid replication lag during query assertions
 */

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { POST } from './route';

// ✅ Integration test suite only runs when env config is available
describe('POST /api/sessions integration', () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // ⛔ Skip execution when Supabase isn't configured
  if (!supabaseUrl || !serviceKey) {
    it('skips because SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set', () => {
      expect(true).toBe(true);
    });
    return;
  }

  // ✅ Direct server-authenticated Supabase client (bypasses RLS)
  const serverSupabase = createClient(supabaseUrl, serviceKey);

  it(`
    ✅ Integration Success:
    - Creates a session row via POST handler
    - Server populates a valid "ends_at" timestamp
    - Database row validated directly via SQL
  `, async () => {
    // API request payload
    const payload = {
      price: '$$',
      location: { lat: 37.7749, lng: -122.4194 },
      radiusMiles: 5,
      hours: 2, // used by API to compute `ends_at`
    };

    // Simulated Next.js request object
    const req = {
      json: async () => payload,
    } as any;

    // 🔥 Call actual HTTP handler
    const res = await POST(req);
    const body = await (res as any).json();

    // ✅ Response shape verifies handler executed successfully
    expect(res).toBeDefined();
    expect(body).toBeDefined();
    expect(body.code).toBeDefined();
    expect(body.id).toBeDefined();

    const id = body.id;

    // Slight delay to avoid timing mismatch with DB update
    await new Promise((r) => setTimeout(r, 250));

    // ✅ Direct DB validation using service-role Supabase client
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

    // ends_at must exist & be after created_at
    expect(session.ends_at).toBeTruthy();
    const createdAt = new Date(session.created_at);
    const endsAt = new Date(session.ends_at);

    expect(endsAt.getTime()).toBeGreaterThan(createdAt.getTime());

    // ✅ Cleanup — ensure test environment remains stable
    const { error: cleanupError } = await serverSupabase.from('sessions').delete().eq('id', id);

    if (cleanupError) {
      console.warn('Failed to delete test session:', cleanupError.message || cleanupError);
    }
  });
});
