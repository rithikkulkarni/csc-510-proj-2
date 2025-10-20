'use client'

import Countdown from '@/components/Countdown'

export default function HostSuccessPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const code = searchParams.code ?? ''
  const expiresAt = searchParams.expiresAt

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Session Created</h1>
        <div className="text-5xl font-bold tracking-widest">{code || '— — — —'}</div>
        <p className="text-gray-600">Expires in: <Countdown expiresAt={expiresAt} /></p>

        <div className="space-y-2">
          <p>Share this code with participants. They'll join using the Home → <em>Join</em> form.</p>
          <p className="text-sm text-gray-500">When the code expires, the session will no longer be available.</p>
        </div>
      </div>
    </main>
  )
}