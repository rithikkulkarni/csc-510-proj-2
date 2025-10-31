'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type Place = {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  priceLevel?: any;
  openNow?: boolean;
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

export default function SwipePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionCode = searchParams.get('session');

  const [items, setItems] = useState<Item[]>([]);
  const [finished, setFinished] = useState(false);
  const [leaderIdx, setLeaderIdx] = useState(0);
  const [cursor, setCursor] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // ---- fetch session + restaurants ----
  useEffect(() => {
    if (!sessionCode) {
      setError('No session code provided.');
      return;
    }

    async function fetchSessionRestaurants() {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', sessionCode)
        .single();

      if (sessionError || !session) {
        setError('Session not found.');
        return;
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
        id: r.google_place_id || r.id,
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
  }, [sessionCode]);

  // ---- swipe helpers ----
  const havePair = useMemo(() => {
    return !finished && items.length >= 2 && leaderIdx < items.length && cursor < items.length;
  }, [finished, items, leaderIdx, cursor]);

  function pickWinner(index: number) {
    if (!havePair) return;

    setItems((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], wins: clone[index].wins + 1 };
      const loser = index === leaderIdx ? cursor : leaderIdx;
      clone[loser] = { ...clone[loser], losses: clone[loser].losses + 1 };
      return clone;
    });

    const nextCursor = cursor + 1;
    setLeaderIdx(index);
    if (nextCursor >= items.length) setFinished(true);
    else setCursor(nextCursor);
  }

  function endSessionManually() {
    setFinished(true);
  }

  const winner = useMemo(() => {
    if (!finished) return null;
    return items.reduce((prev, curr) => (curr.wins > prev.wins ? curr : prev), items[0]);
  }, [finished, items]);

  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {/* ---- Header (only while swiping) ---- */}
        {!finished && (
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Pick your favorite</h1>
            <button
              onClick={() => router.back()}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ---- Inline Winner Display ---- */}
        {finished && winner && (
          <div className="mb-6 rounded-xl border p-4 shadow-sm bg-green-50">
            <h2 className="text-xl font-semibold mb-2">Your Choice</h2>
            <div className="text-lg font-medium">{winner.name}</div>
            {winner.address && <div className="text-sm text-gray-600">{winner.address}</div>}
            <div className="text-xs text-gray-500 mt-1">Price: {priceLabelFromIndex(winner._priceIdx)}</div>
            {winner.mapsUri && (
              <a
                href={winner.mapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm mt-1 block"
              >
                View on Google Maps
              </a>
            )}
            {winner.website && (
              <a
                href={winner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm mt-1 block"
              >
                Visit Website
              </a>
            )}
            {winner.deliveryLinks?.length > 0 && (
              <div className="mt-2">
                <h3 className="text-sm font-semibold">Order Online:</h3>
                <ul className="mt-1 space-y-1">
                  {winner.deliveryLinks.map((link, idx) => (
                    <li key={idx}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-sm"
                      >
                        {link.includes('ubereats')
                          ? 'UberEats'
                          : link.includes('doordash')
                            ? 'DoorDash'
                            : 'Link'}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => router.push('/host/location')}
              className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-white"
            >
              Start a New Session
            </button>
          </div>
        )}

        {/* ---- Swipe Cards ---- */}
        {!error && !finished && havePair && (
          <div className="mt-5 rounded-2xl border p-4 shadow-sm">
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

            <button
              onClick={endSessionManually}
              className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-white"
            >
              I found my place
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- RestaurantCard ---------------- */
function RestaurantCard({ place, onChoose }: { place: Place; onChoose: () => void }) {
  return (
    <button
      onClick={onChoose}
      className="w-full rounded-xl border p-4 text-left hover:shadow-md transition"
    >
      <div className="text-lg font-semibold leading-snug">{place.name}</div>
      {place.address && <div className="mt-1 text-sm text-gray-600">{place.address}</div>}
      <div className="mt-1 text-xs text-gray-500">
        {typeof place.rating === 'number' && <>⭐ {place.rating.toFixed(1)} · </>}
        Price: {priceLabelFromIndex(place._priceIdx)}
      </div>
    </button>
  );
}
