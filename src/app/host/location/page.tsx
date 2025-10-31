// // 'use client'

// // import HostLocationForm from '@/components/HostLocationForm'

// // export default function HostLocationPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
// //   const price = searchParams.price ?? ''

// //   return <HostLocationForm price={price} />
// // }

// 'use client'

// import { useEffect, useMemo, useRef, useState } from 'react'
// import dynamic from 'next/dynamic'
// import { useSearchParams } from 'next/navigation'

// const LeafletMap = dynamic(() => import('./parts/LeafletMap'), { ssr: false })

// type Place = {
//   id: string
//   name: string
//   address?: string
//   rating?: number
//   priceLevel?: any
//   openNow?: boolean
//   lat?: number
//   lng?: number
//   mapsUri?: string
//   _priceIdx?: number | null
// }

// const MILES_TO_METERS = 1609.34

// // ---- utils ----
// function toPriceIndex(priceLevel: any): number | null {
//   if (priceLevel == null) return null
//   if (typeof priceLevel === 'number') {
//     const n = Math.max(0, Math.min(3, priceLevel))
//     return Number.isFinite(n) ? n : null
//   }
//   const map: Record<string, number | null> = {
//     PRICE_LEVEL_FREE: 0,
//     PRICE_LEVEL_INEXPENSIVE: 0,
//     PRICE_LEVEL_MODERATE: 1,
//     PRICE_LEVEL_EXPENSIVE: 2,
//     PRICE_LEVEL_VERY_EXPENSIVE: 3,
//     PRICE_LEVEL_UNSPECIFIED: null,
//   }
//   return map[priceLevel] ?? null
// }

// function priceLabelFromIndex(idx: number | null): string {
//   if (idx == null) return 'N/A'
//   return '$'.repeat(idx + 1)
// }

// function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
//   const R = 3958.7613 // miles
//   const dLat = ((b.lat - a.lat) * Math.PI) / 180
//   const dLng = ((b.lng - a.lng) * Math.PI) / 180
//   const lat1 = (a.lat * Math.PI) / 180
//   const lat2 = (b.lat * Math.PI) / 180
//   const s =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
//   return 2 * R * Math.asin(Math.sqrt(s))
// }

// // meters->degrees helpers
// const degLat = (m: number) => m / 111_320
// const degLng = (m: number, baseLat: number) =>
//   m / (111_320 * Math.cos((baseLat * Math.PI) / 180))

// export default function HostLocationPage() {
//   // ---- price passed from Host page ----
//   const params = useSearchParams()
//   const priceIdxFromQuery = params.get('priceIdx')
//   const [selectedPriceIdx, setSelectedPriceIdx] = useState<number | null>(null)

//   // ---- map + radius ----
//   const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
//   const [radiusMi, setRadiusMi] = useState<number>(3)

//   // ---- fetch state ----
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [results, setResults] = useState<Place[]>([])
//   const seenIds = useRef<Set<string>>(new Set())

//   // initialize price from query
//   useEffect(() => {
//     if (priceIdxFromQuery !== null) {
//       const n = Number(priceIdxFromQuery)
//       setSelectedPriceIdx(Number.isFinite(n) ? n : null)
//     }
//   }, [priceIdxFromQuery])

//   // ---- tiling params (derived from radius) ----
//   const radiusMeters = radiusMi * MILES_TO_METERS

//   // Choose a tile size relative to the total radius for decent coverage/QPS
//   // e.g., aim ~8–16 tiles for common radii
//   const tileRadiusMeters = Math.max(800, Math.min(2500, radiusMeters / 3)) // ~0.5–1.5 mi
//   const tileSpacingMeters = tileRadiusMeters * 1.5 // center-to-center spacing

//   // Build tile centers around the picked point
//   const tileCenters = useMemo(() => {
//     if (!picked) return [] as Array<{ lat: number; lng: number }>
//     const { lat, lng } = picked
//     const centers: Array<{ lat: number; lng: number }> = []
//     centers.push({ lat, lng }) // center tile

