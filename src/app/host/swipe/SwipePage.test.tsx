// src/app/host/swipe/SwipePage.test.tsx
import React from 'react';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { it, expect, vi, afterEach } from 'vitest';

// --- test setup ---
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.resetModules();
  // Safety net: ensure we’re back on real timers even if a test failed mid-way.
  try {
    vi.useRealTimers();
  } catch {}
});

const pushMock = vi.fn();

function mockNextNavigation(search: Record<string, string | null> = {}) {
  vi.doMock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
    useSearchParams: () => ({
      get: (key: string) =>
        Object.prototype.hasOwnProperty.call(search, key) ? search[key] : null,
    }),
  }));
}

function mockBackButton() {
  vi.doMock('@/components/BackButton', () => ({
    BackButton: () => <div data-testid="back-btn">back</div>,
  }));
}

type Session = { id: number; code: string; mode: 'solo' | 'group'; ends_at?: string | null };
type Restaurant = {
  id: number | string;
  name: string;
  address?: string;
  rating?: number;
  website?: string;
  maps_uri?: string;
  delivery_links?: string[] | null;
  price_level?: number | null;
};

function mockSupabase(impl: {
  session?: Session | null;
  sessionError?: any;
  restaurants?: Restaurant[] | null;
  restaurantsError?: any;
  captureVoteInsert?: (payload: any) => void;
}) {
  // Chain for: supabase.from('restaurants').select('*').eq('session_id', session.id)
  const restaurantsChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(async () => ({
      data: impl.restaurants ?? null,
      error: impl.restaurantsError ?? null,
    })),
  };

  const fromMock = vi.fn((table: string) => {
    if (table === 'sessions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({
          data: impl.session ?? null,
          error: impl.sessionError ?? (impl.session ? null : 'notfound'),
        })),
      };
    }

    if (table === 'restaurants') {
      return restaurantsChain as any;
    }

    if (table === 'votes') {
      return {
        insert: vi.fn(async (payload) => {
          impl.captureVoteInsert?.(payload);
          return { data: null, error: null };
        }),
      };
    }

    return {} as any;
  });

  vi.doMock('../../../lib/supabaseClient', () => ({
    supabase: { from: fromMock },
  }));
}

/**
 * Justification:
 * SOLO path without Supabase: initializes from `soloRestaurants`, renders a pair,
 * exercises price labels (N/A and $$$), clicks through until finish, and asserts
 * solo-style router.push (with top & last).
 */
it('solo mode: renders pair, respects price labels, and routes to results after finishing', async () => {
  mockBackButton();
  mockNextNavigation({ session: 'ABC' });
  mockSupabase({}); // not used in solo, but keeps import satisfied

  const { default: SwipePage } = await import('./SwipePage');

  const solo = [
    { id: 1, name: 'A', _priceIdx: null, address: 'One', rating: 4.234 } as any,
    {
      id: 2,
      name: 'B',
      _priceIdx: 2,
      website: 'https://b.example',
      mapsUri: 'https://maps.example/b',
    } as any,
    { id: 3, name: 'C', _priceIdx: 0 } as any,
  ];

  render(<SwipePage soloRestaurants={solo} />);

  // Price labels + rating formatting + links
  expect(screen.getByText('A')).toBeInTheDocument();
  expect(screen.getByText(/Price: N\/A/i)).toBeInTheDocument();

  expect(screen.getByText('B')).toBeInTheDocument();
  expect(screen.getByText(/Price: \$\$\$/)).toBeInTheDocument();

  expect(screen.getByText(/⭐ 4\.2 ·/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /website/i })).toHaveAttribute(
    'href',
    'https://b.example'
  );
  expect(screen.getByRole('link', { name: /google maps/i })).toHaveAttribute(
    'href',
    'https://maps.example/b'
  );

  // First comparison: pick B
  fireEvent.click(screen.getByText('B'));
  // Second comparison: winner vs C → pick C
  fireEvent.click(screen.getByText('C'));

  await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
  const pushed = pushMock.mock.calls[0][0] as string;

  expect(pushed).toMatch(/^\/host\/results\?/);
  expect(pushed).toContain('session=ABC');
  expect(pushed).toContain('last=3'); // final click was C(id 3)
  expect(pushed).toMatch(/top=(1|2|3)/); // top present and valid
});

