// src/app/tests/supabaseFetch.test.tsx

import { describe, test, expect } from 'vitest';
import { supabase } from '../../lib/supabaseClient';

describe('Supabase Fetch', () => {
    test('fetches restaurants from Supabase', async () => {
        const { data, error } = await supabase
            .from('restaurants')
            .select('*');

        // Ensure no error occurred
        expect(error).toBeNull();
        expect(data).not.toBeNull();

        // If there are results, check the fields
        if (data && data.length > 0) {
            const first = data[0];
            expect(first).toHaveProperty('id');
            expect(first).toHaveProperty('name');
            expect(first).toHaveProperty('latitude');
            expect(first).toHaveProperty('longitude');
            expect(first).toHaveProperty('price_level');
        }
    });
});
