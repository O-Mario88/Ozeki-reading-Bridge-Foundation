from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.common.models import TimeStampedModel


class User(AbstractUser):
    class Role(models.TextChoices):
        STAFF = "staff", "Staff"
        VOLUNTEER = "volunteer", "Volunteer"
        SUPERVISOR = "supervisor", "Supervisor"
        ME = "me", "M&E"
        ADMIN = "admin", "Admin"
        SUPERADMIN = "superadmin", "Super Admin"
        ACCOUNTANT = "accountant", "Accountant"

    role = models.CharField(max_length=32, choices=Role.choices, default=Role.STAFF)
    geography_scope = models.CharField(max_length=255, blank=True)
    legacy_id = models.IntegerField(null=True, blank=True, unique=True)

    @property
    def is_staff_role(self) -> bool:
        return self.role in {
            self.Role.STAFF,
            self.Role.VOLUNTEER,
            self.Role.SUPERVISOR,
            self.Role.ME,
            self.Role.ADMIN,
            self.Role.SUPERADMIN,
            self.Role.ACCOUNTANT,
        }

    @property
    def is_admin_role(self) -> bool:
        return self.role in {self.Role.ADMIN, self.Role.SUPERADMIN}


class RoleAudit(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="role_audits")
    old_role = models.CharField(max_length=32)
    new_role = models.CharField(max_length=32)
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="changed_role_audits",
    )
