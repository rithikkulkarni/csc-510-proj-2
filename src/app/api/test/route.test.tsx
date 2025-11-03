import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/test', () => {
  it('returns 200 and data when Supabase query succeeds', async () => {
    // Mock the chain: from('restaurants').select('*').limit(1)
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

  it('returns 500 and error message when Supabase fails', async () => {
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
