/*'use client';

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

      // Convert ends_at to Date (assume UTC from Supabase)
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

    // If expired, route to results
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
      // Check restaurants exist
      const { data: restaurants, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('session_id', sessionData.id);

      if (restError || !restaurants?.length) {
        setMessage('Session is not ready yet. Please try again.');
        setLoading(false);
        return;
      }

      // Check if user name already exists
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

      // Insert new user
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

      // Redirect to swipe page
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
              {!expired && <p className="text-green-700 font-bold text-xl">Time remaining: {timeLeft}</p>}
            </div>
          )}

          <input
            type="text"
            placeholder="Enter Your Name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            className={`w-full rounded-lg border border-gray-300 bg-white px-5 py-3 text-lg text-black shadow-sm placeholder:text-gray-400
                       focus:outline-none focus:ring-2 focus:ring-green-300 focus:shadow-lg transition transform duration-200 hover:scale-105
                       ${expired ? 'bg-gray-200 cursor-not-allowed' : ''}`}
            disabled={expired}
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${expired ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : 'bg-green-800 hover:bg-green-900'
              } text-white font-bold py-3 px-6 rounded-2xl shadow-md transition transform duration-150 hover:scale-105`}
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
*/
'use client';

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

      // Convert ends_at to Date (assume UTC from Supabase)
      if (session.ends_at) {
        const ends = new Date(session.ends_at + 'Z'); // ensure UTC
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
      if (!expiresAt) return;

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

    // If expired, route to results
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
      // Check restaurants exist
      const { data: restaurants, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('session_id', sessionData.id);

      if (restError || !restaurants?.length) {
        setMessage('Session is not ready yet. Please try again.');
        setLoading(false);
        return;
      }

      // Check if user name already exists
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

      // Insert new user
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

      // Redirect to swipe page
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
            className={`w-full rounded-lg border border-gray-300 bg-white px-5 py-3 text-lg text-black shadow-sm placeholder:text-gray-400
                       focus:outline-none focus:ring-2 focus:ring-green-300 focus:shadow-lg transition transform duration-200 hover:scale-105
                       ${expired ? 'bg-gray-200 cursor-not-allowed' : ''}`}
            disabled={expired}
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${
              expired
                ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
                : 'bg-green-800 hover:bg-green-900'
            } text-white font-bold py-3 px-6 rounded-2xl shadow-md transition transform duration-150 hover:scale-105`}
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
