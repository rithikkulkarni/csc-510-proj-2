'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
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
  /** Normalized 0–3 price index derived from API price level */
  _priceIdx: number | null;
};

const MILES_TO_METERS = 1609.34;
const LAST_SEARCH_KEY = 'lastSearch_v1';

// --- Utility Functions ---
/** Normalize Google Places `priceLevel` -> 0..3 or null */
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

/** Format price index for UI */
function priceLabelFromIndex(idx: number | null): string {
  if (idx == null) return 'N/A';
  return '$'.repeat(idx + 1);
}

/** Great-circle distance (miles) */
function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.7613; // miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Meter -> degree helpers (approximate)
const degLat = (m: number) => m / 111_320;
const degLng = (m: number, baseLat: number) => m / (111_320 * Math.cos((baseLat * Math.PI) / 180));

/**
 * HostLocationPage
 *
 * Top-level suspense wrapper for the location-selection/search flow.
 * Shows a lightweight fallback while `HostLocationInner` reads the query string.
 */
export default function HostLocationPage() {
  return (
    <div className="relative min-h-screen text-gray-900 flex flex-col items-center justify-start px-6 py-10 overflow-hidden">
      {/* Background Image */}
      <Image
        src="/background.png"
        alt="Background"
        fill
        className="absolute inset-0 object-cover z-0"
        priority
      />
      {/* Top-left Logo + Name + Slogan (compact, aligned) */}
      <div className="absolute top-4 left-4 z-20 flex flex-row items-start gap-2">
        {/* Logo */}
        <div className="relative w-10 h-10">
          <Image
            src="/logo.png"
            alt="Food Finder logo"
            width={40}
            height={40}
            className="animate-float"
          />
        </div>

        {/* Title + Slogan */}
        <div className="flex flex-col items-start gap-0">
          {/* Title */}
          <h1
            className="text-lg font-extrabold uppercase text-green-800"
            style={{
              textShadow: `
          0 0 2px rgba(203, 241, 195, 0.5),
          0 0 4px rgba(203, 241, 195, 0.3)
        `,
              lineHeight: '1', // tight
            }}
          >
            FOOD FINDER
          </h1>

          {/* Slogan aligned with title */}
          <p
            className="text-[8px] font-semibold text-gray-700 mt-0"
            style={{
              lineHeight: '0.95',
              textShadow: '1px 1px 1px rgba(0,0,0,0.1)',
            }}
          >
            DECISIONS ARE HARD.
            <br />
            EATING TOGETHER SHOULDN'T BE.
          </p>
        </div>
      </div>

      {/* Title Header */}
      <header className="relative z-10 mb-12 text-center w-full">
        <h1
          className="text-6xl md:text-7xl font-extrabold text-green-800"
          style={{
            textShadow: `
              0 0 8px rgba(203, 241, 195, 0.5),
              0 0 12px rgba(203, 241, 195, 0.3)
            `,
          }}
        >
          Host a Session
        </h1>
        <p
          className="text-lg md:text-xl font-bold text-gray-700 mt-2"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}
        >
          Set the Search Criteria for your Session
        </p>
      </header>

      <main className="relative z-10 flex flex-col md:flex-row gap-6 w-full max-w-7xl">
        <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading map…</div>}>
          <HostLocationInner />
        </Suspense>
      </main>

      <footer className="mt-12 text-gray-500 text-sm relative z-10 w-full text-center">
        <div className="text-center mt-6">
          <BackButton className="inline-block rounded-2xl bg-green-800 text-white font-bold text-lg py-3 px-6 shadow-md hover:shadow-lg hover:bg-green-900 transition transform duration-150 hover:scale-105" />
        </div>
        <div className="mt-4">© {new Date().getFullYear()} Food Finder</div>
      </footer>
    </div>
  );
}

