from django.db import models

from apps.common.models import TimeStampedModel


class ImpactReport(TimeStampedModel):
    class ScopeType(models.TextChoices):
        COUNTRY = "country", "Country"
        REGION = "region", "Region"
        SUBREGION = "subregion", "Subregion"
        DISTRICT = "district", "District"
        SCHOOL = "school", "School"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    report_code = models.CharField(max_length=64, unique=True)
    title = models.CharField(max_length=255)
    scope_type = models.CharField(max_length=16, choices=ScopeType.choices)
    scope_value = models.CharField(max_length=255)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    narrative_json = models.JSONField(default=dict, blank=True)
    fact_pack_json = models.JSONField(default=dict, blank=True)
    is_public = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]


class PublicDashboardAggregate(TimeStampedModel):
    class ScopeType(models.TextChoices):
        COUNTRY = "country", "Country"
        REGION = "region", "Region"
        SUBREGION = "subregion", "Subregion"
        DISTRICT = "district", "District"
        SCHOOL = "school", "School"

    scope_type = models.CharField(max_length=16, choices=ScopeType.choices)
    scope_value = models.CharField(max_length=255)
    period_key = models.CharField(max_length=32, default="FY")
    kpis = models.JSONField(default=dict, blank=True)
    domain_breakdown = models.JSONField(default=dict, blank=True)
    teaching_quality = models.JSONField(default=dict, blank=True)
    data_quality = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["scope_type", "scope_value", "-updated_at"]
        unique_together = [("scope_type", "scope_value", "period_key")]
