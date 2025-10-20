import { vi, describe, test, expect } from 'vitest';
import { GET } from './route';
import { createMocks } from 'node-mocks-http';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: () => ({
        select: () => ({
          eq: (code: string) => ({
            single: async () => {
              if (code === 'VALID') {
                return { data: { code: 'VALID', status: 'open', created_at: new Date(), length_hours: 1 }, error: null };
              } else if (code === 'EXPD') {
                return {
                  data: { code: 'EXPD', status: 'open', created_at: new Date(Date.now() - 2 * 3600 * 1000), length_hours: 1 },
                  error: null
                };
              } else {
                return { data: null, error: { message: 'Not found' } };
              }
            }
          })
        })
      })
    })
  };
});

describe('API Route: GET /api/sessions/[code]', () => {
  test('returns session for valid code', async () => {
    const res = await GET({} as any, { params: { code: 'VALID' } });
    const data = await res.json();
    expect(data.code).toBe('VALID');
    expect(data.status).toBe('open');
  });

  test('returns closed for expired session', async () => {
    const res = await GET({} as any, { params: { code: 'EXPD' } });
    const data = await res.json();
    expect(data.status).toBe('closed');
  });

  test('returns 404 for non-existent session', async () => {
    const res = await GET({} as any, { params: { code: 'NONE' } });
    const data = await res.json();
    expect(data.error).toBe('Session not found');
  });

  test('returns 400 for missing code', async () => {
    const res = await GET({} as any, { params: { code: '' } });
    const data = await res.json();
    expect(data.error).toBe('Session code is required');
  });
});
