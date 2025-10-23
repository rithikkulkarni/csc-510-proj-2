'use client'

import HostLocationForm from '@/components/HostLocationForm'
import React from 'react'

export default function HostLocationPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const price = searchParams.price ?? ''

  return <HostLocationForm price={price} />
}