'use client';

import { useMemo, useRef, useState } from 'react';

/**
 * Demo Nearby Search Page (client)
 *
 * Client-side UI that tiles a search area into overlapping circles and calls
 * Google Places “Nearby (New)” to aggregate restaurants. Includes a simple
 * price filter that excludes N/A when a specific tier is chosen.
 *
 * Notes:
 * - Uses a basic de-dup by place id/URI/name to avoid repeats across tiles.
 * - Adds a tiny delay between tile requests to reduce 429s.
 * - Expects a public Places API key in NEXT_PUBLIC_GOOGLE_PLACES_API_KEY.
 *
 * @example
 * export default function Host() { ... }
 */
export default function Host() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);

  // User-chosen center & radius (meters)
  const lat = 35.7796;
  const lng = -78.6382;
  const searchRadiusMeters = 1609 * 5; // e.g., 5 miles

  // ---- TILING SETTINGS ----
  // Each tile is a smaller circle we query via Nearby (New).
  const tileRadiusMeters = 2000; // ~2 km tiles (adjust to taste)
  const tileSpacingMeters = tileRadiusMeters * 1.5; // center-to-center spacing

  // meters->degrees (approx)
  const degLat = (m: number) => m / 111_320;
  const degLng = (m: number, baseLat: number) =>
    m / (111_320 * Math.cos((baseLat * Math.PI) / 180));

  // Build a ring/plus pattern of centers to cover the user radius
  const tileCenters = useMemo(() => {
    const centers: Array<{ lat: number; lng: number }> = [];
    centers.push({ lat, lng }); // center tile

    const rings = Math.ceil(searchRadiusMeters / tileSpacingMeters);
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
        centers.push({
          lat: lat + degLat(dy),
          lng: lng + degLng(dx, lat),
        });
      }
    }
    return centers;
  }, [lat, lng, searchRadiusMeters, tileSpacingMeters]);

  // Track which place IDs we've already added
  const seenIds = useRef<Set<string>>(new Set());

  // Map Places priceLevel → internal 0..3 (null = N/A)
  function toPriceIndex(priceLevel: any): number | null {
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
    return map[priceLevel] ?? null;
  }

  function priceLabelFromIndex(idx: number | null): string {
    if (idx == null) return 'N/A';
    return '$'.repeat(idx + 1);
  }

  // Fetch one tile with Nearby (New); de-dup and apply optional price filter
  async function fetchNearbyAtCenter(center: { lat: number; lng: number }) {
    const resp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY!,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.rating',
          'places.priceLevel',
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
        maxResultCount: 20, // Nearby (New) max
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Error ${resp.status}: ${text}`);
    }
    const data = await resp.json();

    const deduped = (data?.places ?? [])
      .filter((p: any) => {
        const id = p.id ?? p.googleMapsUri ?? p.displayName?.text;
        if (!id) return false;
        if (seenIds.current.has(id)) return false;
        seenIds.current.add(id);
        return true;
      })
      .map((p: any) => ({
        ...p,
        _priceIdx: toPriceIndex(p.priceLevel),
      }));

    // When a specific price is selected, exclude N/A
    return selectedPrice === null
      ? deduped
      : deduped.filter((p: any) => p._priceIdx === selectedPrice);
  }

  // Sweep all tiles, with a small delay to avoid QPS spikes
  async function sweepTiles({ reset = false }: { reset?: boolean } = {}) {
    try {
      setLoading(true);
      setError(null);
      if (reset) {
        setResults([]);
        seenIds.current.clear();
      }
      const aggregated: any[] = [];
      for (let i = 0; i < tileCenters.length; i++) {
        const batch = await fetchNearbyAtCenter(tileCenters[i]);
        aggregated.push(...batch);
        await new Promise((r) => setTimeout(r, 250)); // gentle on rate limits
      }
      setResults((prev) => (reset ? aggregated : [...prev, ...aggregated]));
    } catch (e: any) {
      setError(e.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900 p-8 space-y-6">
      {/* PRICE FILTER */}
      <div className="flex space-x-2 items-center">
        <label htmlFor="price" className="font-semibold text-lg">
          Price Range:
        </label>
        <select
          id="price"
          value={selectedPrice ?? ''}
          onChange={(e) => setSelectedPrice(e.target.value ? parseInt(e.target.value) : null)}
          className="border border-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option value="0">$ (Inexpensive)</option>
          <option value="1">$$ (Moderate)</option>
          <option value="2">$$$ (Expensive)</option>
          <option value="3">$$$$ (Very Expensive)</option>
        </select>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-3">
        <button
          onClick={() => sweepTiles({ reset: true })}
          disabled={loading}
          className="px-6 py-3 text-lg font-semibold rounded-lg bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-transform hover:scale-105 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Find Restaurants'}
        </button>

        <button
          onClick={() => sweepTiles({ reset: false })}
          disabled={loading}
          className="px-6 py-3 text-lg font-semibold rounded-lg bg-gray-800 text-white shadow-md hover:bg-gray-900 transition-transform hover:scale-105 disabled:opacity-50"
          title="Fetch another full sweep (useful if you adjusted tile size/radius)"
        >
          {loading ? 'Loading...' : 'Load all in area'}
        </button>
      </div>

      {/* ERROR */}
      {error && <p className="mt-2 text-red-600">{error}</p>}

      {/* RESULTS */}
      <ul className="mt-4 w-full max-w-md space-y-3">
        {results.map((p) => (
          <li
            key={p.id ?? p.displayName?.text ?? p.googleMapsUri}
            className="border rounded-md p-3 shadow-sm"
          >
            <p className="font-semibold">{p.displayName?.text}</p>
            <p className="text-sm text-gray-600">{p.formattedAddress}</p>
            <p className="text-sm text-gray-500">
              ⭐ {p.rating ?? 'N/A'} | Price: {priceLabelFromIndex(p._priceIdx)}
            </p>
            <a
              href={p.googleMapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-sm underline"
            >
              View on Google Maps
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
