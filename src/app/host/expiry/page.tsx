// app/host/expiry/page.tsx
'use client'

import HostExpiryForm from '@/components/HostExpiryForm'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

export default function HostExpiryPage() {
  const searchParams = useSearchParams()

  // Memoize parsed values so they don't recalc on every render
  const { price, lat, lng, radiusMiles } = useMemo(() => {
    const p = searchParams?.get('price') ?? ''
    const latVal = Number(searchParams?.get('lat') ?? '0')
    const lngVal = Number(searchParams?.get('lng') ?? '0')
    let radius = Number(searchParams?.get('radiusMiles') ?? '5')
    if (radius <= 0) radius = 5

    return { price: p, lat: latVal, lng: lngVal, radiusMiles: radius }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-green-100 flex flex-col items-center px-4 py-8">
      {/* Page Title */}
      <h1 className="text-4xl md:text-5xl font-extrabold text-black mb-2 text-center">
        Set Expiration
      </h1>
      <p className="text-black text-lg md:text-xl mb-8 text-center">
        Choose how long this session will be valid for
      </p>

      {/* Form card */}
      <div className="w-full max-w-md rounded-2xl bg-yellow-50 p-6 shadow-md">
        <HostExpiryForm price={price} lat={lat} lng={lng} radiusMiles={radiusMiles} />
      </div>
    </div>
  )
}
