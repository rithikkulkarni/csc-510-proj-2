// src/app/tests/home.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, beforeEach, describe, test, expect } from 'vitest';
import Home from '../page';

// ---- Mock next/navigation (App Router hooks) ----
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

// ---- Minimal Supabase mock that JoinForm uses ----
type Filters = Record<string, any>;
type Row = Record<string, any>;
type SupaResult = { data: any; error: any };

const scenario = {
  sessions: async (_f: Filters): Promise<SupaResult> => ({
    data: null,
    error: new Error('not found'),
  }),
  restaurants: async (_f: Filters): Promise<SupaResult> => ({ data: [], error: null }),
  usersSelect: async (_f: Filters): Promise<SupaResult> => ({
    data: { id: 1, name: 'Test', session_id: 1 },
    error: null,
  }),
  usersInsert: async (row: Row): Promise<SupaResult> => ({ data: { id: 2, ...row }, error: null }),
  votes: async (_f: Filters): Promise<SupaResult> => ({ data: [], error: null }),
};

vi.mock('../../components/../lib/supabaseClient', () => {
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
        return { select: () => ({ single: () => scenario.usersInsert(rows?.[0]) }) };
      },
      // Allow awaiting directly for restaurants/votes calls
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
  // reset scenario defaults
  scenario.sessions = async () => ({ data: null, error: new Error('not found') });
  scenario.restaurants = async () => ({ data: [], error: null });
  scenario.usersSelect = async () => ({
    data: { id: 1, name: 'Test', session_id: 1 },
    error: null,
  });
  scenario.usersInsert = async (row) => ({ data: { id: 2, ...row }, error: null });
  scenario.votes = async () => ({ data: [], error: null });
});

describe('Home Page', () => {
  test('renders HOST and JOIN cards', () => {
    render(<Home />);

    expect(screen.getByText('HOST')).toBeInTheDocument();
    expect(screen.getByText('JOIN')).toBeInTheDocument();
    expect(screen.getByText('Create Session')).toBeInTheDocument();

    expect(screen.getByTestId('join-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('join-button')).toBeInTheDocument();
  });

  test('JOIN form works correctly', async () => {
    render(<Home />);

    // Fill required name for active (non-expired) flow
    const nameInput = screen.getByPlaceholderText(/enter your name/i);
    fireEvent.change(nameInput, { target: { value: 'Tester' } });

    const input = screen.getByTestId('join-code-input') as HTMLInputElement;
    const button = screen.getByTestId('join-button');

    // 1) Enter incorrect code -> "Invalid session code."
    // scenario.sessions remains "not found"
    fireEvent.change(input, { target: { value: 'WXYZ' } });
    fireEvent.click(button);
    expect(await screen.findByTestId('join-message')).toHaveTextContent('Invalid session code.');
    expect(pushMock).not.toHaveBeenCalled();

    // 2) Enter correct code -> active session -> navigate (no success banner)
    scenario.sessions = async (f) => ({
      data: { id: 42, code: f.code, ends_at: null },
      error: null,
    });
    scenario.restaurants = async () => ({ data: [{ id: 10 }], error: null });
    scenario.usersSelect = async () => ({
      data: { id: 777, name: 'Tester', session_id: 42 },
      error: null,
    });

    fireEvent.change(input, { target: { value: 'abcd' } }); // becomes ABCD
    fireEvent.click(button);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/host\/swipe\?session=ABCD&user=777/)
      );
    });
  });
});