/**
 * HostLocationInner
 *
 * Allows a host to:
 * - pick a map center and radius,
 * - fetch nearby restaurants via Google Places in a tiled sweep,
 * - filter by price,
 * - then either start a solo swipe session or create a group session with expiration.
 *
 * State:
 * - `picked`, `radiusMi`, `selectedPriceIdx`, `expiryHours`, `mode`
 * - loading/error UX and fetched `results`
 */
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

  // De-duplicate place IDs across tile sweeps
  const seenIds = useRef<Set<string>>(new Set());

  const isFindEnabled = !!picked && !loading;
  const canSwipe = !!picked && results.length > 0;
  const canCreate = canSwipe;

  // Initialize price filter from query (?priceIdx=)
  useEffect(() => {
    if (priceIdxFromQuery !== null) {
      const n = Number(priceIdxFromQuery);
      setSelectedPriceIdx(Number.isFinite(n) ? n : null);
    }
  }, [priceIdxFromQuery]);

  // Sweep parameters
  const radiusMeters = radiusMi * MILES_TO_METERS;
  const tileRadiusMeters = Math.max(800, Math.min(2500, radiusMeters / 3));
  const tileSpacingMeters = tileRadiusMeters * 1.5;

  // Compute a set of tile centers covering the circular search area
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

  /** Fetch website detail for a given place (best-effort) */
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

  /** Query Google Places Nearby for a single tile center; filters by price if selected */
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
    return selectedPriceIdx == null
      ? batch
      : batch.filter((pl) => pl._priceIdx === selectedPriceIdx);
  }

  /** Persist last successful search in sessionStorage (non-critical) */
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

  /** Sweep all tile centers, aggregate and sort by distance from `picked` */
  async function sweepTiles({ reset = true }: { reset?: boolean } = {}) {
    if (!picked) return setError('Click the map to set a center point.');
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
        await new Promise((r) => setTimeout(r, 250)); // gentle pacing
      }

      // Keep only places within the exact radius (tile sweep may exceed the circle)
      const within = aggregated.filter((pl) =>
        pl.lat && pl.lng ? haversineMiles(picked!, { lat: pl.lat, lng: pl.lng }) <= radiusMi : true
      );

      // Sort by distance (nearest first)
      const sorted = within.sort((a, b) => {
        const da = a.lat && a.lng ? haversineMiles(picked!, { lat: a.lat, lng: a.lng }) : Infinity;
        const db = b.lat && b.lng ? haversineMiles(picked!, { lat: b.lat, lng: b.lng }) : Infinity;
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

  /** 4-letter session code generator (A–Z) */
  const generateSessionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
      ''
    );
  };

  /** Create a SOLO session, insert restaurants, navigate to swipe */
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

    const insertRestaurants = results.map((r) => ({
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
    const { error: restError } = await supabase.from('restaurants').insert(insertRestaurants);
    if (restError) return setError('Failed to save restaurants: ' + restError.message);

    router.push(`/host/swipe?session=${session.code}`);
  }

  /** Create a GROUP session (with expiry), insert restaurants, navigate to confirm */
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

    const insertRestaurants = results.map((r) => ({
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
    const { error: restError } = await supabase.from('restaurants').insert(insertRestaurants);
    if (restError) return setError('Failed to save restaurants: ' + restError.message);

    router.push(
      `/host/confirm?session=${encodeURIComponent(session.code)}&ends_at=${encodeURIComponent(
        session.ends_at
      )}`
    );
  }

  // --- JSX ---
  return (
    <div className="flex flex-col md:flex-row gap-6 w-full">
      {/* Map */}
      <div className="md:w-2/3 rounded-xl overflow-hidden h-[600px]">
        <LeafletMap picked={picked} onPick={setPicked} radiusMeters={radiusMi * MILES_TO_METERS} />
      </div>

      {/* Right Panel */}
      <div className="md:w-1/3 flex flex-col gap-4">
        {/* Search + Tip */}
        <div className="rounded-xl bg-white border-2 border-green-300 shadow-md p-5 space-y-4">
          <h2 className="text-xl font-bold text-green-800">Search Settings</h2>

          {/* Mode Buttons */}
          <div className="flex gap-2">
            <button
              className={`flex-1 py-2 rounded-md font-medium ${
                mode === 'solo'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 cursor-pointer hover:scale-105'
              }`}
              onClick={() => setMode('solo')}
            >
              Solo
            </button>
            <button
              className={`flex-1 py-2 rounded-md font-medium ${
                mode === 'group'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 cursor-pointer hover:scale-105'
              }`}
              onClick={() => setMode('group')}
            >
              Group
            </button>
          </div>

          {/* Price Selector */}
          <div>
            <label className="block text-sm text-gray-700">Price</label>
            <select
              value={selectedPriceIdx ?? ''}
              onChange={(e) => setSelectedPriceIdx(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 cursor-pointer"
            >
              <option value="">All</option>
              <option value="0">$ (Inexpensive)</option>
              <option value="1">$$ (Moderate)</option>
              <option value="2">$$$ (Expensive)</option>
              <option value="3">$$$$ (Very Expensive)</option>
            </select>
          </div>

          {/* Radius */}
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

          {/* Expiry for Group Mode */}
          {mode === 'group' && (
            <div>
              <label htmlFor="expiry-input" className="block text-sm text-gray-700">
                Session Expiration (hours)
              </label>
              <input
                id="expiry-input" // link label for accessibility
                data-testid="expiry-input" // for testing
                type="number"
                min={1}
                max={48}
                step={1}
                value={expiryHours}
                onChange={(e) => setExpiryHours(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          )}

          {/* Tip */}
          {!picked && (
            <p className="text-sm text-gray-500 mt-2">Tip: click the map to set the center.</p>
          )}

          {/* Find Restaurants Button */}
          <button
            onClick={() => sweepTiles({ reset: true })}
            disabled={!isFindEnabled}
            className={`w-full mt-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 ${
              isFindEnabled ? 'cursor-pointer' : ''
            }`}
          >
            {loading ? 'Searching…' : 'Find Restaurants'}
          </button>

          {/* Start Swiping / Create Session */}
          {mode === 'solo' && (
            <button
              onClick={goToSwipe}
              disabled={!canSwipe}
              className={`w-full mt-2 py-2 rounded-md bg-green-600 text-white disabled:opacity-50 ${
                canSwipe ? 'cursor-pointer' : ''
              }`}
            >
              Start Swiping
            </button>
          )}
          {mode === 'group' && (
            <button
              onClick={goToConfirmPage}
              disabled={!canCreate}
              className={`w-full mt-2 py-2 rounded-md bg-purple-600 text-white disabled:opacity-50 ${
                canCreate ? 'cursor-pointer' : ''
              }`}
            >
              Create Session
            </button>
          )}

          {/* Error Message */}
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        {/* Results Card */}
        <div className="rounded-xl bg-white border-2 border-green-300 shadow-md p-5 flex-1 overflow-y-auto">
          <h2 className="text-xl font-bold text-green-800 mb-3">Results</h2>
          <ul className="space-y-3">
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
  );
}
