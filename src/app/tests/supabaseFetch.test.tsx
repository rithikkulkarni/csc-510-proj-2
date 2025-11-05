// src/app/tests/supabaseFetch.test.tsx

import { describe, test, expect } from 'vitest';
import { supabase } from '../../lib/supabaseClient';

/**
 * Integration Test — Supabase Restaurant Fetch
 *
 * Verifies that the application's Supabase client can:
 * - Successfully query the `restaurants` table
 * - Return rows with expected schema fields
 *
 * This test assumes:
 * - A Supabase backend is properly configured via environment variables
 * - The `restaurants` table exists and may contain data
 *
 * Notes:
 * - If the table is empty, structural assertions are skipped
 * - Useful for connectivity/permission sanity checks during development
 *
 * @group integration
 */
describe('Supabase Fetch', () => {
  test('fetches restaurants from Supabase', async () => {
    const { data, error } = await supabase.from('restaurants').select('*');

    // Ensure no error occurred
    expect(error).toBeNull();
    expect(data).not.toBeNull();

    // If there are results, validate expected fields exist
    if (data && data.length > 0) {
      const first = data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('latitude');
      expect(first).toHaveProperty('longitude');
      expect(first).toHaveProperty('price_level');
    }
  });
});
