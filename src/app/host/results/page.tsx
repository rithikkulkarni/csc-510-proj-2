// ./src/app/host/results/page.tsx
import { Suspense } from 'react';
import ResultsPageClient from './ResultsPageClient';

export const dynamic = 'force-dynamic'; // disables static prerender

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading results…</div>}>
      <ResultsPageClient />
    </Suspense>
  );
}
