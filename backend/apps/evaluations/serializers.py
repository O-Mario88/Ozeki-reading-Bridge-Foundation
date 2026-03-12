from rest_framework import serializers

from .models import LessonEvaluation, LessonEvaluationItem


class LessonEvaluationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonEvaluationItem
        fields = "__all__"


class LessonEvaluationSerializer(serializers.ModelSerializer):
    items = LessonEvaluationItemSerializer(many=True, read_only=True)

    class Meta:
        model = LessonEvaluation
        fields = "__all__"
