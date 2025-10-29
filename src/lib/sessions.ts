// src/lib/sessions.ts
import { supabase } from './supabaseClient';

export async function getSessionByCode(codeInput: string) {
  const code = codeInput.toUpperCase(); // match database format

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    console.error('Error fetching session:', error);
    return null;
  }
  
  return data;
}
