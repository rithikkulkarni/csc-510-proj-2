// src/app/host/location/page.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

/**
 * Integration/UI Tests — HostLocationPage (flex version)
 *
 * What this suite verifies:
 * - Initial UI state: tip is visible; "Find" is disabled until a map pick occurs.
 * - Nearby (New) Places fetching: price filtering, dedupe, and rendering of results.
 * - SOLO flow: inserts a session, inserts restaurants, then navigates to /host/swipe.
 * - GROUP flow: inserts an expiring session and navigates to confirmation page.
 *
 * Mocks:
 * - next/navigation: `useRouter().push` and `useSearchParams()` for price index.
 * - next/dynamic & LeafletMap: render a simple clickable mock with onPick callback.
 * - Supabase client: table-specific insert/select behaviors.
 * - fetch: Google Places Nearby & Place Details (website) responses.
 *
 * @group integration
 */

// --- Reset between tests ---
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.resetModules();
  sessionStorage.clear?.();
});

// Router mock
const pushMock = vi.fn();

function mockNextNavigation(params: Record<string, string | null> = {}) {
  vi.doMock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
    useSearchParams: () => ({
      get: (k: string) => (Object.prototype.hasOwnProperty.call(params, k) ? params[k] : null),
    }),
  }));
}

// Dynamic passthrough mock (so dynamic(() => import(...)) produces a test double)
function mockNextDynamicPassthrough() {
  vi.doMock('next/dynamic', () => ({
    __esModule: true,
    default: (_loader: any, _opts?: any) => (props: any) => (
      <div data-testid="leaflet-mock">
        <button onClick={() => props.onPick?.({ lat: 35.78, lng: -78.64 })}>mock-pick</button>
        <div data-testid="radius">{props.radiusMeters}</div>
      </div>
    ),
  }));
}

// Direct LeafletMap mock (used by the page import)
function mockLeafletMap() {
  vi.doMock('./parts/LeafletMap', () => ({
    __esModule: true,
    default: ({ onPick, radiusMeters }: any) => (
      <div data-testid="leaflet-mock">
        <button onClick={() => onPick({ lat: 35.78, lng: -78.64 })}>mock-pick</button>
        <div data-testid="radius">{radiusMeters}</div>
      </div>
    ),
  }));
}

/**
 * Supabase mock builder
 *
 * - sessions.insert(...).select().single(): returns either SOLO or GROUP session rows
 * - restaurants.insert(...): side-effect hook + success
 */
function buildSupabaseMock({
  onInsertSessionSolo,
  onInsertSessionGroup,
  onInsertRestaurants,
}: any) {
  const fromMock = vi.fn((table: string) => {
    if (table === 'sessions') {
      return {
        insert: vi.fn((payload: any) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              if (payload?.mode === 'solo') {
                return { data: onInsertSessionSolo?.() ?? { id: 101, code: 'ABCD' }, error: null };
              }
              return {
                data: onInsertSessionGroup?.() ?? {
                  id: 202,
                  code: 'WXYZ',
                  ends_at: '2025-01-01T13:00:00',
                },
                error: null,
              };
            }),
          })),
        })),
      };
    }

    if (table === 'restaurants') {
      return {
        insert: vi.fn(async () => {
          onInsertRestaurants?.();
          return { data: null, error: null };
        }),
      };
    }

    return {};
  });

  vi.doMock('../../../lib/supabaseClient', () => ({
    supabase: { from: fromMock },
  }));

  return { fromMock };
}

/**
 * Google Places API mock
 *
 * - POST searchNearby → returns two places (R One matches “moderate”; R Two has PRICE_LEVEL_UNSPECIFIED)
 * - Place Details by id → returns website when enabled
 */
