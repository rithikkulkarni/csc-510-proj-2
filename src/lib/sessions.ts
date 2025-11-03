// src/lib/sessions.ts
import { supabase } from './supabaseClient';

export async function getSessionByCode(codeInput: string) {
  const code = codeInput.toUpperCase(); // match database format

  const { data, error } = await supabase.from('sessions').select('*').eq('code', code).single();

  if (error) {
    throw new Error('Error fetching session: ${error.message}');
  }

  return data;
}
