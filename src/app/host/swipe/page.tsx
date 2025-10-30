'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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
  _priceIdx: number | null
}

type LastSearchPayload = {
  picked: { lat: number; lng: number }
  radiusMi: number
  selectedPriceIdx: number | null
  results: Place[]
  savedAt: number
}

type TournamentItem = Place & { wins: number; losses: number }

const LAST_SEARCH_KEY = 'lastSearch_v1'

function priceLabelFromIndex(idx: number | null): string {
  if (idx == null) return 'N/A'
  return '$'.repeat(idx + 1)
}

function dedupeBy<T>(keyer: (x: T) => string, arr: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const x of arr) {
    const k = keyer(x)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(x)
  }
  return out
}

export default function SwipePage() {
  const router = useRouter()

  // ---- derive everything once from sessionStorage (no effect, no setState in effect) ----
  const init = (() => {
    try {
      const raw = sessionStorage.getItem(LAST_SEARCH_KEY)
      if (!raw) {
        return {
          payload: null as LastSearchPayload | null,
          items: [] as TournamentItem[],
          error: 'No cached results found. Please go back and run a search.',
        }
      }
      const parsed = JSON.parse(raw) as LastSearchPayload
      if (!parsed?.picked || !Array.isArray(parsed?.results)) {
        return {
          payload: null,
          items: [],
          error: 'Saved search is incomplete. Please re-run the search.',
        }
      }
      const deduped = dedupeBy((r: Place) => r.id || `${r.name}|${r.address}`, parsed.results)
      const seeded: TournamentItem[] = deduped.map((p) => ({
        ...p,
        _priceIdx: p._priceIdx ?? null,
        wins: 0,
        losses: 0,
      }))
      const error =
        seeded.length < 2
          ? 'Need at least 2 restaurants to compare. Please widen your search.'
          : null
      return { payload: parsed, items: seeded, error }
    } catch {
      return {
        payload: null,
        items: [],
        error: 'Failed to read saved search. Please re-run the search.',
      }
    }
  })()

  const [payload] = useState<LastSearchPayload | null>(init.payload)
  const [items, setItems] = useState<TournamentItem[]>(init.items)
  const [error] = useState<string | null>(init.error)

  // tournament state
  const [leaderIdx, setLeaderIdx] = useState<number>(0)
  const [cursor, setCursor] = useState<number>(items.length > 1 ? 1 : 0)
  const [finished, setFinished] = useState<boolean>(false)

  const havePair = useMemo(() => {
    return (
      !finished &&
      items.length >= 2 &&
      leaderIdx >= 0 &&
      leaderIdx < items.length &&
      cursor >= 0 &&
      cursor < items.length &&
      leaderIdx !== cursor
    )
  }, [finished, items, leaderIdx, cursor])

  function pickWinner(which: 'left' | 'right') {
    if (!havePair) return
    const aIdx = leaderIdx
    const bIdx = cursor
    const winnerIdx = which === 'left' ? aIdx : bIdx
    const loserIdx = which === 'left' ? bIdx : aIdx

    setItems((prev) => {
      const clone = [...prev]
      clone[winnerIdx] = { ...clone[winnerIdx], wins: clone[winnerIdx].wins + 1 }
      clone[loserIdx] = { ...clone[loserIdx], losses: clone[loserIdx].losses + 1 }
      return clone
    })

    const nextCursor = cursor + 1
    setLeaderIdx(winnerIdx)
    if (nextCursor >= items.length) {
      setFinished(true)
    } else {
      setCursor(nextCursor)
    }
  }

  function skipPair() {
    if (!havePair) return
    setItems((prev) => {
      if (prev.length < 3) return prev
      const newArr = [...prev]
      const [leader] = newArr.splice(leaderIdx, 1)
      newArr.push(leader)
      return newArr
    })
    setLeaderIdx(0)
    setCursor(1)
  }

  function undoLast() {
    if (cursor > 1) setCursor((c) => c - 1)
  }

  const top3 = useMemo(() => {
    if (!finished) return []
    const sorted = [...items].sort((x, y) => {
      if (y.wins !== x.wins) return y.wins - x.wins
      const xr = x.rating ?? -1
      const yr = y.rating ?? -1
      if (yr !== xr) return yr - xr
      const xrc = (x as any).userRatingCount ?? -1
      const yrc = (y as any).userRatingCount ?? -1
      if (yrc !== xrc) return yrc - xrc
      return (x.name || '').localeCompare(y.name || '')
    })
    return sorted.slice(0, 3)
  }, [finished, items])

  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Which do you prefer?</h1>
          <button
            onClick={() => router.back()}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        {payload && (
          <p className="text-sm text-gray-600 mt-1">
            Center ({payload.picked.lat.toFixed(4)}, {payload.picked.lng.toFixed(4)}) · radius {payload.radiusMi} mi ·{' '}
            {payload.selectedPriceIdx === null
              ? 'All prices (incl. N/A)'
              : `Price: ${priceLabelFromIndex(payload.selectedPriceIdx)}`}
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}{' '}
            <button onClick={() => router.push('/host/location')} className="ml-2 underline">
              Go back to Location
            </button>
          </div>
        )}

        {/* Main compare UI */}
        {!error && !finished && havePair && (
          <div className="mt-5 rounded-2xl border p-4 shadow-sm">
            <div className="text-center text-base font-medium mb-3">Tap the option you prefer</div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <RestaurantCard place={items[leaderIdx]} onChoose={() => pickWinner('left')} tag="Current" />
              <div className="flex items-center justify-center">
                <span className="rounded-full border px-3 py-1 text-sm">OR</span>
              </div>
              <RestaurantCard place={items[cursor]} onChoose={() => pickWinner('right')} tag="Challenger" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button onClick={undoLast} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                Undo
              </button>
              <button onClick={skipPair} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
                Too tough / Skip
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Compared {Math.min(cursor, Math.max(0, items.length - 1))} of {Math.max(0, items.length - 1)} challengers
            </div>
          </div>
        )}

        {/* Finished summary */}
        {finished && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold">Your Top 3</h2>
            <ol className="mt-3 space-y-3">
              {top3.map((p, i) => (
                <li key={p.id || `${p.name}|${p.address}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {i + 1}. {p.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      Wins: {p.wins} {typeof p.rating === 'number' && <span className="ml-2">⭐ {p.rating.toFixed(1)}</span>}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{p.address}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Price: {priceLabelFromIndex(p._priceIdx)}{' '}
                    {p.openNow !== undefined ? (p.openNow ? '· Open now' : '· Closed') : ''}
                  </div>
                  {p.mapsUri && (
                    <a
                      href={p.mapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-sm underline"
                    >
                      View on Google Maps
                    </a>
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={() => {
                  if (items.length >= 2) {
                    setLeaderIdx(0)
                    setCursor(1)
                    setFinished(false)
                  }
                }}
                className="rounded-md bg-green-600 px-4 py-2 text-white"
              >
                Restart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- helpers & small components ---------------- */

function RestaurantCard({
  place,
  onChoose,
  tag,
}: {
  place: Place
  onChoose: () => void
  tag?: string
}) {
  return (
    <button onClick={onChoose} className="w-full rounded-xl border p-4 text-left hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold leading-snug">{place.name}</div>
        {tag && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{tag}</span>}
      </div>
      {place.address && <div className="mt-1 text-sm text-gray-600">{place.address}</div>}
      <div className="mt-1 text-xs text-gray-500">
        {typeof place.rating === 'number' && <>⭐ {place.rating.toFixed(1)} · </>}
        Price: {priceLabelFromIndex(place._priceIdx)}
      </div>
      {place.openNow !== undefined && (
        <div className="mt-1 text-xs text-gray-500">{place.openNow ? 'Open now' : 'Closed'}</div>
      )}
    </button>
  )
}
