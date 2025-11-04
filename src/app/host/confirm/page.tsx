import { Suspense } from 'react';
import ConfirmPageClient from './ConfirmPageClient';

export const dynamic = 'force-dynamic'; // Ensures this route is rendered dynamically at runtime

/**
 * ConfirmPage
 *
 * Server component wrapper for the confirmation step of the host flow.
 * It loads the client-side component (`ConfirmPageClient`) inside a React
 * `Suspense` boundary, allowing for asynchronous rendering while showing
 * a fallback during client-side hydration or data loading.
 *
 * @example
 * export default function Page() {
 *   return <ConfirmPage />;
 * }
 */
export default function ConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmPageClient />
    </Suspense>
  );
}
