'use client'

import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/BackButton'

export default function Host() {
  const router = useRouter()

  const priceRanges = [
    { id: '0-10', label: 'Inexpensive', dollars: 1 },
    { id: '10-20', label: 'Moderately Expensive', dollars: 2 },
    { id: '30-50', label: 'Expensive', dollars: 3 },
    { id: '50+', label: 'Very Expensive', dollars: 4 },
  ]

  return (
    <div className="min-h-screen bg-green-100 flex flex-col items-center px-4 py-8">
      <BackButton />

      {/* Title and description */}
      <h1 className="text-4xl md:text-5xl font-extrabold text-black mb-2 text-center">
        Pick a Price Range
      </h1>
      <p className="text-black text-lg md:text-xl mb-8 text-center">
        Choose a range to guide your group’s decision
      </p>

      {/* Price buttons */}
      <main className="flex flex-col gap-6 w-full max-w-md">
        {priceRanges.map((range) => (
          <button
            key={range.id}
            className="w-full rounded-2xl bg-yellow-50 border border-green-300 px-6 py-4 text-lg font-bold text-gray-900 shadow-md hover:shadow-lg hover:bg-yellow-100 transition transform duration-150 hover:scale-105 flex justify-center items-center gap-2"
            onClick={() =>
              router.push(`/host/location?price=${encodeURIComponent(range.id)}`)
            }
            aria-label={`Select price range ${range.label}`}
          >
            {/* Dollar signs in front */}
            <span className="flex gap-1">
              {Array(range.dollars)
                .fill('$')
                .map((d, i) => (
                  <span key={i} className="text-green-800">
                    {d}
                  </span>
                ))}
            </span>

            {/* Label */}
            <span className="ml-2">{range.label}</span>
          </button>
        ))}
      </main>
    </div>
  )
}
