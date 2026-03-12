from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel
from apps.schools.models import School, SchoolContact, Teacher


class TrainingSession(TimeStampedModel):
    class TrainingType(models.TextChoices):
        PHONICS = "phonics", "Phonics"
        COACHING = "coaching", "Coaching"
        ASSESSMENT = "assessment", "Assessment"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        APPROVED = "approved", "Approved"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="training_sessions")
    date = models.DateField()
    training_type = models.CharField(max_length=24, choices=TrainingType.choices, default=TrainingType.PHONICS)
    title = models.CharField(max_length=255, blank=True)
    district_name = models.CharField(max_length=120, blank=True)
    sub_county_name = models.CharField(max_length=120, blank=True)
    parish_name = models.CharField(max_length=120, blank=True)
    village = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "id"]


class TrainingParticipant(TimeStampedModel):
    class ParticipantRole(models.TextChoices):
        CLASSROOM_TEACHER = "classroom_teacher", "Classroom Teacher"
        SCHOOL_LEADER = "school_leader", "School Leader"
        OTHER = "other", "Other"

    session = models.ForeignKey(TrainingSession, on_delete=models.CASCADE, related_name="participants")
    school = models.ForeignKey(School, null=True, blank=True, on_delete=models.SET_NULL)
    contact = models.ForeignKey(SchoolContact, null=True, blank=True, on_delete=models.SET_NULL)
    teacher = models.ForeignKey(Teacher, null=True, blank=True, on_delete=models.SET_NULL)
    participant_name = models.CharField(max_length=255)
    participant_role = models.CharField(max_length=32, choices=ParticipantRole.choices)
    gender = models.CharField(max_length=16, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    attended = models.BooleanField(default=True)

    class Meta:
        ordering = ["session_id", "participant_name"]
