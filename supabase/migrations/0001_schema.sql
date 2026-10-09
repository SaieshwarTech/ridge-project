-- ============================================================================
-- AttendX schema. Run in the Supabase SQL editor (or `supabase db push`).
-- profiles.id === auth.users.id (1:1 with Supabase Auth).
-- ============================================================================

create extension if not exists "pgcrypto";

create type user_role      as enum ('admin','teacher','student');
create type session_status as enum ('scheduled','completed','cancelled');
create type attend_status  as enum ('present','absent','late','excused');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text not null,
  role        user_role not null default 'student',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table classes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  section       text not null,
  academic_year text not null,
  created_at    timestamptz not null default now(),
  unique (name, section, academic_year)
);

create table subjects (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

create table students (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  roll_no    text not null unique,
  class_id   uuid not null references classes(id) on delete restrict,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table teachers (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  department text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table class_enrollments (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table teacher_assignments (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  class_id   uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, class_id, subject_id)
);

create table class_sessions (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete restrict,
  date       date not null,
  status     session_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  unique (class_id, subject_id, date, teacher_id)
);

create table attendance_records (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status     attend_status not null,
  marked_by  uuid references teachers(id) on delete set null,
  marked_at  timestamptz not null default now(),
  -- prevents duplicate attendance for the same student in one session
  unique (session_id, student_id)
);

create table audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references profiles(id) on delete set null,
  actor_name text,
  action     text not null,
  entity     text not null,
  entity_id  text,
  before     jsonb,
  after      jsonb,
  reason     text,
  created_at timestamptz not null default now()
);

-- Useful indexes for the hot query paths.
create index idx_students_class       on students(class_id);
create index idx_enroll_class         on class_enrollments(class_id);
create index idx_enroll_student       on class_enrollments(student_id);
create index idx_assign_teacher       on teacher_assignments(teacher_id);
create index idx_sessions_class_date  on class_sessions(class_id, date);
create index idx_sessions_teacher     on class_sessions(teacher_id);
create index idx_attend_session       on attendance_records(session_id);
create index idx_attend_student       on attendance_records(student_id);
create index idx_audit_created        on audit_logs(created_at desc);
