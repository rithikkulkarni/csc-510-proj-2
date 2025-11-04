// src/app/host/results/resultsPageClient.test.tsx
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ResultsPageClient from './ResultsPageClient';

// --- Mocks ---
const makeSearchParams = (pairs: Record<string, string | number | null | undefined>) => {
  return {
    get: (k: string) => {
      const v = pairs[k];
      return v === null || v === undefined ? null : String(v);
    },
  };
};

const useSearchParamsMock = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

type FromHandlers = {
  sessions?: any;
  restaurants?: any;
  votes?: any;
  users?: any;
};
const supabaseFromMock = vi.fn();
vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: (table: string) => supabaseFromMock(table),
  },
}));

const makeQuery = (impls: Partial<{
  select: (arg?: any) => any;
  eq: (...args: any[]) => any;
  in: (...args: any[]) => any;
  single: () => any;
  order: (...args: any[]) => any;
}>) => ({
  select: impls.select ?? vi.fn().mockReturnThis(),
  eq: impls.eq ?? vi.fn().mockReturnThis(),
  in: impls.in ?? vi.fn().mockReturnThis(),
  single: impls.single ?? vi.fn().mockResolvedValue({ data: null, error: null }),
  order: impls.order ?? vi.fn().mockReturnThis(),
});

const setSupabaseScenario = (handlers: FromHandlers) => {
  supabaseFromMock.mockImplementation((table: string) => {
    if (table === 'sessions' && handlers.sessions) return handlers.sessions;
    if (table === 'restaurants' && handlers.restaurants) return handlers.restaurants;
    if (table === 'votes' && handlers.votes) return handlers.votes;
    if (table === 'users' && handlers.users) return handlers.users;
    return makeQuery({});
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ResultsPageClient', () => {
  it(`
  JUSTIFICATION: Covers early-return error when no session code is provided.
  `, async () => {
    useSearchParamsMock.mockReturnValue(makeSearchParams({}));
    setSupabaseScenario({});

    render(<ResultsPageClient />);

    await waitFor(() =>
      expect(screen.getByText('No session code provided.')).toBeInTheDocument()
    );
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it(`
  JUSTIFICATION: "Session not found." when sessions.single() returns error.
  `, async () => {
    useSearchParamsMock.mockReturnValue(makeSearchParams({ session: 'ABC123' }));

    const sessions = makeQuery({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'nope' } }),
    });
    setSupabaseScenario({ sessions });

    render(<ResultsPageClient />);

    await waitFor(() =>
      expect(screen.getByText('Session not found.')).toBeInTheDocument()
    );
    expect(sessions.select).toHaveBeenCalled();
  });

  it(`
    JUSTIFICATION: Expired session message via expires_at check.
    We keep votes non-empty so no later error overwrites the expired text.
    `, async () => {
    useSearchParamsMock.mockReturnValue(
        makeSearchParams({ session: 'ABC123', expires_at: '2000-01-01T00:00:00' })
    );

    const sessions = makeQuery({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 1, code: 'ABC123', mode: 'group' }, error: null }),
    });

    const votes = makeQuery({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
        data: [{ restaurant_id: 999, user_id: 42, created_at: '2025-11-01T10:00:00Z' }],
        error: null,
        }),
    });

    const restaurants = makeQuery({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
        data: [{ id: 999, name: 'Any', address: 'X', rating: 4.0, price_level: 1 }],
        error: null,
        }),
    });

    const users = makeQuery({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [{ id: 42, name: 'U' }], error: null }),
    });

    setSupabaseScenario({ sessions, votes, restaurants, users });

    render(<ResultsPageClient />);

    await waitFor(() =>
        expect(
        screen.getByText('This session has expired. You are viewing the results.')
        ).toBeInTheDocument()
    );
  });

  it(`
  JUSTIFICATION: SOLO mode guard "Invalid solo session data." when top/last IDs missing.
  `, async () => {
    useSearchParamsMock.mockReturnValue(
      makeSearchParams({ session: 'S1', top: null, last: null })
    );

    const sessions = makeQuery({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 10, code: 'S1', mode: 'solo' }, error: null }),
    });

    setSupabaseScenario({ sessions });

    render(<ResultsPageClient />);

    await waitFor(() =>
      expect(screen.getByText('Invalid solo session data.')).toBeInTheDocument()
    );
  });

  it(`
  JUSTIFICATION: SOLO mode "Restaurants not found..." when restaurants query returns empty.
  `, async () => {
    useSearchParamsMock.mockReturnValue(
      makeSearchParams({ session: 'S2', top: 101, last: 202 })
    );

    const sessions = makeQuery({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 11, code: 'S2', mode: 'solo' }, error: null }),
    });

    const restaurants = makeQuery({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    setSupabaseScenario({ sessions, restaurants });

    render(<ResultsPageClient />);

    await waitFor(() =>
      expect(
        screen.getByText('Restaurants not found for this session.')
      ).toBeInTheDocument()
    );
  });

  it(`
  JUSTIFICATION: SOLO success path renders "Results" layout and both cards.
  Verifies headings and fields, exercising RestaurantCard (links/fields render).
  `, async () => {
    useSearchParamsMock.mockReturnValue(
      makeSearchParams({
        session: 'S3',
        top: 1,
        last: 2,
        expires_at: '2999-01-01T00:00:00',
      })
    );

    const sessions = makeQuery({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 12, code: 'S3', mode: 'solo' }, error: null }),
    });

    // NOTE: In SOLO mode, the component pushes raw rows to RestaurantCard (no price_level→price mapping).
    // Therefore Price will render as "N/A" even if price_level is present in row.
    const restaurantsRows = [
      {
        id: 1,
        name: 'Top Place',
        address: '123 A St',
        website: 'https://top.example',
        maps_uri: 'https://maps.example/top',
        rating: 4.7,
        price_level: 3,
      },
      {
        id: 2,
        name: 'Last Place',
        rating: null,
        price_level: 0,
      },
    ];

    const restaurants = makeQuery({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: restaurantsRows, error: null }),
    });

    setSupabaseScenario({ sessions, restaurants });

    render(<ResultsPageClient />);

    await waitFor(() => expect(screen.getByRole('heading', { name: /results/i })).toBeInTheDocument());

    expect(screen.getByRole('heading', { name: /top choice/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /last man standing/i })).toBeInTheDocument();

    const topCard = screen.getByText(/Top Place/).closest('div')!;
    expect(within(topCard).getByText('123 A St')).toBeInTheDocument();
    expect(within(topCard).getByRole('link', { name: /website/i })).toHaveAttribute('href', 'https://top.example');
    expect(within(topCard).getByRole('link', { name: /google maps/i })).toHaveAttribute('href', 'https://maps.example/top');
    // FIX: Expect N/A because r.price is undefined in SOLO path
    expect(within(topCard).getByText(/Price:\s*N\/A/i)).toBeInTheDocument();
    expect(within(topCard).getByText(/Rating:\s*4\.7/i)).toBeInTheDocument();

    const lastCard = screen.getByText(/Last Place/).closest('div')!;
    expect(within(lastCard).getByText(/Price:\s*N\/A/i)).toBeInTheDocument();
    expect(within(lastCard).getByText(/Rating:\s*N\/A/i)).toBeInTheDocument();
  });

  it(`
  JUSTIFICATION: GROUP mode "No votes found..." when votes query returns empty array.
  `, async () => {
    useSearchParamsMock.mockReturnValue(makeSearchParams({ session: 'G1' }));

    const sessions = makeQuery({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 20, code: 'G1', mode: 'group' }, error: null }),
    });

    const votes = makeQuery({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    setSupabaseScenario({ sessions, votes });

    render(<ResultsPageClient />);

    await waitFor(() =>
      expect(screen.getByText('No votes found for this session.')).toBeInTheDocument()
    );
  });

  it(`
    JUSTIFICATION: GROUP success renders Top Voted grid (with border classes) and LMS list with ranks/voters.
    `, async () => {
    useSearchParamsMock.mockReturnValue(makeSearchParams({ session: 'G2' }));

    const sessionRow = { id: 21, code: 'G2', mode: 'group' };

    const sessions = makeQuery({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sessionRow, error: null }),
    });

    // DESCENDING by created_at (latest first), as Supabase would return
    const votesData = [
        { restaurant_id: 104, user_id: 3, created_at: '2025-11-01T10:05:00Z' }, // latest for user 3
        { restaurant_id: 102, user_id: 2, created_at: '2025-11-01T10:04:00Z' }, // latest for user 2
        { restaurant_id: 103, user_id: 3, created_at: '2025-11-01T10:03:00Z' },
        { restaurant_id: 102, user_id: 1, created_at: '2025-11-01T10:02:00Z' }, // latest for user 1
        { restaurant_id: 101, user_id: 2, created_at: '2025-11-01T10:01:00Z' },
        { restaurant_id: 101, user_id: 1, created_at: '2025-11-01T10:00:00Z' },
    ];

    const votes = makeQuery({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: votesData, error: null }),
    });

    const topRestaurantsRows = [
        { id: 101, name: 'A', address: 'A st', website: 'https://a', maps_uri: 'https://maps/a', rating: 4.2, price_level: 2 },
        { id: 102, name: 'B', address: 'B st', website: 'https://b', maps_uri: 'https://maps/b', rating: 4.9, price_level: 3 },
        { id: 103, name: 'C', address: 'C st', website: null, maps_uri: null, rating: 3.8, price_level: 1 },
        { id: 104, name: 'D', address: 'D st', website: null, maps_uri: null, rating: 4.1, price_level: 1 },
    ];

    const restaurants = makeQuery({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockImplementation((...args: any[]) => {
        const ids = Array.isArray(args[1]) ? args[1] : args[0];
        const data = topRestaurantsRows.filter(r => ids.includes(r.id));
        return Promise.resolve({ data, error: null });
        }),
    });

    const users = makeQuery({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
        data: [
            { id: 1, name: 'U1' },
            { id: 2, name: 'U2' },
            { id: 3, name: 'U3' },
        ],
        error: null,
        }),
    });

    setSupabaseScenario({ sessions, votes, restaurants, users });

    const { container } = render(<ResultsPageClient />);

    await waitFor(() =>
        expect(screen.getByRole('heading', { name: /group results/i })).toBeInTheDocument()
    );

    expect(screen.getByRole('heading', { name: /top voted restaurants/i })).toBeInTheDocument();

    // Rank borders exist on wrappers
    await waitFor(() => {
        expect(container.querySelector('.border-yellow-400')).toBeTruthy();
        expect(container.querySelector('.border-gray-400')).toBeTruthy();
        expect(container.querySelector('.border-amber-700')).toBeTruthy();
    });

    // Function matchers to tolerate line breaks/extra spaces in <h3> text
    const h3ByText = (re: RegExp) =>
        screen.getByText((content, el) => el?.tagName === 'H3' && re.test(el.textContent || ''));

    // #1 should be B with voters U1,U2 (2 votes)
    const rank1Heading = h3ByText(/#\s*1\s*B\b/);
    const rank1Card = rank1Heading.closest('div')!;
    expect(
    within(rank1Card).getByText((_, el) =>
        el?.tagName === 'P' && /Voted by:\s*U1,\s*U2/i.test(el.textContent || '')
    )
    ).toBeInTheDocument();
    expect(within(rank1Card).getByText(/Votes:\s*2/i)).toBeInTheDocument();

    // #2 should be D with voter U3 (1 vote)
    const rank2Heading = h3ByText(/#\s*2\s*D\b/);
    const rank2Card = rank2Heading.closest('div')!;
    expect(
    within(rank2Card).getByText((_, el) =>
        el?.tagName === 'P' && /Voted by:\s*U3/i.test(el.textContent || '')
    )
    ).toBeInTheDocument();
    expect(within(rank2Card).getByText(/Votes:\s*1/i)).toBeInTheDocument();
  });


  it(`
  JUSTIFICATION: Catch-all exception path -> "Failed to fetch results."
  `, async () => {
    useSearchParamsMock.mockReturnValue(makeSearchParams({ session: 'ERR' }));

    supabaseFromMock.mockImplementation(() => {
      throw new Error('boom');
    });

    render(<ResultsPageClient />);

    await waitFor(() =>
      expect(screen.getByText('Failed to fetch results.')).toBeInTheDocument()
    );
  });
});
