-- AI 삼국지 (Strategy Simulation) DB Schema
-- Migration: 007_sangokji.sql

-- Game instances
create table if not exists public.sg_games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  status text default 'running' check (status in ('running', 'completed')),
  current_turn int default 0,
  max_turns int default 30,
  current_state jsonb not null,
  winner_id text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Turn events (30 turns × per game)
create table if not exists public.sg_turn_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.sg_games(id) on delete cascade,
  turn int not null,
  events jsonb not null,
  state_snapshot jsonb not null,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_sg_games_owner on public.sg_games(owner_id);
create index if not exists idx_sg_turn_events_game on public.sg_turn_events(game_id, turn);

-- RLS
alter table public.sg_games enable row level security;
alter table public.sg_turn_events enable row level security;

-- sg_games: users can read/write their own games
create policy "sg_games_owner_all" on public.sg_games
  for all using (auth.uid() = owner_id);

-- sg_turn_events: users can read events for games they own
create policy "sg_turn_events_owner_read" on public.sg_turn_events
  for select using (
    exists (
      select 1 from public.sg_games g
      where g.id = game_id and g.owner_id = auth.uid()
    )
  );

create policy "sg_turn_events_owner_insert" on public.sg_turn_events
  for insert with check (
    exists (
      select 1 from public.sg_games g
      where g.id = game_id and g.owner_id = auth.uid()
    )
  );