//     const rings = Math.ceil(radiusMeters / tileSpacingMeters)
//     for (let r = 1; r <= rings; r++) {
//       const d = r * tileSpacingMeters
//       const candidates: Array<[number, number]> = [
//         [ d,  0], [ 0,  d], [-d,  0], [ 0, -d],
//         [ d,  d], [-d,  d], [-d, -d], [ d, -d],
//       ]
//       for (const [dx, dy] of candidates) {
//         centers.push({
//           lat: lat + degLat(dy),
//           lng: lng + degLng(dx, lat),
//         })
//       }
//     }
//     return centers
//   }, [picked, radiusMeters, tileSpacingMeters])

//   // ---- field mask for Places (keep lean but include location!) ----
//   const FIELD_MASK = useMemo(
//     () =>
//       [
//         'places.id',
//         'places.displayName',
//         'places.formattedAddress',
//         'places.location',
//         'places.rating',
//         'places.userRatingCount',
//         'places.priceLevel',
//         'places.currentOpeningHours.openNow',
//         'places.googleMapsUri',
//       ].join(','),
//     []
//   )

//   // One Nearby call for a given tile center
//   async function fetchNearbyAtCenter(center: { lat: number; lng: number }) {
//     const resp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY as string,
//         'X-Goog-FieldMask': FIELD_MASK,
//       },
//       body: JSON.stringify({
//         includedTypes: ['restaurant'],
//         locationRestriction: {
//           circle: {
//             center: { latitude: center.lat, longitude: center.lng },
//             radius: tileRadiusMeters,
//           },
//         },
//         rankPreference: 'POPULARITY',
//         maxResultCount: 20,
//       }),
//     })

//     if (!resp.ok) {
//       const text = await resp.text()
//       throw new Error(`Places error ${resp.status}: ${text}`)
//     }

//     const data = await resp.json()
//     // Dedupe by ID and normalize
//     const batch = (data?.places ?? [])
//       .filter((p: any) => {
//         const id = p.id ?? p.googleMapsUri ?? p.displayName?.text
//         if (!id) return false
//         if (seenIds.current.has(id)) return false
//         seenIds.current.add(id)
//         return true
//       })
//       .map((p: any) => {
//         const _priceIdx = toPriceIndex(p.priceLevel)
//         return {
//           id: p.id,
//           name: p.displayName?.text,
//           address: p.formattedAddress,
//           rating: p.rating,
//           priceLevel: p.priceLevel,
//           openNow: p.currentOpeningHours?.openNow ?? undefined,
//           lat: p.location?.latitude,
//           lng: p.location?.longitude,
//           mapsUri: p.googleMapsUri,
//           _priceIdx,
//         } as Place
//       })

//     // Price filter that EXCLUDES N/A when a specific price is selected
//     return selectedPriceIdx === null
//       ? batch
//       : batch.filter((pl) => pl._priceIdx === selectedPriceIdx)
//   }

//   // Sweep all tiles (sequential, gentle on QPS)
//   async function sweepTiles({ reset = true }: { reset?: boolean } = {}) {
//     if (!picked) {
//       setError('Click the map to set a center point.')
//       return
//     }

//     try {
//       setLoading(true)
//       setError(null)
//       if (reset) {
//         setResults([])
//         seenIds.current.clear()
//       }

//       const aggregated: Place[] = []
//       for (let i = 0; i < tileCenters.length; i++) {
//         const batch = await fetchNearbyAtCenter(tileCenters[i])
//         aggregated.push(...batch)
//         // small pause helps avoid bursts/429s
//         await new Promise((r) => setTimeout(r, 250))
//       }

//       // Safety: keep only those truly within the selected radius
//       const within = aggregated.filter((pl) =>
//         pl.lat && pl.lng
//           ? haversineMiles(picked, { lat: pl.lat, lng: pl.lng }) <= radiusMi
//           : true
//       )

