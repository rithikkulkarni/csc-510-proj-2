 // app/host/page.tsx
import Link from "next/link";

export default function Host() {
  const priceRanges = ["$0-10", "$10-20", "$30-50", "$50+"];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* home button top-left */}
      <div className="p-4">
        <Link
          href="/"
          className="rounded-md border px-3 py-1 text-sm shadow-sm hover:bg-gray-50"
        >
          home
        </Link>
      </div>

      <main className="flex min-h-[80vh] flex-col items-center justify-center gap-6">
        {priceRanges.map((range) => (
          <button
            key={range}
            className="w-48 rounded-md border border-gray-400 px-6 py-3 text-lg font-medium shadow-sm hover:bg-gray-50 transition"
          >
            {range}
          </button>
        ))}
      </main>
    </div>
  );
}
