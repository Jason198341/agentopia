import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runTurns } from '@/lib/sangokji/engine';
import type { SGGameState, TurnEvent } from '@/types/sangokji';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({ turns: 1 }));
  const turns = Math.min(Math.max(1, Number(body.turns) || 1), 10);

  // Fetch current game
  const { data: game, error: fetchErr } = await supabase
    .from('sg_games')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (fetchErr || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  if (game.status === 'completed') {
    return NextResponse.json({ error: 'Game already completed', state: game.current_state });
  }

  // Run turns
  const currentState = game.current_state as SGGameState;
  const snapshotTurn = game.current_turn as number;
  const { state: newState, allEvents, snapshots } = await runTurns(currentState, turns);

  // Optimistic lock: only update if current_turn hasn't changed since we read it.
  // This prevents duplicate events from concurrent requests.
  const updateData: Record<string, unknown> = {
    current_state: newState,
    current_turn: newState.turn,
    status: newState.status,
  };

  if (newState.status === 'completed') {
    updateData.winner_id = newState.winner_id;
    updateData.completed_at = new Date().toISOString();
  }

  const { data: updated } = await supabase
    .from('sg_games')
    .update(updateData)
    .eq('id', id)
    .eq('current_turn', snapshotTurn)  // Only update if no concurrent write happened
    .select('id');

  if (!updated || updated.length === 0) {
    // Another request already advanced the turn — return the latest state
    const { data: latestGame } = await supabase
      .from('sg_games').select('current_state, status, current_turn')
      .eq('id', id).single();
    return NextResponse.json({
      state: latestGame?.current_state,
      events: [],
      completed: latestGame?.status === 'completed',
      skipped: true,
    }, { status: 200 });
  }

  // Insert turn events (only on successful optimistic lock)
  const startTurn = snapshotTurn;
  const eventInserts = allEvents.map((events: TurnEvent[], i: number) => ({
    game_id: id,
    turn: startTurn + i + 1,
    events,
    state_snapshot: newState,
  }));

  if (eventInserts.length > 0) {
    await supabase.from('sg_turn_events').insert(eventInserts);
  }

  return NextResponse.json({
    state: newState,
    events: allEvents,
    snapshots,
    completed: newState.status === 'completed',
  });
}
