/*'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

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

// ---- utils ----
function toPriceIndex(priceLevel: unknown): number | null {
  if (priceLevel == null) return null;
  if (typeof priceLevel === 'number') {
    const n = Math.max(0, Math.min(3, priceLevel));
    return Number.isFinite(n) ? n : null;
  }
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  // initialize price from query
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
    if (!picked) return [] as Array<{ lat: number; lng: number }>;
    const { lat, lng } = picked;
    const centers: Array<{ lat: number; lng: number }> = [{ lat, lng }];
    const rings = Math.ceil(radiusMeters / tileSpacingMeters);

    for (let r = 1; r <= rings; r++) {
      const d = r * tileSpacingMeters;
      const candidates: Array<[number, number]> = [
        [d, 0], [0, d], [-d, 0], [0, -d],
        [d, d], [-d, d], [-d, -d], [d, -d]
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
          'places.googleMapsUri'
        ].join(',')
      },
      body: JSON.stringify({
        includedTypes: ['restaurant'],
        locationRestriction: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: tileRadiusMeters } },
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
      const payload = { picked, radiusMi, selectedPriceIdx, results: currentResults, savedAt: Date.now() };
      sessionStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(payload));
    } catch { }
  }

  async function sweepTiles({ reset = true }: { reset?: boolean } = {}) {
    if (!picked) {
      setError('Click the map to set a center point.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
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
        const da = a.lat && a.lng ? haversineMiles(picked!, { lat: a.lat, lng: a.lng }) : Number.POSITIVE_INFINITY;
        const db = b.lat && b.lng ? haversineMiles(picked!, { lat: b.lat, lng: b.lng }) : Number.POSITIVE_INFINITY;
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

  async function goToSwipe() {
    if (!picked) {
      setError('Pick a point on the map first.');
      return;
    }

    if (results.length === 0) {
      setError('Find restaurants first, then begin swiping.');
      return;
    }

    setError(null);

    // --- 1. Generate a 4-character session code ---
    function generateSessionCode() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    }

    let session: any = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (!session && attempts < maxAttempts) {
      const code = generateSessionCode();
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          code,
          status: 'open',
          latitude: picked.lat,
          longitude: picked.lng,
          radius: radiusMi,
          price_range: selectedPriceIdx ?? null, // allow N/A
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // duplicate code, retry
          attempts++;
          continue;
        } else {
          setError('Failed to create session: ' + error.message);
          return;
        }
      }

      session = data;
    }

    if (!session) {
      setError('Failed to generate a unique session code. Try again.');
      return;
    }

    // --- 2. Insert restaurants ---
    const insertData = results.map((r) => ({
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

    const { error: restError } = await supabase
      .from('restaurants')
      .upsert(insertData, { onConflict: ['google_place_id', 'session_id'] });

    if (restError) {
      console.error('Failed to save restaurants:', restError);
      setError('Failed to save restaurants: ' + restError.message);
      return;
    }

    // --- 3. Persist last search in sessionStorage ---
    try {
      const payload = {
        picked,
        radiusMi,
        selectedPriceIdx,
        results,
        savedAt: Date.now(),
      };
      sessionStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage failures
    }

    // --- 4. Redirect to swipe page with session code ---
    router.push(`/host/swipe?session=${session.code}`);
  }


  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-6">
      <div className="mx-auto max-w-5xl grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <LeafletMap picked={picked} onPick={setPicked} radiusMeters={radiusMi * MILES_TO_METERS} />
        </div>

        <div className="md:col-span-1 space-y-4">
          <div className="rounded-xl border p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Search Settings</h2>
            <div className="mt-3">
              <label className="text-sm text-gray-700">Price</label>
              <select
                value={selectedPriceIdx ?? ''}
                onChange={(e) => setSelectedPriceIdx(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2"
              >
                <option value="">All</option>
                <option value="0">$ (Inexpensive)</option>
                <option value="1">$$ (Moderate)</option>
                <option value="2">$$$ (Expensive)</option>
                <option value="3">$$$$ (Very Expensive)</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="text-sm text-gray-700">Radius: {radiusMi} miles</label>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={radiusMi}
                onChange={(e) => setRadiusMi(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={() => sweepTiles({ reset: true })}
              disabled={!picked || loading}
              className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Find Restaurants'}
            </button>

            <button
              onClick={goToSwipe}
              disabled={!picked || results.length === 0}
              className="mt-2 w-full rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-50"
            >
              Begin swiping
            </button>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {!picked && <p className="mt-2 text-sm text-gray-600">Tip: click the map to set the center.</p>}
          </div>

          <div className="rounded-xl border p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Results</h2>
            <ul className="mt-3 space-y-3">
              {results.map((r) => (
                <li key={r.id || `${r.name}|${r.address}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.name}</div>
                    {typeof r.rating === 'number' && <div className="text-sm text-gray-600">⭐ {r.rating.toFixed(1)}</div>}
                  </div>
                  <div className="text-sm text-gray-600">{r.address}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Price: {priceLabelFromIndex(r._priceIdx)} {r.openNow !== undefined ? (r.openNow ? '· Open now' : '· Closed') : ''}
                  </div>
                  {r.mapsUri && (
                    <a href={r.mapsUri} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline">
                      View on Google Maps
                    </a>
                  )}
                  {r.website && (
                    <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline block">
                      Visit Website
                    </a>
                  )}
                </li>
              ))}
              {!loading && results.length === 0 && <li className="text-sm text-gray-500">No results yet. Pick a point on the map and search.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
*/

