import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initGame } from '@/lib/sangokji/engine';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { strategy, personality } = body as Record<string, string>;

  const state = initGame();

  // Optionally override agent_0's strategy/personality with user input
  if (strategy || personality) {
    const agent = state.agents.find((a) => a.id === 'agent_0');
    if (agent) {
      if (strategy) agent.strategy = strategy;
      if (personality) agent.personality = personality;
    }
  }

  const { data, error } = await supabase
    .from('sg_games')
    .insert({
      owner_id: user.id,
      status: 'running',
      current_turn: 0,
      max_turns: state.max_turns,
      current_state: state,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  state.game_id = data.id;

  // Persist game_id into current_state
  await supabase
    .from('sg_games')
    .update({ current_state: state })
    .eq('id', data.id);

  return NextResponse.json({ game_id: data.id, state });
}
