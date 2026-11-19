-- Ebop, Launch release, build step 2: Strategist session, Checkpoints, decisions.
-- Adds the expert roster (all 12, so step 4's pickers have data), each project's
-- team, the session's messages, checkpoint batches, decisions with authorship,
-- and progress events for the north-star metric.

create type public.expert_role as enum ('strategist', 'designer', 'engineer');
create type public.expert_warmth as enum ('warm', 'candid');
create type public.expert_pace as enum ('deep', 'quick');
create type public.message_sender as enum ('user', 'expert');
create type public.decision_status as enum ('open', 'locked', 'parked');
create type public.decision_author as enum ('user', 'expert_suggested_user_approved');
create type public.guardrail_kind as enum ('legal', 'medical', 'financial', 'tax', 'safety');
create type public.batch_state as enum ('pending', 'paused', 'done');
create type public.progress_kind as enum ('phase_completed', 'decision_recorded', 'live_update_acted');

-- ---------------------------------------------------------------- experts (reference data)
create table public.experts (
  id text primary key,
  role public.expert_role not null,
  name text not null,
  warmth public.expert_warmth not null,
  pace public.expert_pace not null,
  sample_line text not null,
  voice_prompt text not null,
  is_default boolean not null default false,
  unique (role, warmth, pace)
);

insert into public.experts (id, role, name, warmth, pace, is_default, sample_line, voice_prompt) values
-- Strategists
('strategist-coach', 'strategist', 'The Coach', 'warm', 'deep', false,
 'Let''s slow down for a second and get this right. Here''s what I''d lock first, and why.',
 'You are The Coach, the Strategist. Warm and patient. You explain your reasoning fully, connect each choice to what the person told you, and name the tradeoff in plain words. Encourage without flattering. Replies run a short paragraph or two.'),
('strategist-champion', 'strategist', 'The Champion', 'warm', 'quick', true,
 'Love this. Three calls to make today and we''re moving.',
 'You are The Champion, the Strategist. Warm, upbeat and brisk. You lead with momentum: what to decide now and why it moves the project forward. Keep replies to two to four short sentences. Enthusiasm is real but never replaces substance.'),
('strategist-analyst', 'strategist', 'The Analyst', 'candid', 'deep', false,
 'Two of these assumptions are carrying the whole plan. Let''s test them before we build on them.',
 'You are The Analyst, the Strategist. Candid and thorough. You surface assumptions, risks and second-order effects, and you say plainly when something won''t work, always with a better path. Structured, precise, a short paragraph or two.'),
('strategist-straight-shooter', 'strategist', 'The Straight Shooter', 'candid', 'quick', false,
 'Here''s the call. Here''s why. Next.',
 'You are The Straight Shooter, the Strategist. Candid and fast. No cushioning, no filler: the recommendation, the reason, the next step. One to three sentences.'),
-- Designers
('designer-guide', 'designer', 'The Guide', 'warm', 'deep', false,
 'Let''s walk through it the way your customer will, one step at a time.',
 'You are The Guide, the Designer. Warm and thorough. You walk through experiences step by step from the customer''s point of view and explain why each choice helps them. A short paragraph or two.'),
('designer-rapid-prototyper', 'designer', 'The Rapid Prototyper', 'warm', 'quick', true,
 'Quick sketch: try this layout, see how it feels, adjust.',
 'You are The Rapid Prototyper, the Designer. Warm and quick. You propose a concrete first version fast and invite a reaction. Two to four short sentences.'),
('designer-curator', 'designer', 'The Curator', 'candid', 'deep', false,
 'This screen is doing four jobs. It should do one. Here''s the one.',
 'You are The Curator, the Designer. Candid and considered. You cut what doesn''t serve the customer and explain the principle behind each cut. A short paragraph or two.'),
('designer-editor', 'designer', 'The Editor', 'candid', 'quick', false,
 'Cut the second button. Rename the first. Done.',
 'You are The Editor, the Designer. Candid and fast. You trim and tighten with short, specific edits. One to three sentences.'),
-- Engineers
('engineer-mentor', 'engineer', 'The Mentor', 'warm', 'deep', false,
 'Here''s how the pieces fit together, and why I''d build it this way.',
 'You are The Mentor, the Engineer. Warm and thorough. You explain technical choices in plain language so a non-engineer understands the tradeoffs. A short paragraph or two.'),
('engineer-tinkerer', 'engineer', 'The Tinkerer', 'warm', 'quick', true,
 'Simplest thing that works: start here, we can swap it later.',
 'You are The Tinkerer, the Engineer. Warm and quick. You favor the simplest working approach and say how it can grow later. Two to four short sentences.'),
('engineer-architect', 'engineer', 'The Architect', 'candid', 'deep', false,
 'This will hold for a hundred users and break at ten thousand. Here''s the fix now, while it''s cheap.',
 'You are The Architect, the Engineer. Candid and thorough. You think about structure, scale and failure modes, and you say plainly what will break, always with the fix. A short paragraph or two.'),
('engineer-pragmatist', 'engineer', 'The Pragmatist', 'candid', 'quick', false,
 'Use the off-the-shelf option. Ship it. Revisit if it hurts.',
 'You are The Pragmatist, the Engineer. Candid and fast. You pick the boring option that ships and say why. One to three sentences.');

-- ---------------------------------------------------------------- project team
create table public.project_experts (
  project_id uuid not null references public.projects (id) on delete cascade,
  role public.expert_role not null,
  expert_id text not null references public.experts (id),
  chosen_at timestamptz not null default now(),
  primary key (project_id, role)
);

-- Every new project starts with the default expert in each role (step 4 adds pickers).
create function public.create_project_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_experts (project_id, role, expert_id)
  select new.id, e.role, e.id from public.experts e where e.is_default;
  return new;
end;
$$;

create trigger on_project_created_team
  after insert on public.projects
  for each row execute function public.create_project_team();

-- Projects created in step 1 get their team now.
insert into public.project_experts (project_id, role, expert_id)
select p.id, e.role, e.id
from public.projects p cross join public.experts e
where e.is_default
on conflict do nothing;

-- ---------------------------------------------------------------- intake
-- Answers to the first session's three questions: {"what": "...", "who": "...", "done": "..."}.
alter table public.projects add column intake jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------- checkpoint batches
create table public.checkpoint_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase public.phase_name not null,
  state public.batch_state not null default 'pending',
  -- Guardrail and big decisions come one at a time, in a batch of their own.
  single boolean not null default false,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index checkpoint_batches_project_idx on public.checkpoint_batches (project_id, created_at);

-- ---------------------------------------------------------------- decisions
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase public.phase_name not null,
  title text not null check (char_length(title) between 1 and 200),
  detail text not null default '' check (char_length(detail) <= 2000),
  reason text not null default '' check (char_length(reason) <= 2000),
  status public.decision_status not null default 'open',
  parked_for_phase public.phase_name,
  -- Null while waiting in a checkpoint; set when the user approves or changes it.
  author public.decision_author,
  proposed_by text references public.experts (id),
  source text not null default 'session',
  guardrail_kind public.guardrail_kind,
  guardrail_stakes text,
  professional_questions text[] not null default '{}',
  batch_id uuid references public.checkpoint_batches (id) on delete set null,
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  constraint locked_has_author check (status <> 'locked' or (author is not null and locked_at is not null))
);

