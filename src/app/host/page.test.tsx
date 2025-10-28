import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Host from './page';
import { useRouter } from 'next/navigation';
import { NavigateOptions, PrefetchOptions } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// Mock the next/navigation module
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock the BackButton component
vi.mock('@/components/BackButton', () => ({
  BackButton: () => <button>Back</button>,
}));

describe('Host Page', () => {
  it('renders all price range buttons', () => {
    vi.mocked(useRouter).mockReturnValue({
        push: vi.fn(),
        back: function (): void {
            throw new Error('Function not implemented.');
        },
        forward: function (): void {
            throw new Error('Function not implemented.');
        },
        refresh: function (): void {
            throw new Error('Function not implemented.');
        },
        replace: function (href: string, options?: NavigateOptions): void {
            throw new Error('Function not implemented.');
        },
        prefetch: function (href: string, options?: PrefetchOptions): void {
            throw new Error('Function not implemented.');
        }
    });
    render(<Host />);
    
    // Check for all price range buttons
    expect(screen.getByText('$0-10')).toBeDefined();
    expect(screen.getByText('$10-20')).toBeDefined();
    expect(screen.getByText('$30-50')).toBeDefined();
    expect(screen.getByText('$50+')).toBeDefined();
  });

  it('renders the back button', () => {
    vi.mocked(useRouter).mockReturnValue({
        push: vi.fn(),
        back: function (): void {
            throw new Error('Function not implemented.');
        },
        forward: function (): void {
            throw new Error('Function not implemented.');
        },
        refresh: function (): void {
            throw new Error('Function not implemented.');
        },
        replace: function (href: string, options?: NavigateOptions): void {
            throw new Error('Function not implemented.');
        },
        prefetch: function (href: string, options?: PrefetchOptions): void {
            throw new Error('Function not implemented.');
        }
    });
    render(<Host />);
    expect(screen.getByText('Back')).toBeDefined();
  });
});