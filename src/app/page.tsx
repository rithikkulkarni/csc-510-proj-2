'use client'

import React from "react";
import Image from "next/image";
import Link from "next/link";
import JoinForm from "../components/JoinForm";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-green-100 text-gray-900 flex flex-col items-center px-4 py-8">
      {/* Page Title */}
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-2">Food Finder</h1>
      <p className="text-gray-700 text-lg md:text-xl mb-8">Decisions are hard. Eating together shouldn’t be.</p>

      <main className="flex flex-col gap-10 w-full max-w-5xl">
        {/* HOST card */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 rounded-2xl bg-yellow-50 p-6 md:p-8 shadow-md hover:shadow-lg transition-all duration-150">
          <div className="relative h-36 w-36 md:h-40 md:w-40 rounded-full overflow-hidden border">
            <Image
              src="/host-placeholder.png"
              alt="Host"
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-col gap-5 md:gap-6 w-full">
            <div className="relative w-full">
              <span className="absolute -top-6 left-0 text-xl md:text-2xl font-bold tracking-widest text-gray-700">
                HOST
              </span>
              <div className="h-px w-full bg-green-300 mt-2" />
            </div>

            <Link
              href="/host"
              className="w-full md:w-auto text-center rounded-2xl bg-green-800 text-white font-bold text-lg md:text-xl py-4 px-6 shadow-md hover:shadow-lg hover:bg-green-900 transition transform duration-150 hover:scale-105"
            >
              Create Session
            </Link>
          </div>
        </div>

        {/* JOIN card */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 rounded-2xl bg-yellow-50 p-6 md:p-8 shadow-md hover:shadow-lg transition-all duration-150">
          <div className="relative h-36 w-36 md:h-40 md:w-40 rounded-full overflow-hidden border">
            <Image
              src="/join-placeholder.png"
              alt="Join"
              fill
              className="object-cover"
            />
          </div>

          <div className="flex flex-col gap-5 md:gap-6 w-full">
            <div className="relative w-full">
              <span className="absolute -top-6 left-0 text-xl md:text-2xl font-bold tracking-widest text-gray-700">
                JOIN
              </span>
              <div className="h-px w-full bg-green-300 mt-2" />
            </div>

            <div className="w-full">
              <JoinForm
                inputClassName="bg-white rounded-lg border border-gray-300 px-4 py-2 w-full text-lg"
                buttonClassName="w-full rounded-2xl bg-green-800 text-white font-bold text-lg py-4 px-6 shadow-md hover:shadow-lg hover:bg-green-900 transition transform duration-150 hover:scale-105"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
