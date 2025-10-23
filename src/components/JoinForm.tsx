'use client';
import React, { useState } from "react";
import { supabase as realSupabase } from "../lib/supabaseClient";

type JoinFormProps = {
  supabase?: typeof realSupabase; // optional for tests
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
      const { data, error } = await supabase
        .from("sessions")
        .select("id, code")
        .eq("code", code)
        .maybeSingle();

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
      onSubmit={handleSubmit}
      className="flex flex-col w-full gap-4 bg-yellow-50 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-150"
    >
      <input
        name="code"
        type="text"
        placeholder="Enter Session Code"
        maxLength={4}
        value={code}
        onChange={(e) => {
          const filtered = e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4);
          setCode(filtered);
        }}
        className="w-full rounded-lg border border-gray-300 bg-white px-5 py-3 text-lg shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 transition transform duration-150"
      />

      <button
        type="submit"
        className="w-full rounded-2xl bg-green-800 text-white font-bold text-lg py-4 shadow-md hover:bg-green-900 transition transform duration-150 hover:scale-105"
      >
        Join Session
      </button>

      {message && (
        <p className="text-sm text-red-500 mt-1">{message}</p>
      )}
    </form>
  );
}
