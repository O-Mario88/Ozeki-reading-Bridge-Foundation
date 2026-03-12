from rest_framework import serializers

from .models import District, Parish, Region, SubCounty, SubRegion


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = "__all__"


class SubRegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubRegion
        fields = "__all__"


class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = "__all__"


class SubCountySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCounty
        fields = "__all__"


class ParishSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parish
        fields = "__all__"
