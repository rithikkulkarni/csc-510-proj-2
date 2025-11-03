'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { BackButton } from '@/components/BackButton';
import React from 'react';

const Map = dynamic(() => import('@/app/host/location/parts/LeafletMap'), { ssr: false });

type Props = {
  /** Price filter key (e.g., 'ALL', '1', '2', '3', '4') */
  price: string;
};

/**
 * HostLocationForm
 *
 * Lets the host pick a map location and radius before continuing to the expiry step.
 * Disables the "Continue" button until a location and valid radius are selected.
 *
 * Flow:
 * - User picks a point on the map (lat/lng)
 * - User sets a radius in miles (>= 1)
 * - On continue, navigates to `/host/expiry` with query params
 *
 * @example
 * <HostLocationForm price="ALL" />
 */
export default function HostLocationForm({ price }: Props) {
  const router = useRouter();

  // Selected center point from the map and search radius in miles
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusMiles, setRadiusMiles] = useState(5);

  // Disable continue if required inputs are missing/invalid
  const disabled = useMemo(
    () => !price || !latLng || radiusMiles <= 0,
    [price, latLng, radiusMiles]
  );

  return (
    <main className="flex flex-col items-center gap-6 w-full max-w-4x1">
      <BackButton />

      {/* Map: user picks location; LeafletMap calls onPick with {lat,lng} */}
      <div className="w-full h-80 rounded-lg border overflow-hidden mb-4">
        <Map onPick={setLatLng} picked={latLng} />
      </div>

      {/* Radius input (miles), clamped to minimum of 1 */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-black font-medium">Radius (miles)</label>
        <input
          type="number"
          min={1}
          className="w-24 rounded-md border border-gray-300 px-3 py-2 bg-white text-black"
          value={radiusMiles}
          onChange={(e) => {
            const value = parseInt(e.target.value || '0', 10);
            setRadiusMiles(Math.max(1, value));
          }}
        />
      </div>

      {/* Continue */}
      <button
        disabled={disabled}
        className={`w-full rounded-2xl py-3 font-bold text-white ${
          disabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-800 hover:bg-green-900'
        }`}
        onClick={() => {
          if (!latLng) return;
          router.push(
            `/host/expiry?price=${encodeURIComponent(price)}&lat=${latLng.lat}&lng=${latLng.lng}&radiusMiles=${radiusMiles}`
          );
        }}
      >
        Continue
      </button>
    </main>
  );
}

