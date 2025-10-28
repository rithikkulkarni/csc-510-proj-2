// 'use client'

// import HostLocationForm from '@/components/HostLocationForm'

// export default function HostLocationPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
//   const price = searchParams.price ?? ''

//   return <HostLocationForm price={price} />
// }

'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'

const LeafletMap = dynamic(() => import('./parts/LeafletMap'), { ssr: false })

type Place = {
  id: string
  name: string
  address?: string
  rating?: number
  priceLevel?: any
  openNow?: boolean
  lat?: number
  lng?: number
  mapsUri?: string
  _priceIdx?: number | null
}

const MILES_TO_METERS = 1609.34

// Normalize Google priceLevel to an index 0..3 => $, $$, $$$, $$$$
function toPriceIndex(priceLevel: any): number | null {
  if (priceLevel == null) return null
  if (typeof priceLevel === 'number') {
    const n = Math.max(0, Math.min(3, priceLevel))
    return Number.isFinite(n) ? n : null
  }
  const map: Record<string, number | null> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 0,
    PRICE_LEVEL_MODERATE: 1,
    PRICE_LEVEL_EXPENSIVE: 2,
    PRICE_LEVEL_VERY_EXPENSIVE: 3,
    PRICE_LEVEL_UNSPECIFIED: null,
  }
  return map[priceLevel] ?? null
}

function priceLabelFromIndex(idx: number | null): string {
  if (idx == null) return 'N/A'
  return '$'.repeat(idx + 1)
}

// Distance for safety post-filter
function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.7613 // miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export default function HostLocationPage() {
  const params = useSearchParams()
  const priceIdxFromQuery = params.get('priceIdx')
  const [selectedPriceIdx, setSelectedPriceIdx] = useState<number | null>(null)

  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [radiusMi, setRadiusMi] = useState<number>(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Place[]>([])

  // initialize selected price from host page
  useEffect(() => {
    if (priceIdxFromQuery !== null) {
      const n = Number(priceIdxFromQuery)
      setSelectedPriceIdx(Number.isFinite(n) ? n : null)
    }
  }, [priceIdxFromQuery])

  // Build the Places field mask (keep it lean)
  const fieldMask = useMemo(
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
  )

  async function search() {
    if (!picked) {
      setError('Click the map to set a center point.')
      return
    }
    setLoading(true)
    setError(null)
    setResults([])

    try {
      const resp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY as string, // browser key
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify({
          includedTypes: ['restaurant'],
          locationRestriction: {
            circle: {
              center: { latitude: picked.lat, longitude: picked.lng },
              radius: Math.max(100, radiusMi * MILES_TO_METERS),
            },
          },
          rankPreference: 'POPULARITY',
          maxResultCount: 20,
        }),
      })

      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`Places error ${resp.status}: ${text}`)
      }

      const data = await resp.json()

      // Map + normalize
      let places: Place[] = (data.places || []).map((p: any) => ({
        id: p.id,
        name: p.displayName?.text,
        address: p.formattedAddress,
        rating: p.rating,
        priceLevel: p.priceLevel,
        openNow: p.currentOpeningHours?.openNow ?? undefined,
        lat: p.location?.latitude,
        lng: p.location?.longitude,
        mapsUri: p.googleMapsUri,
        _priceIdx: toPriceIndex(p.priceLevel),
      }))

      // Filter by the user-chosen price (from host page)
      if (selectedPriceIdx !== null) {
        places = places.filter((pl) => pl._priceIdx === selectedPriceIdx)
      }

      // Safety: filter by actual distance
      places = places.filter((pl) => pl.lat && pl.lng
        ? haversineMiles(picked, { lat: pl.lat!, lng: pl.lng! }) <= radiusMi
        : true
      )

      // Deduplicate by place ID
      const unique = new Map<string, Place>()
      for (const pl of places) {
        if (!pl.id) continue
        if (!unique.has(pl.id)) unique.set(pl.id, pl)
      }

      // Sort by distance ascending
      const finalList = Array.from(unique.values()).sort((a, b) => {
        const da = a.lat && a.lng ? haversineMiles(picked, { lat: a.lat, lng: a.lng }) : Number.POSITIVE_INFINITY
        const db = b.lat && b.lng ? haversineMiles(picked, { lat: b.lat, lng: b.lng }) : Number.POSITIVE_INFINITY
        return da - db
      })

      setResults(finalList)
      // console.log('✅ final results', finalList)
    } catch (e: any) {
      setError(e?.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
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

            {/* Show the price chosen on Host (changeable here if desired) */}
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
              onClick={search}
              disabled={!picked || loading}
              className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Find Restaurants'}
            </button>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {!picked && <p className="mt-2 text-sm text-gray-600">Tip: click the map to set the center.</p>}
          </div>

          <div className="rounded-xl border p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Results</h2>
            <ul className="mt-3 space-y-3">
              {results.map((r) => (
                <li key={r.id} className="rounded-md border p-3">
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
                <li className="text-sm text-gray-500">No results yet. Pick a point on the map and search.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
