import { describe, it, expect } from 'vitest';
import { supabase } from '../../lib/supabaseClient';

/**
 * Integration Test — Supabase Connectivity
 *
 * Verifies that the application can successfully communicate with the Supabase database
 * and that core tables (`restaurants`, `sessions`, `users`, `votes`) are accessible.
 *
 * Purpose:
 * - Sanity check for DB connectivity and permission config
 * - Ensures tables exist and return valid responses
 *
 * Notes:
 * - Queries `limit(1)` for minimal overhead
 * - Only checks that responses are arrays & no permission errors occur
 * - Does not assume presence of specific records or schema fields
 *
 * @group integration
 */
describe('Supabase Connection', () => {
  it('connects to Supabase and fetches restaurants', async () => {
    const { data, error } = await supabase.from('restaurants').select('*').limit(1);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
  });

  it('can fetch sessions', async () => {
    const { data, error } = await supabase.from('sessions').select('*').limit(1);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
  });

  it('can fetch users', async () => {
    const { data, error } = await supabase.from('users').select('*').limit(1);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
  });

  it('can fetch votes', async () => {
    const { data, error } = await supabase.from('votes').select('*').limit(1);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
  });
});
