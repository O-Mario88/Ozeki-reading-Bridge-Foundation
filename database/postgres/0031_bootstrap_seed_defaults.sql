-- Ensures a fresh PostgreSQL bootstrap has the minimum anchor records
-- expected by portal/auth and record-write backend flows.

INSERT INTO portal_users (
  id,
  full_name,
  email,
  role,
  password_hash,
  phone,
  is_supervisor,
  is_me,
  is_admin,
  is_superadmin,
  geography_scope
)
VALUES (
  900001,
  'ORB Foundation Staff',
  'staff@ozekireadingbridge.org',
  'Staff',
  'bootstrap-seeded-disabled',
  '+256700100001',
  FALSE,
  FALSE,
  FALSE,
  FALSE,
  'country:Uganda'
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = COALESCE(portal_users.phone, EXCLUDED.phone),
  is_supervisor = portal_users.is_supervisor OR EXCLUDED.is_supervisor,
  is_me = portal_users.is_me OR EXCLUDED.is_me,
  is_admin = portal_users.is_admin OR EXCLUDED.is_admin,
  is_superadmin = portal_users.is_superadmin OR EXCLUDED.is_superadmin,
  geography_scope = COALESCE(portal_users.geography_scope, EXCLUDED.geography_scope),
  password_hash = CASE
    WHEN portal_users.password_hash IS NULL OR trim(portal_users.password_hash) = '' THEN EXCLUDED.password_hash
    ELSE portal_users.password_hash
  END;

INSERT INTO portal_users (
  id,
  full_name,
  email,
  role,
  password_hash,
  phone,
  is_supervisor,
  is_me,
  is_admin,
  is_superadmin,
  geography_scope
)
VALUES (
  900002,
  'ORB Super Admin',
  'edwin@ozekiread.org',
  'Staff',
  'bootstrap-seeded-disabled',
  '+256773397375',
  FALSE,
  FALSE,
  TRUE,
  TRUE,
  'country:Uganda'
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = COALESCE(portal_users.phone, EXCLUDED.phone),
  is_supervisor = portal_users.is_supervisor OR EXCLUDED.is_supervisor,
  is_me = portal_users.is_me OR EXCLUDED.is_me,
  is_admin = portal_users.is_admin OR EXCLUDED.is_admin,
  is_superadmin = portal_users.is_superadmin OR EXCLUDED.is_superadmin,
  geography_scope = COALESCE(portal_users.geography_scope, EXCLUDED.geography_scope),
  password_hash = CASE
    WHEN portal_users.password_hash IS NULL OR trim(portal_users.password_hash) = '' THEN EXCLUDED.password_hash
    ELSE portal_users.password_hash
  END;

INSERT INTO schools_directory (
  id,
  school_uid,
  school_code,
  name,
  country,
  district,
  sub_county,
  parish,
  village,
  region,
  sub_region,
  district_id,
  contact_name,
  contact_phone,
  contact_email,
  school_status,
  current_partner_type,
  account_record_type,
  school_type,
  parent_account_label,
  enrollment_total,
  enrolled_learners
)
VALUES (
  900001,
  'sch-bootstrap-demo',
  'S-BOOTSTRAP',
  'Bootstrap Demonstration School',
  'Uganda',
  'Kampala',
  'Central',
  'Makerere',
  'Demonstration Village',
  'Central',
  'Kampala Metropolitan',
  'DT-900',
  'Bootstrap Head Teacher',
  '+256700100010',
  'headteacher.bootstrap@ozekireadingbridge.org',
  'Open',
  'NA',
  'School',
  'School',
  'Uganda',
  120,
  120
)
ON CONFLICT (school_code) DO UPDATE SET
  name = EXCLUDED.name,
  country = COALESCE(schools_directory.country, EXCLUDED.country),
  district = COALESCE(schools_directory.district, EXCLUDED.district),
  sub_county = COALESCE(schools_directory.sub_county, EXCLUDED.sub_county),
  parish = COALESCE(schools_directory.parish, EXCLUDED.parish),
  village = COALESCE(schools_directory.village, EXCLUDED.village),
  region = COALESCE(schools_directory.region, EXCLUDED.region),
  sub_region = COALESCE(schools_directory.sub_region, EXCLUDED.sub_region),
  district_id = COALESCE(schools_directory.district_id, EXCLUDED.district_id),
  contact_name = COALESCE(schools_directory.contact_name, EXCLUDED.contact_name),
  contact_phone = COALESCE(schools_directory.contact_phone, EXCLUDED.contact_phone),
  contact_email = COALESCE(schools_directory.contact_email, EXCLUDED.contact_email),
  school_status = COALESCE(schools_directory.school_status, EXCLUDED.school_status),
  enrollment_total = GREATEST(schools_directory.enrollment_total, EXCLUDED.enrollment_total),
  enrolled_learners = GREATEST(schools_directory.enrolled_learners, EXCLUDED.enrolled_learners);

INSERT INTO teacher_roster (
  id,
  teacher_uid,
  school_id,
  full_name,
  gender,
  phone,
  email,
  class_taught,
  role_title
)
VALUES (
  900001,
  'T-BS-001',
  (SELECT id FROM schools_directory WHERE school_code = 'S-BOOTSTRAP' LIMIT 1),
  'Bootstrap Teacher',
  'Female',
  '+256700100011',
  'teacher.bootstrap@ozekireadingbridge.org',
  'P3',
  'Classroom Teacher'
)
ON CONFLICT (teacher_uid) DO UPDATE SET
  school_id = EXCLUDED.school_id,
  full_name = EXCLUDED.full_name,
  gender = COALESCE(teacher_roster.gender, EXCLUDED.gender),
  phone = COALESCE(teacher_roster.phone, EXCLUDED.phone),
  email = COALESCE(teacher_roster.email, EXCLUDED.email),
  class_taught = COALESCE(teacher_roster.class_taught, EXCLUDED.class_taught),
  role_title = COALESCE(teacher_roster.role_title, EXCLUDED.role_title),
  updated_at = NOW();

INSERT INTO school_contacts (
  contact_id,
  contact_uid,
  school_id,
  full_name,
  gender,
  phone,
  email,
  whatsapp,
  category,
  role_title,
  is_primary_contact,
  class_taught,
  subject_taught,
  teacher_uid
)
VALUES (
  900001,
  'contact-bootstrap-primary',
  (SELECT id FROM schools_directory WHERE school_code = 'S-BOOTSTRAP' LIMIT 1),
  'Bootstrap Teacher Contact',
  'Female',
  '+256700100011',
  'teacher.bootstrap@ozekireadingbridge.org',
  '+256700100011',
  'Teacher',
  'Classroom Teacher',
  TRUE,
  'P3',
  'Literacy',
  'T-BS-001'
)
ON CONFLICT (contact_uid) DO UPDATE SET
  school_id = EXCLUDED.school_id,
  full_name = EXCLUDED.full_name,
  gender = EXCLUDED.gender,
  phone = COALESCE(school_contacts.phone, EXCLUDED.phone),
  email = COALESCE(school_contacts.email, EXCLUDED.email),
  whatsapp = COALESCE(school_contacts.whatsapp, EXCLUDED.whatsapp),
  category = COALESCE(school_contacts.category, EXCLUDED.category),
  role_title = COALESCE(school_contacts.role_title, EXCLUDED.role_title),
  is_primary_contact = school_contacts.is_primary_contact OR EXCLUDED.is_primary_contact,
  class_taught = COALESCE(school_contacts.class_taught, EXCLUDED.class_taught),
  subject_taught = COALESCE(school_contacts.subject_taught, EXCLUDED.subject_taught),
  teacher_uid = COALESCE(school_contacts.teacher_uid, EXCLUDED.teacher_uid),
  updated_at = NOW();

INSERT INTO school_learners (
  learner_id,
  learner_uid,
  school_id,
  learner_name,
  class_grade,
  age,
  gender,
  internal_child_id
)
VALUES (
  900001,
  'L-BS-001',
  (SELECT id FROM schools_directory WHERE school_code = 'S-BOOTSTRAP' LIMIT 1),
  'Bootstrap Learner',
  'P3',
  9,
  'Female',
  'BS-CHILD-001'
)
ON CONFLICT (learner_uid) DO UPDATE SET
  school_id = EXCLUDED.school_id,
  learner_name = EXCLUDED.learner_name,
  class_grade = COALESCE(school_learners.class_grade, EXCLUDED.class_grade),
  age = COALESCE(school_learners.age, EXCLUDED.age),
  gender = COALESCE(school_learners.gender, EXCLUDED.gender),
  internal_child_id = COALESCE(school_learners.internal_child_id, EXCLUDED.internal_child_id),
  updated_at = NOW();

INSERT INTO learner_roster (
  id,
  learner_uid,
  school_id,
  full_name,
  gender,
  age,
  class_grade
)
VALUES (
  900001,
  'L-BS-001',
  (SELECT id FROM schools_directory WHERE school_code = 'S-BOOTSTRAP' LIMIT 1),
  'Bootstrap Learner',
  'Female',
  9,
  'P3'
)
ON CONFLICT (learner_uid) DO UPDATE SET
  school_id = EXCLUDED.school_id,
  full_name = EXCLUDED.full_name,
  gender = COALESCE(learner_roster.gender, EXCLUDED.gender),
  age = COALESCE(learner_roster.age, EXCLUDED.age),
  class_grade = COALESCE(learner_roster.class_grade, EXCLUDED.class_grade),
  updated_at = NOW();

UPDATE schools_directory sd
SET
  primary_contact_id = sc.contact_id,
  contact_name = COALESCE(sd.contact_name, sc.full_name),
  contact_phone = COALESCE(sd.contact_phone, sc.phone),
  contact_email = COALESCE(sd.contact_email, sc.email)
FROM school_contacts sc
WHERE sd.school_code = 'S-BOOTSTRAP'
  AND sc.contact_uid = 'contact-bootstrap-primary'
  AND sd.id = sc.school_id;
