"use client";
import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export default function JoinForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSession(null);

    if (code.length !== 4) {
      setError("Session code must be 4 letters.");
      return;
    }

    // Call Supabase to get session
    const { data, error: supabaseError } = await supabase
      .from("sessions")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (supabaseError || !data) {
      setError("Session not found.");
      return;
    }

    setSession(data);
    console.log("Joined session:", data);
    // TODO: Redirect or update app state here as needed
  };

  return (
    <>
      <form
        className="flex w-full max-w-lg items-center gap-3"
        onSubmit={handleSubmit}
      >
        <input
          name="code"
          type="text"
          placeholder="Enter Code"
          inputMode="text"
          value={code}
          onChange={(e) => {
            const filtered = e.target.value
              .replace(/[^A-Za-z]/g, "")
              .toUpperCase();
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
      </form>

      {/* Error message */}
      {error && <p className="mt-2 text-red-500">{error}</p>}

      {/* Optional session info display */}
      {session && (
        <div className="mt-2 p-2 border rounded">
          <p>
            <strong>Code:</strong> {session.code}
          </p>
          <p>
            <strong>Status:</strong> {session.status}
          </p>
          <p>
            <strong>Created At:</strong>{" "}
            {new Date(session.created_at).toLocaleString()}
          </p>
        </div>
      )}
    </>
  );
}
