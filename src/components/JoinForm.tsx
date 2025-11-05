/**
 * JoinForm Component
 *
 * Allows a user to join a session by entering a session code and their name.
 * Handles both active and expired sessions.
 *
 * Props:
 * - inputClassName?: string — optional Tailwind classes to override default input styling
 * - buttonClassName?: string — optional Tailwind classes to override default button styling
 *
 * State:
 * - code: string — session code input by the user
 * - name: string — user's name input
 * - message: string | null — feedback/error messages displayed below inputs
 * - loading: boolean — tracks whether an API request is in progress
 * - sessionExpired: boolean — indicates if the session is expired
 * - lastRestaurantId: number | null — stores the winning restaurant ID for expired sessions
 *
 * Behavior:
 * - Sanitizes session code input (letters only, uppercase, max 4 chars)
 * - Validates required fields before submitting
 * - Queries Supabase to:
 *     - Verify session existence
 *     - Check session expiration
 *     - Fetch restaurants for active sessions
 *     - Create a new user if one does not exist
 *     - Compute the last-vote restaurant if session expired
 * - Navigates to:
 *     - `/host/swipe` for active sessions
 *     - `/host/results` for expired sessions
 *
 * Notes:
 * - Uses `useRouter` from Next.js App Router for navigation
 * - Uses `data-testid` attributes for reliable testing
 * - Handles API errors gracefully and shows user-friendly messages
 */

'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

type JoinFormProps = {
  inputClassName?: string;
  buttonClassName?: string;
};

export default function JoinForm({ inputClassName, buttonClassName }: JoinFormProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [lastRestaurantId, setLastRestaurantId] = useState<number | null>(null);

  const router = useRouter();

  const inputClasses =
    inputClassName ??
    'w-full rounded-lg border border-gray-300 bg-white px-5 py-3 text-lg shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 transition transform duration-150';
  const buttonClasses =
    buttonClassName ??
    'w-full rounded-2xl bg-green-800 text-white font-bold text-lg py-4 shadow-md hover:bg-green-900 transition transform duration-150 hover:scale-105';

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
      .slice(0, 4);
    setCode(filtered);
    setMessage(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.slice(0, 30));
    setMessage(null);
  };

  const handleJoin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code) {
      setMessage('Please enter the session code.');
      return;
    }
    if (!sessionExpired && !name) {
      setMessage('Please enter your name.');
      return;
    }

    setLoading(true);

    try {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .single();

      if (!session || sessionError) {
        setMessage('Invalid session code.');
        setLoading(false);
        return;
      }

      if (session.ends_at) {
        const now = new Date();
        const endsAt = new Date(session.ends_at + 'Z');
        if (now >= endsAt) {
          setMessage('This session has expired.');
          setSessionExpired(true);

          const { data: votesData } = await supabase
            .from('votes')
            .select('restaurant_id, user_id, created_at')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false });

          if (votesData && votesData.length > 0) {
            const lastVoteMap: Record<number, number> = {};
            votesData.forEach((v) => {
              if (!lastVoteMap[v.user_id]) lastVoteMap[v.user_id] = v.restaurant_id;
            });

            const countMap: Record<number, number> = {};
            Object.values(lastVoteMap).forEach((rid) => {
              countMap[rid] = (countMap[rid] || 0) + 1;
            });

            const sorted = Object.entries(countMap)
              .sort(([, a], [, b]) => b - a)
              .map(([rid]) => Number(rid));

            if (sorted.length > 0) setLastRestaurantId(sorted[0]);
          }

          setLoading(false);
          return;
        }
      }

      const { data: restaurants, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('session_id', session.id);

      if (restError || !restaurants?.length) {
        setMessage('Session is not ready yet. Please try again.');
        setLoading(false);
        return;
      }

      let { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('session_id', session.id)
        .eq('name', name)
        .single();

      if (!user) {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{ name, session_id: session.id }])
          .select()
          .single();

        if (insertError || !newUser) {
          setMessage('Error creating user.');
          setLoading(false);
          return;
        }
        user = newUser;
      }

      router.push(`/host/swipe?session=${encodeURIComponent(session.code)}&user=${user.id}`);
    } catch (err: any) {
      console.error('Error joining session:', err);
      setMessage('Failed to join session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = () => {
    if (!code || !lastRestaurantId) return;
    router.push(`/host/results?session=${encodeURIComponent(code)}&last=${lastRestaurantId}`);
  };

  return (
    <form
      onSubmit={handleJoin}
      className="flex flex-col w-full gap-4 bg-white p-6 rounded-2xl transition-all duration-150"
    >
      {!sessionExpired && (
        <input
          data-testid="join-name-input"
          name="name"
          type="text"
          placeholder="Enter Your Name"
          value={name}
          onChange={handleNameChange}
          className={inputClasses}
        />
      )}

      <input
        data-testid="join-code-input"
        name="code"
        type="text"
        placeholder="Enter Session Code"
        maxLength={4}
        value={code}
        onChange={handleCodeChange}
        className={inputClasses}
      />

      {/* Join Button */}
      {!sessionExpired && (
        <button
          data-testid="join-button"
          type="submit"
          disabled={loading}
          className={`w-full mt-2 rounded-2xl bg-green-700 text-white font-bold text-lg py-4 shadow-md hover:shadow-lg hover:bg-green-800 active:scale-95 transition-transform duration-150 ${buttonClassName ?? ''}`}
        >
          {loading ? 'Joining...' : 'Join Session'}
        </button>
      )}

      {/* View Results Button */}
      {sessionExpired && (
        <button
          data-testid="view-results-button"
          type="button"
          onClick={handleViewResults}
          className={`w-full mt-2 rounded-2xl bg-yellow-400 text-green-900 font-bold text-lg py-4 shadow-md border border-yellow-500 hover:bg-yellow-300 active:scale-95 transition-transform duration-150 flex items-center justify-center gap-2 ${buttonClassName ?? ''}`}
          disabled={loading}
        >
          View Results
        </button>
      )}

      {message && (
        <p data-testid="join-message" className="text-red-600 font-medium mt-2">
          {message}
        </p>
      )}
    </form>
  );
}
