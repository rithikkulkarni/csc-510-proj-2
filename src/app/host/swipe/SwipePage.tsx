'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type Place = {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  lat?: number;
  lng?: number;
  mapsUri?: string;
  website?: string;
  deliveryLinks?: string[];
  _priceIdx: number | null;
};

type Item = Place & { wins: number; losses: number };

function priceLabelFromIndex(idx: number | null): string {
  if (idx == null) return 'N/A';
  return '$'.repeat(idx + 1);
}

export default function SwipePage({ soloRestaurants }: { soloRestaurants?: Place[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionCode = searchParams.get('session');
  const userId = searchParams.get('user');

  const [items, setItems] = useState<Item[]>([]);
  const [finished, setFinished] = useState(false);
  const [leaderIdx, setLeaderIdx] = useState(0);
  const [cursor, setCursor] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<'solo' | 'group'>(
    soloRestaurants ? 'solo' : 'group'
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    async function fetchSessionRestaurants() {
      if (soloRestaurants) {
        const initialItems: Item[] = soloRestaurants.map((r) => ({ ...r, wins: 0, losses: 0 }));
        setItems(initialItems);
        setCursor(initialItems.length > 1 ? 1 : 0);
        setSessionMode('solo');
        return;
      }

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

      // Countdown timer
      if (session.mode === 'group' && session.ends_at) {
        const endsAt = new Date(session.ends_at);
        const interval = setInterval(() => {
          const diff = endsAt.getTime() - new Date().getTime();
          if (diff <= 0) {
            clearInterval(interval);
            setFinished(true);
            return;
          }
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }, 1000);
        return () => clearInterval(interval);
      }

      // Load restaurants
      const { data: restaurants, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('session_id', session.id);

      if (restError || !restaurants?.length) {
        setError('No restaurants found for this session.');
        return;
      }

      const initialItems: Item[] = restaurants.map((r: any) => ({
        id: r.id,
        name: r.name,
        address: r.address,
        lat: r.latitude,
        lng: r.longitude,
        rating: r.rating,
        mapsUri: r.maps_uri ?? r.google_maps_uri,
        website: r.website,
        deliveryLinks: r.delivery_links ?? [],
        _priceIdx: r.price_level ?? null,
        wins: 0,
        losses: 0,
      }));

      setItems(initialItems);
      setCursor(initialItems.length > 1 ? 1 : 0);
    }

    fetchSessionRestaurants();
  }, [soloRestaurants, sessionCode, userId]);

  const havePair = useMemo(
    () => !finished && items.length >= 2 && leaderIdx < items.length && cursor < items.length,
    [finished, items, leaderIdx, cursor]
  );

  const pickWinner = async (index: number) => {
    if (!havePair) return;
    const loser = index === leaderIdx ? cursor : leaderIdx;

    setItems((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], wins: clone[index].wins + 1 };
      clone[loser] = { ...clone[loser], losses: clone[loser].losses + 1 };
      return clone;
    });

    if (sessionMode === 'group' && sessionId && userId) {
      await supabase.from('votes').insert([
        { session_id: sessionId, restaurant_id: items[index].id, user_id: Number(userId) },
        { session_id: sessionId, restaurant_id: items[loser].id, user_id: Number(userId) },
      ]);
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

  const routeToResults = (lastId: string) => {
    if (sessionMode === 'solo') {
      const top = items.reduce((prev, curr) => (curr.wins > prev.wins ? curr : prev), items[0]).id;
      router.push(`/host/results?session=${sessionCode}&last=${lastId}&top=${top}`);
    } else {
      router.push(`/host/results?session=${sessionCode}&user=${userId}&last=${lastId}`);
    }
  };

  const handleFoundMyPlace = () => {
    // Jump to results page manually
    const top = items[leaderIdx]?.id ?? items[0]?.id;
    router.push(`/host/results?session=${sessionCode}&user=${userId ?? ''}&last=${top}`);
  };

  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {!finished && sessionMode === 'group' && (
          <div className="mb-4 text-center text-sm text-gray-600">Time remaining: {timeLeft}</div>
        )}

        {error && <div className="mt-4 text-red-700">{error}</div>}

        {!error && !finished && havePair && (
          <div className="mt-5 border p-4 shadow-sm rounded-2xl">
            <div className="text-center text-sm text-gray-500 mb-3">
              Compared {Math.min(cursor, items.length)} of {items.length} restaurants
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <RestaurantCard place={items[leaderIdx]} onChoose={() => pickWinner(leaderIdx)} />
              <div className="flex items-center justify-center">
                <span className="rounded-full border px-3 py-1 text-sm">OR</span>
              </div>
              <RestaurantCard place={items[cursor]} onChoose={() => pickWinner(cursor)} />
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                onClick={skipPair}
                className="rounded-md bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
              >
                Too Tough / Skip
              </button>

              <button
                onClick={handleFoundMyPlace}
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                I Found My Place
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RestaurantCard({ place, onChoose }: { place: Place; onChoose: () => void }) {
  return (
    <button
      onClick={onChoose}
      className="w-full border rounded-xl p-4 text-left hover:shadow-md transition"
    >
      <div className="text-lg font-semibold">{place.name}</div>
      {place.address && <div className="text-sm text-gray-600">{place.address}</div>}
      <div className="text-xs text-gray-500 mt-1">
        {typeof place.rating === 'number' && <>⭐ {place.rating.toFixed(1)} · </>}
        Price: {priceLabelFromIndex(place._priceIdx)}
      </div>
    </button>
  );
}
