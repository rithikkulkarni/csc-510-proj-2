// vitest.setup.ts
// This file runs before every test file — define global mocks & utilities here.

import '@testing-library/jest-dom';
import fetch from 'node-fetch';
import { vi } from 'vitest';

// Only needed if Node < 18
if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = fetch;
}

// Mock next/font/google to return dummy functions
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'font-geist-sans' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
}));
