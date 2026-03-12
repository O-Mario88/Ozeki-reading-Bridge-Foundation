from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel
from apps.schools.models import School, Teacher
from apps.visits.models import SchoolVisit


class LessonEvaluation(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        VOID = "void", "Void"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="lesson_evaluations")
    teacher = models.ForeignKey(Teacher, null=True, blank=True, on_delete=models.SET_NULL, related_name="lesson_evaluations")
    visit = models.ForeignKey(SchoolVisit, null=True, blank=True, on_delete=models.SET_NULL, related_name="lesson_evaluations")
    evaluator = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    lesson_date = models.DateField()
    grade = models.CharField(max_length=32, blank=True)
    lesson_focus = models.JSONField(default=list, blank=True)
    strengths_text = models.TextField(blank=True)
    priority_gap_text = models.TextField(blank=True)
    next_coaching_action = models.TextField(blank=True)
    teacher_commitment = models.TextField(blank=True)
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ["-lesson_date", "id"]


class LessonEvaluationItem(TimeStampedModel):
    evaluation = models.ForeignKey(LessonEvaluation, on_delete=models.CASCADE, related_name="items")
    domain_key = models.CharField(max_length=64)
    item_key = models.CharField(max_length=64)
    score = models.PositiveSmallIntegerField()
    note = models.TextField(blank=True)

    class Meta:
        ordering = ["evaluation_id", "domain_key", "item_key"]
        unique_together = [("evaluation", "item_key")]
