import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GameLobbyClient } from './GameLobbyClient';

export default async function GameLobbyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: games } = await supabase
    .from('sg_games')
    .select('id, status, current_turn, max_turns, winner_id, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return <GameLobbyClient games={games ?? []} />;
}
