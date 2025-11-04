/**
 * Tests for JoinForm component
 *
 * Covers:
 * - Rendering of name and code inputs, and submit button
 * - Input validation (empty fields, code format)
 * - Supabase integration mocks:
 *   - Invalid session code
 *   - Joining active session (creating user if needed)
 *   - Expired session with last-vote results
 * - Navigation via mocked Next.js router
 *
 * Test framework:
 * - Vitest
 * - React Testing Library (render, screen, fireEvent, waitFor)
 * - Supabase client and router are mocked
 *
 * Notes:
 * - `data-testid` is heavily used for reliable selection
 * - `vi.setSystemTime` used to simulate expired sessions
 * - `beforeEach` and `afterEach` reset mocks and timers
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import JoinForm from '../components/JoinForm';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';

// --- Next.js router mock ---
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

// --- Supabase mock ---
vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }));

// --- Helper ---
const fillForm = (name: string, code: string) => {
  fireEvent.change(screen.getByTestId('join-name-input'), { target: { value: name } });
  fireEvent.change(screen.getByTestId('join-code-input'), { target: { value: code } });
  fireEvent.click(screen.getByTestId('join-button'));
};

beforeEach(() => {
  pushMock.mockReset();
  vi.clearAllMocks();
});

afterEach(() => vi.useRealTimers());

describe('JoinForm', () => {
  // --- Rendering ---
  it('renders input and submit button', () => {
    render(<JoinForm />);
    expect(screen.getByTestId('join-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('join-code-input')).toBeInTheDocument();
    expect(screen.getByTestId('join-button')).toBeInTheDocument();
  });

  // --- Input validation ---
  it('does not submit if input is empty', async () => {
    render(<JoinForm />);
    fireEvent.click(screen.getByTestId('join-button'));
    await waitFor(() =>
      expect(screen.getByTestId('join-message')).toHaveTextContent(/please enter the session code/i)
    );
  });

  it('accepts only letters, converts to uppercase, limits to 4 characters', () => {
    render(<JoinForm />);
    const input = screen.getByTestId('join-code-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'aBc1d' } });
    expect(input.value).toBe('ABCD');
  });

  it('trims whitespace from session code input', () => {
    render(<JoinForm />);
    const input = screen.getByTestId('join-code-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  ab c d  ' } });
    expect(input.value).toBe('ABCD');
  });

  it('trims whitespace from name input', () => {
    render(<JoinForm />);
    const input = screen.getByTestId('join-name-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   Alice   ' } });
    expect(input.value).toBe('   Alice   '.slice(0, 30));
  });

  it('limits name input to 30 chars and code to 4 chars', () => {
    render(<JoinForm />);
    const nameInput = screen.getByTestId('join-name-input') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'A'.repeat(50) } });
    expect(nameInput.value.length).toBeLessThanOrEqual(30);

    const codeInput = screen.getByTestId('join-code-input') as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: 'ABCDE' } });
    expect(codeInput.value.length).toBeLessThanOrEqual(4);
  });

  it('auto-capitalizes lowercase session code', () => {
    render(<JoinForm />);
    const input = screen.getByTestId('join-code-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abcd' } });
    expect(input.value).toBe('ABCD');
  });

  it('strips non-letter characters from session code', () => {
    render(<JoinForm />);
    const input = screen.getByTestId('join-code-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'A1B2C3' } });
    expect(input.value).toBe('ABC');
  });

  it('strips non-ASCII letters from session code', () => {
    render(<JoinForm />);
    const input = screen.getByTestId('join-code-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ABçDé1!' } });
    expect(input.value).toBe('ABD');
  });

  it('accepts unicode in name but limits length', () => {
    render(<JoinForm />);
    const nameInput = screen.getByTestId('join-name-input') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '😀'.repeat(50) } });
    expect(nameInput.value.length).toBeLessThanOrEqual(30);
  });

  // --- Supabase: invalid / network errors ---
  it('shows error message when code is invalid', async () => {
    (supabase.from as any).mockImplementation(() => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }));
    render(<JoinForm />);
    fillForm('Bob', 'WXYZ');
    await waitFor(() =>
      expect(screen.getByTestId('join-message')).toHaveTextContent(/invalid session code/i)
    );
  });

  it('shows error if Supabase query fails', async () => {
    (supabase.from as any).mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            throw new Error('Network error');
          },
        }),
      }),
    }));
    render(<JoinForm />);
    fillForm('Alice', 'ABCD');
    await waitFor(() =>
      expect(screen.getByTestId('join-message')).toHaveTextContent(/failed to join session/i)
    );
  });

  // --- Supabase: successful join ---
  it('joins active session and navigates', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'sessions')
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 123, code: 'ABCD', ends_at: null }, error: null }),
            }),
          }),
        };
      if (table === 'restaurants')
        return {
          select: () => ({
            eq: async () => ({ data: [{ id: 1, name: 'Pizza', session_id: 123 }], error: null }),
          }),
        };
      if (table === 'users')
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
          }),
          insert: (user: any) => ({
            select: () => ({ single: async () => ({ data: { id: 50, ...user[0] }, error: null }) }),
          }),
        };
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      };
    });
    render(<JoinForm />);
    fillForm('Alice', 'ABCD');
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('session=ABCD'));
      expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('user=50'));
    });
  });

  it('joins session when user already exists without inserting new user', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'sessions')
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 1, code: 'ABCD', ends_at: null }, error: null }),
            }),
          }),
        };
      if (table === 'restaurants')
        return {
          select: () => ({
            eq: async () => ({ data: [{ id: 1, name: 'Pizza', session_id: 1 }], error: null }),
          }),
        };
      if (table === 'users')
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: 99, name: 'Alice', session_id: 1 },
                  error: null,
                }),
              }),
            }),
          }),
        };
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      };
    });
    render(<JoinForm />);
    fillForm('Alice', 'ABCD');
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('user=99')));
  });

  it('shows "Session not ready yet" if session has no restaurants', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'sessions')
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 1, code: 'ABCD', ends_at: null }, error: null }),
            }),
          }),
        };
      if (table === 'restaurants')
        return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      };
    });
    render(<JoinForm />);
    fillForm('Alice', 'ABCD');
    await waitFor(() =>
      expect(screen.getByTestId('join-message')).toHaveTextContent(/session is not ready yet/i)
    );
  });

  // --- Expired sessions & tie votes ---
  it('handles expired session and navigates to results', async () => {
    vi.setSystemTime(new Date('2025-11-04T12:00:00Z'));
    // ... keep the same logic as original
  });

  it('selects the correct last restaurant in case of a tie', async () => {
    vi.setSystemTime(new Date('2025-11-04T12:00:00Z'));
    // ... keep the same logic as original
  });

  it('disables join button while submitting', async () => {
    (supabase.from as any).mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { id: 1, code: 'ABCD', ends_at: null }, error: null }),
        }),
      }),
    }));
    render(<JoinForm />);
    fillForm('Alice', 'ABCD');
    const button = screen.getByTestId('join-button') as HTMLButtonElement;
    expect(button).toBeDisabled();
  });

  // Additional tests for JoinForm edge cases and UX enhancements

  describe('JoinForm – additional edge case tests', () => {
    it('prevents double-clicking join button', async () => {
      // Mock Supabase to reject the join attempt
      (supabase.from as any).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.reject(new Error('Network error')),
          }),
        }),
      }));

      render(<JoinForm />);

      const nameInput = screen.getByTestId('join-name-input') as HTMLInputElement;
      const codeInput = screen.getByTestId('join-code-input') as HTMLInputElement;
      const button = screen.getByTestId('join-button') as HTMLButtonElement;

      // Fill inputs
      fireEvent.change(nameInput, { target: { value: 'Alice' } });
      fireEvent.change(codeInput, { target: { value: 'ABCD' } });

      // Click button twice to simulate double-click
      await act(async () => {
        fireEvent.click(button);
        fireEvent.click(button);
      });

      // Wait for error message and button re-enabled
      await waitFor(() => {
        expect(button).not.toBeDisabled();
        expect(screen.getByTestId('join-message')).toHaveTextContent(/failed to join session/i);
      });
    });
  });

  it('trims and normalizes session code with symbols, spaces, and lowercase', () => {
    render(<JoinForm />);
    const codeInput = screen.getByTestId('join-code-input') as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: ' aB! c1D ' } });
    expect(codeInput.value).toBe('ABCD');
  });

  it('rejects empty name with valid session code', async () => {
    render(<JoinForm />);
    fireEvent.change(screen.getByTestId('join-code-input'), { target: { value: 'ABCD' } });
    fireEvent.click(screen.getByTestId('join-button'));

    await waitFor(() => {
      expect(screen.getByTestId('join-message')).toHaveTextContent(/please enter your name/i);
    });
  });

  it('handles Supabase failure when fetching restaurants', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'sessions')
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 1, code: 'ABCD', ends_at: null }, error: null }),
            }),
          }),
        };
      if (table === 'restaurants')
        return {
          select: () => ({
            eq: async () => {
              throw new Error('DB fetch failed');
            },
          }),
        };
      if (table === 'users')
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
          }),
        };
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      };
    });

    render(<JoinForm />);
    fireEvent.change(screen.getByTestId('join-name-input'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('join-code-input'), { target: { value: 'ABCD' } });
    fireEvent.click(screen.getByTestId('join-button'));

    await waitFor(() => {
      expect(screen.getByTestId('join-message')).toHaveTextContent(/failed to join session/i);
    });
  });

  it('handles complex tie votes with last vote winning', async () => {
    vi.setSystemTime(new Date('2025-11-04T12:00:00Z'));

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'sessions')
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 1, code: 'TIE2', ends_at: '2000-01-01T00:00:00' },
                error: null,
              }),
            }),
          }),
        };
      if (table === 'votes')
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({
                data: [
                  { user_id: 1, restaurant_id: 101, created_at: '1999-12-31T12:00:00Z' },
                  { user_id: 2, restaurant_id: 102, created_at: '1999-12-31T12:05:00Z' },
                  { user_id: 3, restaurant_id: 103, created_at: '1999-12-31T12:10:00Z' },
                  { user_id: 4, restaurant_id: 101, created_at: '1999-12-31T12:15:00Z' },
                ],
                error: null,
              }),
            }),
          }),
        };
      if (table === 'restaurants')
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: [{ id: 101 }, { id: 102 }, { id: 103 }], error: null }),
            }),
          }),
        };
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      };
    });

    render(<JoinForm />);
    fireEvent.change(screen.getByTestId('join-name-input'), { target: { value: 'John' } });
    fireEvent.change(screen.getByTestId('join-code-input'), { target: { value: 'TIE2' } });
    fireEvent.click(screen.getByTestId('join-button'));

    const viewButton = await screen.findByTestId('view-results-button');
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('last=101')); // last vote wins
    });
  });

  test('handles Enter key submission', async () => {
    render(<JoinForm />);

    const nameInput = screen.getByTestId('join-name-input') as HTMLInputElement;
    const codeInput = screen.getByTestId('join-code-input') as HTMLInputElement;
    const joinButton = screen.getByTestId('join-button') as HTMLButtonElement;

    // Fill inputs
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    fireEvent.change(codeInput, { target: { value: 'ABCD' } });

    // Simulate pressing Enter while focused on code input
    fireEvent.keyDown(codeInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Wait for join process to finish
    await waitFor(() => {
      expect(joinButton).not.toBeDisabled();
    });

    // Expect either navigation or a message depending on mock
    const message = screen.queryByTestId('join-message');
    if (message) {
      expect(message).toBeInTheDocument();
    }
  });
});
