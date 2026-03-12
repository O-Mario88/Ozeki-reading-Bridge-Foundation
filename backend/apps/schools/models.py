from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel
from apps.geography.models import District, Parish, Region, SubCounty, SubRegion


class School(TimeStampedModel):
    class ProgramStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        GRADUATED = "graduated", "Graduated"
        PAUSED = "paused", "Paused"
        MONITORING = "monitoring", "Monitoring"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    uid = models.CharField(max_length=64, blank=True, default="")
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    region = models.ForeignKey(Region, null=True, blank=True, on_delete=models.SET_NULL, related_name="schools")
    subregion = models.ForeignKey(SubRegion, null=True, blank=True, on_delete=models.SET_NULL, related_name="schools")
    district = models.ForeignKey(District, null=True, blank=True, on_delete=models.SET_NULL, related_name="schools")
    subcounty = models.ForeignKey(SubCounty, null=True, blank=True, on_delete=models.SET_NULL, related_name="schools")
    parish = models.ForeignKey(Parish, null=True, blank=True, on_delete=models.SET_NULL, related_name="schools")
    district_name = models.CharField(max_length=120, blank=True)
    sub_county_name = models.CharField(max_length=120, blank=True)
    parish_name = models.CharField(max_length=120, blank=True)
    village = models.CharField(max_length=120, blank=True)
    gps_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    enrollment_total = models.PositiveIntegerField(default=0)
    enrolled_boys = models.PositiveIntegerField(default=0)
    enrolled_girls = models.PositiveIntegerField(default=0)
    program_status = models.CharField(max_length=24, choices=ProgramStatus.choices, default=ProgramStatus.ACTIVE)
    graduated_at = models.DateTimeField(null=True, blank=True)
    graduation_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class SchoolContact(TimeStampedModel):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"

    class Category(models.TextChoices):
        PROPRIETOR = "proprietor", "Proprietor"
        HEAD_TEACHER = "head_teacher", "Head Teacher"
        DEPUTY_HEAD = "deputy_head", "Deputy Head Teacher"
        DOS = "dos", "Director of Studies"
        TEACHER = "teacher", "Teacher"
        ADMINISTRATOR = "administrator", "Administrator"
        ACCOUNTANT = "accountant", "Accountant"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    uid = models.CharField(max_length=64, blank=True, default="")
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="contacts")
    full_name = models.CharField(max_length=255)
    gender = models.CharField(max_length=16, choices=Gender.choices)
    category = models.CharField(max_length=32, choices=Category.choices)
    role_title = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    whatsapp = models.CharField(max_length=40, blank=True)
    class_taught = models.CharField(max_length=64, blank=True)
    subject_taught = models.CharField(max_length=64, blank=True)
    is_primary_contact = models.BooleanField(default=False)

    class Meta:
        ordering = ["school_id", "full_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["school"],
                condition=models.Q(is_primary_contact=True),
                name="unique_primary_contact_per_school",
            )
        ]

    def __str__(self) -> str:
        return self.full_name


class Teacher(TimeStampedModel):
    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    uid = models.CharField(max_length=64, unique=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="teachers")
    full_name = models.CharField(max_length=255)
    gender = models.CharField(max_length=16, choices=SchoolContact.Gender.choices)
    is_reading_teacher = models.BooleanField(default=True)
    phone = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=32, default="active")

    class Meta:
        ordering = ["school_id", "full_name"]


class SchoolGraduationWorkflow(TimeStampedModel):
    class WorkflowState(models.TextChoices):
        PENDING = "pending", "Pending"
        KEPT_SUPPORTING = "kept_supporting", "Kept Supporting"
        NEEDS_REVIEW = "needs_review", "Needs Review"
        GRADUATED = "graduated", "Graduated"
        MONITORING = "monitoring", "Monitoring"

    school = models.OneToOneField(School, on_delete=models.CASCADE, related_name="graduation_workflow")
    state = models.CharField(max_length=32, choices=WorkflowState.choices, default=WorkflowState.PENDING)
    snoozed_until = models.DateField(null=True, blank=True)
    assigned_supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="graduation_assignments",
    )
    reason = models.TextField(blank=True)
    checklist_answers = models.JSONField(default=dict, blank=True)
