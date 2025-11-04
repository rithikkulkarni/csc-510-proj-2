/**
 * sessionCode.ts
 *
 * Exports `generateCode`, a utility to generate random session codes.
 *
 * Function: generateCode
 * ----------------------
 * Generates a random session code of a specified length using uppercase letters.
 *
 * Parameters:
 * - len: number — desired length of the code (default: 4)
 *
 * Returns:
 * - string — randomly generated uppercase code
 *
 * Behavior:
 * - Uses Web Crypto (`crypto.getRandomValues`) for secure randomness
 * - Maps random bytes to uppercase letters (A-Z)
 * - Works in both Node 18+ and Edge runtimes
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Works on both Node 18+ and Edge runtimes
export function generateCode(len = 4) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes); // <- Web Crypto
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
