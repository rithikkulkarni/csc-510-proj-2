// src/app/host/page.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HostPageRedirect from './page';

/**
 * Unit Test — Host Redirect Page
 *
 * Ensures that navigating to `/host`:
 * ✅ Displays a brief redirect message
 * ✅ Triggers client-side navigation to `/host/location` via router.replace()
 *
 * This protects redirect behavior from silent regression if routing logic
 * or component structure changes later.
 *
 * @group unit
 */

// Mock Next.js App Router
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

  /**
   * UI smoke test — ensures redirect messaging is visible before navigation
   */
  it('renders the redirect message', () => {
    render(<HostPageRedirect />);
    expect(screen.getByText(/redirecting to location selection/i)).toBeInTheDocument();
  });

  /**
   * Behavior test — verifies that user is programmatically rerouted to `/host/location`
   */
  it('immediately redirects to /host/location', async () => {
    render(<HostPageRedirect />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/host/location'));

    expect(replaceMock).toHaveBeenCalledTimes(1);
  });
});
