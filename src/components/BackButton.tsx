'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import React from 'react';

/**
 * BackButton Component
 *
 * A reusable UI button that navigates the user back to the previous page
 * using Next.js router history.
 *
 * Usage:
 * ```tsx
 * <BackButton />
 * ```
 *
 * Behavior:
 * - Calls `router.back()` on click
 * - Styled as a floating rounded button positioned top-left on screens
 */
export function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      className="absolute top-8 left-8 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 shadow-sm text-gray-700 hover:bg-gray-100 hover:scale-105 transition"
      onClick={() => router.back()}
    >
      <ArrowLeft className="h-5 w-5" />
      <span>Back</span>
    </Button>
  );
}
