/**
 * @file route.test.tsx
 * @description Unit tests for the `/api/test` GET endpoint.
 *
 * These tests validate:
 *  ✅ Correct success response when Supabase query succeeds
 *  ✅ Error handling and proper status code when Supabase fails
 *  ✅ JSON response structure in both scenarios
 *
 * Implementation Details:
 * - Supabase client is mocked to control query outcomes
 * - Only the minimal method chain used in the route (`from → select → limit`)
 *   is simulated to keep test logic clean and precise
 *
 * Test Coverage:
 * - Ensures API route behavior remains stable even if Supabase changes
 * - Validates defensive error handling in production deployment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { supabase } from '@/lib/supabaseClient';

// ✅ Mock the Supabase client implementation
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/test', () => {
  it(`
    ✅ SUCCESS CASE:
    - Supabase returns a valid dataset
    - Endpoint responds with 200 & correct JSON
  `, async () => {
    // Mock the method chain: from('restaurants').select('*').limit(1)
    const mockLimit = vi.fn().mockResolvedValue({
      data: [{ id: 1, name: 'Pizza Place' }],
      error: null,
    });
    const mockSelect = vi.fn(() => ({ limit: mockLimit }));
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual([{ id: 1, name: 'Pizza Place' }]);
  });

  it(`
    ❌ FAILURE CASE:
    - Supabase returns an error object
    - Endpoint responds with 500 & correct error message
  `, async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    });
    const mockSelect = vi.fn(() => ({ limit: mockLimit }));
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const res = await GET();
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Database error');
  });
});
