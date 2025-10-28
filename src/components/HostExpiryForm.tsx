'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BackButton } from '@/components/BackButton'
import React from 'react'

type Props = {
  price: string
  lat: number
  lng: number
  radiusMiles: number
}

export default function HostExpiryForm({ price, lat, lng, radiusMiles }: Props) {
  const router = useRouter()
  const [hours, setHours] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disabled = !price || !lat || !lng || hours <= 0

  const handleCreate = async () => {
    if (disabled) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price, location: { lat, lng }, hours, radiusMiles }),
      })

      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Server returned invalid JSON: ' + text)
      }

      if (!res.ok) throw new Error(data?.error || 'Failed to create session')

      const expiresAt =
        data.expiresAt ?? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

      router.replace(
        `/host/success?code=${encodeURIComponent(data.code)}&expiresAt=${encodeURIComponent(
          expiresAt
        )}`
      )
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-col items-center gap-6">
      <BackButton />

      <div className="flex flex-col gap-6 w-full max-w-md">
        {/* Hours input */}
        <div className="flex items-center justify-center gap-3">
          <label className="text-black font-medium">Valid for (hours)</label>
          <input
            type="number"
            min={1}
            max={24}
            className="w-24 rounded-md border border-gray-300 px-3 py-2 bg-white text-black"
            value={hours}
            onChange={(e) => {
              let val = parseInt(e.target.value || '1', 10)
              val = Math.max(1, Math.min(val, 24))
              setHours(val)
            }}
          />
        </div>

        {/* Error message */}
        {error && <p className="text-red-600 text-center">{error}</p>}

        {/* Create session button */}
        <button
          disabled={disabled || loading}
          onClick={handleCreate}
          className={`w-full rounded-2xl py-3 font-bold text-white ${disabled || loading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-green-800 hover:bg-green-900'
            }`}
        >
          {loading ? 'Creating…' : 'Create Session'}
        </button>
      </div>
    </main>
  )
}
