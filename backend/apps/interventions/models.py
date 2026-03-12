from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel
from apps.learners.models import Learner
from apps.schools.models import School


class InterventionPlan(TimeStampedModel):
    class ScopeType(models.TextChoices):
        SCHOOL = "school", "School"
        DISTRICT = "district", "District"
        REGION = "region", "Region"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        CLOSED = "closed", "Closed"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    scope_type = models.CharField(max_length=24, choices=ScopeType.choices)
    school = models.ForeignKey(School, null=True, blank=True, on_delete=models.CASCADE, related_name="intervention_plans")
    scope_reference = models.CharField(max_length=128, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.OPEN)
    title = models.CharField(max_length=255)
    notes = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)


class InterventionAction(TimeStampedModel):
    class Priority(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    class Status(models.TextChoices):
        TODO = "todo", "Todo"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"

    plan = models.ForeignKey(InterventionPlan, on_delete=models.CASCADE, related_name="actions")
    title = models.CharField(max_length=255)
    notes = models.TextField(blank=True)
    priority = models.CharField(max_length=16, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.TODO)
    due_date = models.DateField(null=True, blank=True)


class InterventionGroup(TimeStampedModel):
    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="intervention_groups")
    name = models.CharField(max_length=255)
    grade = models.CharField(max_length=32, blank=True)
    target_reading_level = models.CharField(max_length=64, blank=True)
    learners = models.ManyToManyField(Learner, blank=True, related_name="intervention_groups")


class InterventionSession(TimeStampedModel):
    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    group = models.ForeignKey(InterventionGroup, on_delete=models.CASCADE, related_name="sessions")
    date = models.DateField()
    duration_minutes = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)


class GraduationSettings(TimeStampedModel):
    id = models.PositiveIntegerField(primary_key=True, default=1, editable=False)
    criteria_version = models.CharField(max_length=32, default="GRAD-v1")
    target_domain_proficiency_pct = models.DecimalField(max_digits=5, decimal_places=2, default=90)
    required_domains = models.JSONField(default=list, blank=True)
    required_reading_level = models.CharField(max_length=64, default="Competent")
    required_fluent_pct = models.DecimalField(max_digits=5, decimal_places=2, default=60)
    min_published_stories = models.PositiveIntegerField(default=1)
    target_teaching_quality_pct = models.DecimalField(max_digits=5, decimal_places=2, default=70)
    min_learners_assessed_n = models.PositiveIntegerField(default=20)
    min_teacher_evaluations_total = models.PositiveIntegerField(default=2)
    require_sustainability_validation = models.BooleanField(default=True)
