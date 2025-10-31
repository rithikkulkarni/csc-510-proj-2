'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  expiresAt?: string | null;
};

export default function Countdown({ expiresAt }: Props) {
  // Lazy initializer avoids calling Date.now() during render
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
