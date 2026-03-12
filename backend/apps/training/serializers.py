from rest_framework import serializers

from .models import TrainingParticipant, TrainingSession


class TrainingParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingParticipant
        fields = "__all__"


class TrainingSessionSerializer(serializers.ModelSerializer):
    participants = TrainingParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = TrainingSession
        fields = "__all__"


class TrainingSessionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingSession
        fields = "__all__"
