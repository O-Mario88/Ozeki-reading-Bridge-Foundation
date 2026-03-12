#!/usr/bin/env python3
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils.text import slugify

from apps.accounts.models import User
from apps.assessments.models import AssessmentResult, AssessmentSession
from apps.content.models import BlogPost, Story, StoryAnthology
from apps.evaluations.models import LessonEvaluation, LessonEvaluationItem
from apps.finance.models import (
    Expense,
    FinanceAuditException,
    FinanceContact,
    Invoice,
    InvoiceItem,
    LedgerTransaction,
    MonthlyStatement,
    PublicFinanceSnapshot,
    Receipt,
)
from apps.geography.models import District, Parish, Region, SubCounty, SubRegion
from apps.interventions.models import GraduationSettings, InterventionAction, InterventionGroup, InterventionPlan, InterventionSession
from apps.learners.models import Learner
from apps.reports.models import ImpactReport
from apps.schools.models import School, SchoolContact, SchoolGraduationWorkflow, Teacher
from apps.training.models import TrainingParticipant, TrainingSession
from apps.visits.models import SchoolVisit, VisitParticipant


ROLE_MAP = {
    "Staff": User.Role.STAFF,
    "Volunteer": User.Role.VOLUNTEER,
}


def table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    ).fetchone()
    return row is not None


def fetch_rows(conn: sqlite3.Connection, query: str, params: tuple = ()):
    conn.row_factory = sqlite3.Row
    return conn.execute(query, params).fetchall()


def nullable_str(value):
    if value is None:
        return ""
    return str(value).strip()


def to_slug(value: str, fallback: str) -> str:
    token = slugify(value)[:180]
    return token or fallback


