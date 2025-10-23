// 'use client'

// import { useRouter } from "next/navigation";

// export default function Host() {
//   const router = useRouter();

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
//       <button
//         className="px-8 py-4 text-2xl font-semibold rounded-lg bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105"
//         onClick={() => router.push("/host/location")}
//         aria-label="Find restaurants"
//       >
//         Find Restaurants
//       </button>
//     </div>
//   );
// }

'use client'

import { useState } from "react";

export default function Host() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  // Replace with your desired coordinates (e.g., Raleigh, NC)
  const lat = 35.7796;
  const lng = -78.6382;
  const radiusMeters = 1609 * 5; // 5 miles

  async function handleFindRestaurants() {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY!, // expose via NEXT_PUBLIC_ variable
          "X-Goog-FieldMask": [
            "places.displayName",
            "places.formattedAddress",
            "places.rating",
            "places.priceLevel",
            "places.googleMapsUri",
          ].join(","),
        },
        body: JSON.stringify({
          includedTypes: ["restaurant"],
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: radiusMeters,
            },
          },
          rankPreference: "POPULARITY",
          maxResultCount: 10,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text}`);
      }

      const data = await response.json();
      setResults(data.places || []);
      console.log("✅ Google Places results:", data.places);
    } catch (e: any) {
      setError(e.message || "Failed to fetch");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900 p-8">
      <button
        onClick={handleFindRestaurants}
        disabled={loading}
        className="px-8 py-4 text-2xl font-semibold rounded-lg bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:opacity-50"
      >
        {loading ? "Searching..." : "Find Restaurants"}
      </button>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      <ul className="mt-6 w-full max-w-md space-y-3">
        {results.map((p) => (
          <li key={p.displayName?.text} className="border rounded-md p-3 shadow-sm">
            <p className="font-semibold">{p.displayName?.text}</p>
            <p className="text-sm text-gray-600">{p.formattedAddress}</p>
            <p className="text-sm text-gray-500">
              ⭐ {p.rating ?? "N/A"} | Price: {p.priceLevel ?? "N/A"}
            </p>
            <a
              href={p.googleMapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-sm underline"
            >
              View on Google Maps
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
