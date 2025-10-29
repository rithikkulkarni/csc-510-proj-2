// import React from 'react'

// import { describe, it, expect, vi } from 'vitest';
// import { render, screen, fireEvent } from '@testing-library/react';
// import Host from './page';
// import { useRouter } from 'next/navigation';
// import { NavigateOptions, PrefetchOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// // Mock the next/navigation module
// vi.mock('next/navigation', () => ({
//     useRouter: vi.fn(),
// }));

// // Mock the BackButton component
// vi.mock('@/components/BackButton', () => ({
//     BackButton: () => <button>Back</button>,
// }));

// // Commenting out failing tests to prevent React errors
// describe('Host Page', () => {
//     it('renders all price range buttons', () => {
//         vi.mocked(useRouter).mockReturnValue({
//             push: vi.fn(),
//             back: function (): void {
//                 throw new Error('Function not implemented.');
//             },
//             forward: function (): void {
//                 throw new Error('Function not implemented.');
//             },
//             refresh: function (): void {
//                 throw new Error('Function not implemented.');
//             },
//             replace: function (href: string, options?: NavigateOptions): void {
//                 throw new Error('Function not implemented.');
//             },
//             prefetch: function (href: string, options?: PrefetchOptions): void {
//                 throw new Error('Function not implemented.');
//             }
//         });
//         render(<Host />);
    
//         // Check for all price range buttons
//         expect(screen.getByText('Inexpensive')).toBeDefined();
//         expect(screen.getByText('Moderately Expensive')).toBeDefined();
//         expect(screen.getByText('Expensive')).toBeDefined();
//         expect(screen.getByText('Very Expensive')).toBeDefined();
//     });

//     it('renders the back button', () => {
//         vi.mocked(useRouter).mockReturnValue({
//             push: vi.fn(),
//             back: function (): void {
//                 throw new Error('Function not implemented.');
//             },
//             forward: function (): void {
//                 throw new Error('Function not implemented.');
//             },
//             refresh: function (): void {
//                 throw new Error('Function not implemented.');
//             },
//             replace: function (href: string, options?: NavigateOptions): void {
//                 throw new Error('Function not implemented.');
//             },
//             prefetch: function (href: string, options?: PrefetchOptions): void {
//                 throw new Error('Function not implemented.');
//             }
//         });
//         render(<Host />);
//         expect(screen.getByText('Back')).toBeDefined();
//     });
// });

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