function mockPlaces({ withWebsite = true } = {}) {
  const fetchSpy = vi.spyOn(global, 'fetch' as any).mockImplementation((url: string) => {
    if (url.includes('searchNearby')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          places: [
            {
              id: 'p1',
              displayName: { text: 'R One' },
              formattedAddress: 'Addr 1',
              location: { latitude: 35.7805, longitude: -78.6405 },
              rating: 4.5,
              priceLevel: 'PRICE_LEVEL_MODERATE',
              currentOpeningHours: { openNow: true },
              googleMapsUri: 'https://maps.example/p1',
            },
            {
              id: 'p2',
              displayName: { text: 'R Two' },
              formattedAddress: 'Addr 2',
              location: { latitude: 35.782, longitude: -78.639 },
              rating: 4.2,
              priceLevel: 'PRICE_LEVEL_UNSPECIFIED',
              currentOpeningHours: { openNow: false },
              googleMapsUri: 'https://maps.example/p2',
            },
          ],
        }),
      } as Response);
    }

    if (url.includes('p1')) {
      return Promise.resolve({
        ok: true,
        json: async () => (withWebsite ? { website: 'https://rone.example' } : {}),
      } as Response);
    }
    if (url.includes('p2')) {
      return Promise.resolve({
        ok: true,
        json: async () => (withWebsite ? { website: 'https://rtwo.example' } : {}),
      } as Response);
    }

    return Promise.resolve({ ok: false, json: async () => ({}) } as Response);
  });

  return { fetchSpy };
}

beforeEach(() => {
  mockNextDynamicPassthrough();
});

describe('HostLocationPage (flex version)', () => {
  it('shows tip before pick, allows pick, then enables find', async () => {
    mockNextNavigation({ priceIdx: null });
    mockLeafletMap();
    buildSupabaseMock({});
    const { default: Page } = await import('./page');
    render(<Page />);

    // Tip present; find button disabled before picking a location
    expect(screen.getByText(/tip/i)).toBeInTheDocument();
    const findBtn = screen.getByRole('button', { name: /find/i });
    expect(findBtn).toBeDisabled();

    // Simulate map pick → button becomes enabled
    fireEvent.click(screen.getByText(/mock-pick/i));
    expect(findBtn).not.toBeDisabled();
  });

  it('fetches restaurants, filtering by price if provided', async () => {
    mockNextNavigation({ priceIdx: '1' }); // moderate
    mockLeafletMap();
    buildSupabaseMock({});
    const { fetchSpy } = mockPlaces({ withWebsite: true });

    const { default: Page } = await import('./page');
    render(<Page />);

    fireEvent.click(screen.getByText(/mock-pick/i));
    fireEvent.click(screen.getByRole('button', { name: /find/i }));

    // "R One" (moderate) should render; "R Two" (unspecified) should be excluded
    await waitFor(() => expect(screen.getByText(/r one/i)).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.queryByText(/r two/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Price:\s*\$\$/i)).toBeInTheDocument();

    fetchSpy.mockRestore();
  });

  it('solo mode → insert session + insert restaurants → navigate to swipe page', async () => {
    mockNextNavigation({ priceIdx: null });
    mockLeafletMap();
    const { fromMock } = buildSupabaseMock({
      onInsertSessionSolo: () => ({ id: 999, code: 'ABCD' }),
    });
    mockPlaces();

    const { default: Page } = await import('./page');
    render(<Page />);

    fireEvent.click(screen.getByText(/mock-pick/i));
    fireEvent.click(screen.getByRole('button', { name: /find/i }));

    await waitFor(() => expect(screen.getByText(/r one/i)).toBeInTheDocument(), { timeout: 15000 });

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    await waitFor(
      () => expect(pushMock).toHaveBeenCalledWith(expect.stringMatching(/host\/swipe/)),
      { timeout: 5000 }
    );

    // Ensure both sessions and restaurants tables were used
    expect(fromMock).toHaveBeenCalledWith('sessions');
    expect(fromMock).toHaveBeenCalledWith('restaurants');
  });

  it('group mode → insert session w/ expiry → navigate to confirm page', async () => {
    mockNextNavigation({});
    mockLeafletMap();
    const endsAt = '2025-05-05T10:00:00';
    buildSupabaseMock({
      onInsertSessionGroup: () => ({ id: 321, code: 'WXYZ', ends_at: endsAt }),
    });
    mockPlaces();

    const { default: Page } = await import('./page');
    render(<Page />);

    fireEvent.click(screen.getByText(/mock-pick/i));
    fireEvent.click(screen.getByRole('button', { name: /find/i }));

    await waitFor(() => expect(screen.getByText(/r one/i)).toBeInTheDocument(), { timeout: 15000 });

    fireEvent.click(screen.getByRole('button', { name: /group/i }));
    const expiryInput = screen.getByTestId('expiry-input');
    fireEvent.change(expiryInput, { target: { value: 4 } });


    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(
      () => expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('host/confirm')),
      { timeout: 5000 }
    );
  });
});
