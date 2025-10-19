// vitest.setup.ts
// This file runs before every test file — define global mocks & utilities here.

import '@testing-library/jest-dom'  // adds nice matchers like .toBeInTheDocument()
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

// (Optional) — if you use MSW for API mocking
// import { server } from './src/mocks/server'
// beforeAll(() => server.listen())
// afterEach(() => server.resetHandlers())
// afterAll(() => server.close())

// ---- Mock Next.js internals ----

// Mock next/navigation hooks so client components can call useRouter safely
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

// Make next/image behave like a plain <img> (no optimization in JSDOM)
vi.mock('next/image', () => ({
  default: (props: any) => {
    const React = require('react')
    return React.createElement('img', props)
  },
}))

// ---- General test hygiene ----

// Reset all mocks between tests for clean isolation
afterEach(() => {
  vi.clearAllMocks()
})
