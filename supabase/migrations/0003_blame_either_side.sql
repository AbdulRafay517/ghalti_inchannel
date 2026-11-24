-- Both people now have their own counter: the public may bump either side by one.
drop function public.increment_blame();

create function public.increment_blame(target text)
returns int
language sql
security definer
set search_path = ''
as $$
  update public.people set count = count + 1 where side = target returning count;
$$;

revoke execute on function public.increment_blame(text) from public;
grant execute on function public.increment_blame(text) to anon, authenticated;
