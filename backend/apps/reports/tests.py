from django.test import TestCase
from rest_framework.test import APIClient

from apps.assessments.models import AssessmentSession
from apps.learners.models import Learner
from apps.schools.models import School
from apps.training.models import TrainingSession


class PublicImpactSummaryTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_public_summary_returns_aggregate_keys(self):
        school = School.objects.create(code="SCH-1", name="Demo School", district_name="Kampala")
        Learner.objects.create(
            uid="L-1",
            school=school,
            full_name="Hidden Name",
            class_grade="P3",
            age=9,
            gender=Learner.Gender.BOY,
        )
        TrainingSession.objects.create(school=school, date="2026-03-01", training_type=TrainingSession.TrainingType.PHONICS)
        AssessmentSession.objects.create(
            uid="AS-1",
            school=school,
            assessment_date="2026-03-02",
            assessment_type=AssessmentSession.AssessmentType.BASELINE,
            class_grade="P3",
        )

        response = self.client.get("/api/v1/public/impact/summary")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("kpis", payload)
        self.assertIn("schools_supported", payload["kpis"])
        self.assertIn("training_sessions_total", payload["kpis"])
        self.assertIn("teachers_supported", payload["kpis"])
        self.assertIn("learners_assessed_unique", payload["kpis"])
        self.assertNotIn("full_name", str(payload).lower())
        self.assertNotIn("learner_uid", str(payload).lower())
