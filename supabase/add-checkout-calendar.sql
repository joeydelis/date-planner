create extension if not exists "uuid-ossp";

alter table public.list_items
add column if not exists checkout boolean default false;

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

alter table public.scheduled_dates enable row level security;

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
