// src/app/host/confirm/ConfirmPageClient.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, beforeEach, expect, vi } from 'vitest';

import ConfirmPageClient from './ConfirmPageClient';

// -------------------- Mocks --------------------
const useSearchParamsMock = vi.fn();
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
  useRouter: () => ({ push: pushMock }),
}));

const supabaseFromMock = vi.fn();

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => supabaseFromMock(table),
  },
}));

// Utility: build chainable query objects for supabase .from()
const q = (methods: Record<string, any> = {}) => {
  const noop = vi.fn().mockReturnThis();
  return {
    select: methods.select ?? noop,
    eq: methods.eq ?? noop,
    single: methods.single ?? vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: methods.insert ?? vi.fn().mockReturnThis(),
  };
};

const setScenario = (handlers: Partial<Record<'sessions' | 'restaurants' | 'users', any>>) => {
  supabaseFromMock.mockImplementation((table: string) => {
    if (table in (handlers as any)) return (handlers as any)[table];
    return q(); // inert default
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

// -------------------- Tests --------------------
describe('ConfirmPageClient', () => {
  it('JUSTIFICATION: Missing session code → shows loading stub, no Supabase calls.', async () => {
    useSearchParamsMock.mockReturnValue({ get: () => null });
    setScenario({});

    render(<ConfirmPageClient />);

    // Effects run; since code is missing, we stay in loading state (sessionData null)
    expect(await screen.findByText(/loading session data/i)).toBeInTheDocument();
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it('JUSTIFICATION: Session not found → stays on loading stub (sessionData null).', async () => {
    useSearchParamsMock.mockReturnValue({ get: (k: string) => (k === 'session' ? 'ABC' : null) });

    const sessions = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    });

    setScenario({ sessions });

    render(<ConfirmPageClient />);

    expect(await screen.findByText(/loading session data/i)).toBeInTheDocument();
  });

  it('JUSTIFICATION: Expired session (ends_at in past) → form renders, disabled name, "View Results" CTA, submit pushes to results.', async () => {
    useSearchParamsMock.mockReturnValue({ get: (k: string) => (k === 'session' ? 'ABC' : null) });

    const sessions = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, code: 'ABC', ends_at: '2000-01-01T00:00:00' }, // past → expired
        error: null,
      }),
    });

    // Restaurants/users are not needed for the expired redirect path
    setScenario({ sessions });

    render(<ConfirmPageClient />);

    // Form shows because sessionData is set even though expired
    await screen.findByRole('heading', { name: /session confirmed/i });

    // Session code input is readOnly; name field is disabled due to expired
    expect(screen.getByDisplayValue('ABC')).toBeInTheDocument();
    const nameInput = screen.getByPlaceholderText(/enter your name/i) as HTMLInputElement;
    expect(nameInput).toBeDisabled();

    // Button shows "View Results" when expired
    const button = screen.getByRole('button', { name: /view results/i });
    expect(button).toBeInTheDocument();

    // Submitting should route to results (no name required in expired branch)
    fireEvent.click(button);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/host/results?session=ABC'));

    // Message rendered for expired
    expect(screen.getByText(/this session has expired/i)).toBeInTheDocument();

    // Expires area visible, but no "Time remaining" since already expired
    expect(screen.getByText(/expires at:/i)).toBeInTheDocument();
    expect(screen.queryByText(/time remaining:/i)).not.toBeInTheDocument();
  });

  it('JUSTIFICATION: Future session renders countdown ("Time remaining") and Join CTA.', async () => {
    useSearchParamsMock.mockReturnValue({ get: (k: string) => (k === 'session' ? 'LIVE' : null) });

    const future = new Date(Date.now() + 60_000).toISOString(); // +1 min
    const sessions = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 10, code: 'LIVE', ends_at: future },
        error: null,
      }),
    });

    setScenario({ sessions });

    render(<ConfirmPageClient />);

    // Form present, countdown present (we don't assert exact numbers)
    await screen.findByRole('button', { name: /join session/i });
    expect(screen.getByText(/time remaining:/i)).toBeInTheDocument();
  });

  it('JUSTIFICATION: Reject empty name → shows validation message.', async () => {
    useSearchParamsMock.mockReturnValue({ get: (k: string) => (k === 'session' ? 'LIVE' : null) });

    const future = new Date(Date.now() + 60_000).toISOString();
    const sessions = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 10, code: 'LIVE', ends_at: future },
        error: null,
      }),
    });

    setScenario({ sessions });

    render(<ConfirmPageClient />);

    // Submit with empty name
    const joinBtn = await screen.findByRole('button', { name: /join session/i });
    fireEvent.click(joinBtn);

    expect(await screen.findByText(/please enter your name/i)).toBeInTheDocument();
  });

  it('JUSTIFICATION: Restaurants not ready → shows "Session is not ready yet."', async () => {
    useSearchParamsMock.mockReturnValue({ get: (k: string) => (k === 'session' ? 'LIVE' : null) });

    const future = new Date(Date.now() + 60_000).toISOString();
    const sessions = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 10, code: 'LIVE', ends_at: future },
        error: null,
      }),
    });

    const restaurants = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }), // no restaurants
    });

    setScenario({ sessions, restaurants });

    render(<ConfirmPageClient />);

    // Fill name then submit
    const nameInput = await screen.findByPlaceholderText(/enter your name/i);
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: /join session/i }));

    expect(await screen.findByText(/session is not ready yet/i)).toBeInTheDocument();
  });

  it('JUSTIFICATION: Existing user with same name → shows "Another user is already using this name."', async () => {
    useSearchParamsMock.mockReturnValue({ get: (k: string) => (k === 'session' ? 'LIVE' : null) });

    const future = new Date(Date.now() + 60_000).toISOString();
    const sessions = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 22, code: 'LIVE', ends_at: future },
        error: null,
      }),
    });

    const restaurants = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }), // ready
    });

    // existingUser is truthy
    const users = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 99, name: 'Alice' }, error: null }),
      insert: vi.fn(), // won't be reached
    };

    setScenario({ sessions, restaurants, users });

    render(<ConfirmPageClient />);

    const nameInput = await screen.findByPlaceholderText(/enter your name/i);
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: /join session/i }));

    expect(await screen.findByText(/another user is already using this name/i)).toBeInTheDocument();
  });

  it('JUSTIFICATION: Insert user fails → shows "Error creating user."', async () => {
    useSearchParamsMock.mockReturnValue({ get: (k: string) => (k === 'session' ? 'LIVE' : null) });

    const future = new Date(Date.now() + 60_000).toISOString();
    const sessions = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 33, code: 'LIVE', ends_at: future },
        error: null,
      }),
    });

    const restaurants = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
    });

    const users = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // No existing user
      single: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
      // Insert then .select().single() → return error
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'bad' } }),
      }),
    };

    setScenario({ sessions, restaurants, users });

    render(<ConfirmPageClient />);

    const nameInput = await screen.findByPlaceholderText(/enter your name/i);
    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    fireEvent.click(screen.getByRole('button', { name: /join session/i }));

    expect(await screen.findByText(/error creating user/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('JUSTIFICATION: Happy path → inserts user and navigates to swipe with user id.', async () => {
    useSearchParamsMock.mockReturnValue({ get: (k: string) => (k === 'session' ? 'GO' : null) });

    const future = new Date(Date.now() + 60_000).toISOString();
    const sessions = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 55, code: 'GO', ends_at: future },
        error: null,
      }),
    });

    const restaurants = q({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }), // ready
    });

    // No existing user; insert returns new user { id: 777 }
    const users = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({ data: null, error: null }), // existing user check
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 777 }, error: null }),
      }),
    };

    setScenario({ sessions, restaurants, users });

    render(<ConfirmPageClient />);

    const nameInput = await screen.findByPlaceholderText(/enter your name/i);
    fireEvent.change(nameInput, { target: { value: 'Charlie' } });
    fireEvent.click(screen.getByRole('button', { name: /join session/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/host/swipe?session=GO&user=777'));
  });
});
