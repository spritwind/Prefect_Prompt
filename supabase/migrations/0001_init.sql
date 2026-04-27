-- Prompt Hub initial schema
-- Run via: supabase db push  (or paste in Supabase SQL editor)

create table if not exists public.presets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  prompt_id    text not null,
  name         text not null,
  values       jsonb not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists presets_user_prompt_idx
  on public.presets(user_id, prompt_id);

create table if not exists public.recent_uses (
  user_id      uuid not null references auth.users(id) on delete cascade,
  preset_id    uuid references public.presets(id) on delete cascade,
  prompt_id    text not null,
  used_at      timestamptz default now(),
  primary key (user_id, prompt_id, preset_id)
);

create index if not exists recent_uses_user_used_idx
  on public.recent_uses(user_id, used_at desc);

-- RLS
alter table public.presets enable row level security;
alter table public.recent_uses enable row level security;

drop policy if exists "own presets" on public.presets;
create policy "own presets" on public.presets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own recent" on public.recent_uses;
create policy "own recent" on public.recent_uses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists presets_updated_at on public.presets;
create trigger presets_updated_at
  before update on public.presets
  for each row execute function public.set_updated_at();
