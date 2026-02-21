-- NPC System User + 5 NPC Agents (matching the 5 presets)
-- Run this in Supabase SQL Editor

-- 1. Create NPC user in auth.users first (FK requirement)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'npc@agentopia.system',
  '$2a$10$placeholder_not_a_real_password_hash_000000000000000000',
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"npc_system"}'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the NPC system profile
INSERT INTO public.profiles (id, username, display_name, tier)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'npc_system',
  'Arena NPCs',
  'free'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert 5 NPC agents matching the preset archetypes
-- The Logician
INSERT INTO public.agents (
  owner_id, name,
  stat_logic, stat_aggression, stat_brevity, stat_humor,
  stat_boldness, stat_creativity, stat_knowledge, stat_adaptability,
  specialties, elo
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'NPC: The Logician',
  9, 3, 7, 2, 4, 5, 8, 4,
  ARRAY['science', 'philosophy'],
  1000
);

-- The Firebrand
INSERT INTO public.agents (
  owner_id, name,
  stat_logic, stat_aggression, stat_brevity, stat_humor,
  stat_boldness, stat_creativity, stat_knowledge, stat_adaptability,
  specialties, elo
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'NPC: The Firebrand',
  5, 9, 4, 6, 9, 7, 5, 5,
  ARRAY['politics', 'culture'],
  1000
);

-- The Diplomat
INSERT INTO public.agents (
  owner_id, name,
  stat_logic, stat_aggression, stat_brevity, stat_humor,
  stat_boldness, stat_creativity, stat_knowledge, stat_adaptability,
  specialties, elo
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'NPC: The Diplomat',
  7, 3, 5, 5, 5, 6, 7, 9,
  ARRAY['ethics', 'psychology'],
  1000
);

-- The Wildcard
INSERT INTO public.agents (
  owner_id, name,
  stat_logic, stat_aggression, stat_brevity, stat_humor,
  stat_boldness, stat_creativity, stat_knowledge, stat_adaptability,
  specialties, elo
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'NPC: The Wildcard',
  4, 5, 6, 9, 8, 9, 4, 7,
  ARRAY['culture', 'philosophy'],
  1000
);

-- The Scholar
INSERT INTO public.agents (
  owner_id, name,
  stat_logic, stat_aggression, stat_brevity, stat_humor,
  stat_boldness, stat_creativity, stat_knowledge, stat_adaptability,
  specialties, elo
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'NPC: The Scholar',
  8, 2, 4, 3, 3, 5, 10, 5,
  ARRAY['history', 'science', 'economics'],
  1000
);
