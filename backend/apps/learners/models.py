from django.db import models

from apps.common.models import TimeStampedModel
from apps.schools.models import School


class Learner(TimeStampedModel):
    class Gender(models.TextChoices):
        BOY = "boy", "Boy"
        GIRL = "girl", "Girl"
        OTHER = "other", "Other"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    uid = models.CharField(max_length=64, unique=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="learners")
    full_name = models.CharField(max_length=255)
    class_grade = models.CharField(max_length=32)
    age = models.PositiveIntegerField()
    gender = models.CharField(max_length=16, choices=Gender.choices)
    internal_child_id = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["school_id", "class_grade", "full_name"]
