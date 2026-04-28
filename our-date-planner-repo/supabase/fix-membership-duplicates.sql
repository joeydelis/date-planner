with ranked_memberships as (
  select
    id,
    row_number() over (
      partition by user_id
      order by created_at desc, id desc
    ) as membership_rank
  from public.couple_members
)
delete from public.couple_members
where id in (
  select id
  from ranked_memberships
  where membership_rank > 1
);

alter table public.couple_members
alter column couple_id set not null,
alter column user_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'couple_members_user_id_key'
      and conrelid = 'public.couple_members'::regclass
  ) then
    alter table public.couple_members
    add constraint couple_members_user_id_key unique (user_id);
  end if;
end $$;
