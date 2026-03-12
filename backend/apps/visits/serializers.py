from rest_framework import serializers

from .models import SchoolVisit, VisitParticipant


class VisitParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitParticipant
        fields = "__all__"


class SchoolVisitSerializer(serializers.ModelSerializer):
    participants = VisitParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = SchoolVisit
        fields = "__all__"
