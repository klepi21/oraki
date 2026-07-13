-- Rate limiting for the student magic-link lookup route. Backed by
-- Postgres (not in-memory) because the app runs as multiple serverless
-- instances on Vercel — in-memory counters would not share state.
create table rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket_key text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_hits_bucket_created_idx on rate_limit_hits(bucket_key, created_at);

alter table rate_limit_hits enable row level security;
-- No policies granted to `authenticated`/`anon` — only the service-role
-- key (used from the student API route) ever touches this table.

create or replace function check_rate_limit(p_bucket_key text, p_max_hits int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from rate_limit_hits
    where bucket_key = p_bucket_key
      and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count from rate_limit_hits where bucket_key = p_bucket_key;

  if v_count >= p_max_hits then
    return false;
  end if;

  insert into rate_limit_hits (bucket_key) values (p_bucket_key);
  return true;
end;
$$;

revoke all on function check_rate_limit(text, int, int) from public;
