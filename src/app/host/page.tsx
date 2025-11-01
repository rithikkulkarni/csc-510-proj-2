/*'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/BackButton';

const priceOptions = [
  { idx: 0, label: '$ (Inexpensive)' },
  { idx: 1, label: '$$ (Moderate)' },
  { idx: 2, label: '$$$ (Expensive)' },
  { idx: 3, label: '$$$$ (Very Expensive)' },
];

export default function Host() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-green-100 flex flex-col items-center px-4 py-8">
      <BackButton />

      <main className="flex min-h-[80vh] flex-col items-center justify-center gap-6">
        <h1 className="text-2xl font-semibold">Select a Price Range</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {priceOptions.map((p) => (
            <button
              key={p.idx}
              className="w-64 rounded-md border border-gray-400 px-6 py-3 text-lg font-medium shadow-sm cursor-pointer transform transition duration-150 hover:scale-105 hover:bg-gray-100"
              onClick={() => router.push(`/host/location?priceIdx=${p.idx}`)}
              aria-label={`Select price range ${p.label}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
*/
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HostPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/host/location'); // redirect immediately
  }, [router]);

  return <div className="p-6 text-gray-600">Redirecting to location selection…</div>;
}
