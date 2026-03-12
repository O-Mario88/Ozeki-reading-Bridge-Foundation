from django.db import models

from apps.common.models import TimeStampedModel


class Region(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=120, unique=True)
    valid_from_year = models.IntegerField(null=True, blank=True)
    valid_to_year = models.IntegerField(null=True, blank=True)
    legacy_id = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class SubRegion(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=120)
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name="subregions")
    valid_from_year = models.IntegerField(null=True, blank=True)
    valid_to_year = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = [("region", "name")]
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class District(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=120)
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="districts")
    subregion = models.ForeignKey(SubRegion, on_delete=models.PROTECT, related_name="districts")
    valid_from_year = models.IntegerField(null=True, blank=True)
    valid_to_year = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = [("subregion", "name")]
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class SubCounty(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=120)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name="subcounties")

    class Meta:
        unique_together = [("district", "name")]
        ordering = ["name"]


class Parish(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=120)
    subcounty = models.ForeignKey(SubCounty, on_delete=models.CASCADE, related_name="parishes")

    class Meta:
        unique_together = [("subcounty", "name")]
        ordering = ["name"]
