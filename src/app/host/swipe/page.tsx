// // Swiping algorithm code
// 'use client'

// import { useEffect, useMemo, useState } from 'react'
// import { useRouter } from 'next/navigation'

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
//   _priceIdx: number | null // <- REQUIRED; never undefined
// }

// type LastSearchPayload = {
//   picked: { lat: number; lng: number }
//   radiusMi: number
//   selectedPriceIdx: number | null
//   results: Place[]
//   savedAt: number
// }

// type TournamentItem = Place & {
//   wins: number
//   losses: number
// }

// const LAST_SEARCH_KEY = 'lastSearch_v1'

// function priceLabelFromIndex(idx: number | null): string {
//   if (idx == null) return 'N/A'
//   return '$'.repeat(idx + 1)
// }

// export default function SwipePage() {
//   const router = useRouter()

//   const [payload, setPayload] = useState<LastSearchPayload | null>(null)
//   const [items, setItems] = useState<TournamentItem[]>([])
//   const [error, setError] = useState<string | null>(null)

//   // tournament state
//   const [leaderIdx, setLeaderIdx] = useState<number>(0) // index in items of "king of the hill"
//   const [cursor, setCursor] = useState<number>(1)       // next challenger index
//   const [finished, setFinished] = useState<boolean>(false)

//   useEffect(() => {
//     try {
//       const raw = sessionStorage.getItem(LAST_SEARCH_KEY)
//       if (!raw) {
//         setError('No cached results found. Please go back and run a search.')
//         return
//       }
//       const parsed = JSON.parse(raw) as LastSearchPayload
//       if (!parsed?.picked || !Array.isArray(parsed?.results)) {
//         setError('Saved search is incomplete. Please re-run the search.')
//         return
//       }

//       // Filter out any dupes or missing names just in case
//       const deduped = dedupeBy(
//         (r) => r.id || `${r.name}|${r.address}`,
//         parsed.results
//       )

//       // Normalize legacy entries that might have _priceIdx === undefined
//       const seeded: TournamentItem[] = deduped.map((p) => ({
//         ...p,
//         _priceIdx: p._priceIdx ?? null,
//         wins: 0,
//         losses: 0,
//       }))

//       if (seeded.length < 2) {
//         setError('Need at least 2 restaurants to compare. Please widen your search.')
//       }

//       setPayload(parsed)
//       setItems(seeded)
//       setLeaderIdx(0)
//       setCursor(Math.min(1, Math.max(0, seeded.length - 1)))
//     } catch {
//       setError('Failed to read saved search. Please re-run the search.')
//     }
//   }, [])

//   const havePair = useMemo(() => {
//     return (
//       !finished &&
//       items.length >= 2 &&
//       leaderIdx >= 0 &&
//       leaderIdx < items.length &&
//       cursor >= 0 &&
//       cursor < items.length &&
//       leaderIdx !== cursor
//     )
//   }, [finished, items, leaderIdx, cursor])

//   function pickWinner(which: 'left' | 'right') {
//     if (!havePair) return
//     const aIdx = leaderIdx
//     const bIdx = cursor
//     const winnerIdx = which === 'left' ? aIdx : bIdx
//     const loserIdx = which === 'left' ? bIdx : aIdx

//     setItems((prev) => {
//       const clone = [...prev]
//       clone[winnerIdx] = { ...clone[winnerIdx], wins: clone[winnerIdx].wins + 1 }
//       clone[loserIdx] = { ...clone[loserIdx], losses: clone[loserIdx].losses + 1 }
//       return clone
//     })

//     // winner stays as leader; challenger advances
//     const nextCursor = cursor + 1
//     setLeaderIdx(winnerIdx)
//     if (nextCursor >= items.length) {
//       setFinished(true)
//     } else {
//       setCursor(nextCursor)
//     }
//   }

//   function skipPair() {
//     // rotate: send leader to the back, bring next two forward
//     if (!havePair) return
//     setItems((prev) => {
//       if (prev.length < 3) return prev
//       const newArr = [...prev]
//       const [leader] = newArr.splice(leaderIdx, 1) // remove current leader
//       newArr.push(leader) // put it at end
//       return newArr
//     })
//     // reset pointers to first two items
//     setLeaderIdx(0)
//     setCursor(1)
//   }

