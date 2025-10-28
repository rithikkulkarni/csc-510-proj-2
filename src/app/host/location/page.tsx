'use client'

import React, { Suspense } from 'react'
import HostLocationForm from '@/components/HostLocationForm'
import { useSearchParams } from 'next/navigation'

function LocationContent() {
  const searchParams = useSearchParams()
  const price = searchParams?.get('price') ?? ''
  return <HostLocationForm price={price} />
}

export default function HostLocationPage() {
  return (
    <div className="min-h-screen bg-green-100 flex flex-col items-center px-4 py-8">
      <Suspense fallback={<p>Loading…</p>}>
        <LocationContent />
      </Suspense>
    </div>
  )
}
