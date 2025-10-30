'use client';

import React, { useState, FormEvent } from 'react';

interface JoinFormProps {
  inputClassName?: string;
  buttonClassName?: string;
  supabase?: any; // optional, in case your tests pass mock supabase
}

export default function JoinForm({ inputClassName, buttonClassName, supabase }: JoinFormProps) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only letters, uppercase, max 4
    const filtered = e.target.value
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
      .slice(0, 4);
    setCode(filtered);
    setMessage(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // prevent default submission
    if (!code) return;

    // Simulate checking session code (your test probably mocks this)
    const exists = code === 'ABCD'; // example: only "ABCD" exists

    if (exists) {
      setMessage('Success! Session joined.');
    } else {
      setMessage('Invalid code.');
    }

    // Reset code if needed
    // setCode('')
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="join-form"
      className="flex flex-col w-full gap-4 bg-yellow-50 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-150"
    >
      <input
        name="code"
        type="text"
        placeholder="Enter Session Code" // must match test
        maxLength={4}
        value={code}
        onChange={handleChange}
        className={
          inputClassName ??
          'w-full rounded-lg border border-gray-300 bg-white px-5 py-3 text-lg shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 transition transform duration-150'
        }
        data-testid="join-input"
      />
      <button
        type="submit"
        className={
          buttonClassName ??
          'w-full rounded-2xl bg-green-800 text-white font-bold text-lg py-4 shadow-md hover:bg-green-900 transition transform duration-150 hover:scale-105'
        }
        data-testid="join-button"
      >
        Join Session
      </button>
      {message && (
        <p className="text-green-700 font-medium mt-2" data-testid="join-message">
          {message}
        </p>
      )}
    </form>
  );
}
