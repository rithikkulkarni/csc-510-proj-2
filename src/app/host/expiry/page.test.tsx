import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// --- helpers ---
const makeSearchParams = (obj: Record<string, string | number | undefined | null>) => ({
  get: (k: string) =>
    obj[k] === undefined || obj[k] === null ? null : String(obj[k]),
});

// --- mocks must come BEFORE importing the SUT modules ---

// Mock next/navigation: only useSearchParams is needed here
const useSearchParamsMock = vi.fn();
vi.mock('next/navigation', () => ({
  __esModule: true,
  useSearchParams: () => useSearchParamsMock(),
}));

// Mock HostExpiryForm to capture the props the client page passes down
vi.mock('@/components/HostExpiryForm', () => ({
  __esModule: true,
  default: (props: { price: string; lat: number; lng: number; radiusMiles: number }) => (
    <div data-testid="host-expiry-form">
      Price:{props.price}|Lat:{props.lat}|Lng:{props.lng}|Radius:{props.radiusMiles}
    </div>
  ),
}));

// Import the component under test AFTER mocks
import HostExpiryPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  // if you dynamically import modules in tests, you might need vi.resetModules()
});

// --- tests ---
describe('HostExpiryPage (Server component + Client child)', () => {
  it('renders heading and description', () => {
    useSearchParamsMock.mockReturnValue(makeSearchParams({}));
    render(<HostExpiryPage />);

    expect(
      screen.getByRole('heading', { name: /set expiration/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/choose how long this session will be valid for/i)
    ).toBeInTheDocument();
  });

  it('passes parsed search params to HostExpiryForm', () => {
    useSearchParamsMock.mockReturnValue(
      makeSearchParams({
        price: '$10-20',
        lat: '12.34',
        lng: '-56.78',
        radiusMiles: '7',
      })
    );

    render(<HostExpiryPage />);

    // Our mock component prints the props in a simple string for easy assertions
    expect(screen.getByTestId('host-expiry-form')).toHaveTextContent(
      'Price:$10-20|Lat:12.34|Lng:-56.78|Radius:7'
    );
  });

  it('uses defaults when params are missing', () => {
    // No params provided
    useSearchParamsMock.mockReturnValue(makeSearchParams({}));

    render(<HostExpiryPage />);

    // Defaults: price '', lat 0, lng 0, radiusMiles 5
    expect(screen.getByTestId('host-expiry-form')).toHaveTextContent(
      'Price:|Lat:0|Lng:0|Radius:5'
    );
  });

  it('clamps radiusMiles to 5 when <= 0', () => {
    useSearchParamsMock.mockReturnValue(
      makeSearchParams({
        price: '$0-10',
        lat: '35',
        lng: '-80',
        radiusMiles: '0', // or '-1' would be the same for this logic
      })
    );

    render(<HostExpiryPage />);
    expect(screen.getByTestId('host-expiry-form')).toHaveTextContent(
      'Price:$0-10|Lat:35|Lng:-80|Radius:5'
    );
  });
});