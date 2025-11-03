import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}));

// Mock NextResponse realistically
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: any, init?: { status?: number }) => ({
      json: () => Promise.resolve(body),
      status: init?.status ?? 200,
      body,
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET handler', () => {
  it('returns 400 if no code is provided', async () => {
    const response = await GET({} as any, { params: Promise.resolve({ code: '' }) });
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json.error).toMatch(/Missing session code/);
  });

  it('returns 500 if supabase returns an error', async () => {
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

  it('returns session data if successful', async () => {
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

  it('handles unexpected errors gracefully', async () => {
    const badParams = { params: Promise.reject('broken') };
    const response = await GET({} as any, badParams as any);
    const json = await response.json();
    expect(response.status).toBe(500);
    expect(json.error).toMatch(/Unexpected server error/);
  });
});

describe('POST handler', () => {
  it('returns 400 if code missing from body', async () => {
    const mockReq = { json: async () => ({}) } as any;
    const response = await POST(mockReq, { params: Promise.resolve({ code: '' }) });
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json.error).toMatch(/Missing session code/);
  });

  it('returns 500 if supabase insert errors', async () => {
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

  it('handles unexpected POST errors gracefully', async () => {
    const badReq = { json: vi.fn().mockRejectedValue('bad json') } as any;
    const response = await POST(badReq, { params: Promise.resolve({ code: 'ERRR' }) });
    const json = await response.json();
    expect(response.status).toBe(500);
    expect(json.error).toMatch(/Unexpected server error/);
  });
});
