import React from 'react';
import { Suspense } from 'react';
import HostExpiryPageClient from './HostExpiryPageClient';

export default function HostExpiryPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <HostExpiryPageClient />
    </Suspense>
  );
}
