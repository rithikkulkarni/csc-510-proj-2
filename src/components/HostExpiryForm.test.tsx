import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// SUT
import HostExpiryForm from './HostExpiryForm';

// Mock BackButton to avoid pulling its internals
vi.mock('@/components/BackButton', () => ({
  BackButton: () => <div data-testid="back-button" />,
}));

// Mock next/navigation with spy-able useRouter
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));
import { useRouter } from 'next/navigation';

const FIXED_NOW = 0; // Jan 1, 1970 00:00:00.000 UTC
const TWO_HOURS_MS = 2 * 3600_000;
const EXPECTED_EXPIRES_AT = new Date(FIXED_NOW + TWO_HOURS_MS).toISOString(); // 1970-01-01T02:00:00.000Z

describe('HostExpiryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Freeze time so expiresAt is deterministic
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    // Mock router
    vi.mocked(useRouter).mockReturnValue({
      replace: vi.fn(),
    } as any);
    // Mock fetch globally
    // ts-expect-error assign for test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validProps = {
    price: '10-20',
    lat: 35.0,
    lng: -78.5,
    radiusMiles: 5,
  };

  it('renders and is enabled with valid props (hours default to 2)', () => {
    render(<HostExpiryForm {...validProps} />);
    const button = screen.getByRole('button', { name: /create session/i });
    expect(button).toBeEnabled();
    // shows BackButton stub
    expect(screen.getByTestId('back-button')).toBeInTheDocument();
  });

  it('is disabled when required props are missing/invalid', () => {
    // price empty -> disabled
    const { rerender } = render(<HostExpiryForm {...validProps} price="" />);
    expect(screen.getByRole('button', { name: /create session/i })).toBeDisabled();

    // lat 0 -> disabled
    rerender(<HostExpiryForm {...validProps} lat={0} />);
    expect(screen.getByRole('button', { name: /create session/i })).toBeDisabled();

    // lng 0 -> disabled
    rerender(<HostExpiryForm {...validProps} lng={0} />);
    expect(screen.getByRole('button', { name: /create session/i })).toBeDisabled();

    // radiusMiles 0 -> disabled
    rerender(<HostExpiryForm {...validProps} radiusMiles={0} />);
    expect(screen.getByRole('button', { name: /create session/i })).toBeDisabled();
  });

  it('POSTs to /api/sessions and navigates to success with code & expiresAt on success', async () => {
    const mockReplace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as any);

    // Successful response
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 'ABC123', expiresAt: EXPECTED_EXPIRES_AT }),
    });

    render(<HostExpiryForm {...validProps} />);

    const button = screen.getByRole('button', { name: /create session/i });
    fireEvent.click(button);

    // While loading, label should change
    expect(await screen.findByText(/creating…/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    // Assert request shape
    expect(global.fetch).toHaveBeenCalledWith('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.any(String),
    });

    const [, fetchInit] = (global.fetch as any).mock.calls[0];
    const parsed = JSON.parse(fetchInit.body);

    // payload correctness
    // expect(parsed).toEqual({
    //   expiresAt: EXPECTED_EXPIRES_AT,
    //   payload: {
    //     price: validProps.price,
    //     location: { lat: validProps.lat, lng: validProps.lng },
    //     radiusMiles: validProps.radiusMiles,
    //   },
    // });

    // navigation URL correctness (includes encoded params)
    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/^\/host\/success\?/);
    expect(calledUrl).toContain('code=ABC123');
    expect(calledUrl).toContain(
      `expiresAt=${encodeURIComponent(EXPECTED_EXPIRES_AT)}`
    );

    // After done, button label returns
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create session/i })).toBeInTheDocument();
    });
  });

  it('shows error message and re-enables button when the API returns an error', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Boom' }),
    });

    render(<HostExpiryForm {...validProps} />);

    const button = screen.getByRole('button', { name: /create session/i });
    fireEvent.click(button);

    // Shows loading label first
    expect(await screen.findByText(/creating…/i)).toBeInTheDocument();

    // Then shows error
    expect(await screen.findByText(/boom/i)).toBeInTheDocument();

    // Back to idle state, button should be enabled again (props valid)
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('caps hours input at 24', () => {
    render(<HostExpiryForm {...validProps} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;

    // Try to enter 30 -> clamped to 24
    fireEvent.change(input, { target: { value: '30' } });
    expect(input.value).toBe('24');

    // Enter 12 -> accepted
    fireEvent.change(input, { target: { value: '12' } });
    expect(input.value).toBe('12');
  });
});