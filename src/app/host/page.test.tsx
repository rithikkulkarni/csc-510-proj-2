// src/app/host/page.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HostPageRedirect from './page';

// Mock next/navigation's useRouter
const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('Host Page Redirect', () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  it('renders the redirect message', () => {
    render(<HostPageRedirect />);
    expect(screen.getByText(/redirecting to location selection/i)).toBeInTheDocument();
  });

  it('immediately redirects to /host/location', async () => {
    render(<HostPageRedirect />);
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/host/location');
    });
    expect(replaceMock).toHaveBeenCalledTimes(1);
  });
});
