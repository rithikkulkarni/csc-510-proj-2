"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BackButton } from '@/components/BackButton'

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

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const expiresAt = new Date(Date.now() + hours * 3600_000).toISOString()
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiresAt,
          payload: {
            price,
            location: { lat, lng },
            radiusMiles,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create session')

      router.replace(`/host/success?code=${encodeURIComponent(data.code)}&expiresAt=${encodeURIComponent(data.expiresAt)}`)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const disabled = !price || !lat || !lng || !radiusMiles || hours <= 0

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <BackButton />
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center">Set Expiration</h1>
        <div className="flex items-center justify-center gap-3">
          <label className="text-sm">Valid for (hours)</label>
          <input
            type="number"
            min={1}
            max={24}
            className="w-24 rounded-md border px-3 py-2"
            value={hours}
            onChange={(e) => {
              const val = parseInt(e.target.value || '0', 10)
              setHours(Math.min(val, 24))
            }}
          />
          {hours > 24 && (
            <p className="text-sm text-amber-600">Maximum 24 hours allowed</p>
          )}
        </div>
        {error && <p className="text-center text-red-600">{error}</p>}
        <div className="flex justify-center">
          <button
            disabled={disabled || loading}
            onClick={handleCreate}
            className={`rounded-md px-6 py-3 text-white ${disabled || loading ? 'bg-gray-300' : 'bg-green-600 hover:bg-green-700  cursor-pointer transform transition duration-150 hover:scale-105 hover:bg-gray-300/90'}`}
          >
            {loading ? 'Creating…' : 'Create Session'}
          </button>
        </div>
      </div>
    </main>
  )
}
