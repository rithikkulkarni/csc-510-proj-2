// ./src/app/host/swipe/page.tsx
'use client'; // optional here if you want full client behavior; normally not needed for Suspense wrapper

import { Suspense } from 'react';
import SwipePage from './SwipePage';

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading session...</div>}>
      <SwipePage />
    </Suspense>
  );
}
