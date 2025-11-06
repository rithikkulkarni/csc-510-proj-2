// 'use client';

// import { useEffect, useState } from 'react';
// import { useSearchParams } from 'next/navigation';
// import Link from 'next/link';
// import { supabase } from '../../../lib/supabaseClient';

// type Restaurant = {
//   id: number;
//   name: string;
//   address?: string;
//   website?: string;
//   maps_uri?: string;
//   rating?: number;
//   price?: number;
//   votes?: number;
//   users?: string[];
//   rank?: number;
// };

// export default function ResultsPageClient() {
//   const searchParams = useSearchParams();
//   const sessionCode = searchParams.get('session');
//   const topIdParam = searchParams.get('top');
//   const lastIdParam = searchParams.get('last');
//   const userIdParam = searchParams.get('user');
//   const expiresAtParam = searchParams.get('expires_at');

//   const topId = topIdParam ? Number(topIdParam) : null;
//   const lastId = lastIdParam ? Number(lastIdParam) : null;
//   const userId = userIdParam ? Number(userIdParam) : null;

//   const [topRestaurants, setTopRestaurants] = useState<Restaurant[]>([]);
//   const [lastManStanding, setLastManStanding] = useState<Restaurant[]>([]);
//   const [error, setError] = useState<string | null>(null);
//   const [sessionMode, setSessionMode] = useState<'solo' | 'group' | null>(null);

//   useEffect(() => {
//     async function fetchResults() {
//       if (!sessionCode) {
//         setError('No session code provided.');
//         return;
//       }

//       try {
//         const { data: session, error: sessionError } = await supabase
//           .from('sessions')
//           .select('*')
//           .eq('code', sessionCode)
//           .single();

//         if (sessionError || !session) {
//           setError('Session not found.');
//           return;
//         }

//         setSessionMode(session.mode);

//         // --- Check for expired session ---
//         if (expiresAtParam) {
//           const now = new Date();
//           const endsAt = new Date(expiresAtParam + 'Z');
//           if (now > endsAt) {
//             setError('This session has expired. You are viewing the results.');
//           }
//         }

//         // --- SOLO SESSION ---
//         if (session.mode === 'solo') {
//           if (!topId || !lastId) {
//             setError('Invalid solo session data.');
//             return;
//           }

//           const { data: restaurants, error: restError } = await supabase
//             .from('restaurants')
//             .select('*')
//             .in('id', [topId, lastId]);

//           if (restError || !restaurants || restaurants.length === 0) {
//             setError('Restaurants not found for this session.');
//             return;
//           }

//           const top = restaurants.find((r) => r.id === topId);
//           const last = restaurants.find((r) => r.id === lastId);

//           if (top) setTopRestaurants([top]);
//           if (last) setLastManStanding([last]);
//           return;
//         }

//         // --- GROUP SESSION ---
//         // userId is optional if session expired
//         const { data: votesData } = await supabase
//           .from('votes')
//           .select('restaurant_id, user_id, created_at')
//           .eq('session_id', session.id)
//           .order('created_at', { ascending: false });

//         if (!votesData || votesData.length === 0) {
//           setError('No votes found for this session.');
//           return;
//         }

//         // --- Top voted restaurants ---
//         const voteCounts: Record<number, number> = {};
//         votesData.forEach((v) => {
//           voteCounts[v.restaurant_id] = (voteCounts[v.restaurant_id] || 0) + 1;
//         });

//         const top3Ids = Object.entries(voteCounts)
//           .sort(([, a], [, b]) => b - a)
//           .slice(0, 3)
//           .map(([id]) => Number(id));

//         const { data: topData } = await supabase.from('restaurants').select('*').in('id', top3Ids);

//         const topRestaurants: Restaurant[] = top3Ids
//           .map((id) => {
//             const r = topData?.find((t) => t.id === id);
//             return r
//               ? {
//                 id: r.id,
//                 name: r.name,
//                 address: r.address,
//                 website: r.website,
//                 maps_uri: r.maps_uri,
//                 rating: r.rating,
//                 price: r.price_level,
//                 votes: voteCounts[r.id] || 0,
//               }
//               : null;
//           })
//           .filter(Boolean) as Restaurant[];

