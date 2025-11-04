'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';

/**
 * HostPageRedirect
 *
 * Simple redirect component for the host flow.
 * Automatically navigates users from `/host` to `/host/location`
 * when the page mounts, ensuring the correct entry point for the hosting process.
 *
 * @example
 * export default function Page() {
 *   return <HostPageRedirect />;
 * }
 */
export default function HostPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/host/location'); // Redirect immediately on mount
  }, [router]);

  return <div className="p-6 text-gray-600">Redirecting to location selection…</div>;
}
