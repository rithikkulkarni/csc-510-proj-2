const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export function generateCode(len = 4) {
  const { randomInt } = require('crypto') as typeof import('crypto')
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[randomInt(0, ALPHABET.length)]
  return out
}