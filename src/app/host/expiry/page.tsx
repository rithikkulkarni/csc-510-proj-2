'use client'

import HostExpiryForm from '@/components/HostExpiryForm'
import React from 'react';

export default function HostExpiryPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const price = searchParams.price ?? ''
  const lat = Number(searchParams.lat ?? '0')
  const lng = Number(searchParams.lng ?? '0')
  const radiusMiles = Number(searchParams.radiusMiles ?? '0')

  return <HostExpiryForm price={price} lat={lat} lng={lng} radiusMiles={radiusMiles} />
}