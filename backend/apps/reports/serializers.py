from rest_framework import serializers

from .models import ImpactReport, PublicDashboardAggregate


class ImpactReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImpactReport
        fields = "__all__"


class PublicDashboardAggregateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicDashboardAggregate
        fields = "__all__"
