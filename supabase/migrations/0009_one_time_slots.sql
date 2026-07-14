-- One-time (non-repeating) lessons. `slots` otherwise means "recurring
-- every week on day_of_week" — one_time_date overrides that: when set,
-- this slot occurs exactly once, on this exact date, and never recurs.
-- day_of_week is still populated (derived from one_time_date at creation)
-- so existing day-of-week-based summaries/labels keep working unchanged.
alter table slots add column one_time_date date;

create index slots_one_time_date_idx on slots(one_time_date) where one_time_date is not null;
