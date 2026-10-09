-- ============================================================================
-- Row Level Security. Defense-in-depth for the public anon key: the serverless
-- functions use the service-role key (which bypasses RLS) and authorize every
-- request in code, but these policies protect any direct anon-key access.
-- ============================================================================

alter table profiles             enable row level security;
alter table classes              enable row level security;
alter table subjects             enable row level security;
alter table students             enable row level security;
alter table teachers             enable row level security;
alter table class_enrollments    enable row level security;
alter table teacher_assignments  enable row level security;
alter table class_sessions       enable row level security;
alter table attendance_records   enable row level security;
alter table audit_logs           enable row level security;

-- Helper: current user's role from their profile.
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- Helper: the student row id for the current user (null if not a student).
create or replace function my_student_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from students where profile_id = auth.uid()
$$;

-- Helper: the teacher row id for the current user (null if not a teacher).
create or replace function my_teacher_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from teachers where profile_id = auth.uid()
$$;

-- profiles: a user sees their own profile; admins see all.
create policy profiles_self_or_admin on profiles for select
  using (id = auth.uid() or auth_role() = 'admin');

-- Reference tables readable by any authenticated user.
create policy classes_read  on classes  for select using (auth.role() = 'authenticated');
create policy subjects_read on subjects for select using (auth.role() = 'authenticated');

-- students: admins all; teachers see students in classes they are assigned to;
-- a student sees only their own row.
create policy students_admin on students for select using (auth_role() = 'admin');
create policy students_self  on students for select using (profile_id = auth.uid());
create policy students_teacher on students for select using (
  exists (
    select 1 from teacher_assignments ta
    where ta.teacher_id = my_teacher_id() and ta.class_id = students.class_id
  )
);

-- teachers: admins all; a teacher sees their own row.
create policy teachers_admin on teachers for select using (auth_role() = 'admin');
create policy teachers_self  on teachers for select using (profile_id = auth.uid());

-- enrollments / assignments: admins all; teachers see their own assignments.
create policy enroll_admin  on class_enrollments for select using (auth_role() = 'admin');
create policy assign_admin  on teacher_assignments for select using (auth_role() = 'admin');
create policy assign_teacher on teacher_assignments for select using (teacher_id = my_teacher_id());

-- class_sessions: admins all; teachers their own; students sessions of their class.
create policy sessions_admin on class_sessions for select using (auth_role() = 'admin');
create policy sessions_teacher on class_sessions for select using (teacher_id = my_teacher_id());
create policy sessions_student on class_sessions for select using (
  exists (select 1 from students s where s.id = my_student_id() and s.class_id = class_sessions.class_id)
);

-- attendance_records: admins all; teachers for their own sessions; students only
-- their own records (cannot read other students' attendance).
create policy attend_admin on attendance_records for select using (auth_role() = 'admin');
create policy attend_teacher on attendance_records for select using (
  exists (select 1 from class_sessions cs where cs.id = attendance_records.session_id and cs.teacher_id = my_teacher_id())
);
create policy attend_student on attendance_records for select using (student_id = my_student_id());

-- audit_logs: admins only.
create policy audit_admin on audit_logs for select using (auth_role() = 'admin');

-- NOTE: no INSERT/UPDATE/DELETE policies are granted to anon/authenticated.
-- All writes go through the serverless functions using the service-role key,
-- which bypasses RLS after authorizing the caller in application code.
