import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HostLocationForm from './HostLocationForm';

// Mock BackButton so we don't depend on its internals
vi.mock('@/components/BackButton', () => ({
  BackButton: () => <div data-testid="back-button" />,
}));

// Mock next/navigation (spy-able useRouter)
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));
import { useRouter } from 'next/navigation';

// Mock next/dynamic: return a stub Map that calls props.onPick when clicked
vi.mock('next/dynamic', () => ({
  default:
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_importer: any, _opts?: any) =>
    (props: any) =>
      (
        <div
          data-testid="map"
          onClick={() => props.onPick?.({ lat: 1, lng: 2 })}
        >
          MAP_STUB
        </div>
      ),
}));

describe('HostLocationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders and is initially disabled until a location is picked', () => {
    render(<HostLocationForm price="10-20" />);

    // Back button stub present
    expect(screen.getByTestId('back-button')).toBeInTheDocument();

    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled(); // latLng is null initially
  });

  it('enables the button after picking a location and navigates with correct query', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(<HostLocationForm price="10-20" />);

    // Click the stub map to set latLng = {lat:1, lng:2}
    fireEvent.click(screen.getByTestId('map'));

    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeEnabled();

    fireEvent.click(continueBtn);

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0] as string;

    // Verify URL & query params
    expect(url).toMatch(/^\/host\/expiry\?/);
    const qs = new URLSearchParams(url.split('?')[1]);
    expect(qs.get('price')).toBe('10-20');
    expect(qs.get('lat')).toBe('1');
    expect(qs.get('lng')).toBe('2');
    expect(qs.get('radiusMiles')).toBe('5'); // default radius
  });

  it('disables the button when radius <= 0 and re-enables when radius > 0', () => {
    render(<HostLocationForm price="10-20" />);

    // Pick a point first so only radius affects disabled state
    fireEvent.click(screen.getByTestId('map'));
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeEnabled(); // default radius = 5

    const radiusInput = screen.getByRole('spinbutton') as HTMLInputElement;

    // Set radius to 0 -> disabled
    fireEvent.change(radiusInput, { target: { value: '0' } });
    expect(continueBtn).toBeDisabled();

    // Set radius to 3 -> enabled
    fireEvent.change(radiusInput, { target: { value: '3' } });
    expect(continueBtn).toBeEnabled();
  });

  it('stays disabled if price is empty even after picking a location', () => {
    render(<HostLocationForm price="" />);

    fireEvent.click(screen.getByTestId('map')); // set latLng
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled(); // because price is falsy
  });

  it('includes updated radiusMiles in navigation URL', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(<HostLocationForm price="$$" />);

    // Pick a location
    fireEvent.click(screen.getByTestId('map'));

    // Change radius to 12
    const radiusInput = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.change(radiusInput, { target: { value: '12' } });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    const url = mockPush.mock.calls[0][0] as string;
    const qs = new URLSearchParams(url.split('?')[1]);
    expect(qs.get('radiusMiles')).toBe('12');
  });
});