/**
 * sessions.test.ts
 *
 * Tests the `getSessionByCode` function which fetches a session by its code from Supabase.
 *
 * Behavior Tested:
 * - Returns session data when the session exists
 * - Throws an error when Supabase returns an error
 *
 * Setup:
 * - Mocks `supabase.from().select().eq().single()` before each test
 * - Restores mocks after each test
 *
 * Test Cases:
 * 1. Returns session data for a valid code
 * 2. Throws an error if Supabase returns an error
 *
 * Notes:
 * - Uses Vitest for mocking and assertions
 * - Covers both success and failure paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSessionByCode } from './sessions';
import { supabase } from './supabaseClient';

describe('getSessionByCode', () => {
  let fromSpy: any;

  beforeEach(() => {
    // Mock the chain supabase.from().select().eq().single()
    const singleMock = vi.fn().mockResolvedValue({ data: { code: 'ABCD' }, error: null });
    const eqMock = vi.fn(() => ({ single: singleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({ select: selectMock } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns session data when found', async () => {
    const result = await getSessionByCode('abcd');

    expect(result).toEqual({ code: 'ABCD' });
    expect(fromSpy).toHaveBeenCalledWith('sessions');
  });

  it('throws an error when supabase returns an error', async () => {
    // Override the mock to return an error
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
    const eqMock = vi.fn(() => ({ single: singleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    vi.spyOn(supabase, 'from').mockReturnValue({ select: selectMock } as any);

    await expect(getSessionByCode('abcd')).rejects.toThrow(
      'Error fetching session: ${error.message}' // matches your current code
    );
  });
});
