import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  const { data, error } = await supabase.from('restaurants').select('*').limit(1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ data }), { status: 200 });
}
