import { Suspense } from 'react';
import ConfirmPageClient from './ConfirmPageClient';

export const dynamic = 'force-dynamic'; // 👈 important line

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmPageClient />
    </Suspense>
  );
}
