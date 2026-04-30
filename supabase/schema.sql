create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text default 'New User',
  created_at timestamptz default now()
);

create table if not exists public.couples (
  id uuid primary key default uuid_generate_v4(),
  invite_code text unique not null,
  invite_used boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.couple_members (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  unique(user_id)
);

create table if not exists public.list_items (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade not null,
  type text not null,
  name text not null,
  plays integer default 0,
  favorite boolean default false,
  checkout boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.scheduled_dates (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid references public.couples(id) on delete cascade not null,
  list_item_id uuid references public.list_items(id) on delete set null,
  title text not null,
  scheduled_for date not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.is_couple_member(target_couple_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.couple_members
    where couple_id = target_couple_id
      and user_id = auth.uid()
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.list_items enable row level security;
alter table public.scheduled_dates enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (id = auth.uid());

drop policy if exists "Members can read partner profiles" on public.profiles;
create policy "Members can read partner profiles"
on public.profiles for select
using (
  id in (
    select cm2.user_id
    from public.couple_members cm1
    join public.couple_members cm2 on cm1.couple_id = cm2.couple_id
    where cm1.user_id = auth.uid()
  )
);

drop policy if exists "Users can create couples" on public.couples;
create policy "Users can create couples"
on public.couples for insert
with check (auth.uid() is not null);

drop policy if exists "Members can read their couple" on public.couples;
create policy "Members can read their couple"
on public.couples for select
using (
  public.is_couple_member(id)
  or invite_used = false
);

drop policy if exists "Members can update their couple" on public.couples;
create policy "Members can update their couple"
on public.couples for update
using (public.is_couple_member(id) or invite_used = false);

drop policy if exists "Users can join/create memberships" on public.couple_members;
create policy "Users can join/create memberships"
on public.couple_members for insert
with check (user_id = auth.uid());

drop policy if exists "Members can read couple memberships" on public.couple_members;
create policy "Members can read couple memberships"
on public.couple_members for select
using (
  user_id = auth.uid()
  or public.is_couple_member(couple_id)
);

drop policy if exists "Users can leave their couple" on public.couple_members;
create policy "Users can leave their couple"
on public.couple_members for delete
using (user_id = auth.uid());

drop policy if exists "Members can read items" on public.list_items;
create policy "Members can read items"
on public.list_items for select
using (public.is_couple_member(couple_id));

drop policy if exists "Members can insert items" on public.list_items;
create policy "Members can insert items"
on public.list_items for insert
with check (public.is_couple_member(couple_id));

drop policy if exists "Members can update items" on public.list_items;
create policy "Members can update items"
on public.list_items for update
using (public.is_couple_member(couple_id));

drop policy if exists "Members can delete items" on public.list_items;
create policy "Members can delete items"
on public.list_items for delete
using (public.is_couple_member(couple_id));

drop policy if exists "Members can read scheduled dates" on public.scheduled_dates;
create policy "Members can read scheduled dates"
on public.scheduled_dates for select
using (public.is_couple_member(couple_id));

drop policy if exists "Members can insert scheduled dates" on public.scheduled_dates;
create policy "Members can insert scheduled dates"
on public.scheduled_dates for insert
with check (public.is_couple_member(couple_id));

drop policy if exists "Members can update scheduled dates" on public.scheduled_dates;
create policy "Members can update scheduled dates"
on public.scheduled_dates for update
using (public.is_couple_member(couple_id))
with check (public.is_couple_member(couple_id));

drop policy if exists "Members can delete scheduled dates" on public.scheduled_dates;
create policy "Members can delete scheduled dates"
on public.scheduled_dates for delete
using (public.is_couple_member(couple_id));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'list_items'
  ) then
    alter publication supabase_realtime add table public.list_items;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scheduled_dates'
  ) then
    alter publication supabase_realtime add table public.scheduled_dates;
  end if;
end $$;
