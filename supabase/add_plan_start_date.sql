-- Adds plan_start_date to athletes so the active week auto-advances each week.
-- Run in Supabase SQL Editor → New query → Run

alter table public.athletes add column if not exists plan_start_date date;
