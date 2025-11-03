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

      // Check if session has expired
      if (session.ends_at) {
        const now = new Date();
        const endsAt = new Date(session.ends_at + 'Z');
        if (now > endsAt) {
          setMessage('This session has expired.');
          setSessionExpired(true);

          // --- Fetch last man standing restaurant ID ---
          // 1. Get all votes for this session
          const { data: votesData } = await supabase
            .from('votes')
            .select('restaurant_id, user_id, created_at')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false });

          if (votesData && votesData.length > 0) {
            const lastVoteMap: Record<number, number> = {}; // user_id -> restaurant_id
            votesData.forEach((v) => {
              if (!lastVoteMap[v.user_id]) lastVoteMap[v.user_id] = v.restaurant_id; // newest vote per user
            });

            // Count number of users per last restaurant
            const countMap: Record<number, number> = {};
            Object.values(lastVoteMap).forEach((rid) => {
              countMap[rid] = (countMap[rid] || 0) + 1;
            });

            // Pick the restaurant with the most "last votes"
            const sorted = Object.entries(countMap)
              .sort(([, a], [, b]) => b - a)
              .map(([rid]) => Number(rid));

            if (sorted.length > 0) setLastRestaurantId(sorted[0]);
          }

          setLoading(false);
          return;
        }
      }

      // Session is active
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
      onSubmit={handleSubmit}
      className="flex flex-col w-full gap-4 bg-yellow-50 p-6 rounded-2xl transition-all duration-150"
    >
      {/* Name input is above session code, but removed if expired */}
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
