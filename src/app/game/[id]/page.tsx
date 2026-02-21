import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GameViewerClient } from './GameViewerClient';
import type { SGGameState, TurnEvent } from '@/types/sangokji';

export default async function GameViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: game, error } = await supabase
    .from('sg_games')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !game) redirect('/game');

  const { data: turnEventsRaw } = await supabase
    .from('sg_turn_events')
    .select('turn, events')
    .eq('game_id', id)
    .order('turn', { ascending: true })
    .limit(30);

  const turnEvents: { turn: number; events: TurnEvent[] }[] =
    (turnEventsRaw ?? []).map((te) => ({
      turn: te.turn,
      events: te.events as TurnEvent[],
    }));

  return (
    <GameViewerClient
      gameId={id}
      initialState={game.current_state as SGGameState}
      initialTurnEvents={turnEvents}
    />
  );
}
