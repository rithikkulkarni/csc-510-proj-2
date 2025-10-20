'use client'

import HostLocationForm from '@/components/HostLocationForm'

export default function HostLocationPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const price = searchParams.price ?? ''

  return <HostLocationForm price={price} />
}