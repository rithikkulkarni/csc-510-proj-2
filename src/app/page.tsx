'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import JoinForm from '../components/JoinForm';

/**
 * Home Page — Landing Screen
 *
 * Entry point for the Food Finder app. Provides two primary actions:
 * - Host creates a new session (navigates into the host onboarding flow)
 * - Guest joins an existing session using a short join code
 *
 * Layout:
 * - "HOST" card with CTA button linking to `/host/location`
 * - "JOIN" card with inline <JoinForm />
 *
 * @example
 * // Loaded at /
 * export default function Home() { ... }
 */
export default function Home() {
  return (
    <div className="relative min-h-screen text-gray-900 flex flex-col items-center justify-start px-6 py-10 overflow-hidden">
      {/* Background Image */}
      <Image
        src="/background.png"
        alt="Background"
        fill
        className="absolute inset-0 object-cover z-0"
        priority
      />

      {/* Hero Header with blur box */}
      <header className="relative z-10 mb-16 flex flex-col items-start md:items-start px-6 md:px-0">
        <div className="flex flex-row items-center gap-6 mb-2">
          {/* Logo with faint glow */}
          <div className="relative">
            <Image
              src="/logo.png"
              alt="Food Finder logo"
              width={175}
              height={175}
              className="animate-float"
            />
          </div>

          {/* Title + Slogan */}
          <div className="flex flex-col items-start">
            {/* Title with natural glow */}
            <h1
              className="text-6xl md:text-7xl font-extrabold uppercase text-green-800 leading-tight"
              style={{
                textShadow: `
            0 0 8px rgba(203, 241, 195, 0.5),
            0 0 12px rgba(203, 241, 195, 0.3)
          `,
              }}
            >
              FOOD FINDER
            </h1>

            {/* Slogan tighter and subtle shadow */}
            <p
              className="text-lg md:text-xl font-bold text-gray-700 mt-0 leading-snug"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}
            >
              DECISIONS ARE HARD. EATING TOGETHER SHOULDN'T BE.
            </p>
          </div>
        </div>
      </header>

      {/* Cards container */}
      <main className="grid md:grid-cols-2 gap-10 w-full max-w-5xl relative z-10">
        {/* HOST card */}
        <div className="flex flex-col items-center bg-white rounded-3xl p-8 border-2 border-green-300 shadow-lg">
          <div className="relative h-36 w-36 mb-6 rounded-full overflow-hidden border-4 border-green-300 shadow-inner">
            <Image src="/host.png" alt="Host" fill className="object-cover" priority />
          </div>

          <h2 className="text-2xl font-bold text-green-800 mb-2">🧑‍🤝‍🧑 Host a Session</h2>
          <p className="text-gray-600 text-center mb-6">
            Start a new food session and invite your friends to join.
          </p>

          <Link
            href="/host/location"
            className="w-full text-center rounded-2xl bg-green-700 text-white font-bold text-lg py-4 px-6 shadow-md hover:shadow-xl hover:bg-green-900 transition-all duration-300 transform hover:scale-[1.02]"
          >
            Create Session
          </Link>
        </div>

        {/* JOIN card */}
        <div className="flex flex-col items-center bg-white rounded-3xl p-8 border-2 border-green-300 shadow-lg">
          <div className="relative h-36 w-36 mb-6 rounded-full overflow-hidden border-4 border-green-300 shadow-inner">
            <Image src="/join.png" alt="Join" fill className="object-cover" />
          </div>

          <h2 className="text-2xl font-bold text-green-800 mb-2">🍽️ Join a Session</h2>
          <p className="text-gray-600 text-center mb-6">
            Have a session code? Join and start deciding on your next meal together!
          </p>

          <div className="w-full">
            <JoinForm
              inputClassName="bg-white rounded-xl border-2 border-green-200 px-4 py-3 w-full text-lg shadow-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
              buttonClassName="w-full mt-4 rounded-2xl bg-green-700 text-white font-bold text-lg py-4 shadow-md hover:shadow-lg hover:shadow-xl hover:bg-green-900 transition-all duration-300 transform hover:scale-[1.02] cursor-pointer"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 text-gray-500 text-sm relative z-10">
        © {new Date().getFullYear()} Food Finder
      </footer>
    </div>
  );
}
