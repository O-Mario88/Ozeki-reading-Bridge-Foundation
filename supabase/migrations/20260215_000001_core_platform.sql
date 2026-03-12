-- Core scalable data model for Ozeki Reading Bridge Foundation
-- Target: Supabase Postgres

create extension if not exists pgcrypto;
create extension if not exists vector;

create schema if not exists app;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum (
      'super_admin',
      'admin',
      'staff',
      'volunteer',
      'coach',
      'headteacher',
      'teacher',
      'partner_viewer'
    );
  end if;
end $$;

create table if not exists orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  org_type text not null default 'foundation',
  country text not null default 'Uganda',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists districts (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete set null,
  district_id uuid references districts(id) on delete set null,
  school_code text unique,
  name text not null,
  sub_county text,
  parish text,
  village text,
  lat double precision,
  lng double precision,
  enrollment integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schools_org_id on schools(org_id);
create index if not exists idx_schools_district_id on schools(district_id);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  grade text not null,
  stream text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_classes_unique_grade_stream
  on classes(school_id, grade, coalesce(stream, ''));

create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role app_role not null default 'volunteer',
  org_id uuid references orgs(id) on delete set null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_role on user_profiles(role);
create index if not exists idx_user_profiles_org_id on user_profiles(org_id);

create table if not exists coach_school_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references user_profiles(user_id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(coach_user_id, school_id)
);

create table if not exists school_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(user_id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  staff_role text not null default 'teacher',
  created_at timestamptz not null default now(),
  unique(user_id, school_id)
);

create table if not exists teacher_class_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(user_id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, class_id)
);

create table if not exists partner_org_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(user_id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, org_id)
);

create table if not exists program_cycles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  fiscal_year integer not null,
  term text,
  quarter text,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active' check (status in ('planning', 'active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_program_cycles_org_id on program_cycles(org_id);