//         setTopRestaurants(topRestaurants);

//         // --- Last Man Standing ---
//         const lastVoteMap: Record<number, number> = {}; // user_id -> restaurant_id
//         votesData.forEach((v) => {
//           if (!lastVoteMap[v.user_id]) lastVoteMap[v.user_id] = v.restaurant_id;
//         });

//         const lastRestaurantIds = Array.from(new Set(Object.values(lastVoteMap)));

//         const { data: lastRestaurants } = await supabase
//           .from('restaurants')
//           .select('*')
//           .in('id', lastRestaurantIds);

//         const userIds = Object.keys(lastVoteMap).map(Number);
//         const { data: userData } = await supabase
//           .from('users')
//           .select('id, name')
//           .in('id', userIds);

//         const userMap: Record<number, string> = {};
//         userData?.forEach((u) => (userMap[u.id] = u.name));

//         const restaurantUserMap: Record<number, string[]> = {};
//         for (const [uidStr, rid] of Object.entries(lastVoteMap)) {
//           const ridNum = Number(rid);
//           if (!restaurantUserMap[ridNum]) restaurantUserMap[ridNum] = [];
//           restaurantUserMap[ridNum].push(userMap[Number(uidStr)] || `User ${uidStr}`);
//         }

//         let lastManStandingData: Restaurant[] = lastRestaurantIds
//           .map((id) => {
//             const r = lastRestaurants?.find((lr) => lr.id === id);
//             if (!r) return null;
//             const users = restaurantUserMap[id] || [];
//             return {
//               id: r.id,
//               name: r.name,
//               address: r.address,
//               website: r.website,
//               maps_uri: r.maps_uri,
//               rating: r.rating,
//               price: r.price_level,
//               users,
//               votes: users.length,
//             };
//           })
//           .filter(Boolean) as Restaurant[];

//         lastManStandingData = lastManStandingData
//           .sort((a, b) => (b.votes || 0) - (a.votes || 0))
//           .map((r, idx) => ({ ...r, rank: idx + 1 }));

//         setLastManStanding(lastManStandingData);
//       } catch (err) {
//         console.error(err);
//         setError('Failed to fetch results.');
//       }
//     }

//     fetchResults();
//   }, [sessionCode, topId, lastId, userId, expiresAtParam]);

//   const rankBorder = (index: number) => {
//     switch (index) {
//       case 0:
//         return 'border-4 border-yellow-400';
//       case 1:
//         return 'border-4 border-gray-400';
//       case 2:
//         return 'border-4 border-amber-700';
//       default:
//         return 'border';
//     }
//   };

//   if (error) return <div className="text-red-600 mt-4 text-center font-semibold">{error}</div>;

//   return (
//     <div className="min-h-screen bg-green-100 px-4 py-10">
//       <h1 className="text-4xl md:text-5xl font-extrabold text-green-900 mb-10 text-center">
//         {sessionMode === 'solo' ? 'Results' : 'Group Results'}
//       </h1>

