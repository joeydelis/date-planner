alter table public.profiles
add column if not exists username text;

create unique index if not exists profiles_username_key
on public.profiles (username)
where username is not null;

alter table public.profiles enable row level security;

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can find profiles by username" on public.profiles;
create policy "Users can find profiles by username"
on public.profiles for select
to authenticated
using (username is not null);

create table if not exists public.couple_invites (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade not null,
  from_user_id uuid references public.profiles(id) on delete cascade not null,
  to_user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  unique (couple_id, to_user_id, status)
);

alter table public.couple_invites enable row level security;

drop policy if exists "Users can read their sent and received invites" on public.couple_invites;
create policy "Users can read their sent and received invites"
on public.couple_invites for select
to authenticated
using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists "Members can send couple invites" on public.couple_invites;
create policy "Members can send couple invites"
on public.couple_invites for insert
to authenticated
with check (
  from_user_id = auth.uid()
  and public.is_couple_member(couple_id)
  and to_user_id <> auth.uid()
);

drop policy if exists "Recipients can update invite status" on public.couple_invites;
create policy "Recipients can update invite status"
on public.couple_invites for update
to authenticated
using (to_user_id = auth.uid())
with check (to_user_id = auth.uid());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_invites'
  ) then
    alter publication supabase_realtime add table public.couple_invites;
  end if;
end $$;