//       // Sort by distance ascending
//       const sorted = within.sort((a, b) => {
//         const da =
//           a.lat && a.lng
//             ? haversineMiles(picked, { lat: a.lat, lng: a.lng })
//             : Number.POSITIVE_INFINITY
//         const db =
//           b.lat && b.lng
//             ? haversineMiles(picked, { lat: b.lat, lng: b.lng })
//             : Number.POSITIVE_INFINITY
//         return da - db
//       })

//       setResults(sorted)
//     } catch (e: any) {
//       setError(e?.message || 'Failed to fetch')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen bg-white text-gray-900 px-4 py-6">
//       <div className="mx-auto max-w-5xl grid gap-4 md:grid-cols-3">
//         {/* Map & radius ring */}
//         <div className="md:col-span-2">
//           <LeafletMap
//             picked={picked}
//             onPick={setPicked}
//             radiusMeters={radiusMi * MILES_TO_METERS}
//           />
//         </div>

//         {/* Controls + Results */}
//         <div className="md:col-span-1 space-y-4">
//           <div className="rounded-xl border p-4 shadow-sm">
//             <h2 className="text-lg font-semibold">Search Settings</h2>

//             {/* Price from Host (editable here) */}
//             <div className="mt-3">
//               <label className="text-sm text-gray-700">Price</label>
//               <select
//                 value={selectedPriceIdx ?? ''}
//                 onChange={(e) =>
//                   setSelectedPriceIdx(e.target.value ? Number(e.target.value) : null)
//                 }
//                 className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2"
//               >
//                 <option value="">All</option>
//                 <option value="0">$ (Inexpensive)</option>
//                 <option value="1">$$ (Moderate)</option>
//                 <option value="2">$$$ (Expensive)</option>
//                 <option value="3">$$$$ (Very Expensive)</option>
//               </select>
//             </div>

//             <div className="mt-3">
//               <label className="text-sm text-gray-700">Radius: {radiusMi} miles</label>
//               <input
//                 type="range"
//                 min={1}
//                 max={20}
//                 step={1}
//                 value={radiusMi}
//                 onChange={(e) => setRadiusMi(Number(e.target.value))}
//                 className="w-full"
//               />
//             </div>

//             <button
//               onClick={() => sweepTiles({ reset: true })}
//               disabled={!picked || loading}
//               className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
//             >
//               {loading ? 'Searching…' : 'Find Restaurants'}
//             </button>

//             {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
//             {!picked && (
//               <p className="mt-2 text-sm text-gray-600">
//                 Tip: click the map to set the center.
//               </p>
//             )}
//           </div>

//           <div className="rounded-xl border p-4 shadow-sm">
//             <h2 className="text-lg font-semibold">Results</h2>
//             <ul className="mt-3 space-y-3">
//               {results.map((r) => (
//                 <li key={r.id || `${r.name}|${r.address}`} className="rounded-md border p-3">
//                   <div className="flex items-center justify-between">
//                     <div className="font-medium">{r.name}</div>
//                     {typeof r.rating === 'number' && (
//                       <div className="text-sm text-gray-600">⭐ {r.rating.toFixed(1)}</div>
//                     )}
//                   </div>
//                   <div className="text-sm text-gray-600">{r.address}</div>
//                   <div className="text-xs text-gray-500 mt-1">
//                     Price: {priceLabelFromIndex(r._priceIdx)}{' '}
//                     {r.openNow !== undefined ? (r.openNow ? '· Open now' : '· Closed') : ''}
//                   </div>
//                   {r.mapsUri && (
//                     <a
//                       href={r.mapsUri}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="text-blue-600 text-sm underline"
//                     >
//                       View on Google Maps
//                     </a>
//                   )}
//                 </li>
//               ))}
//               {!loading && results.length === 0 && (
//                 <li className="text-sm text-gray-500">No results yet. Pick a point on the map and search.</li>
//               )}
//             </ul>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

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
  _priceIdx: number | null; // required to avoid undefined
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

/* ---------- Page export with Suspense ---------- */
export default function HostLocationPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading search settings…</div>}>
      <HostLocationInner />
    </Suspense>
  );
}

