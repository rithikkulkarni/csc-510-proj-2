'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function HostPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/host/location'); // redirect immediately
  }, [router]);

  return <div className="p-6 text-gray-600">Redirecting to location selection…</div>;
}
