'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

type Restaurant = {
  id: number;
  name: string;
  address?: string;
  rating?: number;
  _priceIdx?: number | null;
};

export default function ResultsPageClient() {
  const searchParams = useSearchParams();
  const sessionCode = searchParams.get('session');
  const userId = searchParams.get('user');
  const lastId = searchParams.get('last');
  const topId = searchParams.get('top');

  const [lastManStanding, setLastManStanding] = useState<Restaurant | null>(null);
  const [topRestaurants, setTopRestaurants] = useState<Restaurant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        if (!sessionCode) {
          setError('Missing session code.');
          return;
        }

        // --- SOLO SESSION ---
        if (lastId && topId && !userId) {
          const { data: lastRestaurant } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', Number(lastId))
            .single();

          const { data: topRestaurant } = await supabase
            .from('restaurants')
            .select('*')
            .in('id', [Number(topId)]);

          setLastManStanding(lastRestaurant ?? null);
          setTopRestaurants(topRestaurant ?? []);
          return;
        }

        // --- GROUP SESSION ---
        if (!userId) {
          setError('User ID required for group session.');
          return;
        }

        // Fetch session ID
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('code', sessionCode)
          .single();

        if (!session || sessionError) {
          setError('Session not found.');
          return;
        }

        const sessionId = session.id;

        // Last man standing for group
        const { data: lastVote } = await supabase
          .from('votes')
          .select('restaurant_id')
          .eq('user_id', Number(userId))
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastVote) {
          const { data: lastRestaurant } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', lastVote.restaurant_id)
            .single();
          setLastManStanding(lastRestaurant);
        }

        // Top 3 restaurants by votes
        const { data: voteCounts } = await supabase
          .from('votes')
          .select('restaurant_id, count:restaurant_id', { count: 'exact' })
          .eq('session_id', sessionId);

        const counts: Record<number, number> = {};
        voteCounts?.forEach((v) => {
          counts[v.restaurant_id] = (counts[v.restaurant_id] || 0) + 1;
        });

        const top3Ids = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([id]) => Number(id));

        if (top3Ids.length) {
          const { data: topData } = await supabase
            .from('restaurants')
            .select('*')
            .in('id', top3Ids);

          const sortedTop = top3Ids
            .map((id) => topData?.find((r) => r.id === id))
            .filter(Boolean) as Restaurant[];

          setTopRestaurants(sortedTop);
        }
      } catch (err) {
        setError('Failed to fetch results.');
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }

    fetchResults();
  }, [sessionCode, userId, lastId, topId]);

  if (error) return <div className="text-red-600 mt-4">{error}</div>;

  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {lastManStanding && (
          <div className="p-6 border rounded-2xl shadow-md">
            <h2 className="text-xl font-bold mb-2">Last Man Standing</h2>
            <p className="text-lg">{lastManStanding.name}</p>
            {lastManStanding.address && (
              <p className="text-sm text-gray-600">{lastManStanding.address}</p>
            )}
          </div>
        )}

        {topRestaurants.length > 0 && (
          <div className="p-6 border rounded-2xl shadow-md">
            <h2 className="text-xl font-bold mb-4">
              Top Voted Restaurant{topRestaurants.length > 1 ? 's' : ''}
            </h2>
            <ol className="list-decimal list-inside space-y-2">
              {topRestaurants.map((r) => (
                <li key={r.id}>
                  <span className="font-medium">{r.name}</span>
                  {r.address && <span className="text-gray-600"> - {r.address}</span>}
                </li>
              ))}
            </ol>
          </div>
        )}

        {!lastManStanding && topRestaurants.length === 0 && (
          <p className="text-gray-600 text-center">No votes yet.</p>
        )}
      </div>
    </div>
  );
}
