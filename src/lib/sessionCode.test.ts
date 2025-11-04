/**
 * sessionCode.test.ts
 *
 * Tests the `generateCode` function which produces a random session code.
 *
 * Behavior Tested:
 * - Returns a string of uppercase letters of default length 4
 * - Returns a string of custom length when specified
 * - Handles zero length gracefully
 *
 * Notes:
 * - Uses Vitest for assertions and spying on `crypto.getRandomValues`
 * - Ensures only uppercase letters are returned
 */

import { describe, it, expect, vi } from 'vitest';
import { generateCode } from './sessionCode';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

describe('generateCode', () => {
    it('returns a string of default length 4 with only uppercase letters', () => {
        // Spy on crypto.getRandomValues
        const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');

        const code = generateCode();

        expect(code).toHaveLength(4);
        expect(code).toMatch(/^[A-Z]{4}$/);
        expect(spy).toHaveBeenCalled(); // ensures crypto was used
    });

    it('returns a string of custom length', () => {
        const code = generateCode(8);
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-Z]{8}$/);
    });

    it('handles empty length (len=0) gracefully', () => {
        const code = generateCode(0);
        expect(code).toBe('');
    });
});
