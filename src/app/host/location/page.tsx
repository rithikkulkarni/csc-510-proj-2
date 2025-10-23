// app/host/location/page.tsx
'use client'

import HostLocationForm from '@/components/HostLocationForm'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

export default function HostLocationPage() {
  const searchParams = useSearchParams()

  // Safely unwrap searchParams
  const price = useMemo(() => searchParams?.get('price') ?? '', [searchParams])

  return (
    <div className="min-h-screen bg-green-100 flex flex-col items-center px-4 py-8">
      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-extrabold text-black mb-2 text-center">
        Select Location
      </h1>
      <p className="text-black text-lg md:text-xl mb-8 text-center">
        Choose where your session will be available
      </p>

      {/* Form */}
      <div className="w-full max-w-3xl rounded-2xl bg-yellow-50 p-6 shadow-md">
        <HostLocationForm price={price} />
      </div>
    </div>
  )
}
