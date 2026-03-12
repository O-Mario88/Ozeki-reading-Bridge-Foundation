from rest_framework import serializers

from .models import (
    GraduationSettings,
    InterventionAction,
    InterventionGroup,
    InterventionPlan,
    InterventionSession,
)


class InterventionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterventionPlan
        fields = "__all__"


class InterventionActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterventionAction
        fields = "__all__"


class InterventionGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterventionGroup
        fields = "__all__"


class InterventionSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterventionSession
        fields = "__all__"


class GraduationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GraduationSettings
        fields = "__all__"
