import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Import the page under test
import HostExpiryPage from './page';

// Mock the HostExpiryForm so we don't pull in routing or network logic
vi.mock('@/components/HostExpiryForm', () => ({
  default: ({
    price,
    lat,
    lng,
    radiusMiles,
  }: {
    price: string;
    lat: number;
    lng: number;
    radiusMiles: number;
  }) => (
    <div data-testid="host-expiry-form">
      <span data-testid="price">{price}</span>
      <span data-testid="lat">{lat}</span>
      <span data-testid="lng">{lng}</span>
      <span data-testid="radiusMiles">{radiusMiles}</span>
    </div>
  ),
}));

describe('HostExpiryPage', () => {
  it('passes parsed props from search params', () => {
    render(
      <HostExpiryPage
        searchParams={{
          price: '10-20',
          lat: '35.1',
          lng: '-78.5',
          radiusMiles: '7',
        }}
      />
    );

    expect(screen.getByTestId('price').textContent).toBe('10-20');
    expect(screen.getByTestId('lat').textContent).toBe('35.1');     // number rendered to string
    expect(screen.getByTestId('lng').textContent).toBe('-78.5');
    expect(screen.getByTestId('radiusMiles').textContent).toBe('7');
  });

  it('defaults when params are missing', () => {
    render(<HostExpiryPage searchParams={{}} />);

    expect(screen.getByTestId('price').textContent).toBe('');       // ''
    expect(screen.getByTestId('lat').textContent).toBe('0');        // Number(undefined) -> 0
    expect(screen.getByTestId('lng').textContent).toBe('0');
    expect(screen.getByTestId('radiusMiles').textContent).toBe('0');
  });
});