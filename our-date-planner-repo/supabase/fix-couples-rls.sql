alter table public.couples enable row level security;

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
