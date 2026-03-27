-- Feed Me — Supabase Schema
-- Run this in the Supabase SQL editor to set up all tables.
-- Note: household_id = auth.uid() for Phase 1 (one user = one household).

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table if not exists households (
  id uuid primary key,  -- equals auth.uid() for Phase 1
  name text not null default 'My Household',
  created_at timestamptz not null default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  source text,
  source_url text,
  description text,
  difficulty text,
  cook_time integer,
  is_meat boolean not null default false,
  is_vegetarian boolean not null default false,
  is_easy_cleanup boolean not null default false,
  baby_note text,
  created_at timestamptz not null default now()
);

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  name text not null,
  amount text,
  section text not null default 'other'
);

create table if not exists recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  step_number integer not null,
  instruction text not null
);

create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  week_start date,
  confirmed_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  name text not null,
  source text,
  source_url text,
  is_new boolean not null default true,
  is_meat boolean not null default false,
  is_vegetarian boolean not null default false,
  has_leftovers boolean not null default false,
  leftover_days integer not null default 0,
  cook_time integer,
  difficulty text,
  is_easy_cleanup boolean not null default false,
  description text,
  baby_note text,
  uses_fridge_items text[] not null default '{}'
);

create table if not exists meal_history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  meal_name text not null,
  source text,
  signal text not null check (signal in ('save', 'skip')),
  created_at timestamptz not null default now()
);

create table if not exists grocery_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists grocery_items (
  id uuid primary key default gen_random_uuid(),
  grocery_list_id uuid not null references grocery_lists(id) on delete cascade,
  text text not null,
  section text not null default 'other',
  checked boolean not null default false,
  from_meal boolean not null default false,
  is_staple boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists staples (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  text text not null,
  section text not null default 'other'
);

create table if not exists fridge_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists taste_profile (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Phase 2: friends
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  household_id_a uuid not null references households(id) on delete cascade,
  household_id_b uuid not null references households(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists invite_links (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  token text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table households enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table recipe_steps enable row level security;
alter table meal_plans enable row level security;
alter table meal_plan_items enable row level security;
alter table meal_history enable row level security;
alter table grocery_lists enable row level security;
alter table grocery_items enable row level security;
alter table staples enable row level security;
alter table fridge_items enable row level security;
alter table taste_profile enable row level security;
alter table friendships enable row level security;
alter table invite_links enable row level security;

-- Households: users only access their own (id = auth.uid())
create policy "household_own" on households for all
  using (id = auth.uid()) with check (id = auth.uid());

-- Recipes
create policy "recipes_own" on recipes for all
  using (household_id = auth.uid()) with check (household_id = auth.uid());

create policy "recipe_ingredients_own" on recipe_ingredients for all
  using (recipe_id in (select id from recipes where household_id = auth.uid()));

create policy "recipe_steps_own" on recipe_steps for all
  using (recipe_id in (select id from recipes where household_id = auth.uid()));

-- Meal plans
create policy "meal_plans_own" on meal_plans for all
  using (household_id = auth.uid()) with check (household_id = auth.uid());

create policy "meal_plan_items_own" on meal_plan_items for all
  using (meal_plan_id in (select id from meal_plans where household_id = auth.uid()));

-- Meal history
create policy "meal_history_own" on meal_history for all
  using (household_id = auth.uid()) with check (household_id = auth.uid());

-- Grocery
create policy "grocery_lists_own" on grocery_lists for all
  using (household_id = auth.uid()) with check (household_id = auth.uid());

create policy "grocery_items_own" on grocery_items for all
  using (grocery_list_id in (select id from grocery_lists where household_id = auth.uid()));

-- Staples, fridge, taste profile
create policy "staples_own" on staples for all
  using (household_id = auth.uid()) with check (household_id = auth.uid());

create policy "fridge_items_own" on fridge_items for all
  using (household_id = auth.uid()) with check (household_id = auth.uid());

create policy "taste_profile_own" on taste_profile for all
  using (household_id = auth.uid()) with check (household_id = auth.uid());

-- Friendships (Phase 2 — either side can read)
create policy "friendships_own" on friendships for all
  using (household_id_a = auth.uid() or household_id_b = auth.uid());

create policy "invite_links_own" on invite_links for all
  using (household_id = auth.uid()) with check (household_id = auth.uid());

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime for grocery_items (live sync across devices)
alter publication supabase_realtime add table grocery_items;
