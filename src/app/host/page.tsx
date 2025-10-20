'use client'

import { BackButton } from "@/components/BackButton";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Host() {
  const router = useRouter();

  // Keep your labels, but pass a clean id in the URL
  const priceRanges = [
    { id: "0-10", label: "$0-10" },
    { id: "10-20", label: "$10-20" },
    { id: "30-50", label: "$30-50" },
    { id: "50+", label: "$50+" },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <BackButton />

      <main className="flex min-h-[80vh] flex-col items-center justify-center gap-6">
        {priceRanges.map((range) => (
          <button
            key={range.id}
            className="w-48 rounded-md border border-gray-400 px-6 py-3 text-lg font-medium shadow-sm hover:bg-gray-50 cursor-pointer transform transition duration-150 hover:scale-105 hover:bg-gray-300/90"
            onClick={() =>
              router.push(`/host/location?price=${encodeURIComponent(range.id)}`)
            }
            aria-label={`Select price range ${range.label}`}
          >
            {range.label}
          </button>
        ))}
      </main>
    </div>
  );
}