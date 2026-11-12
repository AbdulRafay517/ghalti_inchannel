-- An excuse can show an animation instead of (or alongside) text.
alter table public.excuses
  alter column text drop not null,
  add column animation text check (animation in ('bicep_curl')),
  add constraint excuses_has_content check (text is not null or animation is not null);
