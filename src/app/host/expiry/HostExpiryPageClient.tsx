'use client';

import React from 'react';
import HostExpiryForm from '@/components/HostExpiryForm';
import { useSearchParams } from 'next/navigation';

export default function HostExpiryPageClient() {
  const searchParams = useSearchParams();

  const price = searchParams?.get('price') ?? '';
  const lat = Number(searchParams?.get('lat') ?? '0');
  const lng = Number(searchParams?.get('lng') ?? '0');
  let radiusMiles = Number(searchParams?.get('radiusMiles') ?? '5');
  if (radiusMiles <= 0) radiusMiles = 5;

  return (
    <div className="min-h-screen bg-green-100 flex flex-col items-center px-4 py-8">
      <h1 className="text-4xl md:text-5xl font-extrabold text-black mb-2 text-center">
        Set Expiration
      </h1>
      <p className="text-black text-lg md:text-xl mb-8 text-center">
        Choose how long this session will be valid for
      </p>

      <div className="w-full max-w-md rounded-2xl bg-yellow-50 p-6 shadow-md">
        <HostExpiryForm price={price} lat={lat} lng={lng} radiusMiles={radiusMiles} />
      </div>
    </div>
  );
}
