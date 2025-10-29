'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { generateCode } from '@/lib/sessionCode'

export default function HostConfirmPage() {
  const sp = useSearchParams()
  const router = useRouter()

  const priceIdx = useMemo(() => {
    const v = sp.get('priceIdx')
    if (v === null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }, [sp])

  const lat = Number(sp.get('lat') ?? '0')
  const lng = Number(sp.get('lng') ?? '0')
  const radiusMiles = Math.max(1, Number(sp.get('radiusMiles') ?? '3'))

  const [code, setCode] = useState<string | null>(null)

  // Create the session code and persist constraints (client-side for now)
  useEffect(() => {
    const c = generateCode(4)
    const payload = { priceIdx, lat, lng, radiusMiles }
    try {
    localStorage.setItem(`session:${c}`, JSON.stringify(payload))
      setCode(c)
    } catch (e) {
      console.error('Failed saving session', e)
    }
  }, [priceIdx, lat, lng, radiusMiles])

  return (
    <main className="min-h-screen bg-yellow-50">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-extrabold mb-2">Session Created</h1>
        <p className="text-gray-700 mb-6">
          Share this code with your group. When ready, join the session to load restaurants
          that match the chosen price and radius.
        </p>

        <div className="rounded-2xl bg-white border p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Code</div>
          <div className="text-5xl font-black tracking-widest mb-6">
            {code ?? '----'}
          </div>

          <button
            disabled={!code}
            className="w-full rounded-2xl bg-green-800 text-white font-bold py-3 hover:bg-green-900 disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={() => code && router.push(`/session/${code}`)}
          >
            Join Session
          </button>
        </div>
      </div>
    </main>
  )
}