import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Host from './page';

// Mock the environment + fetch
beforeAll(() => {
  process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = 'fake-key';
});

beforeEach(() => {
  global.fetch = vi.fn(async (url, opts) => {
    // Simulate success for searchNearby
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

describe('Host Page Component', () => {
  it('renders correctly', () => {
    render(<Host />);
    expect(screen.getByText('Price Range:')).toBeInTheDocument();
    expect(screen.getByText('Find Restaurants')).toBeInTheDocument();
  });

  it('changes price filter selection', () => {
    render(<Host />);
    const select = screen.getByLabelText('Price Range:');
    fireEvent.change(select, { target: { value: '2' } });
    expect((select as HTMLSelectElement).value).toBe('2');
  });

  it('handles fetch failure gracefully', async () => {
    (global.fetch as any) = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Error',
    }));

    render(<Host />);
    const button = screen.getByText('Find Restaurants');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch|Error 500/i)).toBeInTheDocument();
    });
  });
});
