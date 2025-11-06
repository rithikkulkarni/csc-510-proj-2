/**
 * @file route.test.tsx
 * @description Unit tests for the dynamic `/api/sessions/[code]` API route handlers (GET & POST).
 *
 * ✅ Covers HTTP status responses, error handling, and Supabase interactions
 * ✅ Mocks Supabase queries at the `.from(...).select().eq().single()` pattern level
 * ✅ Mocks `NextResponse.json` to simulate real server responses
 *
 * GET Scenarios:
 *  - 400 → missing session code in route params
 *  - 500 → Supabase `.single()` returns an error
 *  - 200 → Valid `code` returns session object
 *  - 500 → Unexpected internal error (e.g., failed param resolution)
 *
 * POST Scenarios:
 *  - 400 → missing session code in body
 *  - 500 → Supabase `.insert()` fails
 *  - 201 → Successful session creation and correct response structure
 *  - 500 → Unexpected errors thrown during request parsing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { supabase } from '@/lib/supabaseClient';

// ✅ Supabase mock — returns mock query chains depending on test scenario
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}));

// ✅ Minimal NextResponse.json mock to simulate response shape
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: any, init?: { status?: number }) => ({
      json: () => Promise.resolve(body),
      status: init?.status ?? 200,
      body, // test convenience
    })),
  },
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

//
// ----------------------------------
// ✅ GET Handler Tests
// ----------------------------------
describe('GET handler', () => {
  it('returns 400 if no code is provided', async () => {
    const response = await GET({} as any, { params: Promise.resolve({ code: '' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/Missing session code/i);
  });

  it('returns 500 if Supabase returns an error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Supabase error' },
    });
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));

    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const response = await GET({} as any, { params: Promise.resolve({ code: 'ABCD' }) });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('Supabase error');
  });

  it('returns session data when successful', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 1, code: 'ABCD' },
      error: null,
    });
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));

    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const response = await GET({} as any, { params: Promise.resolve({ code: 'ABCD' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.session).toEqual({ id: 1, code: 'ABCD' });
  });

  it('handles unexpected promise rejection from params', async () => {
    const badParams = { params: Promise.reject('broken') };
    const response = await GET({} as any, badParams as any);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toMatch(/Unexpected server error/i);
  });
});

//
// ----------------------------------
// ✅ POST Handler Tests
// ----------------------------------
describe('POST handler', () => {
  it('returns 400 when body lacks a code', async () => {
    const mockReq = { json: async () => ({}) } as any;

    const response = await POST(mockReq, { params: Promise.resolve({ code: '' }) });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/Missing session code/i);
  });

  it('returns 500 when Supabase insert returns an error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    });
    const mockSelect = vi.fn(() => ({ single: mockSingle }));
    const mockInsert = vi.fn(() => ({ select: mockSelect }));

    (supabase.from as any).mockReturnValue({ insert: mockInsert });

    const mockReq = { json: async () => ({ code: 'XYZ1' }) } as any;
    const response = await POST(mockReq, { params: Promise.resolve({ code: 'XYZ1' }) });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('Insert failed');
  });

  it('returns 201 on successful insert', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 10, code: 'NEWC' },
      error: null,
    });
    const mockSelect = vi.fn(() => ({ single: mockSingle }));
    const mockInsert = vi.fn(() => ({ select: mockSelect }));

    (supabase.from as any).mockReturnValue({ insert: mockInsert });

    const mockReq = { json: async () => ({ code: 'NEWC' }) } as any;
    const response = await POST(mockReq, { params: Promise.resolve({ code: 'NEWC' }) });
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.session).toEqual({ id: 10, code: 'NEWC' });
  });

  it('handles unexpected JSON parsing/logic errors gracefully', async () => {
    const badRequest = { json: vi.fn().mockRejectedValue('bad json') } as any;

    const response = await POST(badRequest, { params: Promise.resolve({ code: 'ERRR' }) });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toMatch(/Unexpected server error/i);
  });
});
