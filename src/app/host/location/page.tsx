'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { BackButton } from '@/components/BackButton';

const LeafletMap = dynamic(() => import('./parts/LeafletMap'), { ssr: false });

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
  _priceIdx: number | null;
};

const MILES_TO_METERS = 1609.34;
const LAST_SEARCH_KEY = 'lastSearch_v1';

function toPriceIndex(priceLevel: unknown): number | null {
  if (priceLevel == null) return null;
  if (typeof priceLevel === 'number') return Math.max(0, Math.min(3, priceLevel));
  const map: Record<string, number | null> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 0,
    PRICE_LEVEL_MODERATE: 1,
    PRICE_LEVEL_EXPENSIVE: 2,
    PRICE_LEVEL_VERY_EXPENSIVE: 3,
    PRICE_LEVEL_UNSPECIFIED: null,
  };
  return map[String(priceLevel)] ?? null;
}

function priceLabelFromIndex(idx: number | null): string {
  if (idx == null) return 'N/A';
  return '$'.repeat(idx + 1);
}

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.7613; // miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const degLat = (m: number) => m / 111_320;
const degLng = (m: number, baseLat: number) => m / (111_320 * Math.cos((baseLat * Math.PI) / 180));

export default function HostLocationPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading search settings…</div>}>
      <HostLocationInner />
    </Suspense>
  );
}