//   function undoLast() {
//     // Minimal UX: just step cursor back one (no score rollback)
//     if (cursor > 1) setCursor((c) => c - 1)
//   }

//   const top3 = useMemo(() => {
//     if (!finished) return []
//     const sorted = [...items].sort((x, y) => {
//       // primary: wins desc
//       if (y.wins !== x.wins) return y.wins - x.wins
//       // tie 1: higher rating first if present
//       const xr = x.rating ?? -1
//       const yr = y.rating ?? -1
//       if (yr !== xr) return yr - xr
//       // tie 2: more ratings first if present
//       const xrc = (x as any).userRatingCount ?? -1
//       const yrc = (y as any).userRatingCount ?? -1
//       if (yrc !== xrc) return yrc - xrc
//       // tie 3: name asc
//       return (x.name || '').localeCompare(y.name || '')
//     })
//     return sorted.slice(0, 3)
//   }, [finished, items])

//   return (
//     <div className="min-h-screen bg-white text-gray-900 px-4 py-6">
//       <div className="mx-auto max-w-3xl">
//         <div className="flex items-center justify-between">
//           <h1 className="text-2xl font-semibold">Which do you prefer?</h1>
//           <button
//             onClick={() => router.back()}
//             className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
//           >
//             Back
//           </button>
//         </div>

//         {payload && (
//           <p className="text-sm text-gray-600 mt-1">
//             Center ({payload.picked.lat.toFixed(4)}, {payload.picked.lng.toFixed(4)}) · radius {payload.radiusMi} mi ·{' '}
//             {payload.selectedPriceIdx === null
//               ? 'All prices (incl. N/A)'
//               : `Price: ${priceLabelFromIndex(payload.selectedPriceIdx)}`}
//           </p>
//         )}

//         {error && (
//           <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
//             {error}{' '}
//             <button onClick={() => router.push('/host/location')} className="ml-2 underline">
//               Go back to Location
//             </button>
//           </div>
//         )}

//         {/* Main compare UI */}
//         {!error && !finished && havePair && (
//           <div className="mt-5 rounded-2xl border p-4 shadow-sm">
//             <div className="text-center text-base font-medium mb-3">
//               Tap the option you prefer
//             </div>

//             <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
//               <RestaurantCard
//                 place={items[leaderIdx]}
//                 onChoose={() => pickWinner('left')}
//                 tag="Current"
//               />
//               <div className="flex items-center justify-center">
//                 <span className="rounded-full border px-3 py-1 text-sm">OR</span>
//               </div>
//               <RestaurantCard
//                 place={items[cursor]}
//                 onChoose={() => pickWinner('right')}
//                 tag="Challenger"
//               />
//             </div>

//             <div className="mt-4 flex items-center justify-between gap-2">
//               <button onClick={undoLast} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
//                 Undo
//               </button>
//               <button onClick={skipPair} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
//                 Too tough / Skip
//               </button>
//             </div>

//             <div className="mt-3 text-xs text-gray-500">
//               Compared {Math.min(cursor, Math.max(0, items.length - 1))} of {Math.max(0, items.length - 1)} challengers
//             </div>
//           </div>
//         )}

//         {/* Finished summary */}
//         {finished && (
//           <div className="mt-6">
//             <h2 className="text-xl font-semibold">Your Top 3</h2>
//             <ol className="mt-3 space-y-3">
//               {top3.map((p, i) => (
//                 <li key={p.id || `${p.name}|${p.address}`} className="rounded-md border p-3">
//                   <div className="flex items-center justify-between">
//                     <div className="font-medium">
//                       {i + 1}. {p.name}
//                     </div>
//                     <div className="text-sm text-gray-600">
//                       Wins: {p.wins}{' '}
//                       {typeof p.rating === 'number' && <span className="ml-2">⭐ {p.rating.toFixed(1)}</span>}
//                     </div>
//                   </div>
//                   <div className="text-sm text-gray-600">{p.address}</div>
//                   <div className="text-xs text-gray-500 mt-1">
//                     Price: {priceLabelFromIndex(p._priceIdx)}{' '}
//                     {p.openNow !== undefined ? (p.openNow ? '· Open now' : '· Closed') : ''}
//                   </div>
//                   {p.mapsUri && (
//                     <a
//                       href={p.mapsUri}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="text-blue-600 text-sm underline"
//                     >
//                       View on Google Maps
//                     </a>
//                   )}
//                 </li>
//               ))}
//             </ol>

