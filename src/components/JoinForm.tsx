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
  const router = useRouter();

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
      .slice(0, 4);
    setCode(filtered);
    setMessage(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.slice(0, 30)); // limit name length
    setMessage(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code || !name) {
      setMessage('Please enter both session code and your name.');
      return;
    }

    setLoading(true);

    // 1. Fetch the session
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

    // 2. Check restaurants exist
    const { data: restaurants, error: restError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('session_id', session.id);

    if (restError || !restaurants?.length) {
      setMessage('Session is not ready yet. Please try again.');
      setLoading(false);
      return;
    }

    // 3. Insert or get user for this session
    let { data: user, error: userError } = await supabase
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

    // 4. Redirect to swipe page with session code and user id
    router.push(`/host/swipe?session=${encodeURIComponent(session.code)}&user=${user.id}`);
  };

  const inputClasses =
    inputClassName ??
    'w-full rounded-lg border border-gray-300 bg-white px-5 py-3 text-lg shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 transition transform duration-150';
  const buttonClasses =
    buttonClassName ??
    'w-full rounded-2xl bg-green-800 text-white font-bold text-lg py-4 shadow-md hover:bg-green-900 transition transform duration-150 hover:scale-105';

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col w-full gap-4 bg-yellow-50 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-150"
    >
      <input
        name="name"
        type="text"
        placeholder="Enter Your Name"
        value={name}
        onChange={handleNameChange}
        className={inputClasses}
      />
      <input
        name="code"
        type="text"
        placeholder="Enter Session Code"
        maxLength={4}
        value={code}
        onChange={handleCodeChange}
        className={inputClasses}
      />
      <button type="submit" disabled={loading} className={buttonClasses}>
        {loading ? 'Joining...' : 'Join Session'}
      </button>
      {message && <p className="text-green-700 font-medium mt-2">{message}</p>}
    </form>
  );
}
