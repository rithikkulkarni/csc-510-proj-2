'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function ConfirmPageClient() {
  const searchParams = useSearchParams();
  const sessionCode = searchParams.get('session');
  const userId = searchParams.get('user');

  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      if (!sessionCode || !userId) {
        setError('Missing session code or user ID.');
        return;
      }
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', sessionCode)
        .single();
      setSessionData(session);
    }
    fetchSession();
  }, [sessionCode, userId]);

  if (error) return <div className="text-red-600 mt-4">{error}</div>;

  return (
    <div className="min-h-screen flex items-center justify-center">
      {sessionData ? (
        <div>Session confirmed: {sessionCode}</div>
      ) : (
        <div>Loading session data...</div>
      )}
    </div>
  );
}
