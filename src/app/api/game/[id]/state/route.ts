import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: game, error } = await supabase
    .from('sg_games')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // Fetch last 10 turn events
  const { data: turnEvents } = await supabase
    .from('sg_turn_events')
    .select('turn, events, created_at')
    .eq('game_id', id)
    .order('turn', { ascending: false })
    .limit(10);

  return NextResponse.json({
    state: game.current_state,
    status: game.status,
    current_turn: game.current_turn,
    winner_id: game.winner_id,
    recent_events: (turnEvents ?? []).reverse(),
  });
}