/* ---------- Actual client content ---------- */
function HostLocationInner() {
  const router = useRouter();

  // ---- price passed from Host page ----
  const params = useSearchParams();
  const priceIdxFromQuery = params.get('priceIdx');
  const [selectedPriceIdx, setSelectedPriceIdx] = useState<number | null>(null);

  // ---- map + radius ----
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusMi, setRadiusMi] = useState<number>(3);

  // ---- fetch state ----
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

  // ---- tiling params (derived from radius) ----
  const radiusMeters = radiusMi * MILES_TO_METERS;
  const tileRadiusMeters = Math.max(800, Math.min(2500, radiusMeters / 3)); // ~0.5–1.5 mi
  const tileSpacingMeters = tileRadiusMeters * 1.5; // center-to-center spacing

  // Build tile centers around the picked point
  const tileCenters = useMemo(() => {
    if (!picked) return [] as Array<{ lat: number; lng: number }>;
    const { lat, lng } = picked;
    const centers: Array<{ lat: number; lng: number }> = [];
    centers.push({ lat, lng }); // center tile

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
        centers.push({
          lat: lat + degLat(dy),
          lng: lng + degLng(dx, lat),
        });
      }
    }
    return centers;
  }, [picked, radiusMeters, tileSpacingMeters]);

  const FIELD_MASK = useMemo(
    () =>
      [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.currentOpeningHours.openNow',
        'places.googleMapsUri',
      ].join(','),
    []
  );

  // One Nearby call for a given tile center
  async function fetchNearbyAtCenter(center: { lat: number; lng: number }): Promise<Place[]> {
    const resp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY as string,
        'X-Goog-FieldMask': FIELD_MASK,
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

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Places error ${resp.status}: ${text}`);
    }

    const data = await resp.json();
    const batch: Place[] = (data?.places ?? [])
      .filter((p: any) => {
        const id = p.id ?? p.googleMapsUri ?? p.displayName?.text;
        if (!id) return false;
        if (seenIds.current.has(id)) return false;
        seenIds.current.add(id);
        return true;
      })
      .map((p: any): Place => {
        const _priceIdx = toPriceIndex(p.priceLevel);
        return {
          id: p.id,
          name: p.displayName?.text,
          address: p.formattedAddress,
          rating: p.rating,
          priceLevel: p.priceLevel,
          openNow: p.currentOpeningHours?.openNow ?? undefined,
          lat: p.location?.latitude,
          lng: p.location?.longitude,
          mapsUri: p.googleMapsUri,
          _priceIdx,
        };
      });

    if (selectedPriceIdx == null) return batch;
    const target = selectedPriceIdx;
    return batch.filter((pl: Place) => pl._priceIdx === target);
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
    } catch {
      // ignore storage failures
    }
  }

  // Sweep all tiles (sequential, gentle on QPS)
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
        await new Promise((r) => setTimeout(r, 250)); // gentle delay
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

  function goToSwipe() {
    if (!picked) {
      setError('Pick a point on the map first.');
      return;
    }
    if (results.length === 0) {
      setError('Find restaurants first, then begin swiping.');
      return;
    }
    persistLastSearch(results);
    const qs = new URLSearchParams({
      lat: String(picked.lat),
      lng: String(picked.lng),
      radiusMi: String(radiusMi),
      priceIdx: selectedPriceIdx === null ? '' : String(selectedPriceIdx),
    }).toString();
    router.push(`/host/swipe?${qs}`);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-6">
      <div className="mx-auto max-w-5xl grid gap-4 md:grid-cols-3">
        {/* Map & radius ring */}
        <div className="md:col-span-2">
          <LeafletMap
            picked={picked}
            onPick={setPicked}
            radiusMeters={radiusMi * MILES_TO_METERS}
          />
        </div>

        {/* Controls + Results */}
        <div className="md:col-span-1 space-y-4">
          <div className="rounded-xl border p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Search Settings</h2>

            {/* Price from Host (editable here) */}
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

            <button
              onClick={goToSwipe}
              disabled={!picked || results.length === 0}
              className="mt-2 w-full rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-50"
            >
              Begin swiping
            </button>

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