create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete set null,
  cycle_id uuid references program_cycles(id) on delete set null,
  school_id uuid references schools(id) on delete set null,
  district_id uuid references districts(id) on delete set null,
  training_type text not null,
  delivery_mode text not null default 'in_person' check (delivery_mode in ('in_person', 'online')),
  title text not null,
  facilitator_user_id uuid references user_profiles(user_id) on delete set null,
  scheduled_at timestamptz,
  ended_at timestamptz,
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  participant_count integer not null default 0 check (participant_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_training_sessions_school_id on training_sessions(school_id);
create index if not exists idx_training_sessions_created_by on training_sessions(created_by);

create table if not exists training_attendance (
  id uuid primary key default gen_random_uuid(),
  training_session_id uuid not null references training_sessions(id) on delete cascade,
  participant_name text not null,
  participant_role text not null default 'teacher' check (participant_role in ('teacher', 'leader', 'volunteer', 'other')),
  phone text,
  email text,
  school_id uuid references schools(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  attended boolean not null default true,
  source text not null default 'portal',
  created_at timestamptz not null default now()
);

create index if not exists idx_training_attendance_session_id on training_attendance(training_session_id);

create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete set null,
  cycle_id uuid references program_cycles(id) on delete set null,
  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  observed_teacher_user_id uuid references user_profiles(user_id) on delete set null,
  coach_user_id uuid references user_profiles(user_id) on delete set null,
  observed_on date not null,
  lesson_focus text,
  rubric jsonb not null default '{}'::jsonb,
  score numeric(6, 2),
  notes text,
  created_by uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_observations_school_id on observations(school_id);
create index if not exists idx_observations_observed_on on observations(observed_on);

create table if not exists coaching_plans (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid references observations(id) on delete set null,
  school_id uuid not null references schools(id) on delete cascade,
  teacher_user_id uuid references user_profiles(user_id) on delete set null,
  coach_user_id uuid references user_profiles(user_id) on delete set null,
  priorities jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  follow_up_due_on date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  created_by uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coaching_followups (
  id uuid primary key default gen_random_uuid(),
  coaching_plan_id uuid not null references coaching_plans(id) on delete cascade,
  follow_up_date date not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'overdue')),
  notes text,
  created_by uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete set null,
  cycle_id uuid references program_cycles(id) on delete set null,
  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  assessment_type text not null check (assessment_type in ('baseline', 'progress', 'endline')),
  assessed_on date not null,
  tool_name text,
  created_by uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assessments_school_id on assessments(school_id);
create index if not exists idx_assessments_assessed_on on assessments(assessed_on);

create table if not exists learner_profiles (
  learner_id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  anonymous_code text not null unique,
  sex text default 'U' check (sex in ('F', 'M', 'U')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_learner_profiles_school_id on learner_profiles(school_id);
create index if not exists idx_learner_profiles_class_id on learner_profiles(class_id);

create table if not exists assessment_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  learner_id uuid not null references learner_profiles(learner_id) on delete cascade,
  letter_sound_score numeric(6, 2),
  decoding_accuracy numeric(6, 2),
  wcpm numeric(6, 2),
  comprehension_score numeric(6, 2),
  performance_band text check (performance_band in ('non_reader', 'emerging', 'developing', 'fluent')),
  recommended_intervention text,
  created_at timestamptz not null default now(),
  unique(assessment_id, learner_id)
);

create index if not exists idx_assessment_results_assessment_id on assessment_results(assessment_id);
create index if not exists idx_assessment_results_learner_id on assessment_results(learner_id);

create table if not exists intervention_groups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete set null,
  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  name text not null,
  level text not null default 'A' check (level in ('A', 'B', 'C', 'D')),
  focus_skill text,
  is_active boolean not null default true,
  created_by uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists intervention_group_members (
  id uuid primary key default gen_random_uuid(),
  intervention_group_id uuid not null references intervention_groups(id) on delete cascade,
  learner_id uuid not null references learner_profiles(learner_id) on delete cascade,
  joined_on date not null default current_date,
  exited_on date,
  exit_reason text,
  created_at timestamptz not null default now(),
  unique(intervention_group_id, learner_id)
);

create table if not exists intervention_sessions (
  id uuid primary key default gen_random_uuid(),
  intervention_group_id uuid not null references intervention_groups(id) on delete cascade,
  session_date date not null,
  facilitator_user_id uuid references user_profiles(user_id) on delete set null,
  session_log text,
  quick_check jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  grade text,
  skill text,
  level text,
  resource_type text,
  file_path text not null,
  preview_path text,
  is_published boolean not null default false,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_by uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resources_is_published on resources(is_published);
create index if not exists idx_resources_skill on resources(skill);
create index if not exists idx_resources_grade on resources(grade);

create table if not exists resource_downloads (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  downloaded_by uuid references user_profiles(user_id) on delete set null,
  email_capture text,
  school_id uuid references schools(id) on delete set null,
  source text not null default 'web',
  downloaded_at timestamptz not null default now()
);

create index if not exists idx_resource_downloads_resource_id on resource_downloads(resource_id);
create index if not exists idx_resource_downloads_downloaded_at on resource_downloads(downloaded_at);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete set null,
  school_id uuid references schools(id) on delete set null,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  booking_type text not null,
  district_id uuid references districts(id) on delete set null,
  preferred_date_from date,
  preferred_date_to date,
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'confirmed', 'assigned', 'completed', 'cancelled')),
  assigned_user_id uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_bookings_created_at on bookings(created_at);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  training_session_id uuid references training_sessions(id) on delete set null,
  provider text not null check (provider in ('google_calendar', 'google_meet', 'internal')),
  external_event_id text,
  meet_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recording_url text,
  attendance_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  subtitle text,
  body_markdown text not null,
  cover_media_path text,
  media_type text not null default 'none' check (media_type in ('none', 'image', 'video')),
  category text,
  is_published boolean not null default false,
  published_at timestamptz,
  views bigint not null default 0,
  author_user_id uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blog_posts_is_published on blog_posts(is_published);
create index if not exists idx_blog_posts_published_at on blog_posts(published_at desc);

create table if not exists anthologies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete set null,
  school_id uuid references schools(id) on delete set null,
  title text not null,
  format text not null default 'digital' check (format in ('digital', 'print')),
  status text not null default 'draft' check (status in ('draft', 'editing', 'published')),
  storage_path text,
  published_at timestamptz,
  created_by uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stories_1001 (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  learner_id uuid references learner_profiles(learner_id) on delete set null,
  anthology_id uuid references anthologies(id) on delete set null,
  title text not null,
  body text not null,
  prompt text,
  session_week integer,
  status text not null default 'draft' check (status in ('draft', 'revised', 'shortlisted', 'published')),
  teacher_user_id uuid references user_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stories_1001_school_id on stories_1001(school_id);
create index if not exists idx_stories_1001_status on stories_1001(status);

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references user_profiles(user_id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text,
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz not null default now()
);

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_orgs') then
    create trigger set_updated_at_orgs before update on orgs for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_schools') then
    create trigger set_updated_at_schools before update on schools for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_classes') then
    create trigger set_updated_at_classes before update on classes for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_user_profiles') then
    create trigger set_updated_at_user_profiles before update on user_profiles for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_program_cycles') then
    create trigger set_updated_at_program_cycles before update on program_cycles for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_training_sessions') then
    create trigger set_updated_at_training_sessions before update on training_sessions for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_observations') then
    create trigger set_updated_at_observations before update on observations for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_coaching_plans') then
    create trigger set_updated_at_coaching_plans before update on coaching_plans for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_assessments') then
    create trigger set_updated_at_assessments before update on assessments for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_learner_profiles') then
    create trigger set_updated_at_learner_profiles before update on learner_profiles for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_intervention_groups') then
    create trigger set_updated_at_intervention_groups before update on intervention_groups for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_resources') then
    create trigger set_updated_at_resources before update on resources for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_bookings') then
    create trigger set_updated_at_bookings before update on bookings for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_blog_posts') then
    create trigger set_updated_at_blog_posts before update on blog_posts for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_anthologies') then
    create trigger set_updated_at_anthologies before update on anthologies for each row execute procedure app.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_stories_1001') then
    create trigger set_updated_at_stories_1001 before update on stories_1001 for each row execute procedure app.set_updated_at();
  end if;
end $$;

create or replace function app.current_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select up.role
  from user_profiles up
  where up.user_id = auth.uid();
$$;

create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(app.current_role() in ('super_admin', 'admin', 'staff'), false);
$$;

create or replace function app.can_access_school(target_school_id uuid, target_org_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    app.is_platform_admin()
    or exists (
      select 1
      from school_staff_assignments ssa
      where ssa.user_id = auth.uid()
        and ssa.school_id = target_school_id
    )
    or exists (
      select 1
      from coach_school_assignments csa
      where csa.coach_user_id = auth.uid()
        and csa.school_id = target_school_id
    )
    or (
      target_org_id is not null
      and exists (
        select 1
        from partner_org_assignments poa
        where poa.user_id = auth.uid()
          and poa.org_id = target_org_id
      )
    ),
    false
  );
$$;

alter table user_profiles enable row level security;
alter table schools enable row level security;
alter table classes enable row level security;
alter table coach_school_assignments enable row level security;
alter table school_staff_assignments enable row level security;
alter table teacher_class_assignments enable row level security;
alter table partner_org_assignments enable row level security;
alter table training_sessions enable row level security;
alter table training_attendance enable row level security;
alter table observations enable row level security;
alter table coaching_plans enable row level security;
alter table coaching_followups enable row level security;
alter table assessments enable row level security;
alter table learner_profiles enable row level security;
alter table assessment_results enable row level security;
alter table intervention_groups enable row level security;
alter table intervention_group_members enable row level security;
alter table intervention_sessions enable row level security;
alter table resources enable row level security;
alter table resource_downloads enable row level security;
alter table bookings enable row level security;
alter table calendar_events enable row level security;
alter table blog_posts enable row level security;
alter table anthologies enable row level security;
alter table stories_1001 enable row level security;
alter table audit_logs enable row level security;

create policy user_profiles_select on user_profiles
for select using (user_id = auth.uid() or app.is_platform_admin());

create policy user_profiles_update on user_profiles
for update using (user_id = auth.uid() or app.is_platform_admin())
with check (user_id = auth.uid() or app.is_platform_admin());

create policy user_profiles_admin_insert on user_profiles
for insert with check (app.is_platform_admin());

create policy schools_select on schools
for select using (app.can_access_school(id, org_id));

create policy schools_admin_write on schools
for all using (app.is_platform_admin())
with check (app.is_platform_admin());

create policy classes_select on classes
for select using (
  app.is_platform_admin()
  or exists (
    select 1 from teacher_class_assignments tca
    where tca.user_id = auth.uid() and tca.class_id = classes.id
  )
  or app.can_access_school(classes.school_id, null)
);

create policy classes_admin_write on classes
for all using (app.is_platform_admin())
with check (app.is_platform_admin());

create policy assignment_admin_all_coach on coach_school_assignments
for all using (app.is_platform_admin()) with check (app.is_platform_admin());

create policy assignment_admin_all_staff on school_staff_assignments
for all using (app.is_platform_admin()) with check (app.is_platform_admin());

create policy assignment_admin_all_teacher on teacher_class_assignments
for all using (app.is_platform_admin()) with check (app.is_platform_admin());

create policy assignment_admin_all_partner on partner_org_assignments
for all using (app.is_platform_admin()) with check (app.is_platform_admin());

create policy training_sessions_select on training_sessions
for select using (
  created_by = auth.uid()
  or app.can_access_school(training_sessions.school_id, training_sessions.org_id)
);

create policy training_sessions_insert on training_sessions
for insert with check (
  auth.uid() is not null
  and (
    app.is_platform_admin()
    or app.current_role() in ('coach', 'headteacher', 'teacher', 'volunteer')
  )
  and (created_by = auth.uid() or created_by is null)
);

create policy training_sessions_update on training_sessions
for update using (
  app.is_platform_admin()
  or created_by = auth.uid()
)
with check (
  app.is_platform_admin()
  or created_by = auth.uid()
);

create policy training_attendance_select on training_attendance
for select using (
  exists (
    select 1
    from training_sessions ts
    where ts.id = training_attendance.training_session_id
      and (
        ts.created_by = auth.uid()
        or app.can_access_school(ts.school_id, ts.org_id)
      )
  )
);

create policy training_attendance_write on training_attendance
for all using (
  app.is_platform_admin()
  or exists (
    select 1
    from training_sessions ts
    where ts.id = training_attendance.training_session_id
      and ts.created_by = auth.uid()
  )
)
with check (
  app.is_platform_admin()
  or exists (
    select 1
    from training_sessions ts
    where ts.id = training_attendance.training_session_id
      and ts.created_by = auth.uid()
  )
);

create policy observations_select on observations
for select using (
  app.can_access_school(observations.school_id, observations.org_id)
);

create policy observations_write on observations
for all using (
  app.is_platform_admin()
  or created_by = auth.uid()
)
with check (
  app.is_platform_admin()
  or created_by = auth.uid()
);

create policy coaching_plans_select on coaching_plans
for select using (app.can_access_school(coaching_plans.school_id, null));

create policy coaching_plans_write on coaching_plans
for all using (app.is_platform_admin() or created_by = auth.uid())
with check (app.is_platform_admin() or created_by = auth.uid());

create policy coaching_followups_select on coaching_followups
for select using (
  exists (
    select 1
    from coaching_plans cp
    where cp.id = coaching_followups.coaching_plan_id
      and app.can_access_school(cp.school_id, null)
  )
);

create policy coaching_followups_write on coaching_followups
for all using (
  app.is_platform_admin()
  or created_by = auth.uid()
)
with check (
  app.is_platform_admin()
  or created_by = auth.uid()
);

create policy assessments_select on assessments
for select using (app.can_access_school(assessments.school_id, assessments.org_id));

create policy assessments_write on assessments
for all using (app.is_platform_admin() or created_by = auth.uid())
with check (app.is_platform_admin() or created_by = auth.uid());

create policy learner_profiles_select on learner_profiles
for select using (app.can_access_school(learner_profiles.school_id, null));

create policy learner_profiles_write on learner_profiles
for all using (app.is_platform_admin())
with check (app.is_platform_admin());

create policy assessment_results_select on assessment_results
for select using (
  exists (
    select 1
    from assessments a
    where a.id = assessment_results.assessment_id
      and app.can_access_school(a.school_id, a.org_id)
  )
);

create policy assessment_results_write on assessment_results
for all using (app.is_platform_admin())
with check (app.is_platform_admin());

create policy intervention_groups_select on intervention_groups
for select using (app.can_access_school(intervention_groups.school_id, intervention_groups.org_id));

create policy intervention_groups_write on intervention_groups
for all using (app.is_platform_admin() or created_by = auth.uid())
with check (app.is_platform_admin() or created_by = auth.uid());

create policy intervention_group_members_select on intervention_group_members
for select using (
  exists (
    select 1
    from intervention_groups ig
    where ig.id = intervention_group_members.intervention_group_id
      and app.can_access_school(ig.school_id, ig.org_id)
  )
);

create policy intervention_group_members_write on intervention_group_members
for all using (app.is_platform_admin())
with check (app.is_platform_admin());

create policy intervention_sessions_select on intervention_sessions
for select using (
  exists (
    select 1
    from intervention_groups ig
    where ig.id = intervention_sessions.intervention_group_id
      and app.can_access_school(ig.school_id, ig.org_id)
  )
);

create policy intervention_sessions_write on intervention_sessions
for all using (
  app.is_platform_admin()
  or facilitator_user_id = auth.uid()
)
with check (
  app.is_platform_admin()
  or facilitator_user_id = auth.uid()
);

create policy resources_public_select on resources
for select using (is_published = true or app.is_platform_admin());

create policy resources_write on resources
for all using (
  app.is_platform_admin()
  or created_by = auth.uid()
)
with check (
  app.is_platform_admin()
  or created_by = auth.uid()
);

create policy resource_downloads_insert_public on resource_downloads
for insert with check (true);

create policy resource_downloads_select_admin on resource_downloads
for select using (app.is_platform_admin());

create policy bookings_insert_public on bookings
for insert with check (true);

create policy bookings_select_admin_or_assigned on bookings
for select using (
  app.is_platform_admin()
  or assigned_user_id = auth.uid()
);

create policy bookings_update_admin_or_assigned on bookings
for update using (
  app.is_platform_admin()
  or assigned_user_id = auth.uid()
)
with check (
  app.is_platform_admin()
  or assigned_user_id = auth.uid()
);

create policy calendar_events_select on calendar_events
for select using (
  app.is_platform_admin()
  or created_by = auth.uid()
);

create policy calendar_events_write on calendar_events
for all using (
  app.is_platform_admin()
  or created_by = auth.uid()
)
with check (
  app.is_platform_admin()
  or created_by = auth.uid()
);

create policy blog_posts_public_select on blog_posts
for select using (is_published = true or app.is_platform_admin());

create policy blog_posts_write on blog_posts
for all using (
  app.is_platform_admin()
  or author_user_id = auth.uid()
)
with check (
  app.is_platform_admin()
  or author_user_id = auth.uid()
);

create policy anthologies_select on anthologies
for select using (
  app.can_access_school(anthologies.school_id, anthologies.org_id)
);

create policy anthologies_write on anthologies
for all using (
  app.is_platform_admin()
  or created_by = auth.uid()
)
with check (
  app.is_platform_admin()
  or created_by = auth.uid()
);

create policy stories_1001_select on stories_1001
for select using (app.can_access_school(stories_1001.school_id, null));

create policy stories_1001_write on stories_1001
for all using (
  app.is_platform_admin()
  or teacher_user_id = auth.uid()
)
with check (
  app.is_platform_admin()
  or teacher_user_id = auth.uid()
);

create policy audit_logs_admin_select on audit_logs
for select using (app.is_platform_admin());

create policy audit_logs_admin_insert on audit_logs
for insert with check (app.is_platform_admin());

create or replace view partner_impact_summary as
select
  o.id as org_id,
  o.name as org_name,
  count(distinct ts.id) as trainings_logged,
  count(distinct ts.school_id) as schools_supported,
  count(distinct ta.id) as attendance_records,
  count(distinct a.id) as assessments_logged,
  count(distinct s.id) as stories_logged
from orgs o
left join training_sessions ts on ts.org_id = o.id
left join training_attendance ta on ta.training_session_id = ts.id
left join assessments a on a.org_id = o.id
left join stories_1001 s on s.school_id in (
  select sc.id from schools sc where sc.org_id = o.id
)
group by o.id, o.name;
