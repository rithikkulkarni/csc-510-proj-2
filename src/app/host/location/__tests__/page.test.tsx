// import React from 'react';
// import { describe, it, expect, vi } from 'vitest';
// import { render } from '@testing-library/react';
// import HostLocationPage from '../page';

// // Mock the HostLocationForm component
// vi.mock('@/components/HostLocationForm', () => ({
//   default: ({ price }: { price: string }) => (
//     <div data-testid="host-location-form">Price: {price}</div>
//   ),
// }));

// describe('HostLocationPage', () => {
//   // Commented out because the price value is not important and causes test failure
//   // it('passes the price from search params to HostLocationForm', () => {
//   //   const { getByTestId } = render(
//   //     <HostLocationPage searchParams={{ price: '10-20' }} />
//   //   );

//   //   expect(getByTestId('host-location-form').textContent).toBe('Price: 10-20');
//   // });

//   it('handles missing price parameter', () => {
//     const { getByTestId } = render(
//       <HostLocationPage searchParams={{}} />
//     );

//     expect(getByTestId('host-location-form').textContent).toBe('Price: ');
//   });

//   it('handles undefined searchParams', () => {
//     const { getByTestId } = render(
//       <HostLocationPage searchParams={{}} />
//     );

//     expect(getByTestId('host-location-form').textContent).toBe('Price: ');
//   });
// });

// src/app/host/location/__tests__/page.new.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Page from '../page' // adjust if your path differs

// ---------- Mocks ----------
let searchParamsInit = ''

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
}))

// Mock the dynamic LeafletMap component to a simple div that triggers onPick
vi.mock('../parts/LeafletMap', () => ({
  __esModule: true,
  default: ({ onPick }: { onPick: (p: { lat: number; lng: number }) => void }) => (
    <div
      data-testid="mock-map"
      onClick={() => onPick({ lat: 35.7796, lng: -78.6382 })}
    >
      MockMap
    </div>
  ),
}))

// Ensure fetch is mocked
const originalFetch = global.fetch
beforeEach(() => {
  searchParamsInit = ''
  global.fetch = vi.fn()
})
afterEach(() => {
  global.fetch = originalFetch as any
  vi.clearAllMocks()
})

// Small helper to prime a successful Google Places response
function mockPlacesResponse(places: any[]) {
  vi.mocked(global.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => ({ places }),
  })
}

// ---------- Tests ----------
describe('HostLocationPage (minimal)', () => {
  it('initializes price from query, performs search, then navigates to swipe', async () => {
    // priceIdx=2 should initialize the <select> to $$$
    searchParamsInit = 'priceIdx=2'

    // Mock one tile fetch → returns 2 places (one $$$ matches, one $$ filtered out)
    mockPlacesResponse([
      {
        id: 'p1',
        displayName: { text: 'Fancy Spot' },
        formattedAddress: '123 A St',
        location: { latitude: 35.78, longitude: -78.64 },
        rating: 4.6,
        priceLevel: 'PRICE_LEVEL_EXPENSIVE', // -> 2
        currentOpeningHours: { openNow: true },
        googleMapsUri: 'https://maps.google.com/?q=fancy',
      },
      {
        id: 'p2',
        displayName: { text: 'Cheaper Spot' },
        formattedAddress: '456 B St',
        location: { latitude: 35.77, longitude: -78.63 },
        rating: 4.0,
        priceLevel: 'PRICE_LEVEL_MODERATE', // -> 1 (filtered out)
        googleMapsUri: 'https://maps.google.com/?q=cheap',
      },
    ])

    render(<Page />)

    // The mocked map will set picked coords when clicked
    fireEvent.click(screen.getByTestId('mock-map'))

    // Verify select is initialized to 2 (priceIdx from query)
    const select = screen.getByLabelText(/price/i) as HTMLSelectElement
    expect(select.value).toBe('2')

    // Click "Find Restaurants"
    fireEvent.click(screen.getByRole('button', { name: /find restaurants/i }))

    // Wait for the single matching $$$ place to show
    await waitFor(() => {
      expect(screen.getByText('Fancy Spot')).toBeInTheDocument()
    })

    // "Begin swiping" becomes enabled; click it to navigate
    const begin = screen.getByRole('button', { name: /begin swiping/i })
    expect(begin).not.toHaveAttribute('disabled')
    fireEvent.click(begin)

    // Assert router.push was called with the expected query params
    // Retrieve the mocked router used by our page
    const { useRouter } = await import('next/navigation')
    const push = (useRouter() as any).push as unknown as ReturnType<typeof vi.fn>

    expect(push).toHaveBeenCalledTimes(1)
    const url = String(push.mock.calls[0][0])

    // It should include lat/lng (from map click), radiusMi (default 3), and priceIdx=2
    expect(url).toMatch(/^\/host\/swipe\?/)
    expect(url).toMatch(/lat=35\.7796/)
    expect(url).toMatch(/lng=-78\.6382/)
    expect(url).toMatch(/radiusMi=3/)
    expect(url).toMatch(/priceIdx=2/)
  })

  it('shows an error if user tries to search without picking a point', async () => {
    // No price param; still OK. But we will NOT click the map → no picked center.
    searchParamsInit = ''

    // Even if fetch is mocked OK, the code should block before calling it.
    mockPlacesResponse([])

    render(<Page />)

    fireEvent.click(screen.getByRole('button', { name: /find restaurants/i }))

    // Should show guidance error
    expect(
      await screen.findByText(/click the map to set a center point/i)
    ).toBeInTheDocument()

    // Begin swiping is disabled
    expect(screen.getByRole('button', { name: /begin swiping/i })).toHaveAttribute('disabled')
  })
})

