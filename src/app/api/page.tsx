// 'use client'

// import { useState } from "react";

// export default function Host() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [results, setResults] = useState<any[]>([]);

//   // Replace with your desired coordinates (e.g., Raleigh, NC)
//   const lat = 35.7796;
//   const lng = -78.6382;
//   const radiusMeters = 1609 * 5; // 5 miles

//   async function handleFindRestaurants() {
//     setLoading(true);
//     setError(null);
//     setResults([]);

//     try {
//       const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY!, // expose via NEXT_PUBLIC_ variable
//           "X-Goog-FieldMask": [
//             "places.displayName",
//             "places.formattedAddress",
//             "places.rating",
//             "places.priceLevel",
//             "places.googleMapsUri",
//           ].join(","),
//         },
//         body: JSON.stringify({
//           includedTypes: ["restaurant"],
//           locationRestriction: {
//             circle: {
//               center: { latitude: lat, longitude: lng },
//               radius: radiusMeters,
//             },
//           },
//           rankPreference: "POPULARITY",
//           maxResultCount: 10,
//         }),
//       });

//       if (!response.ok) {
//         const text = await response.text();
//         throw new Error(`Error ${response.status}: ${text}`);
//       }

//       const data = await response.json();
//       setResults(data.places || []);
//       console.log("✅ Google Places results:", data.places);
//     } catch (e: any) {
//       setError(e.message || "Failed to fetch");
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900 p-8">
//       <button
//         onClick={handleFindRestaurants}
//         disabled={loading}
//         className="px-8 py-4 text-2xl font-semibold rounded-lg bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:opacity-50"
//       >
//         {loading ? "Searching..." : "Find Restaurants"}
//       </button>

//       {error && <p className="mt-4 text-red-600">{error}</p>}

//       <ul className="mt-6 w-full max-w-md space-y-3">
//         {results.map((p) => (
//           <li key={p.displayName?.text} className="border rounded-md p-3 shadow-sm">
//             <p className="font-semibold">{p.displayName?.text}</p>
//             <p className="text-sm text-gray-600">{p.formattedAddress}</p>
//             <p className="text-sm text-gray-500">
//               ⭐ {p.rating ?? "N/A"} | Price: {p.priceLevel ?? "N/A"}
//             </p>
//             <a
//               href={p.googleMapsUri}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="text-blue-600 text-sm underline"
//             >
//               View on Google Maps
//             </a>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

'use client'

import { useState } from "react";

export default function Host() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);

  // Coordinates (e.g., Raleigh, NC)
  const lat = 35.7796;
  const lng = -78.6382;
  const radiusMeters = 1609 * 30; // 5 miles

  // Map Google Places API v1 enum -> compact 0..3 scale ( $, $$, $$$, $$$$ )
  // Also gracefully handle older numeric price levels if they appear.
  function toPriceIndex(priceLevel: any): number | null {
    if (priceLevel == null) return null;
    if (typeof priceLevel === "number") {
      // If Google ever returns 0..3 (or 0..4/5), clamp to 0..3 for $, $$, $$$, $$$$
      const n = Math.max(0, Math.min(3, priceLevel));
      return Number.isFinite(n) ? n : null;
    }
    const map: Record<string, number | null> = {
      PRICE_LEVEL_FREE: 0,               // rare for restaurants
      PRICE_LEVEL_INEXPENSIVE: 0,        // $
      PRICE_LEVEL_MODERATE: 1,           // $$
      PRICE_LEVEL_EXPENSIVE: 2,          // $$$
      PRICE_LEVEL_VERY_EXPENSIVE: 3,     // $$$$
      PRICE_LEVEL_UNSPECIFIED: null
    };
    return map[priceLevel] ?? null;
  }

  function priceLabelFromIndex(idx: number | null): string {
    if (idx == null) return "N/A";
    return "$".repeat(idx + 1); // 0->1 $, 1->2 $$, etc.
  }

  async function handleFindRestaurants() {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY!, 
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
          maxResultCount: 20,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text}`);
      }

      const data = await response.json();

      let places = (data?.places ?? []).map((p: any) => ({
        ...p,
        // Attach a normalized numeric price index for easy filtering/sorting/rendering
        _priceIdx: toPriceIndex(p.priceLevel),
      }));

      if (selectedPrice !== null) {
        places = places.filter((p: any) => p._priceIdx === selectedPrice);
      }

      setResults(places);
      console.log("✅ Filtered results:", places);
    } catch (e: any) {
      setError(e.message || "Failed to fetch");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900 p-8 space-y-6">
      {/* PRICE FILTER */}
      <div className="flex space-x-2 items-center">
        <label htmlFor="price" className="font-semibold text-lg">Price Range:</label>
        <select
          id="price"
          value={selectedPrice ?? ""}
          onChange={(e) =>
            setSelectedPrice(e.target.value ? parseInt(e.target.value) : null)
          }
          className="border border-gray-400 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option value="0">$ (Inexpensive)</option>
          <option value="1">$$ (Moderate)</option>
          <option value="2">$$$ (Expensive)</option>
          <option value="3">$$$$ (Very Expensive)</option>
        </select>
      </div>

      {/* FIND BUTTON */}
      <button
        onClick={handleFindRestaurants}
        disabled={loading}
        className="px-8 py-4 text-2xl font-semibold rounded-lg bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:opacity-50"
      >
        {loading ? "Searching..." : "Find Restaurants"}
      </button>

      {/* ERROR */}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {/* RESULTS */}
      <ul className="mt-6 w-full max-w-md space-y-3">
        {results.map((p) => (
          <li key={p.displayName?.text ?? p.googleMapsUri} className="border rounded-md p-3 shadow-sm">
            <p className="font-semibold">{p.displayName?.text}</p>
            <p className="text-sm text-gray-600">{p.formattedAddress}</p>
            <p className="text-sm text-gray-500">
              ⭐ {p.rating ?? "N/A"} | Price: {priceLabelFromIndex(p._priceIdx)}
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


