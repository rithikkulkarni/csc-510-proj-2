// src/app/host/location/__tests__/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Page from '../page';

/**
 * Unit/Integration (minimal) — HostLocationPage
 *
 * Focus:
 * - Initial UX state: “Find restaurants” button disabled until a map pick is made
 * - Tip/guidance copy is visible before user selects a center point
 * - Clicking disabled search does not throw or produce spurious errors
 *
 * Mocks:
 * - next/navigation: basic router + search params
 * - next/dynamic: returns a sync mock map component that calls `onPick`
 * - global fetch: stubbed to mimic Places API responses
 *
 * @group integration
 */

// -------------------- Mocks --------------------
let searchParamsInit = '';

// Router + search params
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(searchParamsInit),
  usePathname: () => '/host/location',
}));

// Mock next/dynamic so it returns a synchronous stub component
vi.mock('next/dynamic', () => ({
  default: (_loader: any, _opts?: any) => (props: any) => (
    <div data-testid="mock-map" onClick={() => props?.onPick?.({ lat: 35.7796, lng: -78.6382 })}>
      MockMap
    </div>
  ),
}));

// Mock global fetch
const originalFetch = global.fetch;
beforeEach(() => {
  searchParamsInit = '';
  global.fetch = vi.fn();
});
afterEach(() => {
  global.fetch = originalFetch as any;
  vi.clearAllMocks();
});

/**
 * Helper: stub a minimal Google Places “Nearby (New)” response
 */
function mockPlacesResponse(places: any[]) {
  vi.mocked(global.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => ({ places }),
  });
}

// -------------------- Tests --------------------
describe('HostLocationPage (minimal)', () => {
  /**
   * Verifies pre-pick UI state:
   * - Search button disabled
   * - Guidance tip visible
   * - Clicking disabled button is a no-op (no new error text appears)
   */
  it('keeps search disabled without a picked point and shows the tip', async () => {
    searchParamsInit = '';
    mockPlacesResponse([]);

    render(<Page />);

    const findBtn = screen.getByRole('button', { name: /find restaurants/i });
    expect(findBtn).toHaveAttribute('disabled');

    // The guidance tip is visible
    expect(screen.getByText(/tip:\s*click the map to set the center\./i)).toBeInTheDocument();

    // Clicking a disabled button does nothing; no error should appear
    fireEvent.click(findBtn);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/click the map to set a center point/i)).not.toBeInTheDocument();
  });
});
