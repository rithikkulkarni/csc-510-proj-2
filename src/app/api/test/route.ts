/**
 * API Route: GET /api/test
 *
 * Purpose:
 * - Provides a lightweight health-check endpoint to verify:
 *   ✅ Supabase client connectivity
 *   ✅ `restaurants` table availability
 *   ✅ Server-side API routes functioning correctly in Next.js
 *
 * Behavior:
 * - Executes a simple `SELECT * FROM restaurants LIMIT 1`
 * - Returns:
 *    200 + `{ data: [...] }` when the query succeeds (even if empty)
 *    500 + `{ error: "<message>" }` when Supabase returns an error
 *
 * Usage Example:
 *   fetch('/api/test')
 *     .then(res => res.json())
 *     .then(json => console.log(json));
 *
 * Notes:
 * - This endpoint does not require authentication
 * - Minimal logic by design — for diagnostics and development validation
 * - Can be monitored as part of CI to detect DB schema or connectivity issues
 */

import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  const { data, error } = await supabase.from('restaurants').select('*').limit(1);

  if (error) {
    // → Internal server error: DB unreachable, schema mismatch, etc.
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // → Successful query (may still return an empty dataset)
  return new Response(JSON.stringify({ data }), { status: 200 });
}
