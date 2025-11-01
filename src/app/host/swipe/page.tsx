'use client';

import { Suspense } from 'react';
import SwipePage from './SwipePage';

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading session...</div>}>
      <SwipePage />
    </Suspense>
  );
}