'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

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

// ---- utils ----
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
  const [mode, setMode] = useState<'solo' | 'group' | null>('solo');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

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
    if (!picked) return setError('Click the map to set a center point.');

    try {
      setLoading(true);
      setError(null);
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

  // --- Solo mode ---
  async function goToSwipe() {
    if (!picked || results.length === 0) {
      return setError(!picked ? 'Pick a point first' : 'Find restaurants first');
    }

    setError(null);

    // Generate unique session code
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
        if (error.code === '23505')
          attempts++; // duplicate code, retry
        else return setError('Failed to create session: ' + error.message);
      } else {
        session = data;
      }
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

    const { error: restError } = await supabase.from('restaurants').insert(insertRestaurantsSolo); // <-- plain insert

    if (restError) return setError('Failed to save restaurants: ' + restError.message);

    router.push(`/host/swipe?session=${session.code}`);
  }

  // --- Group mode ---
  async function goToConfirmPage() {
    if (!picked || results.length === 0) {
      return setError(!picked ? 'Pick a point first' : 'Find restaurants first');
    }

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
        if (error.code === '23505')
          attempts++; // duplicate code
        else return setError('Failed to create session: ' + error.message);
      } else {
        session = data;
      }
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

    const { error: restError } = await supabase.from('restaurants').insert(insertRestaurantsGroup); // plain insert

    if (restError) return setError('Failed to save restaurants: ' + restError.message);

    router.push(
      `/host/confirm?session=${encodeURIComponent(session.code)}&ends_at=${encodeURIComponent(session.ends_at)}`
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-6">
      <div className="mx-auto max-w-5xl grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <LeafletMap
            picked={picked}
            onPick={setPicked}
            radiusMeters={radiusMi * MILES_TO_METERS}
          />
        </div>

        <div className="md:col-span-1 space-y-4">
          <div className="rounded-xl border p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Search Settings</h2>

            {/* --- Mode Toggle --- */}
            <div className="mt-3 flex gap-2">
              <button
                className={`flex-1 px-3 py-2 rounded-md font-medium ${mode === 'solo' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setMode('solo')}
              >
                Solo
              </button>
              <button
                className={`flex-1 px-3 py-2 rounded-md font-medium ${mode === 'group' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setMode('group')}
              >
                Group
              </button>
            </div>

            <div className="mt-3">
              <label className="text-sm text-gray-700">Price</label>
              <select
                value={selectedPriceIdx ?? ''}
                onChange={(e) =>
                  setSelectedPriceIdx(e.target.value ? Number(e.target.value) : null)
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2"
              >
                <option value="">All</option>
                <option value="0">$ (Inexpensive)</option>
                <option value="1">$$ (Moderate)</option>
                <option value="2">$$$ (Expensive)</option>
                <option value="3">$$$$ (Very Expensive)</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="text-sm text-gray-700">Radius: {radiusMi} miles</label>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={radiusMi}
                onChange={(e) => setRadiusMi(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={() => sweepTiles({ reset: true })}
              disabled={!picked || loading}
              className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Find Restaurants'}
            </button>

            {/* --- Mode-specific actions --- */}
            {mode === 'solo' && (
              <button
                onClick={goToSwipe}
                disabled={!picked || results.length === 0}
                className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-50"
              >
                Start Swiping
              </button>
            )}

            {mode === 'group' && (
              <>
                <div className="mt-3">
                  <label className="text-sm text-gray-700">Session Expiration (hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={48}
                    step={1}
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2"
                  />
                </div>
                <button
                  onClick={goToConfirmPage}
                  disabled={!picked || results.length === 0}
                  className="mt-4 w-full rounded-md bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  Create Session
                </button>
              </>
            )}

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {!picked && (
              <p className="mt-2 text-sm text-gray-600">Tip: click the map to set the center.</p>
            )}
          </div>

          <div className="rounded-xl border p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Results</h2>
            <ul className="mt-3 space-y-3">
              {results.map((r) => (
                <li key={r.id || `${r.name}|${r.address}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.name}</div>
                    {typeof r.rating === 'number' && (
                      <div className="text-sm text-gray-600">⭐ {r.rating.toFixed(1)}</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{r.address}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Price: {priceLabelFromIndex(r._priceIdx)}{' '}
                    {r.openNow !== undefined ? (r.openNow ? '· Open now' : '· Closed') : ''}
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
              {!loading && results.length === 0 && (
                <li className="text-sm text-gray-500">
                  No results yet. Pick a point on the map and search.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