/**
 * Justification:
 * GROUP error branch: session exists but no user id in query.
 * Confirms explicit error message and that the pair is not rendered.
 */
it('group mode without user id → shows error', async () => {
  mockBackButton();
  mockNextNavigation({ session: 'ROOM1', user: null });
  mockSupabase({
    session: { id: 42, code: 'ROOM1', mode: 'group' },
    restaurants: [{ id: 10, name: 'X', price_level: 1 }],
  });

  const { default: SwipePage } = await import('./SwipePage');
  render(<SwipePage />);

  expect(await screen.findByText(/User ID not provided for group session/i)).toBeInTheDocument();
  expect(screen.queryByText('OR')).not.toBeInTheDocument();
});

/**
 * Justification:
 * GROUP happy path: fetches session + restaurants, waits for render, then
 * advances timers so countdown appears; records a vote and routes via Done Voting.
 */
it('group mode with user id → shows countdown, records vote on pick, and routes on Done Voting', async () => {
  // No fake timers. Instead, stub setInterval => fire once immediately.
  const intervalSpy = vi.spyOn(window, 'setInterval').mockImplementation((cb: TimerHandler) => {
    // call once so timeLeft is set after fetch
    // @ts-expect-error deliberate cast for test env
    cb();
    return 1 as any; // fake id
  });
  const clearSpy = vi.spyOn(window, 'clearInterval').mockImplementation(() => {});

  try {
    mockBackButton();
    mockNextNavigation({ session: 'ROOM2', user: '7' });

    const voteSpy = vi.fn();
    const now = new Date();
    // ends_at should be in the future; component appends 'Z'
    const endsAt = new Date(now.getTime() + 2_000).toISOString().replace('Z', '');

    mockSupabase({
      session: { id: 99, code: 'ROOM2', mode: 'group', ends_at: endsAt },
      restaurants: [
        { id: 1, name: 'R1', price_level: 1 },
        { id: 2, name: 'R2', price_level: 2 },
        { id: 3, name: 'R3', price_level: 3 }, // <-- add a 3rd item
      ],
      captureVoteInsert: voteSpy,
    });

    const { default: SwipePage } = await import('./SwipePage');
    render(<SwipePage />);

    // Wait for fetched restaurants to render (real timers, so findByText works)
    await screen.findByText('R1');
    await screen.findByText('R2');

    // Countdown should now be visible thanks to our setInterval stub firing once
    expect(await screen.findByText(/Time remaining:/i)).toBeInTheDocument();

    // Click R2 once -> vote is recorded, but NOT finished now (cursor=2 < length=3)
    fireEvent.click(screen.getByText('R2'));
    await waitFor(() => expect(voteSpy).toHaveBeenCalled());

    // Now the "Done Voting" button still exists; click it to route
    fireEvent.click(screen.getByRole('button', { name: /Done Voting/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));

    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toMatch(/^\/host\/results\?/);
    expect(url).toContain('session=ROOM2');
    expect(url).toContain('user=7');
    // After picking R2, leaderIdx is set to index of R2 => id=2
    expect(url).toContain('last=2'); // current leader id
  } finally {
    intervalSpy.mockRestore();
    clearSpy.mockRestore();
  }
});

/**
 * Justification:
 * Early error branch: no session & not solo → shows "No session code provided."
 * Wait for effect to commit error state.
 */
it('no session & not solo → shows "No session code provided."', async () => {
  mockBackButton();
  mockNextNavigation({});
  mockSupabase({});

  const { default: SwipePage } = await import('./SwipePage');
  render(<SwipePage />);

  await waitFor(() => expect(screen.getByText(/No session code provided\./i)).toBeInTheDocument());
});

/**
 * Justification:
 * Session exists but restaurants query returns empty → explicit error surfaced.
 * Wait for fetch to resolve and error to commit.
 */
it('group session with empty restaurants → shows "No restaurants found for this session."', async () => {
  mockBackButton();
  mockNextNavigation({ session: 'R3', user: '5' });

  mockSupabase({
    session: { id: 77, code: 'R3', mode: 'group' },
    restaurants: [], // empty
  });

  const { default: SwipePage } = await import('./SwipePage');
  render(<SwipePage />);

  await waitFor(() =>
    expect(screen.getByText(/No restaurants found for this session\./i)).toBeInTheDocument()
  );
});

/**
 * Justification:
 * Covers `skipPair` branch and group-style routing when skipping causes the bracket to finish.
 * With exactly 2 restaurants, clicking "Too Tough / Skip" sets finished=true and routes immediately.
 */
it('group mode → skipPair finishes and routes (group branch)', async () => {
  mockBackButton();
  mockNextNavigation({ session: 'GSKIP', user: '11' });

  mockSupabase({
    session: { id: 501, code: 'GSKIP', mode: 'group' }, // no ends_at needed
    restaurants: [
      { id: 1, name: 'R1', price_level: 1 },
      { id: 2, name: 'R2', price_level: 2 },
    ],
  });

  const { default: SwipePage } = await import('./SwipePage');
  render(<SwipePage />);

  // Wait for pair to render
  await screen.findByText('R1');
  await screen.findByText('R2');

  // Skip this pair -> should finish (cursor=2 >= length) and route
  fireEvent.click(screen.getByRole('button', { name: /Too Tough \/ Skip/i }));

  await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
  const url = pushMock.mock.calls[0][0] as string;
  expect(url).toMatch(/^\/host\/results\?/);
  expect(url).toContain('session=GSKIP');
  expect(url).toContain('user=11');
  // skipPair routes with last = items[cursor].id (cursor was 1 => id 2)
  expect(url).toContain('last=2');
});

/**
 * Justification:
 * Forces the vote insert to reject -> exercises the `catch` branch in `pickWinner` and verifies
 * the effect cleanup calls `clearInterval` when an interval was started (ends_at set).
 */
it('group mode vote insert failure → logs error and clears countdown interval on unmount', async () => {
  mockBackButton();
  mockNextNavigation({ session: 'GERR', user: '9' });

  // Spy on console.error and clearInterval to verify both branches
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const clearSpy = vi.spyOn(window, 'clearInterval');

  // A dedicated supabase mock where votes.insert rejects
  function mockSupabaseVoteError() {
    const restaurantsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({
        data: [
          { id: 1, name: 'R1', price_level: 1 },
          { id: 2, name: 'R2', price_level: 2 },
        ],
        error: null,
      })),
    };

    const fromMock = vi.fn((table: string) => {
      if (table === 'sessions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({
            data: {
              id: 700,
              code: 'GERR',
              mode: 'group',
              // ends_at in the future so the component starts an interval we can see cleared on unmount
              ends_at: new Date(Date.now() + 60_000).toISOString().replace('Z', ''),
            },
            error: null,
          })),
        };
      }
      if (table === 'restaurants') return restaurantsChain as any;
      if (table === 'votes') {
        return {
          insert: vi.fn(async () => {
            // Reject to hit the catch branch
            throw new Error('vote insert failed');
          }),
        };
      }
      return {} as any;
    });

    vi.doMock('../../../lib/supabaseClient', () => ({
      supabase: { from: fromMock },
    }));
  }

  mockSupabaseVoteError();

  const { default: SwipePage } = await import('./SwipePage');
  const { unmount } = render(<SwipePage />);

  // Wait for pair
  await screen.findByText('R1');
  await screen.findByText('R2');

  // Click R2 to trigger pickWinner -> vote insert rejection
  fireEvent.click(screen.getByText('R2'));

  // Error should be logged from the catch path
  await waitFor(() =>
    expect(consoleSpy).toHaveBeenCalledWith('Failed to save vote:', expect.any(Error))
  );

  // Unmount to trigger effect cleanup -> clearInterval should be called
  unmount();
  expect(clearSpy).toHaveBeenCalled();

  consoleSpy.mockRestore();
  clearSpy.mockRestore();
});
