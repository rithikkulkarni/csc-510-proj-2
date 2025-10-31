import { describe, it, expect } from 'vitest';
import { supabase } from '../../lib/supabaseClient';

describe('Supabase Connection', () => {
  it('connects to Supabase and fetches restaurants', async () => {
    const { data, error } = await supabase.from('restaurants').select('*').limit(1);

    expect(error).toBeNull(); // no errors in query
    expect(data).toBeInstanceOf(Array); // data should be an array
  });

  it('can fetch sessions', async () => {
    const { data, error } = await supabase.from('sessions').select('*').limit(1);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
  });

  it('can fetch users', async () => {
    const { data, error } = await supabase.from('users').select('*').limit(1);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
  });

  it('can fetch votes', async () => {
    const { data, error } = await supabase.from('votes').select('*').limit(1);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
  });
});