function HostLocationInner() {
  const router = useRouter();
  const params = useSearchParams();
  const priceIdxFromQuery = params.get('priceIdx');

  const [selectedPriceIdx, setSelectedPriceIdx] = useState<number | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusMi, setRadiusMi] = useState<number>(3);
  const [expiryHours, setExpiryHours] = useState<number>(2);
  const [mode, setMode] = useState<'solo' | 'group'>('solo');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const seenIds = useRef<Set<string>>(new Set());

  const isFindEnabled = !!picked && !loading;
  const canSwipe = !!picked && results.length > 0;
  const canCreate = canSwipe; // same condition

  useEffect(() => {
    if (priceIdxFromQuery !== null) {
      const n = Number(priceIdxFromQuery);
      setSelectedPriceIdx(Number.isFinite(n) ? n : null);
    }
  }, [priceIdxFromQuery]);

  const radiusMeters = radiusMi * MILES_TO_METERS;
  const tileRadiusMeters = Math.max(800, Math.min(2500, radiusMeters / 3));
  const tileSpacingMeters = tileRadiusMeters * 1.5;

  const tileCenters = useMemo(() => {
    if (!picked) return [];
    const { lat, lng } = picked;
    const centers: Array<{ lat: number; lng: number }> = [{ lat, lng }];
    const rings = Math.ceil(radiusMeters / tileSpacingMeters);

    for (let r = 1; r <= rings; r++) {
      const d = r * tileSpacingMeters;
      const candidates: Array<[number, number]> = [
        [d, 0],
        [0, d],
        [-d, 0],
        [0, -d],
        [d, d],
        [-d, d],
        [-d, -d],
        [d, -d],
      ];
      for (const [dx, dy] of candidates) {
        centers.push({ lat: lat + degLat(dy), lng: lng + degLng(dx, lat) });
      }
    }
    return centers;
  }, [picked, radiusMeters, tileSpacingMeters]);

  async function fetchPlaceDetails(placeId: string) {
    try {
      const resp = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?fields=website&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`
      );
      if (!resp.ok) return undefined;
      const data = await resp.json();
      return data.website;
    } catch {
      return undefined;
    }
  }

  async function fetchNearbyAtCenter(center: { lat: number; lng: number }): Promise<Place[]> {
    const resp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY as string,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.priceLevel',
          'places.currentOpeningHours.openNow',
          'places.googleMapsUri',
        ].join(','),
      },
      body: JSON.stringify({
        includedTypes: ['restaurant'],
        locationRestriction: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: tileRadiusMeters,
          },
        },
        rankPreference: 'POPULARITY',
        maxResultCount: 20,
      }),
    });

    if (!resp.ok) throw new Error(`Places error ${resp.status}`);
    const data = await resp.json();

    const batch: Place[] = [];
    for (const p of data?.places ?? []) {
      const id = p.id ?? p.googleMapsUri ?? p.displayName?.text;
      if (!id || seenIds.current.has(id)) continue;
      seenIds.current.add(id);

      const website = await fetchPlaceDetails(p.id);

      batch.push({
        id,
        name: p.displayName?.text,
        address: p.formattedAddress,
        rating: p.rating,
        priceLevel: p.priceLevel,
        openNow: p.currentOpeningHours?.openNow ?? undefined,
        lat: p.location?.latitude,
        lng: p.location?.longitude,
        mapsUri: p.googleMapsUri,
        website,
        _priceIdx: toPriceIndex(p.priceLevel),
      });
    }

    if (selectedPriceIdx == null) return batch;
    return batch.filter((pl) => pl._priceIdx === selectedPriceIdx);
  }

  function persistLastSearch(currentResults: Place[]) {
    if (!picked) return;
    try {
      const payload = {
        picked,
        radiusMi,
        selectedPriceIdx,
        results: currentResults,
        savedAt: Date.now(),
      };
      sessionStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(payload));
    } catch {}
  }

  async function sweepTiles({ reset = true }: { reset?: boolean } = {}) {
    if (!picked) {
      setError('Click the map to set a center point.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      if (reset) {
        setResults([]);
        seenIds.current.clear();
      }

      const aggregated: Place[] = [];
      for (let i = 0; i < tileCenters.length; i++) {
        const batch = await fetchNearbyAtCenter(tileCenters[i]);
        aggregated.push(...batch);
        await new Promise((r) => setTimeout(r, 250));
      }

      const within = aggregated.filter((pl) =>
        pl.lat && pl.lng ? haversineMiles(picked!, { lat: pl.lat, lng: pl.lng }) <= radiusMi : true
      );

      const sorted = within.sort((a, b) => {
        const da =
          a.lat && a.lng
            ? haversineMiles(picked!, { lat: a.lat, lng: a.lng })
            : Number.POSITIVE_INFINITY;
        const db =
          b.lat && b.lng
            ? haversineMiles(picked!, { lat: b.lat, lng: b.lng })
            : Number.POSITIVE_INFINITY;
        return da - db;
      });

      setResults(sorted);
      persistLastSearch(sorted);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }

  const generateSessionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
      ''
    );
  };

  // --- swipe and confirm functions (unchanged from previous version) ---
  async function goToSwipe() {
    if (!picked || results.length === 0)
      return setError(!picked ? 'Pick a point first' : 'Find restaurants first');
    setError(null);

    let session: any = null;
    let attempts = 0;
    while (!session && attempts < 5) {
      const code = generateSessionCode();
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          code,
          status: 'open',
          latitude: picked.lat,
          longitude: picked.lng,
          radius: radiusMi,
          price_range: selectedPriceIdx ?? null,
          mode: 'solo',
        })
        .select('id, code')
        .single();

      if (error) {
        if (error.code === '23505') attempts++;
        else return setError('Failed to create session: ' + error.message);
      } else session = data;
    }

    if (!session) return setError('Failed to generate unique session code');

    const insertRestaurantsSolo = results.map((r) => ({
      name: r.name,
      address: r.address,
      latitude: r.lat,
      longitude: r.lng,
      price_level: r._priceIdx,
      rating: r.rating,
      google_place_id: r.id,
      session_id: session.id,
      maps_uri: r.mapsUri ?? null,
    }));

    const { error: restError } = await supabase.from('restaurants').insert(insertRestaurantsSolo);
    if (restError) return setError('Failed to save restaurants: ' + restError.message);

    router.push(`/host/swipe?session=${session.code}`);
  }

  async function goToConfirmPage() {
    if (!picked || results.length === 0)
      return setError(!picked ? 'Pick a point first' : 'Find restaurants first');
    setError(null);

    let session: any = null;
    let attempts = 0;

    while (!session && attempts < 5) {
      const code = generateSessionCode();
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          code,
          status: 'open',
          latitude: picked.lat,
          longitude: picked.lng,
          radius: radiusMi,
          price_range: selectedPriceIdx ?? null,
          expiry_hours: expiryHours,
          mode: 'group',
        })
        .select('id, code, ends_at')
        .single();

      if (error) {
        if (error.code === '23505') attempts++;
        else return setError('Failed to create session: ' + error.message);
      } else session = data;
    }

    if (!session) return setError('Failed to generate unique session code');

    const insertRestaurantsGroup = results.map((r) => ({
      name: r.name,
      address: r.address,
      latitude: r.lat,
      longitude: r.lng,
      price_level: r._priceIdx,
      rating: r.rating,
      google_place_id: r.id,
      session_id: session.id,
      maps_uri: r.mapsUri ?? null,
    }));

    const { error: restError } = await supabase.from('restaurants').insert(insertRestaurantsGroup);
    if (restError) return setError('Failed to save restaurants: ' + restError.message);

    router.push(
      `/host/confirm?session=${encodeURIComponent(session.code)}&ends_at=${encodeURIComponent(session.ends_at)}`
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 px-4 py-6">
      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3">
        <BackButton />
        <div className="md:col-span-2 rounded-xl overflow-hidden shadow-md">
          <LeafletMap
            picked={picked}
            onPick={setPicked}
            radiusMeters={radiusMi * MILES_TO_METERS}
          />
        </div>

        <div className="md:col-span-1 space-y-6">
          {/* Search Settings */}
          <div className="rounded-xl bg-white border shadow-md p-5 space-y-4">
            <h2 className="text-xl font-semibold">Search Settings</h2>

            <div className="flex gap-2">
              <button
                className={`flex-1 py-2 rounded-md font-medium ${
                  mode === 'solo'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 cursor-pointer transition transform duration-150 hover:scale-105'
                }`}
                onClick={() => setMode('solo')}
              >
                Solo
              </button>
              <button
                className={`flex-1 py-2 rounded-md font-medium ${
                  mode === 'group'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 cursor-pointer transition transform duration-150 hover:scale-105'
                }`}
                onClick={() => setMode('group')}
              >
                Group
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-700">Price</label>
              <select
                value={selectedPriceIdx ?? ''}
                onChange={(e) =>
                  setSelectedPriceIdx(e.target.value ? Number(e.target.value) : null)
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 cursor-pointer"
              >
                <option value="">All</option>
                <option value="0">$ (Inexpensive)</option>
                <option value="1">$$ (Moderate)</option>
                <option value="2">$$$ (Expensive)</option>
                <option value="3">$$$$ (Very Expensive)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700">Radius: {radiusMi} miles</label>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={radiusMi}
                onChange={(e) => setRadiusMi(Number(e.target.value))}
                className="w-full mt-1 cursor-pointer"
              />
            </div>

            <button
              onClick={() => sweepTiles({ reset: true })}
              disabled={!isFindEnabled}
              className={
                'w-full mt-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 ${isFindEnabled ? cursor-pointer}'
              }
            >
              {loading ? 'Searching…' : 'Find Restaurants'}
            </button>

            {mode === 'solo' && (
              <button
                onClick={goToSwipe}
                disabled={!canSwipe}
                className={
                  'w-full mt-2 py-2 rounded-md bg-green-600 text-white disabled:opacity-50 ${canSwipe ? cursor-pointer}'
                }
              >
                Start Swiping
              </button>
            )}

            {mode === 'group' && (
              <>
                <div>
                  <label htmlFor="expiry-input" className="block text-sm text-gray-700">
                    Session Expiration (hours)
                  </label>
                  <input
                    id="expiry-input"
                    type="number"
                    min={1}
                    max={48}
                    step={1}
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                <button
                  onClick={goToConfirmPage}
                  disabled={!canCreate}
                  className={
                    'w-full mt-2 py-2 rounded-md bg-purple-600 text-white disabled:opacity-50 ${canCreate ? cursor-pointer}'
                  }
                >
                  Create Session
                </button>
              </>
            )}

            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            {!picked && (
              <p className="text-sm text-gray-500 mt-2">Tip: click the map to set the center.</p>
            )}
          </div>

          {/* Results */}
          <div className="rounded-xl bg-white border shadow-md p-5">
            <h2 className="text-xl font-semibold">Results</h2>
            <ul className="mt-3 space-y-3">
              {results.map((r) => (
                <li key={r.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{r.name}</span>
                    {typeof r.rating === 'number' && (
                      <span className="text-sm text-gray-600">⭐ {r.rating.toFixed(1)}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{r.address}</div>
                  <div className="text-xs text-gray-500">
                    Price: {priceLabelFromIndex(r._priceIdx)}
                    {r.openNow !== undefined ? (r.openNow ? ' · Open now' : ' · Closed') : ''}
                  </div>
                  {r.mapsUri && (
                    <a
                      href={r.mapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-sm underline"
                    >
                      View on Google Maps
                    </a>
                  )}
                  {r.website && (
                    <a
                      href={r.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-sm underline block"
                    >
                      Visit Website
                    </a>
                  )}
                </li>
              ))}

              {!loading && results.length === 0 && hasSearched && (
                <li className="text-sm text-red-600">
                  No restaurants found that match your search criteria.
                </li>
              )}
              {!loading && results.length === 0 && !hasSearched && (
                <li className="text-sm text-gray-500">
                  Pick a point on the map and click "Find Restaurants" to begin.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
