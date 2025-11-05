'use client';

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function ConfirmPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = useMemo(() => searchParams.get('session') ?? '', [searchParams]);

  const [code] = useState(initialCode);
  const [name, setName] = useState('');
  const [sessionData, setSessionData] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // Fetch session
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

      if (session.ends_at) {
        const ends = new Date(session.ends_at + 'Z');
        setExpiresAt(ends);
        const now = new Date();
        if (now > ends) {
          setExpired(true);
          setMessage('This session has expired.');
        }
      }

      setSessionData(session);
    }

    fetchSession();
  }, [code]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    function updateCountdown() {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        setExpired(true);
        setMessage('This session has expired.');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

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
    <div className="relative min-h-screen text-gray-900 flex flex-col items-center justify-start px-6 py-10 overflow-hidden">
      {/* Background */}
      <Image
        src="/background.png"
        alt="Background"
        fill
        className="absolute inset-0 object-cover z-0"
        priority
      />

      {/* Top-left Logo + Title + Slogan */}
      <div className="absolute top-4 left-4 z-20 flex flex-row items-start gap-2">
        <div className="relative w-10 h-10">
          <Image src="/logo.png" alt="Logo" width={40} height={40} className="animate-float" />
        </div>
        <div className="flex flex-col items-start gap-0">
          <h1 className="text-lg font-extrabold uppercase text-green-800" style={{ lineHeight: '1', textShadow: '0 0 2px rgba(203,241,195,0.5),0 0 4px rgba(203,241,195,0.3)' }}>
            FOOD FINDER
          </h1>
          <p className="text-[8px] font-semibold text-gray-700 mt-0" style={{ lineHeight: '0.95', textShadow: '1px 1px 1px rgba(0,0,0,0.1)' }}>
            DECISIONS ARE HARD.<br />EATING TOGETHER SHOULDN'T BE.
          </p>
        </div>
      </div>

      {/* Page Header */}
      <header className="relative z-10 mb-12 text-center w-full">
        <h1 className="text-4xl md:text-5xl font-extrabold text-green-800">
          Session Created!
        </h1>
        <p className="text-lg md:text-xl font-bold text-gray-700 mt-2">
          Share This Code With Your Friends to Start Choosing
        </p>
      </header>

      {/* Glassy Form Section */}
      {sessionData ? (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white/70 backdrop-blur-lg border border-green-200/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col items-center gap-6"
        >
          <p className="text-2xl font-bold text-green-800">Session Code</p>
          <input
            type="text"
            value={sessionData.code}
            readOnly
            className="w-full text-center text-5xl font-mono font-bold text-green-900 bg-green-50/70 px-6 py-3 rounded-xl shadow-sm cursor-not-allowed"
          />

          {expiresAt && (
            <div className="text-center">
              <p className="text-lg text-gray-700">
                Expires at:{' '}
                <span className="font-semibold text-green-800">
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
            className={`w-full rounded-xl border border-green-200/70 bg-white/80 px-5 py-3 text-lg text-gray-900 shadow-sm placeholder:text-gray-400
                       focus:outline-none focus:ring-2 focus:ring-green-400 focus:shadow-lg transition transform duration-200 hover:scale-105
                       ${expired ? 'bg-gray-200 cursor-not-allowed' : ''}`}
            disabled={expired}
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${expired
              ? 'bg-white hover:bg-white cursor-not-allowed'
              : 'bg-green-800 hover:bg-green-900'
              } text-white font-bold py-3 px-6 rounded-2xl shadow-md transition transform duration-150 hover:scale-105 cursor-pointer`}
          >
            {loading ? 'Joining...' : expired ? 'View Results' : 'Join Session'}
          </button>

          {message && <p className="text-red-600 font-medium mt-2 text-center">{message}</p>}
        </form>
      ) : (
        <div className="text-gray-700 text-lg">Loading session data...</div>
      )}

      {/* Return Home */}
      <div className="text-center mt-8 relative z-10">
        <Link
          href="/"
          className="inline-block rounded-2xl bg-green-800 text-white font-bold text-lg py-3 px-6 shadow-md hover:shadow-lg hover:bg-green-900 transition transform duration-150 hover:scale-105"
        >
          Return Home
        </Link>
      </div>

      {/* Footer */}
      <footer className="mt-10 text-gray-500 text-sm text-center relative z-10">
        © {new Date().getFullYear()} Food Finder
      </footer>
    </div>
  );
}
