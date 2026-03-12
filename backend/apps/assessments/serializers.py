from rest_framework import serializers

from .models import AssessmentResult, AssessmentSession


class AssessmentResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentResult
        fields = "__all__"


class AssessmentSessionSerializer(serializers.ModelSerializer):
    results = AssessmentResultSerializer(many=True, read_only=True)

    class Meta:
        model = AssessmentSession
        fields = "__all__"
