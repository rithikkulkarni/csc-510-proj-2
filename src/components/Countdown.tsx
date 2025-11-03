'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  /** ISO timestamp defining when the countdown ends */
  expiresAt?: string | null;
};

/**
 * Countdown Component
 *
 * Displays the remaining time until the given `expiresAt` timestamp
 * and updates every second. Shows `"—"` if no timestamp is provided
 * and `"expired"` when the time has passed.
 *
 * @example
 * <Countdown expiresAt="2025-05-01T18:30:00Z" />
 */
export default function Countdown({ expiresAt }: Props) {
  // Tracks current time; lazy init avoids calling Date.now() during render
  const [now, setNow] = useState(() => Date.now());

  // Update clock every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Calculate HH:MM:SS remaining, memoized for performance
  const remaining = useMemo(() => {
    if (!expiresAt) return '—';
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return 'expired';

    const h = Math.floor(diff / 3600_000);
    const m = Math.floor((diff % 3600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    return `${h}h ${m}m ${s}s`;
  }, [expiresAt, now]);

  return <span className="font-medium text-gray-900">{remaining}</span>;
}

