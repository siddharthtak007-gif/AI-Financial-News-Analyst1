-- AI Financial News Analyst — Supabase (PostgreSQL) schema
-- Run this in Supabase SQL Editor or via migration tooling.

create extension if not exists "pgcrypto";

create table if not exists public.tracked_assets (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  created_at timestamptz not null default now(),
  constraint tracked_assets_ticker_unique unique (ticker)
);

create table if not exists public.alerts_history (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  sentiment text not null,
  impact_score integer not null check (impact_score between 1 and 10),
  summary text not null,
  "timestamp" timestamptz not null default now()
);

create index if not exists alerts_history_timestamp_idx
  on public.alerts_history ("timestamp" desc);

create index if not exists tracked_assets_created_at_idx
  on public.tracked_assets (created_at desc);

-- Demo / dev-friendly policies (tighten for production)
alter table public.tracked_assets enable row level security;
alter table public.alerts_history enable row level security;

create policy "tracked_assets_select_all"
  on public.tracked_assets for select using (true);

create policy "tracked_assets_insert_all"
  on public.tracked_assets for insert with check (true);

create policy "tracked_assets_update_all"
  on public.tracked_assets for update using (true) with check (true);

create policy "alerts_history_select_all"
  on public.alerts_history for select using (true);

create policy "alerts_history_insert_all"
  on public.alerts_history for insert with check (true);
