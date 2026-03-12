from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel
from apps.schools.models import School, SchoolContact


class SchoolVisit(TimeStampedModel):
    class VisitType(models.TextChoices):
        OBSERVATION = "observation", "Observation"
        COACHING = "coaching", "Coaching"
        FOLLOW_UP = "follow_up", "Follow-up"

    class ImplementationStatus(models.TextChoices):
        STARTED = "started", "Started"
        PARTIAL = "partial", "Partial"
        STRONG = "strong", "Strong"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    uid = models.CharField(max_length=64, blank=True, default="")
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="visits")
    coach = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    visit_date = models.DateField()
    visit_type = models.CharField(max_length=24, choices=VisitType.choices)
    visit_reason = models.CharField(max_length=120, blank=True)
    implementation_status = models.CharField(max_length=24, choices=ImplementationStatus.choices, default=ImplementationStatus.STARTED)
    focus_areas = models.JSONField(default=list, blank=True)
    leadership_notes = models.TextField(blank=True)
    demo_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-visit_date", "id"]


class VisitParticipant(TimeStampedModel):
    visit = models.ForeignKey(SchoolVisit, on_delete=models.CASCADE, related_name="participants")
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    contact = models.ForeignKey(SchoolContact, on_delete=models.CASCADE)
    role_at_time = models.CharField(max_length=120, blank=True)
    attended = models.BooleanField(default=True)

    class Meta:
        ordering = ["visit_id", "contact_id"]
        unique_together = [("visit", "contact")]
