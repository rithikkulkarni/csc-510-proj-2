'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
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
    <div className="relative min-h-screen text-gray-900 flex flex-col items-center justify-start px-6 py-10 overflow-hidden">
      {/* Background */}
      <Image
        src="/background.png"
        alt="Background"
        fill
        className="absolute inset-0 object-cover z-0"
        priority
      />

      {/* Top-left Logo + Title + Slogan */}
      <div className="absolute top-4 left-4 z-20 flex flex-row items-start gap-2">
        <div className="relative w-10 h-10">
          <Image src="/logo.png" alt="Logo" width={40} height={40} className="animate-float" />
        </div>
        <div className="flex flex-col items-start gap-0">
          <h1
            className="text-lg font-extrabold uppercase text-green-800"
            style={{
              lineHeight: '1',
              textShadow: '0 0 2px rgba(203,241,195,0.5),0 0 4px rgba(203,241,195,0.3)',
            }}
          >
            FOOD FINDER
          </h1>
          <p
            className="text-[8px] font-semibold text-gray-700 mt-0"
            style={{ lineHeight: '0.95', textShadow: '1px 1px 1px rgba(0,0,0,0.1)' }}
          >
            DECISIONS ARE HARD.
            <br />
            EATING TOGETHER SHOULDN'T BE.
          </p>
        </div>
      </div>

      <header className="relative z-10 mb-12 text-center w-full">
        <h1 className="text-4xl md:text-5xl font-extrabold text-green-800">Choose Your Favorite</h1>
        <p className="text-lg md:text-xl font-bold text-gray-700 mt-2">
          Pick your preferred option or skip if it's too tough!
        </p>
      </header>

      <div className="mx-auto max-w-4xl pt-6relative z-10">
        {/* Error */}
        {error && <div className="mb-6 text-center text-red-700 font-medium">{error}</div>}

        {/* Voting Card */}
        {!error && !finished && havePair && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border-4 border-gray-500">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
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
                className="w-full sm:w-auto rounded-xl bg-gray-200 px-5 py-2 text-gray-800 font-medium hover:bg-gray-300 transition transform hover:scale-105"
              >
                Too Tough / Skip
              </button>
              <button
                onClick={handleDoneVoting}
                className="w-full sm:w-auto rounded-xl bg-green-600 px-5 py-2 text-white font-medium hover:bg-green-700 transition transform hover:scale-105"
              >
                {sessionMode === 'group' ? 'Done Voting' : 'I Found My Place'}
              </button>
            </div>
          </div>
        )}

        {/* Timer */}
        {!finished && sessionMode === 'group' && timeLeft && (
          <div className="mt-3 text-center text-sm text-green-900 font-semibold">
            Time remaining: {timeLeft}
          </div>
        )}

        <footer className="mt-12 text-gray-500 text-sm relative z-10 w-full text-center">
          <div className="text-center mt-6">
            <BackButton className="inline-block rounded-2xl bg-green-800 text-white font-bold text-lg py-3 px-6 shadow-md hover:shadow-lg hover:bg-green-900 transition transform duration-150 hover:scale-105" />
          </div>
          <div className="mt-4">© {new Date().getFullYear()} Food Finder</div>
        </footer>
      </div>
    </div>
  );
}

/** Side-by-side choice card for a candidate restaurant */
function RestaurantCard({ place, onChoose }: { place: Place; onChoose: () => void }) {
  return (
    <button
      onClick={onChoose}
      className="w-full sm:w-64 border-4 rounded-2xl p-5 text-left hover:shadow-lg transition transform hover:scale-105 cursor-pointer bg-white"
    >
      <div className="text-lg font-bold text-green-900">{place.name}</div>
      {place.address && <div className="text-sm text-green-800">{place.address}</div>}
      <div className="mt-1 text-sm text-green-900">
        {typeof place.rating === 'number' && <>⭐ {place.rating.toFixed(1)} · </>}
        Price: {priceLabelFromIndex(place._priceIdx)}
      </div>
      <div className="mt-1 flex flex-wrap gap-2 text-sm">
        {place.website && (
          <a
            href={place.website}
            target="_blank"
            rel="noreferrer"
            className="text-green-700 underline"
          >
            Website
          </a>
        )}
        {place.mapsUri && (
          <a
            href={place.mapsUri}
            target="_blank"
            rel="noreferrer"
            className="text-green-700 underline"
            onClick={(e) => e.stopPropagation()} // <-- prevent card click
          >
            Google Maps
          </a>
        )}
      </div>
    </button>
  );
}
