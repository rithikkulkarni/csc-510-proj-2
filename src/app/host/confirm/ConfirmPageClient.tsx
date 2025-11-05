'use client';

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

/**
 * ConfirmPageClient
 *
 * Client-side join flow after a host creates a session.
 * Responsibilities:
 * - Read `session` code from search params
 * - Fetch session details from Supabase on mount
 * - Display expiration info and live countdown if provided
 * - Allow a participant to enter their name and join the session
 * - Auto-redirect expired sessions directly to the Results page
 *
 * Behavior:
 * - If the name already exists → prompt user to choose a different display name
 * - If restaurants are not yet loaded for the session → show “not ready yet” messaging
 *
 * Routing outcomes:
 * ✅ Active session → `/host/swipe?session=<code>&user=<id>`
 * ✅ Expired session → `/host/results?session=<code>`
 *
 * @component
 */
export default function ConfirmPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Cache initial param value → avoid flicker when searchParams updates
  const initialCode = useMemo(() => searchParams.get('session') ?? '', [searchParams]);
  const [code] = useState(initialCode);

  const [name, setName] = useState('');
  const [sessionData, setSessionData] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Expiry tracking
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  /**
   * Fetch the session row once the code is known.
   * Handles:
   * - Missing / invalid session code
   * - Session not found
   * - Expired session at time of load
   */
  useEffect(() => {
    async function fetchSession() {
      if (!code) {
        setMessage('Missing session code.');
        setExpired(true);
        return;
      }

      const { data: session, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .single();

      if (error || !session) {
        setMessage('Session not found.');
        setExpired(true);
        return;
      }

      // Convert DB timestamp to JS Date (force UTC)
      if (session.ends_at) {
        const ends = new Date(session.ends_at + 'Z');
        setExpiresAt(ends);

        if (new Date() > ends) {
          setExpired(true);
          setMessage('This session has expired.');
        }
      }

      setSessionData(session);
    }

    fetchSession();
  }, [code]);

  /**
   * Live countdown timer recalculated every second.
   * Automatically marks expired state when timer reaches zero.
   */
  useEffect(() => {
    if (!expiresAt) return;

    function updateCountdown(ends: Date) {
      const diff = ends.getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft('Expired');
        setExpired(true);
        setMessage('This session has expired.');
        return;
      }

      const hours = Math.floor(diff / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }

    updateCountdown(expiresAt);
    const interval = setInterval(() => updateCountdown(expiresAt), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  /**
   * Submit handler:
   * - If expired → bypass join and view results immediately
   * - Validate restaurants exist + name uniqueness
   * - Insert user into Supabase → navigate to swipe page
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionData) return;

    if (expired) {
      router.push(`/host/results?session=${encodeURIComponent(sessionData.code)}`);
      return;
    }

    if (!name.trim()) {
      setMessage('Please enter your name.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: restaurants, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('session_id', sessionData.id);

      if (restError || !restaurants?.length) {
        setMessage('Session is not ready yet. Please try again.');
        setLoading(false);
        return;
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('session_id', sessionData.id)
        .eq('name', name.trim())
        .single();

      if (existingUser) {
        setMessage('Another user is already using this name. Please choose a different name.');
        setLoading(false);
        return;
      }

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{ name: name.trim(), session_id: sessionData.id }])
        .select()
        .single();

      if (insertError || !newUser) {
        setMessage('Error creating user.');
        setLoading(false);
        return;
      }

      router.push(
        `/host/swipe?session=${encodeURIComponent(sessionData.code)}&user=${encodeURIComponent(
          newUser.id
        )}`
      );
    } catch (err) {
      console.error(err);
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-green-100 flex flex-col items-center px-4 py-8">
      <h1 className="text-4xl md:text-5xl font-extrabold text-black mb-2 text-center">
        Session Confirmed
      </h1>
      <p className="text-black text-lg md:text-xl mb-8 text-center">
        Share this code with your group so they can join
      </p>

      {sessionData ? (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-yellow-50 rounded-2xl p-6 shadow-md flex flex-col items-center gap-6"
        >
          <p className="text-2xl font-bold text-black">Session Code</p>
          <input
            type="text"
            value={sessionData.code}
            readOnly
            className="w-full text-center text-5xl font-mono font-bold text-black bg-white px-6 py-3 rounded-lg shadow-sm cursor-not-allowed"
          />

          {expiresAt && (
            <div className="text-center">
              <p className="text-lg text-black">
                Expires at:{' '}
                <span className="font-semibold">
                  {expiresAt.toLocaleString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </p>

              {!expired && (
                <p className="text-green-700 font-bold text-xl">Time remaining: {timeLeft}</p>
              )}
            </div>
          )}

          <input
            type="text"
            placeholder="Enter Your Name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            disabled={expired}
            className={`w-full rounded-lg border border-gray-300 bg-white px-5 py-3 text-lg text-black shadow-sm placeholder:text-gray-400
                        focus:outline-none focus:ring-2 focus:ring-green-300 focus:shadow-lg transition transform duration-200 hover:scale-105
                        ${expired ? 'bg-gray-200 cursor-not-allowed' : ''}`}
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${
              expired
                ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
                : 'bg-green-800 hover:bg-green-900'
            } text-white font-bold py-3 px-6 rounded-2xl shadow-md transition transform duration-150 hover:scale-105 cursor-pointer`}
          >
            {loading ? 'Joining...' : expired ? 'View Results' : 'Join Session'}
          </button>

          {message && <p className="text-red-600 font-medium mt-2 text-center">{message}</p>}
        </form>
      ) : (
        <div className="text-black text-lg">Loading session data...</div>
      )}
    </main>
  );
}
