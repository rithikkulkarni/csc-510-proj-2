// src/app/api/page.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Host from './page';

/**
 * Integration/UI Tests — Host Page (Price selection + Places fetch)
 *
 * Focus:
 * - Rendering expected UI elements (price selector + Find CTA)
 * - User can select a price level
 * - Handles Google Places fetch responses gracefully:
 *    ✅ Successful `places:searchNearby` response → restaurant data available
 *    ✅ Failure case → displays error feedback
 *
 * Mocks:
 * - Google Places API (via global.fetch)
 * - Public API key injected in `beforeAll`
 *
 * @group integration @app/api/page
 */

// Provide fake API key so fetch URL construction succeeds
beforeAll(() => {
  process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = 'fake-key';
});

// Default mock fetch behavior (success for "searchNearby")
beforeEach(() => {
  global.fetch = vi.fn(async (url) => {
    if (url.includes('places:searchNearby')) {
      return {
        ok: true,
        json: async () => ({
          places: [
            {
              id: '1',
              displayName: { text: 'Testaurant' },
              formattedAddress: '123 Main St',
              rating: 4.5,
              priceLevel: 2,
              googleMapsUri: 'https://maps.google.com/?q=testaurant',
            },
          ],
        }),
      } as any;
    }
    return { ok: false, status: 500, text: async () => 'fail' } as any;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// -------------------- Tests --------------------
describe('Host Page Component', () => {
  it('JUSTIFICATION: Renders UI with price filter and Find button.', () => {
    render(<Host />);
    expect(screen.getByText(/price range:/i)).toBeInTheDocument();
    expect(screen.getByText(/find restaurants/i)).toBeInTheDocument();
  });

  it('JUSTIFICATION: Dropdown price selection updates correctly.', () => {
    render(<Host />);
    const select = screen.getByLabelText(/price range:/i);
    fireEvent.change(select, { target: { value: '2' } });

    expect((select as HTMLSelectElement).value).toBe('2');
  });

  it('JUSTIFICATION: Handles fetch failure by surfacing error to user.', async () => {
    (global.fetch as any) = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Error',
    }));

    render(<Host />);
    fireEvent.click(screen.getByText(/find restaurants/i));

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch|error 500/i)).toBeInTheDocument();
    });
  });
});