//             <div className="mt-4 flex items-center justify-end">
//               <button
//                 onClick={() => {
//                   // restart the tournament quickly
//                   if (items.length >= 2) {
//                     setLeaderIdx(0)
//                     setCursor(1)
//                     setFinished(false)
//                   }
//                 }}
//                 className="rounded-md bg-green-600 px-4 py-2 text-white"
//               >
//                 Restart
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// /* ---------------- helpers & small components ---------------- */

// function RestaurantCard({
//   place,
//   onChoose,
//   tag,
// }: {
//   place: Place
//   onChoose: () => void
//   tag?: string
// }) {
//   return (
//     <button
//       onClick={onChoose}
//       className="w-full rounded-xl border p-4 text-left hover:shadow-md transition"
//     >
//       <div className="flex items-center justify-between">
//         <div className="text-lg font-semibold leading-snug">{place.name}</div>
//         {tag && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{tag}</span>}
//       </div>
//       {place.address && <div className="mt-1 text-sm text-gray-600">{place.address}</div>}
//       <div className="mt-1 text-xs text-gray-500">
//         {typeof place.rating === 'number' && <>⭐ {place.rating.toFixed(1)} · </>}
//         Price: {priceLabelFromIndex(place._priceIdx)}
//       </div>
//       {place.openNow !== undefined && (
//         <div className="mt-1 text-xs text-gray-500">{place.openNow ? 'Open now' : 'Closed'}</div>
//       )}
//     </button>
//   )
// }

// function dedupeBy<T>(keyer: (x: T) => string, arr: T[]): T[] {
//   const seen = new Set<string>()
//   const out: T[] = []
//   for (const x of arr) {
//     const k = keyer(x)
//     if (!k || seen.has(k)) continue
//     seen.add(k)
//     out.push(x)
//   }
//   return out
// }



// Swiping algorithm code
'use client'

import { useEffect, useMemo, useState } from 'react'
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
  _priceIdx: number | null // <- REQUIRED; never undefined
}

type LastSearchPayload = {
  picked: { lat: number; lng: number }
  radiusMi: number
  selectedPriceIdx: number | null
  results: Place[]
  savedAt: number
}

type TournamentItem = Place & {
  wins: number
  losses: number
}

const LAST_SEARCH_KEY = 'lastSearch_v1'

function priceLabelFromIndex(idx: number | null): string {
  if (idx == null) return 'N/A'
  return '$'.repeat(idx + 1)
}

