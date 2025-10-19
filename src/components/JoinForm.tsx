"use client";
import React, { useState } from "react";

export default function JoinForm() {
  const [code, setCode] = useState("");

  return (
    <form
      className="flex w-full max-w-lg items-center gap-3"
      onSubmit={(e) => {
        // Prevent full page reload
        e.preventDefault();
        // can use 'code' to call an API
        console.log("Join code submitted:", code);
      }}
    >
      <input
        name="code"
        type="text"
        placeholder="Enter Code"
        inputMode="text"
        value={code}
        onChange={(e) => {
          // Remove non-letter chars and force uppercase
          const filtered = e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase();
          setCode(filtered);
        }}
        className="h-12 w-full rounded-lg border px-5 text-base shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 md:h-12 md:text-lg transform transition duration-150 hover:scale-103 hover:bg-gray-300/90"
      />

      <button
        type="submit"
        aria-label="Join"
        className="grid h-12 w-16 place-items-center rounded-lg border shadow-sm hover:bg-gray-50 cursor-pointer transform transition duration-150 hover:scale-110 hover:bg-gray-300/90"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7-11-7z" />
        </svg>
      </button>
    </form>
  );
}
