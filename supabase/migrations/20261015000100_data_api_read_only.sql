-- The application writes only from the server (Drizzle over DATABASE_URL),
-- never through the Supabase Data API. Signed-in users only need to read
-- their own rows there. Any write path through the Data API would let a user
-- call it with their own access token and the public anon key to change
-- protected columns (e.g. profiles.is_admin, projects.user_id) or bypass the
-- server-side plan limits and validation. Remove all of them.

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "projects_insert" on public.projects;
drop policy if exists "projects_update" on public.projects;
drop policy if exists "projects_delete" on public.projects;
drop policy if exists "competitors_all" on public.competitors;
drop policy if exists "queries_all" on public.queries;
drop policy if exists "recommendations_all" on public.recommendations;

create policy "competitors_select" on public.competitors
  for select to authenticated using (public.can_access_project(project_id));
create policy "queries_select" on public.queries
  for select to authenticated using (public.can_access_project(project_id));
create policy "recommendations_select" on public.recommendations
  for select to authenticated using (public.can_access_project(project_id));

-- Defense in depth: the API roles get read access at most, now and for
-- tables created by later migrations.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
