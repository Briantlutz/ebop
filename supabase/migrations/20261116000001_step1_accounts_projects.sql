-- Ebop, Launch release, build step 1: accounts, projects, phases.
-- Brief §5 "users" lives in public.profiles (one row per auth.users row) so it
-- never collides with Supabase's own auth.users table.

create type public.plan_shape as enum ('app', 'operations', 'mixed');
create type public.phase_name as enum ('define', 'plan', 'build', 'launch', 'live');
create type public.phase_state as enum ('upcoming', 'open', 'done');
create type public.project_status as enum ('active', 'closed');
create type public.theme_pref as enum ('system', 'light', 'dark');

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  theme public.theme_pref not null default 'system',
  created_at timestamptz not null default now()
);

-- Create the profile row whenever someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  plan_shape public.plan_shape not null,
  current_phase public.phase_name not null default 'define',
  status public.project_status not null default 'active',
  focus_pinned boolean not null default false,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id, updated_at desc);

-- ---------------------------------------------------------------- phases
create table public.phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name public.phase_name not null,
  state public.phase_state not null default 'upcoming',
  opened_at timestamptz,
  wrapped_at timestamptz,
  unique (project_id, name)
);

-- Every project gets all five phases; Define opens immediately.
create function public.create_project_phases()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.phases (project_id, name, state, opened_at)
  values
    (new.id, 'define', 'open', now()),
    (new.id, 'plan', 'upcoming', null),
    (new.id, 'build', 'upcoming', null),
    (new.id, 'launch', 'upcoming', null),
    (new.id, 'live', 'upcoming', null);
  return new;
end;
$$;

create trigger on_project_created
  after insert on public.projects
  for each row execute function public.create_project_phases();

-- These run only from triggers, never from the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_project_phases() from public, anon, authenticated;

-- ---------------------------------------------------------------- row-level security
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.phases enable row level security;

create policy "Own profile: read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Own profile: update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Own projects: read" on public.projects
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own projects: create" on public.projects
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own projects: update" on public.projects
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own projects: delete" on public.projects
  for delete to authenticated using (user_id = (select auth.uid()));

-- Phases are created by trigger and changed by later steps (Phase wrap); read-only for now.
create policy "Own phases: read" on public.phases
  for select to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = phases.project_id and p.user_id = (select auth.uid())
    )
  );
