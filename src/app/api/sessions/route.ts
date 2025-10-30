import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key on the server to perform inserts that rely on server timestamps
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // We intentionally do not throw here since server may run without env in some test contexts,
  // but we will return proper errors when attempting to use the client.
}

const serverSupabase = createClient(supabaseUrl || '', supabaseServiceRoleKey || '', {
  // Force admin level on server
  auth: { persistSession: false },
});

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase server configuration' }, { status: 500 });
    }

    const body = await request.json();
    const {
      price,
      price_range: priceRangeRaw,
      location,
      lat: latRaw,
      lng: lngRaw,
      radiusMiles,
      hours,
    } = body || {};

    // detect debug flag on the request URL (?debug=1)
    const isDebug = request.nextUrl?.searchParams?.get?.('debug') === '1';

    // Accept either { location: { lat, lng } } or top-level lat and lng

    // Determine price_range (1..4). Accept either explicit price_range or legacy price string like "0-10".
    function mapPriceToRange(p: any): number | null {
      if (p == null) return null;
      const n = Number(p);
      if (!Number.isNaN(n) && [1, 2, 3, 4].includes(n)) return n;

      const s = String(p).trim();

      // Accept dollar-sign style like "$", "$$", "$$$", "$$$$"
      if (/^\$+$/.test(s)) {
        const count = Math.min(Math.max(s.length, 1), 4);
        return count;
      }

      // Accept human-readable labels (Google-like)
      const lowered = s.toLowerCase();
      if (lowered === 'inexpensive') return 1;
      if (lowered === 'moderately expensive' || lowered === 'moderate' || lowered === 'moderately')
        return 2;
      if (lowered === 'expensive') return 3;
      if (lowered === 'very expensive' || lowered === 'very') return 4;

      // Keep legacy numeric range strings mapping for backwards compatibility
      switch (s) {
        case '0-10':
        case '$0-10':
          return 1;
        case '10-20':
        case '$10-20':
          return 2;
        case '30-50':
        case '$30-50':
          return 3;
        case '50+':
        case '$50+':
          return 4;
        default:
          return null;
      }
    }

    const lat = location ? Number(location.lat) : Number(latRaw);
    const lng = location ? Number(location.lng) : Number(lngRaw);

    const price_range = mapPriceToRange(priceRangeRaw ?? price);

    if (
      price_range == null ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      typeof hours !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: price_range (1-4), lat/lng, hours' },
        { status: 400 }
      );
    }
    const radius = Number(radiusMiles || 0);

    // Generate code server-side using simple alphabet approach
    const code = generateCode(4);

    // Insert the session with created_at being set by the DB. We'll compute ends_at using SQL so
    // it is based on the same timestamp the DB uses for created_at to avoid clock skew.
    // Note: PostgreSQL interval syntax supports (hours || ' hours')::interval

    const insertPayload: any = {
      code,
      price_range: price_range,
      latitude: lat,
      longitude: lng,
      radius: radius,
      expiry_hours: hours,
      // keep ends_at null for now, we'll update it in a follow-up SQL statement
    };

    // Rely on DB trigger (expiry_hours -> ends_at) to compute ends_at atomically.
    // Request the full inserted row so the trigger-populated `ends_at` is returned.
    const { data: insertedRow, error: insertErr } = await serverSupabase
      .from('sessions')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertErr || !insertedRow) {
      return NextResponse.json(
        { error: insertErr?.message || 'Failed to insert session' },
        { status: 500 }
      );
    }

    if (isDebug) {
      // return diagnostics to help debug why ends_at might be null
      const debugInfo = {
        insertedRow,
        has_expiry_hours:
          insertedRow.expiry_hours !== undefined && insertedRow.expiry_hours !== null,
        has_ends_at: insertedRow.ends_at !== undefined && insertedRow.ends_at !== null,
      };
      return NextResponse.json(
        { code, id: insertedRow.id, session: insertedRow, debug: debugInfo },
        { status: 201 }
      );
    }

    return NextResponse.json({ code, id: insertedRow.id, session: insertedRow }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 });
  }
}

// Simple server-side code generator (uppercase letters)
function generateCode(len = 4) {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let out = '';
  const bytes = cryptoRandomBytes(len);
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

function cryptoRandomBytes(len: number) {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return arr;
  }
  // Node fallback
  const buf = require('crypto').randomBytes(len);
  return Uint8Array.from(buf);
}
