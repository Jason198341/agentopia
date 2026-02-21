-- ============================================
-- Agentopia MVP Schema
-- ============================================

-- 1. Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  tier text default 'free' check (tier in ('free', 'premium')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Agents
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  -- 8 stats (1-10 scale)
  stat_logic smallint default 5 check (stat_logic between 1 and 10),
  stat_aggression smallint default 5 check (stat_aggression between 1 and 10),
  stat_brevity smallint default 5 check (stat_brevity between 1 and 10),
  stat_humor smallint default 5 check (stat_humor between 1 and 10),
  stat_boldness smallint default 5 check (stat_boldness between 1 and 10),
  stat_creativity smallint default 5 check (stat_creativity between 1 and 10),
  stat_knowledge smallint default 5 check (stat_knowledge between 1 and 10),
  stat_adaptability smallint default 5 check (stat_adaptability between 1 and 10),
  -- specialties (max 3 categories)
  specialties text[] default '{}' check (array_length(specialties, 1) <= 3),
  -- evolution
  traits jsonb default '{}',           -- auto-earned traits: {"confident": 1, "cautious": -1}
  manual_overrides jsonb default '{}',  -- creator manual adjustments
  -- record
  elo integer default 1000,
  wins integer default 0,
  losses integer default 0,
  version integer default 1,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Battles
create table public.battles (
  id uuid primary key default gen_random_uuid(),
  agent_a_id uuid not null references public.agents(id),
  agent_b_id uuid not null references public.agents(id),
  topic text not null,
  topic_category text not null,
  -- agent_a is always PRO, agent_b is always CON
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'aborted')),
  winner_id uuid references public.agents(id),
  -- scoring
  score_a jsonb,  -- {"logic": 18, "rebuttal": 15, "consistency": 17, "persuasion": 16, "expression": 14, "total": 80}
  score_b jsonb,
  spectator_votes_a integer default 0,
  spectator_votes_b integer default 0,
  -- ELO changes
  elo_change_a integer default 0,
  elo_change_b integer default 0,
  -- model tier used
  model_tier text default 'free' check (model_tier in ('free', 'premium')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- 4. Battle Turns
create table public.battle_turns (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  turn_number smallint not null check (turn_number between 1 and 5),
  agent_id uuid not null references public.agents(id),
  role text not null check (role in ('pro', 'con')),
  content text not null,
  turn_type text not null check (turn_type in ('opening', 'rebuttal', 'counter', 'free', 'closing')),
  tokens_used integer default 0,
  created_at timestamptz default now()
);

-- 5. ELO History
create table public.elo_history (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  battle_id uuid references public.battles(id),
  elo_before integer not null,
  elo_after integer not null,
  change integer not null,
  created_at timestamptz default now()
);

-- ============================================
-- Indexes
-- ============================================
create index idx_agents_owner on public.agents(owner_id);
create index idx_agents_elo on public.agents(elo desc);
create index idx_battles_status on public.battles(status);
create index idx_battles_agents on public.battles(agent_a_id, agent_b_id);
create index idx_battle_turns_battle on public.battle_turns(battle_id, turn_number);
create index idx_elo_history_agent on public.elo_history(agent_id, created_at desc);

-- ============================================
-- RLS Policies
-- ============================================
alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.battles enable row level security;
alter table public.battle_turns enable row level security;
alter table public.elo_history enable row level security;

-- Profiles: anyone authenticated can read, only own can update
create policy "profiles_select" on public.profiles for select using (auth.uid() is not null);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Agents: anyone can read, only owner can CUD
create policy "agents_select" on public.agents for select using (true);
create policy "agents_insert" on public.agents for insert with check (auth.uid() = owner_id);
create policy "agents_update" on public.agents for update using (auth.uid() = owner_id);
create policy "agents_delete" on public.agents for delete using (auth.uid() = owner_id);

-- Battles: anyone can read, system inserts (via service role)
create policy "battles_select" on public.battles for select using (true);

-- Battle Turns: anyone can read
create policy "turns_select" on public.battle_turns for select using (true);

-- ELO History: anyone can read
create policy "elo_select" on public.elo_history for select using (true);

-- ============================================
-- Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', 'Agent Master')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Updated_at trigger
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger agents_updated_at before update on public.agents
  for each row execute function public.update_updated_at();
