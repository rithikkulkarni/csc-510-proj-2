// ./src/app/host/results/page.tsx
import { Suspense } from 'react';
import React from 'react';
import ResultsPageClient from './ResultsPageClient';

export const dynamic = 'force-dynamic'; // Ensures dynamic rendering (no static prerender)

/**
 * ResultsPage
 *
 * Server component wrapper for the session results view.
 * Renders the client-side `ResultsPageClient` inside a React `Suspense`
 * boundary so a lightweight fallback can appear during hydration/data fetch.
 *
 * @example
 * export default function Page() {
 *   return <ResultsPage />;
 * }
 */
export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading results…</div>}>
      <ResultsPageClient />
    </Suspense>
  );
}
