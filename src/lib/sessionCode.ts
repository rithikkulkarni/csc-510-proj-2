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