@transaction.atomic
def migrate(sqlite_path: Path):
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row

    print(f"Using SQLite source: {sqlite_path}")

    legacy_to_user: dict[int, User] = {}
    legacy_to_school: dict[int, School] = {}
    legacy_to_contact: dict[int, SchoolContact] = {}
    legacy_to_teacher: dict[int, Teacher] = {}
    legacy_to_learner: dict[int, Learner] = {}
    legacy_to_training: dict[int, TrainingSession] = {}
    legacy_to_visit: dict[int, SchoolVisit] = {}
    legacy_to_eval: dict[int, LessonEvaluation] = {}
    legacy_to_session: dict[int, AssessmentSession] = {}
    legacy_to_contact_fin: dict[int, FinanceContact] = {}
    legacy_to_invoice: dict[int, Invoice] = {}

    if table_exists(conn, "portal_users"):
        for row in fetch_rows(conn, "SELECT * FROM portal_users ORDER BY id"):
            role = ROLE_MAP.get(row["role"], User.Role.STAFF)
            if int(row.get("is_superadmin") or 0) == 1:
                role = User.Role.SUPERADMIN
            elif int(row.get("is_admin") or 0) == 1:
                role = User.Role.ADMIN
            elif int(row.get("is_me") or 0) == 1:
                role = User.Role.ME
            elif int(row.get("is_supervisor") or 0) == 1:
                role = User.Role.SUPERVISOR

            username = (nullable_str(row["email"]).split("@")[0] or f"legacy-user-{row['id']}")[:150]
            user, _ = User.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "username": username,
                    "email": nullable_str(row["email"]).lower() or f"legacy{row['id']}@example.org",
                    "first_name": nullable_str(row["full_name"]).split(" ")[0],
                    "last_name": " ".join(nullable_str(row["full_name"]).split(" ")[1:])[:150],
                    "role": role,
                    "geography_scope": nullable_str(row.get("geography_scope")),
                    "is_active": True,
                    "password": make_password("ChangeMeNow!123"),
                },
            )
            legacy_to_user[row["id"]] = user

    if not User.objects.filter(role=User.Role.SUPERADMIN).exists():
        User.objects.create_superuser(
            username="superadmin",
            email="superadmin@example.org",
            password="ChangeMeNow!123",
            role=User.Role.SUPERADMIN,
        )

    region_map: dict[str, Region] = {}
    subregion_map: dict[str, SubRegion] = {}
    district_map: dict[str, District] = {}
    subcounty_map: dict[str, SubCounty] = {}

    if table_exists(conn, "geo_regions"):
        for row in fetch_rows(conn, "SELECT * FROM geo_regions ORDER BY name"):
            region, _ = Region.objects.update_or_create(
                code=nullable_str(row["id"]) or to_slug(row["name"], f"region-{row['rowid'] if 'rowid' in row.keys() else row['id']}"),
                defaults={
                    "name": nullable_str(row["name"]),
                    "legacy_id": nullable_str(row["id"]),
                    "valid_from_year": row.get("valid_from_year"),
                    "valid_to_year": row.get("valid_to_year"),
                },
            )
            region_map[region.code] = region

    if table_exists(conn, "geo_subregions"):
        for row in fetch_rows(conn, "SELECT * FROM geo_subregions ORDER BY name"):
            region = region_map.get(nullable_str(row.get("region_id")))
            if not region:
                region, _ = Region.objects.get_or_create(code="unknown", defaults={"name": "Unknown"})
            subregion, _ = SubRegion.objects.update_or_create(
                code=nullable_str(row["id"]) or to_slug(row["name"], f"subregion-{row['rowid'] if 'rowid' in row.keys() else row['id']}"),
                defaults={
                    "name": nullable_str(row["name"]),
                    "region": region,
                    "valid_from_year": row.get("valid_from_year"),
                    "valid_to_year": row.get("valid_to_year"),
                },
            )
            subregion_map[subregion.code] = subregion

    if table_exists(conn, "geo_districts"):
        for row in fetch_rows(conn, "SELECT * FROM geo_districts ORDER BY name"):
            subregion = subregion_map.get(nullable_str(row.get("subregion_id")))
            if not subregion:
                unknown_region, _ = Region.objects.get_or_create(code="unknown", defaults={"name": "Unknown"})
                subregion, _ = SubRegion.objects.get_or_create(
                    code="unknown-subregion",
                    defaults={"name": "Unknown", "region": unknown_region},
                )
            district, _ = District.objects.update_or_create(
                code=nullable_str(row["id"]) or to_slug(row["name"], f"district-{row['rowid'] if 'rowid' in row.keys() else row['id']}"),
                defaults={
                    "name": nullable_str(row["name"]),
                    "region": subregion.region,
                    "subregion": subregion,
                    "valid_from_year": row.get("valid_from_year"),
                    "valid_to_year": row.get("valid_to_year"),
                },
            )
            district_map[district.code] = district

    if table_exists(conn, "geo_subcounties"):
        for row in fetch_rows(conn, "SELECT * FROM geo_subcounties ORDER BY name"):
            district = district_map.get(nullable_str(row.get("district_id")))
            if not district:
                continue
            subcounty, _ = SubCounty.objects.update_or_create(
                code=nullable_str(row["id"]) or to_slug(row["name"], f"subcounty-{row['rowid'] if 'rowid' in row.keys() else row['id']}"),
                defaults={"name": nullable_str(row["name"]), "district": district},
            )
            subcounty_map[subcounty.code] = subcounty

    if table_exists(conn, "geo_parishes"):
        for row in fetch_rows(conn, "SELECT * FROM geo_parishes ORDER BY name"):
            subcounty = subcounty_map.get(nullable_str(row.get("subcounty_id")))
            if not subcounty:
                continue
            Parish.objects.update_or_create(
                code=nullable_str(row["id"]) or to_slug(row["name"], f"parish-{row['rowid'] if 'rowid' in row.keys() else row['id']}"),
                defaults={"name": nullable_str(row["name"]), "subcounty": subcounty},
            )

    if table_exists(conn, "schools_directory"):
        for row in fetch_rows(conn, "SELECT * FROM schools_directory ORDER BY id"):
            district = district_map.get(nullable_str(row.get("geo_district_id") or row.get("district_id")))
            subregion = district.subregion if district else None
            region = district.region if district else None
            subcounty = None
            parish = None
            school, _ = School.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "uid": nullable_str(row.get("school_uid")),
                    "code": nullable_str(row.get("school_code")) or f"SCH-{row['id']}",
                    "name": nullable_str(row.get("name")),
                    "region": region,
                    "subregion": subregion,
                    "district": district,
                    "subcounty": subcounty,
                    "parish": parish,
                    "district_name": nullable_str(row.get("district")),
                    "sub_county_name": nullable_str(row.get("sub_county")),
                    "parish_name": nullable_str(row.get("parish")),
                    "village": nullable_str(row.get("village")),
                    "enrollment_total": row.get("enrollment_total") or row.get("enrolled_learners") or 0,
                    "enrolled_boys": row.get("enrolled_boys") or 0,
                    "enrolled_girls": row.get("enrolled_girls") or 0,
                    "program_status": (row.get("program_status") or "active"),
                    "graduation_notes": nullable_str(row.get("graduation_notes")),
                },
            )
            legacy_to_school[row["id"]] = school

    if table_exists(conn, "school_contacts"):
        for row in fetch_rows(conn, "SELECT * FROM school_contacts ORDER BY contact_id"):
            school = legacy_to_school.get(row["school_id"])
            if not school:
                continue
            category = nullable_str(row.get("category")).lower().replace(" ", "_")
            allowed_categories = {choice[0] for choice in SchoolContact.Category.choices}
            if category not in allowed_categories:
                category = SchoolContact.Category.TEACHER
            gender = nullable_str(row.get("gender")).lower()
            if gender not in {choice[0] for choice in SchoolContact.Gender.choices}:
                gender = SchoolContact.Gender.OTHER
            contact, _ = SchoolContact.objects.update_or_create(
                legacy_id=row["contact_id"],
                defaults={
                    "uid": nullable_str(row.get("contact_uid")),
                    "school": school,
                    "full_name": nullable_str(row.get("full_name")),
                    "gender": gender,
                    "category": category,
                    "role_title": nullable_str(row.get("role_title")),
                    "phone": nullable_str(row.get("phone")),
                    "email": nullable_str(row.get("email")),
                    "whatsapp": nullable_str(row.get("whatsapp")),
                    "class_taught": nullable_str(row.get("class_taught")),
                    "subject_taught": nullable_str(row.get("subject_taught")),
                    "is_primary_contact": int(row.get("is_primary_contact") or 0) == 1,
                },
            )
            legacy_to_contact[row["contact_id"]] = contact

    if table_exists(conn, "teacher_roster"):
        for row in fetch_rows(conn, "SELECT * FROM teacher_roster ORDER BY id"):
            school = legacy_to_school.get(row["school_id"])
            if not school:
                continue
            gender = nullable_str(row.get("gender")).lower()
            if gender not in {choice[0] for choice in SchoolContact.Gender.choices}:
                gender = SchoolContact.Gender.OTHER
            teacher, _ = Teacher.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "uid": nullable_str(row.get("teacher_uid")) or f"T-{row['id']}",
                    "school": school,
                    "full_name": nullable_str(row.get("full_name")),
                    "gender": gender,
                    "is_reading_teacher": int(row.get("is_reading_teacher") or 0) == 1,
                    "phone": nullable_str(row.get("phone")),
                    "status": nullable_str(row.get("status")) or "active",
                },
            )
            legacy_to_teacher[row["id"]] = teacher

    if table_exists(conn, "school_learners"):
        for row in fetch_rows(conn, "SELECT * FROM school_learners ORDER BY learner_id"):
            school = legacy_to_school.get(row["school_id"])
            if not school:
                continue
            gender = nullable_str(row.get("gender")).lower()
            if gender not in {choice[0] for choice in Learner.Gender.choices}:
                gender = Learner.Gender.OTHER
            learner, _ = Learner.objects.update_or_create(
                legacy_id=row["learner_id"],
                defaults={
                    "uid": nullable_str(row.get("learner_uid")) or f"L-{row['learner_id']}",
                    "school": school,
                    "full_name": nullable_str(row.get("learner_name")),
                    "class_grade": nullable_str(row.get("class_grade")),
                    "age": row.get("age") or 0,
                    "gender": gender,
                    "internal_child_id": nullable_str(row.get("internal_child_id")),
                },
            )
            legacy_to_learner[row["learner_id"]] = learner

    if table_exists(conn, "training_sessions"):
        for row in fetch_rows(conn, "SELECT * FROM training_sessions ORDER BY id"):
            school = None
            name = nullable_str(row.get("school_name"))
            if name:
                school = School.objects.filter(name=name).first()
            if not school:
                continue
            created_by = legacy_to_user.get(row.get("created_by_user_id"))
            session, _ = TrainingSession.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "school": school,
                    "date": row.get("session_date") or "2026-01-01",
                    "training_type": TrainingSession.TrainingType.PHONICS,
                    "title": "Imported training session",
                    "district_name": nullable_str(row.get("district")),
                    "sub_county_name": nullable_str(row.get("sub_county")),
                    "parish_name": nullable_str(row.get("parish")),
                    "village": nullable_str(row.get("village")),
                    "status": TrainingSession.Status.SUBMITTED,
                    "created_by": created_by,
                },
            )
            legacy_to_training[row["id"]] = session

    if table_exists(conn, "training_participants"):
        for row in fetch_rows(conn, "SELECT * FROM training_participants ORDER BY id"):
            session = legacy_to_training.get(row["session_id"])
            if not session:
                continue
            role = nullable_str(row.get("participant_role")).lower().replace(" ", "_")
            allowed = {choice[0] for choice in TrainingParticipant.ParticipantRole.choices}
            if role not in allowed:
                role = TrainingParticipant.ParticipantRole.OTHER
            TrainingParticipant.objects.update_or_create(
                session=session,
                participant_name=nullable_str(row.get("participant_name")),
                defaults={
                    "school": session.school,
                    "participant_role": role,
                    "gender": nullable_str(row.get("gender")),
                    "phone": nullable_str(row.get("phone")),
                    "email": nullable_str(row.get("email")),
                    "attended": True,
                },
            )

    if table_exists(conn, "coaching_visits"):
        for row in fetch_rows(conn, "SELECT * FROM coaching_visits ORDER BY id"):
            school = legacy_to_school.get(row["school_id"])
            if not school:
                continue
            coach = legacy_to_user.get(row.get("coach_user_id"))
            visit_type = nullable_str(row.get("visit_type")).lower().replace(" ", "_")
            allowed = {choice[0] for choice in SchoolVisit.VisitType.choices}
            if visit_type not in allowed:
                visit_type = SchoolVisit.VisitType.OBSERVATION
            visit, _ = SchoolVisit.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "uid": nullable_str(row.get("visit_uid")),
                    "school": school,
                    "coach": coach,
                    "visit_date": row.get("visit_date") or "2026-01-01",
                    "visit_type": visit_type,
                    "visit_reason": nullable_str(row.get("visit_reason")),
                    "implementation_status": (
                        nullable_str(row.get("implementation_status"))
                        if nullable_str(row.get("implementation_status")) in {choice[0] for choice in SchoolVisit.ImplementationStatus.choices}
                        else SchoolVisit.ImplementationStatus.STARTED
                    ),
                },
            )
            legacy_to_visit[row["id"]] = visit

    if table_exists(conn, "visit_participants"):
        for row in fetch_rows(conn, "SELECT * FROM visit_participants ORDER BY id"):
            visit = legacy_to_visit.get(row["visit_id"])
            contact = legacy_to_contact.get(row["contact_id"])
            school = legacy_to_school.get(row["school_id"])
            if not visit or not contact or not school:
                continue
            VisitParticipant.objects.update_or_create(
                visit=visit,
                contact=contact,
                defaults={
                    "school": school,
                    "role_at_time": nullable_str(row.get("role_at_time")),
                    "attended": int(row.get("attended") or 0) == 1,
                },
            )

    if table_exists(conn, "lesson_evaluations"):
        for row in fetch_rows(conn, "SELECT * FROM lesson_evaluations ORDER BY id"):
            school = legacy_to_school.get(row["school_id"])
            teacher = Teacher.objects.filter(uid=nullable_str(row.get("teacher_uid"))).first()
            visit = legacy_to_visit.get(row.get("visit_id")) if row.get("visit_id") else None
            evaluator = legacy_to_user.get(row.get("evaluator_user_id"))
            if not school:
                continue
            status = nullable_str(row.get("status"))
            if status not in {choice[0] for choice in LessonEvaluation.Status.choices}:
                status = LessonEvaluation.Status.ACTIVE
            evaluation, _ = LessonEvaluation.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "school": school,
                    "teacher": teacher,
                    "visit": visit,
                    "evaluator": evaluator,
                    "lesson_date": row.get("lesson_date") or "2026-01-01",
                    "grade": nullable_str(row.get("grade")),
                    "lesson_focus": [],
                    "strengths_text": nullable_str(row.get("strengths_text")),
                    "priority_gap_text": nullable_str(row.get("priority_gap_text")),
                    "next_coaching_action": nullable_str(row.get("next_coaching_action")),
                    "teacher_commitment": nullable_str(row.get("teacher_commitment")),
                    "overall_score": row.get("overall_score") or 0,
                    "status": status,
                },
            )
            legacy_to_eval[row["id"]] = evaluation

    if table_exists(conn, "lesson_evaluation_items"):
        for row in fetch_rows(conn, "SELECT * FROM lesson_evaluation_items ORDER BY id"):
            evaluation = legacy_to_eval.get(row["evaluation_id"])
            if not evaluation:
                continue
            LessonEvaluationItem.objects.update_or_create(
                evaluation=evaluation,
                item_key=nullable_str(row.get("item_key")),
                defaults={
                    "domain_key": nullable_str(row.get("domain_key")),
                    "score": row.get("score") or 0,
                    "note": nullable_str(row.get("note")),
                },
            )

    if table_exists(conn, "assessment_sessions"):
        for row in fetch_rows(conn, "SELECT * FROM assessment_sessions ORDER BY id"):
            school = legacy_to_school.get(row["school_id"])
            if not school:
                continue
            assessor = legacy_to_user.get(row.get("assessor_user_id"))
            session, _ = AssessmentSession.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "uid": nullable_str(row.get("session_uid")) or f"AS-{row['id']}",
                    "school": school,
                    "assessment_date": row.get("assessment_date") or "2026-01-01",
                    "assessment_type": row.get("assessment_type") or AssessmentSession.AssessmentType.BASELINE,
                    "class_grade": nullable_str(row.get("class_grade")) or "P3",
                    "tool_version": nullable_str(row.get("tool_version")) or "EGRA-v1",
                    "assessor": assessor,
                    "model_version": nullable_str(row.get("model_version")),
                    "benchmark_version": nullable_str(row.get("benchmark_version")),
                    "scoring_profile_version": nullable_str(row.get("scoring_profile_version")),
                },
            )
            legacy_to_session[row["id"]] = session

    if table_exists(conn, "assessment_session_results"):
        for row in fetch_rows(conn, "SELECT * FROM assessment_session_results ORDER BY id"):
            session = legacy_to_session.get(row["assessment_session_id"])
            learner = Learner.objects.filter(uid=nullable_str(row.get("learner_uid"))).first()
            if not session:
                continue
            AssessmentResult.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "session": session,
                    "learner": learner,
                    "source_row_key": nullable_str(row.get("source_row_key")),
                    "letter_identification_score": row.get("letter_sounds_score"),
                    "sound_identification_score": row.get("decoding_score"),
                    "story_reading_score": row.get("fluency_score"),
                    "reading_comprehension_score": row.get("comprehension_score"),
                    "computed_reading_level": nullable_str(row.get("computed_reading_level")),
                    "computed_level_band": row.get("computed_level_band"),
                    "fluency_accuracy_score": row.get("fluency_accuracy_score"),
                },
            )

    if table_exists(conn, "story_anthologies"):
        for row in fetch_rows(conn, "SELECT * FROM story_anthologies ORDER BY id"):
            school = legacy_to_school.get(row.get("school_id")) if row.get("school_id") else None
            StoryAnthology.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "slug": nullable_str(row.get("slug")) or to_slug(nullable_str(row.get("title")), f"anthology-{row['id']}"),
                    "title": nullable_str(row.get("title")),
                    "school": school,
                    "edition": nullable_str(row.get("edition")),
                    "publish_status": nullable_str(row.get("publish_status")) or "draft",
                    "consent_status": nullable_str(row.get("consent_status")) or "pending",
                    "featured": int(row.get("featured") or 0) == 1,
                    "featured_rank": row.get("featured_rank"),
                    "published_at": row.get("published_at"),
                },
            )

    if table_exists(conn, "story_library"):
        anthology_map = {a.legacy_id: a for a in StoryAnthology.objects.exclude(legacy_id__isnull=True)}
        for row in fetch_rows(conn, "SELECT * FROM story_library ORDER BY id"):
            school = legacy_to_school.get(row["school_id"])
            if not school:
                continue
            anthology = anthology_map.get(row.get("anthology_id")) if row.get("anthology_id") else None
            Story.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "slug": nullable_str(row.get("slug")) or to_slug(nullable_str(row.get("title")), f"story-{row['id']}"),
                    "school": school,
                    "anthology": anthology,
                    "title": nullable_str(row.get("title")),
                    "excerpt": nullable_str(row.get("excerpt")),
                    "content_text": nullable_str(row.get("content_text")),
                    "grade": nullable_str(row.get("grade")),
                    "language": nullable_str(row.get("language")) or "English",
                    "tags": [],
                    "publish_status": nullable_str(row.get("publish_status")) or "draft",
                    "consent_status": nullable_str(row.get("consent_status")) or "pending",
                    "public_author_display": nullable_str(row.get("public_author_display")),
                    "view_count": row.get("view_count") or 0,
                    "created_by": legacy_to_user.get(row.get("created_by_user_id")),
                    "published_at": row.get("published_at"),
                },
            )

    if table_exists(conn, "portal_blog_posts"):
        for row in fetch_rows(conn, "SELECT * FROM portal_blog_posts ORDER BY id"):
            BlogPost.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "slug": nullable_str(row.get("slug")) or to_slug(nullable_str(row.get("title")), f"blog-{row['id']}"),
                    "title": nullable_str(row.get("title")),
                    "summary": nullable_str(row.get("summary")),
                    "content_markdown": nullable_str(row.get("content_markdown")),
                    "category": nullable_str(row.get("category")),
                    "cover_image_url": nullable_str(row.get("cover_image_url")),
                    "publish_status": nullable_str(row.get("publish_status")) or "draft",
                    "published_at": row.get("published_at"),
                    "author_name": nullable_str(row.get("author_name")),
                },
            )

    if table_exists(conn, "impact_reports"):
        for row in fetch_rows(conn, "SELECT * FROM impact_reports ORDER BY id"):
            ImpactReport.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "report_code": nullable_str(row.get("report_code")) or f"RPT-{row['id']}",
                    "title": nullable_str(row.get("title")) or f"Impact report {row['id']}",
                    "scope_type": nullable_str(row.get("scope_type")) or ImpactReport.ScopeType.COUNTRY,
                    "scope_value": nullable_str(row.get("scope_value")) or "Uganda",
                    "period_start": row.get("period_start"),
                    "period_end": row.get("period_end"),
                    "narrative_json": {},
                    "fact_pack_json": {},
                    "is_public": int(row.get("is_public") or 0) == 1,
                    "published_at": row.get("published_at") or row.get("generated_at"),
                },
            )

    if table_exists(conn, "finance_contacts"):
        for row in fetch_rows(conn, "SELECT * FROM finance_contacts ORDER BY id"):
            emails = []
            raw = nullable_str(row.get("emails_json"))
            if raw.startswith("[") and raw.endswith("]"):
                import json

                try:
                    emails = json.loads(raw)
                except json.JSONDecodeError:
                    emails = []
            contact, _ = FinanceContact.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "name": nullable_str(row.get("name")),
                    "emails": emails,
                    "phone": nullable_str(row.get("phone")),
                    "whatsapp": nullable_str(row.get("whatsapp")),
                    "address": nullable_str(row.get("address")),
                    "contact_type": nullable_str(row.get("contact_type")) or FinanceContact.ContactType.OTHER,
                },
            )
            legacy_to_contact_fin[row["id"]] = contact

    if table_exists(conn, "finance_invoices"):
        for row in fetch_rows(conn, "SELECT * FROM finance_invoices ORDER BY id"):
            contact = legacy_to_contact_fin.get(row.get("contact_id"))
            if not contact:
                continue
            invoice, _ = Invoice.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "invoice_number": nullable_str(row.get("invoice_number")) or f"INV-{row['id']}",
                    "contact": contact,
                    "category": nullable_str(row.get("category")) or "Donation",
                    "issue_date": row.get("issue_date") or "2026-01-01",
                    "due_date": row.get("due_date") or row.get("issue_date") or "2026-01-01",
                    "currency": nullable_str(row.get("currency")) or "UGX",
                    "notes": nullable_str(row.get("notes")),
                    "subtotal": row.get("subtotal") or 0,
                    "total": row.get("total") or 0,
                    "balance_due": row.get("balance_due") or 0,
                    "status": nullable_str(row.get("status")) or Invoice.Status.DRAFT,
                },
            )
            legacy_to_invoice[row["id"]] = invoice

    if table_exists(conn, "finance_invoice_items"):
        for row in fetch_rows(conn, "SELECT * FROM finance_invoice_items ORDER BY id"):
            invoice = legacy_to_invoice.get(row.get("invoice_id"))
            if not invoice:
                continue
            InvoiceItem.objects.update_or_create(
                invoice=invoice,
                description=nullable_str(row.get("description")) or f"Line {row['id']}",
                defaults={
                    "qty": row.get("qty") or 1,
                    "unit_price": row.get("unit_price") or 0,
                    "line_total": row.get("line_total") or 0,
                },
            )

    if table_exists(conn, "finance_receipts"):
        for row in fetch_rows(conn, "SELECT * FROM finance_receipts ORDER BY id"):
            contact = legacy_to_contact_fin.get(row.get("contact_id"))
            if not contact:
                continue
            invoice = legacy_to_invoice.get(row.get("related_invoice_id")) if row.get("related_invoice_id") else None
            Receipt.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "receipt_number": nullable_str(row.get("receipt_number")) or f"REC-{row['id']}",
                    "contact": contact,
                    "related_invoice": invoice,
                    "category": nullable_str(row.get("category")) or "Donation",
                    "received_from": nullable_str(row.get("received_from")) or contact.name,
                    "receipt_date": row.get("receipt_date") or "2026-01-01",
                    "amount_received": row.get("amount_received") or 0,
                    "currency": nullable_str(row.get("currency")) or "UGX",
                    "payment_method": nullable_str(row.get("payment_method")) or "bank_transfer",
                    "description": nullable_str(row.get("description")),
                    "notes": nullable_str(row.get("notes")),
                    "status": nullable_str(row.get("status")) or Receipt.Status.DRAFT,
                    "issued_at": row.get("issued_at"),
                },
            )

    if table_exists(conn, "finance_expenses"):
        for row in fetch_rows(conn, "SELECT * FROM finance_expenses ORDER BY id"):
            Expense.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "expense_number": nullable_str(row.get("expense_number")) or f"EXP-{row['id']}",
                    "vendor_name": nullable_str(row.get("vendor_name")),
                    "date": row.get("date") or "2026-01-01",
                    "category": nullable_str(row.get("category")) or "Expense",
                    "subcategory": nullable_str(row.get("subcategory")),
                    "amount": row.get("amount") or 0,
                    "currency": nullable_str(row.get("currency")) or "UGX",
                    "payment_method": nullable_str(row.get("payment_method")) or "other",
                    "description": nullable_str(row.get("description")),
                    "notes": nullable_str(row.get("notes")),
                    "status": nullable_str(row.get("status")) or Expense.Status.DRAFT,
                    "submitted_at": row.get("submitted_at"),
                    "posted_at": row.get("posted_at"),
                },
            )

    if table_exists(conn, "finance_transactions_ledger"):
        for row in fetch_rows(conn, "SELECT * FROM finance_transactions_ledger ORDER BY id"):
            LedgerTransaction.objects.update_or_create(
                source_type=nullable_str(row.get("source_type")) or LedgerTransaction.SourceType.MANUAL,
                source_id=row.get("source_id"),
                date=row.get("date") or "2026-01-01",
                amount=row.get("amount") or 0,
                defaults={
                    "txn_type": nullable_str(row.get("txn_type")) or LedgerTransaction.TxnType.MONEY_IN,
                    "category": nullable_str(row.get("category")) or "Other",
                    "currency": nullable_str(row.get("currency")) or "UGX",
                    "posted_status": nullable_str(row.get("posted_status")) or LedgerTransaction.PostedStatus.POSTED,
                    "notes": nullable_str(row.get("notes")),
                },
            )

    if table_exists(conn, "finance_monthly_statements"):
        for row in fetch_rows(conn, "SELECT * FROM finance_monthly_statements ORDER BY id"):
            MonthlyStatement.objects.update_or_create(
                month=nullable_str(row.get("month")) or "2026-01",
                currency=nullable_str(row.get("currency")) or "UGX",
                period_type=nullable_str(row.get("period_type")) or "monthly",
                defaults={
                    "total_money_in": row.get("total_money_in") or 0,
                    "total_money_out": row.get("total_money_out") or 0,
                    "net": row.get("net") or 0,
                    "breakdown_by_category": {},
                },
            )

    if table_exists(conn, "finance_public_snapshots"):
        for row in fetch_rows(conn, "SELECT * FROM finance_public_snapshots ORDER BY id"):
            PublicFinanceSnapshot.objects.update_or_create(
                legacy_id=row["id"],
                defaults={
                    "month": nullable_str(row.get("month")) or "2026-01",
                    "currency": nullable_str(row.get("currency")) or "UGX",
                    "summary_json": {},
                    "status": nullable_str(row.get("status")) or PublicFinanceSnapshot.Status.PRIVATE_UPLOADED,
                    "published_at": row.get("published_at"),
                },
            )

    if table_exists(conn, "finance_audit_exceptions"):
        for row in fetch_rows(conn, "SELECT * FROM finance_audit_exceptions ORDER BY id"):
            FinanceAuditException.objects.update_or_create(
                entity_type=nullable_str(row.get("entity_type")),
                entity_id=row.get("entity_id") or 0,
                rule_code=nullable_str(row.get("rule_code")),
                defaults={
                    "severity": nullable_str(row.get("severity")) or FinanceAuditException.Severity.MEDIUM,
                    "message": nullable_str(row.get("message")),
                    "status": nullable_str(row.get("status")) or FinanceAuditException.Status.OPEN,
                    "amount": row.get("amount"),
                    "currency": nullable_str(row.get("currency")) or "UGX",
                },
            )

    GraduationSettings.objects.get_or_create(id=1)

    conn.close()

    print("Migration completed. Row counts:")
    print(f"  users={User.objects.count()}")
    print(f"  schools={School.objects.count()}")
    print(f"  school_contacts={SchoolContact.objects.count()}")
    print(f"  learners={Learner.objects.count()}")
    print(f"  trainings={TrainingSession.objects.count()}")
    print(f"  visits={SchoolVisit.objects.count()}")
    print(f"  evaluations={LessonEvaluation.objects.count()}")
    print(f"  assessments={AssessmentSession.objects.count()} sessions / {AssessmentResult.objects.count()} results")
    print(f"  stories={Story.objects.count()} / anthologies={StoryAnthology.objects.count()} / blog_posts={BlogPost.objects.count()}")
    print(f"  finance_contacts={FinanceContact.objects.count()} invoices={Invoice.objects.count()} receipts={Receipt.objects.count()} expenses={Expense.objects.count()}")
    print(f"  impact_reports={ImpactReport.objects.count()}")


if __name__ == "__main__":
    sqlite_source = Path(os.getenv("SQLITE_SOURCE_PATH", "../data/app.db"))
    if not sqlite_source.exists():
        raise FileNotFoundError(f"SQLite source not found: {sqlite_source}")
    migrate(sqlite_source)
