'use client';

import { Suspense } from 'react';
import SwipePage from './SwipePage';

/**
 * Page
 *
 * Entry point for the swiping interface.
 * Wraps the client-side `SwipePage` component in a React `Suspense`
 * boundary to handle loading states gracefully while session data initializes.
 *
 * @example
 * export default function Page() {
 *   return <Page />;
 * }
 */
export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading session...</div>}>
      <SwipePage />
    </Suspense>
  );
}