create index decisions_project_idx on public.decisions (project_id, status);
create index decisions_batch_idx on public.decisions (batch_id);

-- ---------------------------------------------------------------- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase public.phase_name not null,
  expert_id text references public.experts (id),
  sender public.message_sender not null,
  body text not null check (char_length(body) between 1 and 8000),
  -- Set when the user asked about a specific checkpoint item.
  decision_id uuid references public.decisions (id) on delete set null,
  created_at timestamptz not null default now()
);

create index messages_project_idx on public.messages (project_id, created_at);

-- ---------------------------------------------------------------- progress events
create table public.progress_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind public.progress_kind not null,
  created_at timestamptz not null default now()
);

create index progress_events_project_idx on public.progress_events (project_id, created_at);

-- Locking a decision records progress and bumps the project to the top of Home.
create function public.on_decision_locked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'locked' and (tg_op = 'INSERT' or old.status is distinct from 'locked') then
    insert into public.progress_events (project_id, kind) values (new.project_id, 'decision_recorded');
  end if;
  update public.projects set updated_at = now() where id = new.project_id;
  return new;
end;
$$;

create trigger on_decision_changed
  after insert or update of status on public.decisions
  for each row execute function public.on_decision_locked();

create function public.touch_project_from_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects set updated_at = now() where id = new.project_id;
  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.touch_project_from_message();

revoke execute on function public.create_project_team() from public, anon, authenticated;
revoke execute on function public.on_decision_locked() from public, anon, authenticated;
revoke execute on function public.touch_project_from_message() from public, anon, authenticated;

-- ---------------------------------------------------------------- row-level security
-- Ownership flows from projects, whose own policies already limit rows to the owner,
-- so this check runs as the caller (security invoker) and needs no extra privileges.
create function public.owns_project(p_project_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (select 1 from public.projects where id = p_project_id);
$$;

alter table public.experts enable row level security;
alter table public.project_experts enable row level security;
alter table public.checkpoint_batches enable row level security;
alter table public.decisions enable row level security;
alter table public.messages enable row level security;
alter table public.progress_events enable row level security;

create policy "Experts: read" on public.experts for select to authenticated using (true);

create policy "Own team: read" on public.project_experts
  for select to authenticated using ((select public.owns_project(project_id)));
create policy "Own team: update" on public.project_experts
  for update to authenticated
  using ((select public.owns_project(project_id))) with check ((select public.owns_project(project_id)));

create policy "Own batches: read" on public.checkpoint_batches
  for select to authenticated using ((select public.owns_project(project_id)));
create policy "Own batches: create" on public.checkpoint_batches
  for insert to authenticated with check ((select public.owns_project(project_id)));
create policy "Own batches: update" on public.checkpoint_batches
  for update to authenticated
  using ((select public.owns_project(project_id))) with check ((select public.owns_project(project_id)));

create policy "Own decisions: read" on public.decisions
  for select to authenticated using ((select public.owns_project(project_id)));
create policy "Own decisions: create" on public.decisions
  for insert to authenticated with check ((select public.owns_project(project_id)));
create policy "Own decisions: update" on public.decisions
  for update to authenticated
  using ((select public.owns_project(project_id))) with check ((select public.owns_project(project_id)));

create policy "Own messages: read" on public.messages
  for select to authenticated using ((select public.owns_project(project_id)));
create policy "Own messages: create" on public.messages
  for insert to authenticated with check ((select public.owns_project(project_id)));

create policy "Own progress: read" on public.progress_events
  for select to authenticated using ((select public.owns_project(project_id)));
