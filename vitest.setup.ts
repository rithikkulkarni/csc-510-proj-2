// vitest.setup.ts
// This file runs before every test file — define global mocks & utilities here.

import '@testing-library/jest-dom';
import fetch from 'node-fetch';

// Only needed if Node < 18
if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = fetch;
}
