'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { BackButton } from '@/components/BackButton';

type Place = {
  id: number;
  name: string;
  address?: string;
  rating?: number;
  priceLevel?: number;
  mapsUri?: string;
  website?: string;
  deliveryLinks?: string[];
  /** Normalized 0–3 price index */
  _priceIdx: number | null;
};

type Item = Place & { wins: number; losses: number };

function priceLabelFromIndex(idx: number | null) {
  if (idx == null) return 'N/A';
  return '$'.repeat(idx + 1);
}

/**
 * SwipePage
 *
 * Pairwise comparison (leader vs. challenger) to pick favorites.
 * Supports:
 * - **solo** mode (optional `soloRestaurants` prop) without DB writes.
 * - **group** mode (session via query `?session=&user=`) with persisted votes.
 *
 * Flow:
 * - Load restaurants (from prop or Supabase by session).
 * - Present pairs: current leader vs. cursor.
 * - Record wins/losses locally; in group mode also insert vote rows.
 * - On completion, navigate to results with top & last IDs.
 *
 * Query params (group):
 * - `session` (code), `user` (id)
 */
export default function SwipePage({ soloRestaurants }: { soloRestaurants?: Place[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionCode = searchParams.get('session');
  const userIdParam = searchParams.get('user');
  const userId = userIdParam ? Number(userIdParam) : null;

  const [items, setItems] = useState<Item[]>([]);
  const [finished, setFinished] = useState(false);
  const [leaderIdx, setLeaderIdx] = useState(0);
  const [cursor, setCursor] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<'solo' | 'group'>(
    soloRestaurants ? 'solo' : 'group'
  );
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    let interval: number | undefined;

    async function fetchSessionRestaurants() {
      try {
        // SOLO: use provided list
        if (soloRestaurants) {
          const initialItems: Item[] = soloRestaurants.map((r) => ({ ...r, wins: 0, losses: 0 }));
          setItems(initialItems);
          setCursor(initialItems.length > 1 ? 1 : 0);
          setSessionMode('solo');
          return;
        }

        // GROUP: load session + restaurants by session code
        if (!sessionCode) {
          setError('No session code provided.');
          return;
        }

        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('code', sessionCode)
          .single();

        if (!session || sessionError) {
          setError('Session not found.');
          return;
        }

        setSessionMode(session.mode);
        setSessionId(session.id);

        if (session.mode === 'group' && !userId) {
          setError('User ID not provided for group session.');
          return;
        }

        // Countdown (UTC-based)
        if (session.ends_at) {
          interval = window.setInterval(() => {
            const endsAtUTC = new Date(session.ends_at + 'Z');
            const nowUTC = new Date();
            const diff = endsAtUTC.getTime() - nowUTC.getTime();

            if (diff <= 0) {
              if (interval) clearInterval(interval);
              setFinished(true);
              return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
          }, 1000);
        }

        const { data: restaurants, error: restError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('session_id', session.id);

        if (restError || !restaurants?.length) {
          setError('No restaurants found for this session.');
          return;
        }

        const initialItems: Item[] = restaurants.map((r: any) => ({
          id: Number(r.id),
          name: r.name,
          address: r.address,
          rating: r.rating,
          mapsUri: r.maps_uri,
          website: r.website,
          deliveryLinks: r.delivery_links ?? [],
          _priceIdx: r.price_level ?? null,
          wins: 0,
          losses: 0,
        }));

        setItems(initialItems);
        setCursor(initialItems.length > 1 ? 1 : 0);
      } catch (err: any) {
        console.error('Error initializing session:', err);
        setError(err.message ?? 'Failed to initialize session.');
      }
    }

    fetchSessionRestaurants();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [soloRestaurants, sessionCode, userId]);

  const havePair = useMemo(
    () => !finished && items.length >= 2 && leaderIdx < items.length && cursor < items.length,
    [finished, items, leaderIdx, cursor]
  );

  /** Pick winner of current pair; persist vote in group mode */
  const pickWinner = async (index: number) => {
    if (!havePair) return;

    const loserIdx = index === leaderIdx ? cursor : leaderIdx;

    setItems((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], wins: clone[index].wins + 1 };
      clone[loserIdx] = { ...clone[loserIdx], losses: clone[loserIdx].losses + 1 };
      return clone;
    });

    if (sessionMode === 'group' && sessionId && userId) {
      try {
        await supabase
          .from('votes')
          .insert([{ session_id: sessionId, restaurant_id: items[index].id, user_id: userId }]);
      } catch (err) {
        console.error('Failed to save vote:', err);
      }
    }

    const nextCursor = cursor + 1;
    setLeaderIdx(index);

    if (nextCursor >= items.length) {
      setFinished(true);
      routeToResults(items[index].id);
    } else {
      setCursor(nextCursor);
    }
  };

  /** Skip current pair: challenger becomes next leader */
  const skipPair = () => {
    const nextCursor = cursor + 1;
    setLeaderIdx(cursor);

    if (nextCursor >= items.length) {
      setFinished(true);
      routeToResults(items[cursor].id);
    } else {
      setCursor(nextCursor);
    }
  };

  /** Navigate to results: solo -> include top+last; group -> include user+last */
  const routeToResults = (lastId: number) => {
    if (sessionMode === 'solo') {
      const top = items.reduce((prev, curr) => (curr.wins > prev.wins ? curr : prev), items[0]).id;
      router.push(`/host/results?session=${sessionCode}&last=${lastId}&top=${top}`);
    } else {
      router.push(`/host/results?session=${sessionCode}&user=${userId}&last=${lastId}`);
    }
  };

  /** End early */
  const handleDoneVoting = () => {
    const lastId = items[leaderIdx]?.id ?? items[0]?.id;
    routeToResults(lastId);
  };

  return (
    <div className="min-h-screen bg-green-100 px-4 py-6">
      <div className="mx-auto max-w-4xl">
        {/* TITLE */}
        <h1 className="text-4xl font-extrabold text-green-900 mb-6 text-center">
          Choose Your Favorite
        </h1>

        <BackButton />

        {error && <div className="mt-4 text-red-700 text-center">{error}</div>}

        {!error && !finished && havePair && (
          <div className="bg-[#F5F5DC] p-6 rounded-2xl shadow-md">
            <div className="bg-[#F5F5DC] p-6 rounded-2xl flex items-center justify-center gap-4">
              <RestaurantCard place={items[leaderIdx]} onChoose={() => pickWinner(leaderIdx)} />
              <div className="flex-shrink-0 flex items-center justify-center">
                <span className="rounded-full border-2 border-green-800 px-4 py-2 font-bold text-green-800 text-lg">
                  OR
                </span>
              </div>
              <RestaurantCard place={items[cursor]} onChoose={() => pickWinner(cursor)} />
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                onClick={skipPair}
                className="rounded-md bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400 cursor-pointer"
              >
                Too Tough / Skip
              </button>

              <button
                onClick={handleDoneVoting}
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 cursor-pointer"
              >
                {sessionMode === 'group' ? 'Done Voting' : 'I Found My Place'}
              </button>
            </div>
          </div>
        )}

        {/* TIME REMAINING BELOW CARD */}
        {!finished && sessionMode === 'group' && timeLeft && (
          <div className="mt-3 text-center text-sm text-green-900">Time remaining: {timeLeft}</div>
        )}
      </div>
    </div>
  );
}

/** Side-by-side choice card for a candidate restaurant */
function RestaurantCard({ place, onChoose }: { place: Place; onChoose: () => void }) {
  return (
    <button
      onClick={onChoose}
      className="w-full border rounded-2xl p-6 text-left hover:shadow-lg transition bg-white transition-transform transform
        hover:scale-105 hover:shadow-xl cursor-pointer"
    >
      <div className="text-xl font-semibold text-green-900">{place.name}</div>
      {place.address && <div className="text-sm text-green-800">{place.address}</div>}
      <div className="mt-1 text-sm text-green-900">
        {typeof place.rating === 'number' && <>⭐ {place.rating.toFixed(1)} · </>}
        Price: {priceLabelFromIndex(place._priceIdx)}
      </div>
      {place.website && (
        <a
          href={place.website}
          target="_blank"
          rel="noreferrer"
          className="text-green-700 underline text-sm"
        >
          Website
        </a>
      )}
      {place.mapsUri && (
        <a
          href={place.mapsUri}
          target="_blank"
          rel="noreferrer"
          className="text-green-700 underline text-sm ml-2"
        >
          Google Maps
        </a>
      )}
    </button>
  );
}
