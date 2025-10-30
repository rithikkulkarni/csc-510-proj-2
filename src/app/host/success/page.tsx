import { Suspense } from 'react';
import HostSuccessPageClient from './HostSuccessPageClient';

export default function HostSuccessPage() {
  return (
    <Suspense fallback={<p>Loading session details...</p>}>
      <HostSuccessPageClient />
    </Suspense>
  );
}
