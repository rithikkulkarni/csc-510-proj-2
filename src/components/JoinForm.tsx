'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

type JoinFormProps = {
  /** Optional extra classes for the session code & name inputs */
  inputClassName?: string;
  /** Optional extra classes for the submit button */
  buttonClassName?: string;
};

/**
 * JoinForm
 *
 * Lets a participant join an active session using a 4-letter code and a display name.
 * If the session is expired, the form switches to a “View Results” mode that derives
 * a “last-vote winner” restaurant (per-user most recent vote) and links to results.
 *
 * UX:
 * - Code is normalized to A–Z, uppercased, max 4 chars.
 * - Name required unless session is expired.
 * - Displays lightweight error messaging on validation/DB errors.
 *
 * @example
 * <JoinForm />
 */
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

  // Normalize code to 4 uppercase letters
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
      .slice(0, 4);
    setCode(filtered);
    setMessage(null);
  };

  // Clamp name length to 30 characters
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.slice(0, 30));
    setMessage(null);
  };

  // Join active session; if expired, switch to results mode and compute “last-vote winner”
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
      // 1) Look up session by code
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

      // 2) If expired, compute last-vote winner then allow “View Results”
      if (session.ends_at) {
        const now = new Date();
        // Ensure consistent UTC comparison; append 'Z' if backend stores naive UTC
        const endsAt = new Date(session.ends_at + 'Z');
        if (now > endsAt) {
          setMessage('This session has expired.');
          setSessionExpired(true);

          // Pull all votes, newest first, then take each user's most recent vote
          const { data: votesData } = await supabase
            .from('votes')
            .select('restaurant_id, user_id, created_at')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false });

          if (votesData && votesData.length > 0) {
            const lastVoteMap: Record<number, number> = {}; // user_id -> restaurant_id (latest only)
            votesData.forEach((v) => {
              if (!lastVoteMap[v.user_id]) lastVoteMap[v.user_id] = v.restaurant_id;
            });

            // Count per-restaurant last-votes
            const countMap: Record<number, number> = {};
            Object.values(lastVoteMap).forEach((rid) => {
              countMap[rid] = (countMap[rid] || 0) + 1;
            });

            // Winner = restaurant with highest last-vote count (ties: first by sort order)
            const sorted = Object.entries(countMap)
              .sort(([, a], [, b]) => b - a)
              .map(([rid]) => Number(rid));

            if (sorted.length > 0) setLastRestaurantId(sorted[0]);
          }

          setLoading(false);
          return;
        }
      }

      // 3) Session is active — ensure restaurants have been seeded for this session
      const { data: restaurants, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('session_id', session.id);

      if (restError || !restaurants?.length) {
        setMessage('Session is not ready yet. Please try again.');
        setLoading(false);
        return;
      }

      // 4) Upsert user by (session_id, name)
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

      // 5) Navigate to swiping screen
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
      onSubmit={handleSubmit}
      className="flex flex-col w-full gap-4 bg-yellow-50 p-6 rounded-2xl transition-all duration-150"
    >
      {/* Name input (hidden when session is expired) */}
      {!sessionExpired && (
        <input
          name="name"
          type="text"
          placeholder="Enter Your Name"
          value={name}
          onChange={handleNameChange}
          className={inputClasses}
        />
      )}

      <input
        data-testid="join-input"
        name="code"
        type="text"
        placeholder="Enter Session Code"
        maxLength={4}
        value={code}
        onChange={handleCodeChange}
        className={inputClasses}
      />

      {!sessionExpired ? (
        <button
          data-testid="join-button"
          type="submit"
          disabled={loading}
          className={buttonClasses}
        >
          {loading ? 'Joining...' : 'Join Session'}
        </button>
      ) : (
        <button
          data-testid="join-button"
          type="button"
          onClick={handleViewResults}
          className={`${buttonClasses} bg-gray-500 hover:bg-gray-600`}
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
