// 'use client'

// import { useEffect, useMemo, useState } from 'react'
// import { useParams } from 'next/navigation'

// type Place = {
//   id: string
//   displayName?: { text: string }
//   formattedAddress?: string
//   rating?: number
//   userRatingCount?: number
//   priceLevel?: 'PRICE_LEVEL_INEXPENSIVE'|'PRICE_LEVEL_MODERATE'|'PRICE_LEVEL_EXPENSIVE'|'PRICE_LEVEL_VERY_EXPENSIVE'|'PRICE_LEVEL_UNSPECIFIED'|null
//   googleMapsUri?: string
//   currentOpeningHours?: { openNow?: boolean }
//   location?: { latitude: number, longitude: number }
// }

// function priceIndexFromEnum(priceLevel: Place['priceLevel']): number | null {
//   const map: Record<string, number | null> = {
//     PRICE_LEVEL_INEXPENSIVE: 0,
//     PRICE_LEVEL_MODERATE: 1,
//     PRICE_LEVEL_EXPENSIVE: 2,
//     PRICE_LEVEL_VERY_EXPENSIVE: 3,
//     PRICE_LEVEL_UNSPECIFIED: null,
//   }
//   // @ts-ignore
//   return map[priceLevel] ?? null
// }

// export default function SessionPage() {
//   const params = useParams()
//   const code = (params?.code as string || '').toUpperCase()
//   const [error, setError] = useState<string | null>(null)
//   const [loading, setLoading] = useState(false)
//   const [results, setResults] = useState<Place[]>([])

//   const constraints = useMemo(() => {
//     try {
//     const raw = (typeof window !== 'undefined')
//     ? localStorage.getItem(`session:${code}`)
//     : null
//       return raw ? JSON.parse(raw) as { priceIdx:number, lat:number, lng:number, radiusMiles:number } : null
//     } catch { return null }
//   }, [code])

//   useEffect(() => {
//     if (!constraints) { setError('Session not found on this device.'); return }
//     const { priceIdx, lat, lng, radiusMiles } = constraints
//     const FIELD_MASK = [
//       'places.id',
//       'places.displayName',
//       'places.formattedAddress',
//       'places.location',
//       'places.rating',
//       'places.userRatingCount',
//       'places.priceLevel',
//       'places.currentOpeningHours.openNow',
//       'places.googleMapsUri',
//     ].join(',')

//     async function run() {
//       setLoading(true)
//       setError(null)
//       try {
//         const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY as string,
//             'X-Goog-FieldMask': FIELD_MASK,
//           },
//           body: JSON.stringify({
//             includedTypes: ['restaurant'],
//             locationRestriction: {
//               circle: {
//                 center: { latitude: lat, longitude: lng },
//                 radius: Math.max(50, Math.min(50000, radiusMiles * 1609.34))
//               }
//             },
//             maxResultCount: 20,
//             rankPreference: 'POPULARITY'
//           })
//         })
//         if (!res.ok) throw new Error(await res.text())
//         const data = await res.json()
//         let places: Place[] = data.places ?? []
//         // Filter by price
//         places = places.filter(p => {
//           const idx = priceIndexFromEnum(p.priceLevel ?? null)
//           if (priceIdx === 99) return true // special All
//           if (idx == null) return false
//           return idx === priceIdx
//         })
//         setResults(places)
//       } catch (e:any) {
//         setError(e.message || 'Failed to load restaurants')
//       } finally {
//         setLoading(false)
//       }
//     }
//     run()
//   }, [constraints])

