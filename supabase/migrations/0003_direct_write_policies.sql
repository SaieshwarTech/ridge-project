-- ============================================================================
-- Write policies for browser-direct Supabase mode (VITE_APP_MODE=supabase).
-- These let the signed-in user perform demo-critical writes directly, with RLS
-- as the sole authorization layer (no server tier). Run after 0001 + 0002.
--
-- NOT needed if you deploy the Vercel serverless functions (which use the
-- service-role key). Safe to run either way.
-- ============================================================================

-- Teachers may create their own sessions (only for classes/subjects they teach).
create policy sessions_teacher_insert on class_sessions for insert to authenticated
  with check (
    teacher_id = my_teacher_id()
    and exists (
      select 1 from teacher_assignments ta
      where ta.teacher_id = my_teacher_id()
        and ta.class_id = class_sessions.class_id
        and ta.subject_id = class_sessions.subject_id
    )
  );

-- Teachers may insert/update attendance for their own sessions.
create policy attend_teacher_insert on attendance_records for insert to authenticated
  with check (
    exists (select 1 from class_sessions cs where cs.id = attendance_records.session_id and cs.teacher_id = my_teacher_id())
  );

create policy attend_teacher_update on attendance_records for update to authenticated
  using (exists (select 1 from class_sessions cs where cs.id = attendance_records.session_id and cs.teacher_id = my_teacher_id()))
  with check (exists (select 1 from class_sessions cs where cs.id = attendance_records.session_id and cs.teacher_id = my_teacher_id()));

-- Any signed-in user may write their own audit entries (actor must be themself).
create policy audit_insert_self on audit_logs for insert to authenticated
  with check (actor_id = auth.uid());

-- Admins may manage reference data and toggle student/profile active state.
create policy classes_admin_write  on classes  for insert to authenticated with check (auth_role() = 'admin');
create policy subjects_admin_write on subjects for insert to authenticated with check (auth_role() = 'admin');

create policy students_admin_update on students for update to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy profiles_admin_update on profiles for update to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');
