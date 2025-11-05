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
// BackButton.tsx
import Link from 'next/link';

export function BackButton({ className }: { className?: string }) {
  return (
    <Link href="/" className={className}>
      Return Home
    </Link>
  );
}
