import { Suspense } from 'react';
import React from 'react';
import ResultsPageClient from './ResultsPageClient';

export const dynamic = 'force-dynamic'; // 👈 disables static prerender

export default function ResultsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultsPageClient />
    </Suspense>
  );
}
