// ./src/app/confirm/page.tsx
import { Suspense } from 'react';
import ConfirmPageClient from './ConfirmPageClient';

export const dynamic = 'force-dynamic';

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmPageClient />
    </Suspense>
  );
}