//   return (
//     <div className="min-h-screen bg-green-100 p-6">
//       <div className="mx-auto max-w-4xl">
//         <h1 className="text-3xl font-extrabold mb-2">Session {code}</h1>
//         {constraints && (
//           <p className="text-gray-700 mb-6">Price: {constraints.priceIdx===99? 'All' : '$'.repeat(constraints.priceIdx+1)} • Radius: {constraints.radiusMiles} mi</p>
//         )}
//         {error && <div className="rounded-md bg-red-100 border border-red-300 p-3 mb-4">{error}</div>}
//         {loading && <p>Loading restaurants…</p>}
//         {!loading && results.length === 0 && <p>No restaurants found for these constraints.</p>}
//         <ul className="space-y-3">
//           {results.map(p => (
//             <li key={p.id} className="rounded-lg bg-white border p-4">
//               <div className="flex justify-between items-center gap-3">
//                 <div>
//                   <div className="font-semibold">{p.displayName?.text ?? 'Unnamed place'}</div>
//                   {p.formattedAddress && <div className="text-sm text-gray-600">{p.formattedAddress}</div>}
//                   <div className="text-sm text-gray-700">
//                     {p.rating ? `${p.rating.toFixed(1)}★` : '—'} {p.userRatingCount ? `(${p.userRatingCount})` : ''} •
//                     {' '}{(p.priceLevel && priceIndexFromEnum(p.priceLevel) != null) ? '$'.repeat((priceIndexFromEnum(p.priceLevel) as number)+1) : 'N/A'}
//                     {' '}{p.currentOpeningHours?.openNow ? '• Open now' : ''}
//                   </div>
//                 </div>
//                 {p.googleMapsUri && (
//                   <a href={p.googleMapsUri} className="text-sm underline" target="_blank" rel="noreferrer">Open in Maps</a>
//                 )}
//               </div>
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   )
// }

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type Place = {
  id?: string;
  name: string;
  address?: string;
  rating?: number;
  priceLevel?: any;
  openNow?: boolean;
  lat?: number;
  lng?: number;
  mapsUri?: string;
  _priceIdx?: number | null;
};

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
  };
  return map[String(priceLevel)] ?? null;
}

function priceLabelFromIndex(idx: number | null | undefined) {
  if (idx == null) return 'Any';
  return ['$', '$$', '$$$', '$$$$'][Math.max(0, Math.min(3, idx))];
}

// haversine (miles)
function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.7613;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// meters -> degrees (approx)
const degLat = (m: number) => m / 111_320;
const degLng = (m: number, baseLat: number) => m / (111_320 * Math.cos((baseLat * Math.PI) / 180));

