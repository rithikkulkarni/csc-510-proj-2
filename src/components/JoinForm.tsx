"use client";
import React, { useState } from "react";
import { supabase as realSupabase } from "../lib/supabaseClient";

type JoinFormProps = {
  supabase?: typeof realSupabase; // optional prop for tests
};

export default function JoinForm({ supabase = realSupabase }: JoinFormProps) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code) {
      setMessage("Please enter a code.");
      return;
    }

    try {
      // Query Supabase 'sessions' table for the code
      const { data, error } = await supabase
        .from("sessions")
        .select("id, code")
        .eq("code", code)
        .maybeSingle(); // safer than single() to avoid errors with 0 rows

      if (error) {
        console.error(error);
        setMessage("Error checking code.");
      } else if (!data) {
        setMessage("Invalid code.");
      } else {
        setMessage(`Success! Joined session ${data.id}.`);
      }
    } catch (err) {
      console.error(err);
      setMessage("Unexpected error occurred.");
    }
  };

  return (
    <form
      data-testid="join-form"
      className="flex w-full max-w-lg items-center gap-3"
      onSubmit={handleSubmit}
    >
      <input
        name="code"
        type="text"
        placeholder="Enter Code"
        inputMode="text"
        maxLength={4}
        value={code}
        onChange={(e) => {
          // Remove non-letter chars, force uppercase, and limit to 4 chars
          const filtered = e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4);
          setCode(filtered);
        }}
        className="h-12 w-full rounded-lg border px-5 text-base shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 md:h-12 md:text-lg transform transition duration-150 hover:scale-103 hover:bg-gray-300/90"
      />

      <button
        type="submit"
        aria-label="Join"
        className="grid h-12 w-16 place-items-center rounded-lg border shadow-sm hover:bg-gray-50 cursor-pointer transform transition duration-150 hover:scale-110 hover:bg-gray-300/90"
      >
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7-11-7z" />
        </svg>
      </button>

      {message && (
        <p data-testid="join-message" className="text-sm text-red-500">
          {message}
        </p>
      )}
    </form>
  );
}
