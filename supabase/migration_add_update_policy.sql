-- Run if tracked_assets upsert fails (existing projects)
create policy if not exists "tracked_assets_update_all"
  on public.tracked_assets for update using (true) with check (true);
