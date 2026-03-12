from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel
from apps.learners.models import Learner
from apps.schools.models import School


class AssessmentSession(TimeStampedModel):
    class AssessmentType(models.TextChoices):
        BASELINE = "baseline", "Baseline"
        PROGRESS = "progress", "Progress"
        ENDLINE = "endline", "Endline"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    uid = models.CharField(max_length=64, unique=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="assessment_sessions")
    assessment_date = models.DateField()
    assessment_type = models.CharField(max_length=16, choices=AssessmentType.choices)
    class_grade = models.CharField(max_length=32)
    tool_version = models.CharField(max_length=32, default="EGRA-v1")
    assessor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    model_version = models.CharField(max_length=64, blank=True)
    benchmark_version = models.CharField(max_length=64, blank=True)
    scoring_profile_version = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-assessment_date", "id"]


class AssessmentResult(TimeStampedModel):
    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    session = models.ForeignKey(AssessmentSession, on_delete=models.CASCADE, related_name="results")
    learner = models.ForeignKey(Learner, null=True, blank=True, on_delete=models.SET_NULL, related_name="assessment_results")
    source_row_key = models.CharField(max_length=64, blank=True)
    letter_identification_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sound_identification_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    decodable_words_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    story_reading_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    reading_comprehension_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    computed_reading_level = models.CharField(max_length=64, blank=True)
    computed_level_band = models.IntegerField(null=True, blank=True)
    fluency_accuracy_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["session_id", "id"]
