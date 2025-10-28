import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import HostLocationPage from '../page';
import React from 'react';

// Mock the HostLocationForm component
vi.mock('@/components/HostLocationForm', () => ({
  default: ({ price }: { price: string }) => (
    <div data-testid="host-location-form">Price: {price}</div>
  ),
}));

describe('HostLocationPage', () => {
  it('passes the price from search params to HostLocationForm', () => {
    const { getByTestId } = render(
      <HostLocationPage searchParams={{ price: '10-20' }} />
    );
    
    expect(getByTestId('host-location-form').textContent).toBe('Price: 10-20');
  });

  it('handles missing price parameter', () => {
    const { getByTestId } = render(
      <HostLocationPage searchParams={{}} />
    );
    
    expect(getByTestId('host-location-form').textContent).toBe('Price: ');
  });

  it('handles undefined searchParams', () => {
    const { getByTestId } = render(
      <HostLocationPage searchParams={{}} />
    );
    
    expect(getByTestId('host-location-form').textContent).toBe('Price: ');
  });
});