-- Login accounts are Supabase Auth users; this table holds their username, role and status.
-- Rows are created only by the admin API (service role), so a self sign-up via the anon key gets no profile and can't press.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  role text not null default 'user' check (role in ('user', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- actor_id has no FK on purpose: deleting a user must not erase what they did.
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_username text not null,
  action text not null,
  target text,
  details jsonb not null default '{}'
);

alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;
revoke insert, update, delete on public.profiles, public.audit_log from anon, authenticated;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins read profiles" on public.profiles for select to authenticated using (public.is_admin());
create policy "admins read audit" on public.audit_log for select to authenticated using (public.is_admin());

-- Pressing now needs an active account, and every press is audited in the same statement.
drop function public.increment_blame(text);

create function public.increment_blame(target text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles;
  person public.people;
begin
  select * into me from public.profiles where id = auth.uid() and active;
  if not found then
    raise exception 'login with an active account to blame' using errcode = '42501';
  end if;

  update public.people set count = count + 1 where side = target returning * into person;
  if not found then
    raise exception 'unknown side %', target using errcode = '22023';
  end if;

  insert into public.audit_log (actor_id, actor_username, action, target, details)
  values (me.id, me.username, 'blame', person.name, jsonb_build_object('side', target, 'new_count', person.count));
  return person.count;
end;
$$;

revoke execute on function public.increment_blame(text) from public, anon;
grant execute on function public.increment_blame(text) to authenticated;