export default function JoinSessionPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [results, setResults] = useState<Place[]>([]);

  // Field mask for Places API
  const FIELD_MASK = useMemo(
    () =>
      [
        'id',
        'displayName',
        'formattedAddress',
        'rating',
        'priceLevel',
        'location',
        'places.currentOpeningHours.openNow',
        'places.googleMapsUri',
      ].join(','),
    []
  );

  useEffect(() => {
    async function run() {
      if (!code) return;
      try {
        setLoading(true);
        setError(null);
        setResults([]);

        // 1) Get saved constraints from the session (price, center, radius)
        const res = await fetch(`/api/sessions/${encodeURIComponent(code)}`);
        if (!res.ok) throw new Error('Failed to load session');
        const data = await res.json();
        const s = data?.session;
        if (!s) throw new Error('Invalid session response');
        setSession(s);

        // DB compatibility: some schemas use price_level, others price_range
        const priceLevelOneToFour: number | null =
          typeof s.price_level === 'number'
            ? s.price_level
            : typeof s.price_range === 'number'
              ? s.price_range
              : null;
        const priceIdx = priceLevelOneToFour != null ? priceLevelOneToFour - 1 : null;

        const center = { lat: Number(s.latitude), lng: Number(s.longitude) };
        const radiusMeters: number = Number(s.radius); // stored in meters
        const maxMiles = radiusMeters / 1609.34;

        // 2) Build a small grid of Nearby queries to cover the circle
        const tileRadius = Math.max(500, Math.floor(radiusMeters / 2));
        const spacing = tileRadius * 1.5;
        const centers: { lat: number; lng: number }[] = [{ ...center }];
        const rings = Math.ceil(radiusMeters / spacing);
        for (let r = 1; r <= rings; r++) {
          const d = r * spacing;
          const cand: Array<[number, number]> = [
            [d, 0],
            [0, d],
            [-d, 0],
            [0, -d],
            [d, d],
            [-d, d],
            [-d, -d],
            [d, -d],
          ];
          for (const [dx, dy] of cand) {
            centers.push({
              lat: center.lat + degLat(dy),
              lng: center.lng + degLng(dx, center.lat),
            });
          }
        }

        // 3) Query Places for each tile center
        const seen = new Set<string>();
        const collected: Place[] = [];

        async function fetchNearbyAt(c: { lat: number; lng: number }) {
          const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY as string,
              'X-Goog-FieldMask': FIELD_MASK,
            },
            body: JSON.stringify({
              includedTypes: ['restaurant'],
              maxResultCount: 20,
              rankPreference: 'POPULARITY',
              locationRestriction: {
                circle: { center: { latitude: c.lat, longitude: c.lng }, radius: tileRadius },
              },
            }),
          });
          if (!r.ok) throw new Error(`Places API error ${r.status}`);
          const j = await r.json();
          return (j?.places ?? []) as any[];
        }

        for (const c of centers) {
          const batch = await fetchNearbyAt(c);
          for (const p of batch) {
            const id = p.id ?? p.googleMapsUri ?? p.displayName?.text;
            if (!id || seen.has(id)) continue;
            seen.add(id);

            const item: Place = {
              id,
              name: p.displayName?.text ?? 'Unknown',
              address: p.formattedAddress,
              rating: typeof p.rating === 'number' ? p.rating : undefined,
              priceLevel: p.priceLevel,
              openNow: p.currentOpeningHours?.openNow,
              lat: p.location?.latitude,
              lng: p.location?.longitude,
              mapsUri: p.googleMapsUri,
              _priceIdx: toPriceIndex(p.priceLevel),
            };

            // apply session price filter if specified
            if (priceIdx != null && item._priceIdx != null && item._priceIdx !== priceIdx) continue;

            // keep only those within the overall session radius
            if (item.lat != null && item.lng != null) {
              const d = haversineMiles(center, { lat: item.lat, lng: item.lng });
              if (d > maxMiles + 0.25) continue;
            }
            collected.push(item);
          }
          // gentle pacing
          await new Promise((r) => setTimeout(r, 200));
        }

        // sort by rating desc, then name
        collected.sort((a, b) => {
          const ra = a.rating ?? 0;
          const rb = b.rating ?? 0;
          if (rb !== ra) return rb - ra;
          return (a.name || '').localeCompare(b.name || '');
        });

        setResults(collected);
      } catch (e: any) {
        setError(e?.message || 'Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [code, FIELD_MASK]);

  if (!code) return <div className="p-6">Missing session code.</div>;

  return (
    <main className="min-h-screen bg-green-100 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-extrabold text-black">Restaurants</h1>
        {session && (
          <p className="text-black mt-1">
            Price:&nbsp;
            {priceLabelFromIndex(
              typeof session.price_level === 'number'
                ? session.price_level - 1
                : typeof session.price_range === 'number'
                  ? session.price_range - 1
                  : null
            )}
            &nbsp;· Radius: {(Number(session.radius) / 1609.34).toFixed(1)} mi
          </p>
        )}

        {loading && <p className="mt-4">Loading…</p>}
        {error && <p className="mt-4 text-red-600">{error}</p>}

        <ul className="mt-6 space-y-3">
          {results.map((r) => (
            <li key={r.id} className="rounded-md border bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{r.name}</span>
                {typeof r.rating === 'number' && <span>⭐ {r.rating.toFixed(1)}</span>}
              </div>
              <div className="text-sm text-gray-700">{r.address}</div>
              <div className="text-xs text-gray-600 mt-1">
                Price: {priceLabelFromIndex(r._priceIdx)}{' '}
                {r.openNow !== undefined ? (r.openNow ? '· Open now' : '· Closed') : ''}
              </div>
              {r.mapsUri && (
                <a
                  href={r.mapsUri}
                  target="_blank"
                  className="text-sm text-green-700 underline mt-1 inline-block"
                >
                  View on Maps
                </a>
              )}
            </li>
          ))}
        </ul>

        {!loading && !error && results.length === 0 && (
          <p className="mt-4 text-gray-600">No results within the selected area.</p>
        )}
      </div>
    </main>
  );
}
