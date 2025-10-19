'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { BackButton } from '@/components/BackButton'

const Map = dynamic(() => import('./parts/LeafletMap'), { ssr: false })

export default function HostLocationPage() {
  const sp = useSearchParams()
  const router = useRouter()
  const price = sp.get('price') ?? ''

  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [radiusMiles, setRadiusMiles] = useState(5)

  const disabled = useMemo(() => !price || !latLng || radiusMiles <= 0, [price, latLng, radiusMiles])

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <BackButton />
      
      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold text-center">Choose Location & Radius</h1>

        <div className="rounded-xl border overflow-hidden">
          {/* Click to drop/move pin */}
          <Map onPick={setLatLng} picked={latLng} />
        </div>

        <div className="flex items-center gap-3 justify-center">
          <label className="text-sm">Radius (miles)</label>
          <input
            type="number"
            min={1}
            className="w-24 rounded-md border px-3 py-2"
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(parseInt(e.target.value || '0', 10))}
          />
        </div>

        <div className="flex justify-center">
          <button
            disabled={disabled}
            className={`rounded-md px-6 py-3 text-white ${disabled ? 'bg-gray-300' : 'bg-green-600 hover:bg-green-700 cursor-pointer transform transition duration-150 hover:scale-105 hover:bg-gray-300'}`}
            onClick={() => {
              if (!latLng) return
              const q = new URLSearchParams({
                price,
                lat: String(latLng.lat),
                lng: String(latLng.lng),
                radiusMiles: String(radiusMiles),
              })
              router.push(`/host/expiry?${q.toString()}`)
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  )
}