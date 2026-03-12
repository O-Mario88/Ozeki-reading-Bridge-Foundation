from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import RoleAudit, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (("Platform", {"fields": ("role", "geography_scope", "legacy_id")}),)
    list_display = ("username", "email", "role", "is_active", "is_staff", "is_superuser")
    list_filter = ("role", "is_active")


@admin.register(RoleAudit)
class RoleAuditAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "old_role", "new_role", "changed_by", "created_at")
    search_fields = ("user__email",)