//       <div className="max-w-6xl mx-auto space-y-10">
//         {topRestaurants.length || lastManStanding.length ? (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//             {/* Top Restaurants */}
//             {topRestaurants.length > 0 && (
//               <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
//                 <h2 className="text-2xl font-bold text-green-800 mb-6 text-center border-b-4 border-green-300 pb-2 w-3/4 mx-auto">
//                   Top Voted
//                 </h2>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   {topRestaurants.map((r, index) => (
//                     <div
//                       key={r.id}
//                       className={`p-4 rounded-2xl shadow-md bg-green-50 flex flex-col gap-2 relative transition-transform duration-150 hover:-translate-y-1 hover:scale-[1.02]`}
//                     >
//                       <div className="absolute top-2 right-4 font-bold text-green-900">
//                         Votes: {r.votes}
//                       </div>
//                       <h3 className="text-lg font-semibold text-green-900">
//                         #{index + 1} {r.name}
//                       </h3>
//                       {r.address && <p className="text-sm text-green-800">{r.address}</p>}
//                       <div className="flex gap-3 mt-1 text-green-900 text-sm">
//                         <span>Price: {r.price ? '$'.repeat(r.price) : 'N/A'}</span>
//                         <span>Rating: {r.rating ?? 'N/A'} ⭐</span>
//                       </div>
//                       {r.website && (
//                         <a
//                           href={r.website}
//                           target="_blank"
//                           rel="noreferrer"
//                           className="text-green-700 underline text-sm"
//                         >
//                           Website
//                         </a>
//                       )}
//                       {r.maps_uri && (
//                         <a
//                           href={r.maps_uri}
//                           target="_blank"
//                           rel="noreferrer"
//                           className="text-green-700 underline text-sm"
//                         >
//                           Google Maps
//                         </a>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Last Man Standing */}
//             {lastManStanding.length > 0 && (
//               <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
//                 <h2 className="text-2xl font-bold text-green-800 mb-6 text-center border-b-4 border-green-300 pb-2 w-3/4 mx-auto">
//                   Last Man Standing
//                 </h2>
//                 <div className="flex flex-col gap-6">
//                   {lastManStanding.map((r) => (
//                     <div
//                       key={r.id}
//                       className="p-4 rounded-2xl shadow-md bg-green-50 flex flex-col gap-2 relative transition-transform duration-150 hover:-translate-y-1 hover:scale-[1.02]"
//                     >
//                       <h3 className="text-lg font-semibold text-green-900">{r.name}</h3>
//                       {r.address && <p className="text-sm text-green-800">{r.address}</p>}
//                       <div className="flex gap-3 mt-1 text-green-900 text-sm">
//                         <span>Price: {r.price ? '$'.repeat(r.price) : 'N/A'}</span>
//                         <span>Rating: {r.rating ?? 'N/A'} ⭐</span>
//                       </div>
//                       {r.users && (
//                         <p className="text-sm text-green-700 mt-1">
//                           <strong>Voted by:</strong> {r.users.join(', ')}
//                         </p>
//                       )}
//                       {r.votes !== undefined && (
//                         <div className="absolute top-2 right-4 font-bold text-green-900">
//                           Votes: {r.votes}
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         ) : (
//           <p className="text-green-900 text-center font-medium">No votes have been cast yet.</p>
//         )}

//         <div className="text-center mt-10">
//           <Link
//             href="/"
//             className="inline-block rounded-2xl bg-green-800 text-white font-bold text-lg py-4 px-6 shadow-md hover:shadow-lg hover:bg-green-900 transition transform duration-150 hover:scale-105"
//           >
//             Return Home
//           </Link>
//         </div>
//       </div>
//     </div>

//   );
// }

// function RestaurantCard({ r }: { r: Restaurant }) {
//   return (
//     <div className="p-4 rounded-xl bg-[#F5F5DC] flex flex-col gap-1 relative">
//       <h3 className="text-lg font-semibold text-green-900">
//         {r.rank ? `#${r.rank} ` : ''}
//         {r.name}
//       </h3>
//       {r.address && <p className="text-sm text-green-800">{r.address}</p>}
//       <div className="flex gap-3 mt-1 text-green-900 text-sm">
//         <span>Price: {r.price && r.price > 0 ? '$'.repeat(r.price) : 'N/A'}</span>
//         <span>Rating: {r.rating ?? 'N/A'} ⭐</span>
//       </div>
//       {r.website && (
//         <a
//           href={r.website}
//           target="_blank"
//           rel="noreferrer"
//           className="text-green-700 underline text-sm"
//         >
//           Website
//         </a>
//       )}
//       {r.maps_uri && (
//         <a
//           href={r.maps_uri}
//           target="_blank"
//           rel="noreferrer"
//           className="text-green-700 underline text-sm"
//         >
//           Google Maps
//         </a>
//       )}
//       {r.users && (
//         <p className="text-sm text-green-700 mt-1">
//           <strong>Voted by:</strong> {r.users.join(', ')}
//         </p>
//       )}
//       {r.votes !== undefined && (
//         <div className="absolute top-2 right-4 font-bold text-green-900">Votes: {r.votes}</div>
//       )}
//     </div>
//   );
// }

'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../../../lib/supabaseClient';

type Restaurant = {
  id: number;
  name: string;
  address?: string;
  website?: string;
  maps_uri?: string;
  rating?: number;
  price?: number;
  votes?: number;
  users?: string[];
  rank?: number;
};

/**
 * ResultsPageClient
 *
 * Client-side results view for either:
 * - **Solo** sessions: shows the single “Top Choice” and “Last Man Standing” from query params.
 * - **Group** sessions: aggregates votes to compute Top 3 and “Last Man Standing”
 *   (per-user most recent vote), including voter names.
 *
 * Query params:
 * - `session` (required): session code
 * - `top`, `last` (solo only): restaurant IDs
 * - `user` (optional): viewer user id (not strictly required)
 * - `expires_at` (optional): ISO-like string; if now > ends, show expired notice
 *
 * Data sources: Supabase tables `sessions`, `restaurants`, `votes`, `users`.
 */
export default function ResultsPageClient() {
  const searchParams = useSearchParams();
  const sessionCode = searchParams.get('session');
  const topIdParam = searchParams.get('top');
  const lastIdParam = searchParams.get('last');
  const userIdParam = searchParams.get('user');
  const expiresAtParam = searchParams.get('expires_at');

  const topId = topIdParam ? Number(topIdParam) : null;
  const lastId = lastIdParam ? Number(lastIdParam) : null;
  const userId = userIdParam ? Number(userIdParam) : null;

  const [topRestaurants, setTopRestaurants] = useState<Restaurant[]>([]);
  const [lastManStanding, setLastManStanding] = useState<Restaurant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<'solo' | 'group' | null>(null);

  useEffect(() => {
    async function fetchResults() {
      if (!sessionCode) {
        setError('No session code provided.');
        return;
      }

      try {
        // Load session by code to determine mode and validity
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('code', sessionCode)
          .single();

        if (sessionError || !session) {
          setError('Session not found.');
          return;
        }

        setSessionMode(session.mode);

        // Optional expiry check (client-side UX)
        if (expiresAtParam) {
          const now = new Date();
          const endsAt = new Date(expiresAtParam + 'Z'); // treat as UTC if naive
          if (now > endsAt) {
            setError('This session has expired. You are viewing the results.');
          }
        }

        if (session.mode === 'solo') {
          if (!topId || !lastId) {
            setError('Invalid solo session data.');
            return;
          }

          const { data: restaurants, error: restError } = await supabase
            .from('restaurants')
            .select('*')
            .in('id', [topId, lastId]);

          if (restError || !restaurants || restaurants.length === 0) {
            setError('Restaurants not found for this session.');
            return;
          }

          const top = restaurants.find((r) => r.id === topId);
          const last = restaurants.find((r) => r.id === lastId);

          if (top) setTopRestaurants([top]);
          if (last) setLastManStanding([last]);
          return;
        }

        // --- GROUP SESSION ---
        // Pull all votes (newest first) to compute aggregates
        const { data: votesData } = await supabase
          .from('votes')
          .select('restaurant_id, user_id, created_at')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false });

        if (!votesData || votesData.length === 0) {
          setError('No votes found for this session.');
          return;
        }

        // Top 3 by total vote counts
        const voteCounts: Record<number, number> = {};
        votesData.forEach((v) => {
          voteCounts[v.restaurant_id] = (voteCounts[v.restaurant_id] || 0) + 1;
        });

        const top3Ids = Object.entries(voteCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([id]) => Number(id));

        const { data: topData } = await supabase.from('restaurants').select('*').in('id', top3Ids);

        const topRestaurants: Restaurant[] = top3Ids
          .map((id) => {
            const r = topData?.find((t) => t.id === id);
            return r
              ? {
                  id: r.id,
                  name: r.name,
                  address: r.address,
                  website: r.website,
                  maps_uri: r.maps_uri,
                  rating: r.rating,
                  price: r.price_level,
                  votes: voteCounts[r.id] || 0,
                }
              : null;
          })
          .filter(Boolean) as Restaurant[];

        const rankedTopRestaurants = topRestaurants.map((r, idx) => ({ ...r, rank: idx + 1 }));
        setTopRestaurants(rankedTopRestaurants);

        // “Last Man Standing”: newest vote per user, then tally by restaurant
        const lastVoteMap: Record<number, number> = {}; // user_id -> restaurant_id
        votesData.forEach((v) => {
          if (!lastVoteMap[v.user_id]) lastVoteMap[v.user_id] = v.restaurant_id;
        });

        const lastRestaurantIds = Array.from(new Set(Object.values(lastVoteMap)));
        const { data: lastRestaurants } = await supabase
          .from('restaurants')
          .select('*')
          .in('id', lastRestaurantIds);

        // Map user_id => name
        const userIds = Object.keys(lastVoteMap).map(Number);
        const { data: userData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);

        const userMap: Record<number, string> = {};
        userData?.forEach((u) => (userMap[u.id] = u.name));

        // Invert to restaurant_id => [user names]
        const restaurantUserMap: Record<number, string[]> = {};
        for (const [uidStr, rid] of Object.entries(lastVoteMap)) {
          const ridNum = Number(rid);
          if (!restaurantUserMap[ridNum]) restaurantUserMap[ridNum] = [];
          restaurantUserMap[ridNum].push(userMap[Number(uidStr)] || `User ${uidStr}`);
        }

        // Build + rank LMS list
        let lastManStandingData: Restaurant[] = lastRestaurantIds
          .map((id) => {
            const r = lastRestaurants?.find((lr) => lr.id === id);
            if (!r) return null;
            const users = restaurantUserMap[id] || [];
            return {
              id: r.id,
              name: r.name,
              address: r.address,
              website: r.website,
              maps_uri: r.maps_uri,
              rating: r.rating,
              price: r.price_level,
              users,
              votes: users.length,
            };
          })
          .filter(Boolean) as Restaurant[];

        lastManStandingData = lastManStandingData
          .sort((a, b) => (b.votes || 0) - (a.votes || 0))
          .map((r, idx) => ({ ...r, rank: idx + 1 }));

        setLastManStanding(lastManStandingData);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch results.');
      }
    }

    fetchResults();
  }, [sessionCode, topId, lastId, userId, expiresAtParam]);

  // Rank styling for Top 3 cards
  const rankBorder = (index: number) => {
    switch (index) {
      case 0:
        return 'border-4 border-yellow-400';
      case 1:
        return 'border-4 border-gray-400';
      case 2:
        return 'border-4 border-amber-700';
      default:
        return 'border';
    }
  };

  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-green-100 text-red-600 font-semibold text-center px-4">
        {error}
        <Link
          href="/"
          className="mt-6 inline-block rounded-2xl bg-green-800 text-white font-bold text-lg py-3 px-6 shadow-md hover:shadow-lg hover:bg-green-900 transition transform duration-150 hover:scale-105"
        >
          Return Home
        </Link>
      </div>
    );

  return (
    <div className="relative min-h-screen text-gray-900 flex flex-col items-center justify-start px-6 py-10 overflow-hidden">
      {/* Background */}
      <Image
        src="/background.png"
        alt="Background"
        fill
        className="absolute inset-0 object-cover z-0"
        priority
      />

      {/* Top-left Logo + Title + Slogan */}
      <div className="absolute top-4 left-4 z-20 flex flex-row items-start gap-2">
        <div className="relative w-10 h-10">
          <Image src="/logo.png" alt="Logo" width={40} height={40} className="animate-float" />
        </div>
        <div className="flex flex-col items-start gap-0">
          <h1
            className="text-lg font-extrabold uppercase text-green-800"
            style={{
              lineHeight: '1',
              textShadow: '0 0 2px rgba(203,241,195,0.5),0 0 4px rgba(203,241,195,0.3)',
            }}
          >
            FOOD FINDER
          </h1>
          <p
            className="text-[8px] font-semibold text-gray-700 mt-0"
            style={{ lineHeight: '0.95', textShadow: '1px 1px 1px rgba(0,0,0,0.1)' }}
          >
            DECISIONS ARE HARD.
            <br />
            EATING TOGETHER SHOULDN'T BE.
          </p>
        </div>
      </div>

      {/* Page Header */}
      <header className="relative z-10 mb-12 text-center w-full">
        <h1 className="text-4xl md:text-5xl font-extrabold text-green-800">Results</h1>
      </header>

      {/* Top Voted & Last Man Standing Sections */}
      <div className="relative z-10 max-w-5xl w-full space-y-8">
        {/* Top Voted */}
        {topRestaurants.length > 0 && (
          <section className="rounded-3xl p-6 bg-white shadow-md hover:shadow-xl transition duration-200">
            <h2 className="text-2xl font-bold text-green-800 mb-4 text-center border-b-4 border-green-300 pb-2 w-3/4 mx-auto">
              Top Voted Restaurants
            </h2>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              {topRestaurants.map((r, index) => (
                <RestaurantCard key={r.id} r={r} rankBorder={rankBorder(index)} />
              ))}
            </div>
          </section>
        )}

        {/* Last Man Standing */}
        {lastManStanding.length > 0 && (
          <section className="rounded-3xl p-6 bg-white shadow-md hover:shadow-xl transition duration-200">
            <h2 className="text-2xl font-bold text-green-800 mb-4 text-center border-b-4 border-green-300 pb-2 w-3/4 mx-auto">
              Last Man Standing
            </h2>
            <div className="flex flex-col gap-4">
              {lastManStanding.map((r) => (
                <RestaurantCard key={r.id} r={r} uniformBorder />
              ))}
            </div>
          </section>
        )}

        {/* Return Home */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-block rounded-2xl bg-green-800 text-white font-bold text-lg py-3 px-6 shadow-md hover:shadow-lg hover:bg-green-900 transition transform duration-150 hover:scale-105"
          >
            Return Home
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-12 text-gray-500 text-sm text-center">
        © {new Date().getFullYear()} Food Finder
      </footer>
    </div>
  );

  function RestaurantCard({
    r,
    rankBorder,
    uniformBorder,
  }: {
    r: Restaurant;
    rankBorder?: string;
    uniformBorder?: boolean;
  }) {
    return (
      <div
        className={`relative p-4 rounded-2xl shadow-md bg-white flex flex-col gap-2 transition-transform duration-150 hover:-translate-y-1 hover:scale-[1.02] ${
          uniformBorder ? 'border-2 border-gray-300' : rankBorder || ''
        }`}
      >
        {/* Vote count - top right corner */}
        {r.votes !== undefined && (
          <div className="absolute top-2 right-3 bg-yellow-100 text-yellow-800 font-bold text-sm px-2 py-1 rounded-full shadow-sm">
            {r.votes} Vote{r.votes === 1 ? '' : 's'}
          </div>
        )}

        <h3 className="text-lg font-semibold text-green-900 mt-6">
          {r.rank ? `#${r.rank} ` : ''}
          {r.name}
        </h3>

        {r.address && <p className="text-sm text-green-800">{r.address}</p>}

        <div className="flex gap-3 mt-1 text-green-900 text-sm">
          <span>Price: {r.price ? '$'.repeat(r.price) : 'N/A'}</span>
          <span>Rating: {r.rating ?? 'N/A'} ⭐</span>
        </div>

        {r.website && (
          <a
            href={r.website}
            target="_blank"
            rel="noreferrer"
            className="text-green-700 underline text-sm"
          >
            Website
          </a>
        )}

        {r.maps_uri && (
          <a
            href={r.maps_uri}
            target="_blank"
            rel="noreferrer"
            className="text-green-700 underline text-sm"
          >
            Google Maps
          </a>
        )}

        {r.users && (
          <p className="text-sm text-green-700 mt-1">
            <strong>Voted by:</strong> {r.users.join(', ')}
          </p>
        )}
      </div>
    );
  }
}
