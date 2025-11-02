// test/JoinForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JoinForm from '../../components/JoinForm';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// --- Mock next/navigation so useRouter() doesn't crash in tests ---
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// ---- Types and scenario with WIDE return type so overrides won't error ----
type Filters = Record<string, any>;
type Row = Record<string, any>;
type SupaResult = { data: any; error: any };

type Scenario = {
  sessions: (filters: Filters) => Promise<SupaResult>;
  restaurants: (filters: Filters) => Promise<SupaResult>;
  usersSelect: (filters: Filters) => Promise<SupaResult>;
  usersInsert: (row: Row) => Promise<SupaResult>;
  votes: (filters: Filters) => Promise<SupaResult>;
};

// Wide-typed defaults
const scenario: Scenario = {
  sessions: async () => ({ data: null, error: new Error('not found') }),
  restaurants: async () => ({ data: [], error: null }),
  usersSelect: async () => ({ data: { id: 1, name: 'Test', session_id: 1 }, error: null }),
  usersInsert: async (row) => ({ data: { id: 2, ...row }, error: null }),
  votes: async () => ({ data: [], error: null }),
};

// --- Mock supabase client using a tiny chainable builder that closes over `scenario` ---
vi.mock('../../lib/supabaseClient', () => {
  const builder = (table: string) => {
    const filters: Filters = {};
    const asPromise = (producer: () => Promise<SupaResult>) => ({
      then: (onFulfilled: any, onRejected?: any) => producer().then(onFulfilled, onRejected),
      catch: (onRejected: any) => producer().catch(onRejected),
      finally: (onFinally: any) => producer().finally(onFinally),
      [Symbol.toStringTag]: 'PromiseLike',
    });

    const listProducer = () => {
      if (table === 'restaurants') return scenario.restaurants(filters);
      if (table === 'votes') return scenario.votes(filters);
      return Promise.resolve({ data: null, error: null } as SupaResult);
    };

    return {
      select() {
        return this;
      },
      eq(col: string, val: any) {
        filters[col] = val;
        return this;
      },
      order() {
        return this;
      },
      single() {
        if (table === 'sessions') return scenario.sessions(filters);
        if (table === 'users') return scenario.usersSelect(filters);
        return Promise.resolve({ data: null, error: null } as SupaResult);
      },
      insert(rows: Row[]) {
        return {
          select() {
            return {
              single() {
                return scenario.usersInsert(rows?.[0]);
              },
            };
          },
        };
      },
      // Allow awaiting directly for restaurants/votes queries:
      get then() {
        return asPromise(listProducer).then;
      },
      get catch() {
        return asPromise(listProducer).catch;
      },
      get finally() {
        return asPromise(listProducer).finally;
      },
    };
  };

  const supabase = { from: (table: string) => builder(table) };
  return { supabase };
});

beforeEach(() => {
  pushMock.mockReset();
  // reset scenario to safe defaults each test
  scenario.sessions = async () => ({ data: null, error: new Error('not found') });
  scenario.restaurants = async () => ({ data: [], error: null });
  scenario.usersSelect = async () => ({
    data: { id: 1, name: 'Test', session_id: 1 },
    error: null,
  });
  scenario.usersInsert = async (row) => ({ data: { id: 2, ...row }, error: null });
  scenario.votes = async () => ({ data: [], error: null });
});

describe('JoinForm Component', () => {
  test('renders input and submit button', () => {
    render(<JoinForm />);

    expect(screen.getByTestId('join-input')).toBeInTheDocument();
    expect(screen.getByTestId('join-button')).toBeInTheDocument();
  });

  test('accepts only letters, converts to uppercase, and limits to 4 characters', () => {
    render(<JoinForm />);

    const input = screen.getByTestId('join-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'a1b2c3d4e' } });

    // Only letters, max 4, uppercase
    expect(input.value).toBe('ABCD');
  });

  test('shows success message when correct code is entered', async () => {
    // Active session for ABCD, restaurants exist, user exists
    scenario.sessions = async (f) =>
      Promise.resolve({ data: { id: 42, code: f.code, ends_at: null }, error: null });
    scenario.restaurants = async () => Promise.resolve({ data: [{ id: 10 }], error: null });
    scenario.usersSelect = async () =>
      Promise.resolve({ data: { id: 777, name: 'Alice', session_id: 42 }, error: null });

    render(<JoinForm />);

    // Fill name (required for non-expired sessions)
    const nameInput = screen.getByPlaceholderText(/enter your name/i);
    fireEvent.change(nameInput, { target: { value: 'Alice' } });

    const input = screen.getByTestId('join-input') as HTMLInputElement;
    const button = screen.getByTestId('join-button');

    fireEvent.change(input, { target: { value: 'abcd' } });
    fireEvent.click(button);

    // Component navigates on success; no message is shown
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/host\/swipe\?session=ABCD&user=777/)
      );
    });
    expect(screen.queryByTestId('join-message')).toBeNull();
  });

  test('shows error message when incorrect code is entered', async () => {
    // Keep sessions as "not found" to trigger invalid code
    render(<JoinForm />);

    const nameInput = screen.getByPlaceholderText(/enter your name/i);
    fireEvent.change(nameInput, { target: { value: 'Bob' } });

    const input = screen.getByTestId('join-input') as HTMLInputElement;
    const button = screen.getByTestId('join-button');

    fireEvent.change(input, { target: { value: 'WXYZ' } });
    fireEvent.click(button);

    const msg = await screen.findByTestId('join-message');
    expect(msg).toHaveTextContent('Invalid session code.');
  });

  test('does not submit if input is empty', async () => {
    render(<JoinForm />);

    const button = screen.getByTestId('join-button');
    fireEvent.click(button);

    // Component validates empty code and shows a message
    const msg = await screen.findByTestId('join-message');
    expect(msg).toHaveTextContent('Please enter the session code.');
  });
});
