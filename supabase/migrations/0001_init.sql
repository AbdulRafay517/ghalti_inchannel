create table public.people (
  id int generated always as identity primary key,
  name text not null,
  photo_path text not null,
  side text not null unique check (side in ('left', 'right')),
  count int not null default 0
);

create table public.excuses (
  id int generated always as identity primary key,
  text text not null,
  audio_path text not null
);

alter table public.people enable row level security;
alter table public.excuses enable row level security;

create policy "public read people" on public.people for select to anon, authenticated using (true);
create policy "public read excuses" on public.excuses for select to anon, authenticated using (true);

revoke insert, update, delete on public.people, public.excuses from anon, authenticated;

-- Only way the public can write: bump the left person's count by one, atomically.
create function public.increment_blame()
returns int
language sql
security definer
set search_path = ''
as $$
  update public.people set count = count + 1 where side = 'left' returning count;
$$;

revoke execute on function public.increment_blame() from public;
grant execute on function public.increment_blame() to anon, authenticated;

-- Public bucket: objects are readable by URL, uploads only via dashboard / service role.
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;