export default function SwipePage() {
  const router = useRouter()

  const [payload, setPayload] = useState<LastSearchPayload | null>(null)
  const [items, setItems] = useState<TournamentItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // tournament state
  const [leaderIdx, setLeaderIdx] = useState<number>(0) // index in items of "king of the hill"
  const [cursor, setCursor] = useState<number>(1)       // next challenger index
  const [finished, setFinished] = useState<boolean>(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_SEARCH_KEY)
      if (!raw) {
        setError('No cached results found. Please go back and run a search.')
        return
      }
      const parsed = JSON.parse(raw) as LastSearchPayload
      if (!parsed?.picked || !Array.isArray(parsed?.results)) {
        setError('Saved search is incomplete. Please re-run the search.')
        return
      }

      // Filter out any dupes or missing names just in case
      const deduped = dedupeBy(
        (r) => r.id || `${r.name}|${r.address}`,
        parsed.results
      )

      // Normalize legacy entries that might have _priceIdx === undefined
      const seeded: TournamentItem[] = deduped.map((p) => ({
        ...p,
        _priceIdx: p._priceIdx ?? null,
        wins: 0,
        losses: 0,
      }))

      if (seeded.length < 2) {
        setError('Need at least 2 restaurants to compare. Please widen your search.')
      }

      setPayload(parsed)
      setItems(seeded)
      setLeaderIdx(0)
      setCursor(Math.min(1, Math.max(0, seeded.length - 1)))
    } catch {
      setError('Failed to read saved search. Please re-run the search.')
    }
  }, [])

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

    // winner stays as leader; challenger advances
    const nextCursor = cursor + 1
    setLeaderIdx(winnerIdx)
    if (nextCursor >= items.length) {
      setFinished(true)
    } else {
      setCursor(nextCursor)
    }
  }

  function skipPair() {
    // rotate: send leader to the back, bring next two forward
    if (!havePair) return
    setItems((prev) => {
      if (prev.length < 3) return prev
      const newArr = [...prev]
      const [leader] = newArr.splice(leaderIdx, 1) // remove current leader
      newArr.push(leader) // put it at end
      return newArr
    })
    // reset pointers to first two items
    setLeaderIdx(0)
    setCursor(1)
  }

  function undoLast() {
    // Minimal UX: just step cursor back one (no score rollback)
    if (cursor > 1) setCursor((c) => c - 1)
  }

  const top3 = useMemo(() => {
    if (!finished) return []
    const sorted = [...items].sort((x, y) => {
      // primary: wins desc
      if (y.wins !== x.wins) return y.wins - x.wins
      // tie 1: higher rating first if present
      const xr = x.rating ?? -1
      const yr = y.rating ?? -1
      if (yr !== xr) return yr - xr
      // tie 2: more ratings first if present
      const xrc = (x as any).userRatingCount ?? -1
      const yrc = (y as any).userRatingCount ?? -1
      if (yrc !== xrc) return yrc - xrc
      // tie 3: name asc
      return (x.name || '').localeCompare(y.name || '')
    })
    return sorted.slice(0, 3)
  }, [finished, items])

  return (
    <div className="min-h-screen bg-green-100 text-gray-900 px-4 py-8 flex flex-col items-center">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Which do you prefer?</h1>
          <button
            onClick={() => router.back()}
            className="rounded-md border border-gray-400 px-3 py-1.5 text-sm shadow-sm transform transition duration-150 hover:scale-105 hover:bg-gray-100"
          >
            Back
          </button>
        </div>

        {payload && (
          <p className="text-sm text-gray-700 mt-2">
            Center ({payload.picked.lat.toFixed(4)}, {payload.picked.lng.toFixed(4)}) · radius {payload.radiusMi} mi ·{' '}
            {payload.selectedPriceIdx === null
              ? 'All prices (incl. N/A)'
              : `Price: ${priceLabelFromIndex(payload.selectedPriceIdx)}`}
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-red-300 bg-white p-3 text-sm text-red-700 shadow-sm">
            {error}{' '}
            <button
              onClick={() => router.push('/host/location')}
              className="ml-2 underline hover:opacity-80"
            >
              Go back to Location
            </button>
          </div>
        )}

        {/* Main compare UI */}
        {!error && !finished && havePair && (
        <div className="mt-6 rounded-2xl border border-gray-400 bg-white shadow-sm">
            {/* Card header */}
            <div className="px-5 pt-5">
            <h3 className="text-center text-base font-medium text-gray-800">
                Tap the option you prefer
            </h3>
            </div>

            {/* Choices */}
            <div className="px-5 pb-4 pt-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-stretch">
                {/* Left card */}
                <div className="sm:col-span-1">
                <RestaurantCard
                    place={items[leaderIdx]}
                    onChoose={() => pickWinner('left')}
                    tag="Current"
                />
                </div>

                {/* OR separator */}
                <div className="hidden sm:flex sm:col-span-1 items-center justify-center relative">
                <div className="absolute inset-y-4 left-1/2 -translate-x-1/2 w-px bg-gray-200" />
                <span className="relative rounded-full border border-gray-400 bg-white px-3 py-1 text-sm text-gray-700 shadow-sm">
                    OR
                </span>
                </div>
                {/* Mobile OR */}
                <div className="sm:hidden flex items-center justify-center">
                <span className="rounded-full border border-gray-400 bg-white px-3 py-1 text-sm text-gray-700 shadow-sm">
                    OR
                </span>
                </div>

                {/* Right card */}
                <div className="sm:col-span-1">
                <RestaurantCard
                    place={items[cursor]}
                    onChoose={() => pickWinner('right')}
                    tag="Challenger"
                />
                </div>
            </div>
            </div>

            {/* Footer: actions + progress */}
            <div className="px-5 pb-5">
            <div className="flex items-center justify-between gap-2">
                <button
                onClick={undoLast}
                className="rounded-md border border-gray-400 px-3 py-2 text-sm shadow-sm transform transition duration-150 hover:scale-105 hover:bg-gray-100"
                >
                Undo
                </button>
                <button
                onClick={skipPair}
                className="rounded-md border border-gray-400 px-3 py-2 text-sm shadow-sm transform transition duration-150 hover:scale-105 hover:bg-gray-100"
                >
                Too tough / Skip
                </button>
            </div>

            {/* Progress */}
            {(() => {
                const totalChallengers = Math.max(0, items.length - 1)
                const compared = Math.min(cursor, totalChallengers)
                const pct = totalChallengers ? Math.round((compared / totalChallengers) * 100) : 0
                return (
                <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                        className="h-2 rounded-full bg-green-500 transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                    />
                    </div>
                    <div className="mt-2 text-xs text-gray-600 text-right">
                    {compared} / {totalChallengers} compared · {pct}%
                    </div>
                </div>
                )
            })()}
            </div>
        </div>
        )}


        {/* Finished summary */}
        {finished && (
          <div className="mt-8 rounded-2xl border border-gray-400 p-4 shadow-sm bg-white">
            <h2 className="text-2xl font-semibold">Your Top 3</h2>
            <ol className="mt-4 space-y-3">
              {top3.map((p, i) => (
                <li
                  key={p.id || `${p.name}|${p.address}`}
                  className="rounded-md border border-gray-400 p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {i + 1}. {p.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      Wins: {p.wins}{' '}
                      {typeof p.rating === 'number' && <span className="ml-2">⭐ {p.rating.toFixed(1)}</span>}
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
                      className="text-sm underline"
                    >
                      View on Google Maps
                    </a>
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-5 flex items-center justify-end">
              <button
                onClick={() => {
                  // restart the tournament quickly
                  if (items.length >= 2) {
                    setLeaderIdx(0)
                    setCursor(1)
                    setFinished(false)
                  }
                }}
                className="rounded-md border border-gray-400 px-4 py-2 text-base shadow-sm transform transition duration-150 hover:scale-105 hover:bg-gray-100"
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

/* ---------------- prettier card ---------------- */
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
    <button
      onClick={onChoose}
      className="w-full rounded-xl border border-gray-400 bg-white p-4 text-left shadow-sm
                 transition duration-150 hover:-translate-y-0.5 hover:shadow-md hover:bg-gray-50
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-lg font-semibold leading-snug">{place.name}</div>
        {tag && (
          <span className="shrink-0 rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            {tag}
          </span>
        )}
      </div>

      {place.address && (
        <div className="mt-1 text-sm text-gray-700 flex items-start gap-1">
          <span aria-hidden>📍</span>
          <span>{place.address}</span>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
        {typeof place.rating === 'number' && (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>⭐</span>
            {place.rating.toFixed(1)}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span className="rounded-md border border-gray-300 bg-white px-1.5 py-0.5">
            {priceLabelFromIndex(place._priceIdx)}
          </span>
        </span>
        {place.openNow !== undefined && (
          <span className="inline-flex items-center gap-1">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                place.openNow ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            {place.openNow ? 'Open now' : 'Closed'}
          </span>
        )}
      </div>
    </button>
  )
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
