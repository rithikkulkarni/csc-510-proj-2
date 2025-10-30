// src/app/host/page.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Host from './page'
import { useRouter } from 'next/navigation'

// --- Mocks ---
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/components/BackButton', () => ({
  BackButton: () => <button>Back</button>,
}))

describe('Host Page', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as any)
  })

  it('renders all price range buttons', () => {
    render(<Host />)

    const buttons = [
      '$ (Inexpensive)',
      '$$ (Moderate)',
      '$$$ (Expensive)',
      '$$$$ (Very Expensive)',
    ]

    for (const label of buttons) {
      expect(screen.getByRole('button', { name: `Select price range ${label}` }))
        .toBeInTheDocument()
    }
  })

  it('renders the back button', () => {
    render(<Host />)
    expect(screen.getByText('Back')).toBeInTheDocument()
  })
})

