-- At most one queued/running scan per project. The application already checks
-- this under a per-account advisory lock; the index is the database-level
-- guarantee for any writer outside that lock.

-- Resolve any existing duplicates first: keep the newest active scan per
-- project and fail the older ones.
update public.scans s
set status = 'failed',
    error = coalesce(s.error, 'Superseded by a newer scan.')
where s.status in ('queued', 'running')
  and exists (
    select 1
    from public.scans newer
    where newer.project_id = s.project_id
      and newer.status in ('queued', 'running')
      and (newer.created_at, newer.id) > (s.created_at, s.id)
  );

create unique index if not exists scans_one_active_per_project
  on public.scans (project_id)
  where status in ('queued', 'running');
