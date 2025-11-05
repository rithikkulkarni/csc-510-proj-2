// src/app/api/sessions/route.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// --- Test control knobs for the Supabase client mock ---
let insertedRow: any = null;
let insertError: any = null;
let lastInsertPayload: any = null;

// Mock @supabase/supabase-js BEFORE importing the route module
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => {
      return {
        from: (table: string) => ({
          insert: (payload: any) => {
            lastInsertPayload = payload;
            return {
              select: () => ({
                single: async () => ({
                  data: insertedRow,
                  error: insertError || null,
                }),
              }),
            };
          },
        }),
        // (auth config is ignored in tests)
      };
    }),
  };
});

// Helpers to load the module fresh with current env & mocks
async function loadRoute() {
  vi.resetModules();
  // keep the same vi.mock for supabase in effect
  return await import('./route');
}

// Minimal NextRequest-like object for the handler
function makeReq(body: any, url = 'http://localhost/api/sessions') {
  const u = new URL(url);
  return {
    json: async () => body,
    nextUrl: u, // has .searchParams.get
  } as any;
}

// Deterministic code generator: A, B, C, D...
function mockCryptoSequence() {
  // A type-compatible mock for the overloaded Web Crypto API
  const getRandomValuesMock = vi.fn(<T extends ArrayBufferView | null>(array: T): T => {
    if (array) {
      // Create a Uint8Array view over the same underlying buffer
      const u8 = new Uint8Array(
        array.buffer,
        (array as any).byteOffset ?? 0,
        (array as any).byteLength ?? (array as any).length ?? 0
      );
      // Fill 0,1,2,... so code -> "ABCD"
      for (let i = 0; i < u8.length; i++) u8[i] = i;
    }
    return array;
  });

  // Install a global crypto with our mock; avoids spy type issues
  vi.stubGlobal('crypto', { getRandomValues: getRandomValuesMock } as any);
}

beforeEach(() => {
  insertedRow = null;
  insertError = null;
  lastInsertPayload = null;
  // Default envs present unless a test overrides them
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv_test';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('/api/sessions POST', () => {
  it('500 when Supabase env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { POST } = await loadRoute();
    const res: any = await POST(makeReq({}));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toMatch(/Missing Supabase server configuration/i);
  });

  it('400 for missing required fields (price_range/lat/lng/hours)', async () => {
    const { POST } = await loadRoute();

    // body missing hours and lat/lng
    const res: any = await POST(makeReq({ price_range: 2 }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toMatch(/Missing required fields/i);
  });

  it('201 on success (top-level lat/lng, numeric price_range) and maps radiusMiles', async () => {
    mockCryptoSequence();

    // What the DB returns (trigger-populated)
    insertedRow = {
      id: 'sess_1',
      code: 'IGNORED', // route uses generated code, not DB's
      expiry_hours: 3,
      ends_at: '2099-01-01T00:00:00Z',
    };

    const { POST } = await loadRoute();

    const body = {
      price_range: 3,
      lat: 35.1,
      lng: -78.5,
      radiusMiles: 7.5,
      hours: 3,
    };

    const res: any = await POST(makeReq(body));
    expect(res.status).toBe(201);

    // Ensure we inserted with mapped fields
    expect(lastInsertPayload).toMatchObject({
      code: expect.any(String),
      price_range: 3,
      latitude: 35.1,
      longitude: -78.5,
      radius: 7.5,
      expiry_hours: 3,
    });

    // Code is 4 uppercase letters; with our crypto mock -> ABCD
    expect(lastInsertPayload.code).toMatch(/^[A-Z]{4}$/);
    expect(lastInsertPayload.code).toBe('ABCD');

    const json = await res.json();
    expect(json.id).toBe('sess_1');
    expect(json.session.ends_at).toBe('2099-01-01T00:00:00Z');
  });

  it('201 on success with nested location & debug flag; price mapped from "$$" and legacy "10-20"', async () => {
    mockCryptoSequence();

    insertedRow = {
      id: 'sess_2',
      expiry_hours: 2,
      ends_at: '2099-01-02T00:00:00Z',
    };

    const { POST } = await loadRoute();

    // First: "$$" should map to 2
    let res: any = await POST(
      makeReq(
        {
          price: '$$',
          location: { lat: 10, lng: 20 },
          hours: 2,
        },
        'http://localhost/api/sessions?debug=1'
      )
    );
    expect(res.status).toBe(201);
    let body = await res.json();
    expect(body.code).toBe('ABCD');
    expect(body.session).toBeTruthy();
    expect(body.debug).toBeTruthy();
    expect(body.debug.has_expiry_hours).toBe(true);
    expect(body.debug.has_ends_at).toBe(true);
    expect(lastInsertPayload).toMatchObject({
      price_range: 2,
      latitude: 10,
      longitude: 20,
    });

    // Second: legacy "10-20" -> 2
    res = await POST(
      makeReq({
        price: '10-20',
        location: { lat: 1, lng: 2 },
        hours: 2,
      })
    );
    expect(res.status).toBe(201);
    body = await res.json();
    expect(body.id).toBe('sess_2');
    expect(lastInsertPayload.price_range).toBe(2);
    expect(lastInsertPayload.latitude).toBe(1);
    expect(lastInsertPayload.longitude).toBe(2);
  });

  it('also maps labels like "moderate" and clamps numbers; null/invalid -> 400', async () => {
    insertedRow = { id: 'sess_3', expiry_hours: 1, ends_at: '2099-01-03T00:00:00Z' };
    const { POST } = await loadRoute();

    // "moderate" => 2
    let res: any = await POST(
      makeReq({
        price: 'moderate',
        lat: 9,
        lng: 8,
        hours: 1,
      })
    );
    expect(res.status).toBe(201);
    expect(lastInsertPayload.price_range).toBe(2);

    // numeric within 1..4 => OK
    res = await POST(
      makeReq({
        price: 4,
        lat: 1,
        lng: 1,
        hours: 1,
      })
    );
    expect(res.status).toBe(201);
    expect(lastInsertPayload.price_range).toBe(4);

    // invalid price + missing required => 400
    res = await POST(
      makeReq({
        price: 'unknown',
        lat: 0 / 0, // NaN
        lng: 5,
        hours: 'x' as any,
      })
    );
    expect(res.status).toBe(400);
    const errJson = await res.json();
    expect(errJson.error).toMatch(/Missing required fields/i);
  });

  it('500 when insert fails', async () => {
    insertError = { message: 'db exploded' };
    insertedRow = null;

    const { POST } = await loadRoute();

    const res: any = await POST(
      makeReq({
        price_range: 1,
        lat: 3,
        lng: 4,
        hours: 2,
      })
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/db exploded|Failed to insert/i);
  });
});
