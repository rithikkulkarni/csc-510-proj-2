'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

function useCountdown(expiresAtIso: string | null) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return useMemo(() => {
    if (!expiresAtIso) return '—'
    const diff = new Date(expiresAtIso).getTime() - now
    if (diff <= 0) return 'expired'
    const h = Math.floor(diff / 3600_000)
    const m = Math.floor((diff % 3600_000) / 60_000)
    const s = Math.floor((diff % 60_000) / 1000)
    return `${h}h ${m}m ${s}s`
  }, [expiresAtIso, now])
}

export default function HostSuccessPage() {
  const sp = useSearchParams()
  const code = sp.get('code') ?? ''
  const expiresAt = sp.get('expiresAt')
  const remaining = useCountdown(expiresAt)

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Session Created</h1>
        <div className="text-5xl font-bold tracking-widest">{code || '— — — —'}</div>
        <p className="text-gray-600">Expires in: <span className="font-medium text-gray-900">{remaining}</span></p>

        <div className="space-y-2">
          <p>Share this code with participants. They'll join using the Home → <em>Join</em> form.</p>
          <p className="text-sm text-gray-500">When the code expires, the session will no longer be available.</p>
        </div>
      </div>
    </main>
  )
}