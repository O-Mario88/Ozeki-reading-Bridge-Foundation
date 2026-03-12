from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffRole

from .models import TrainingParticipant, TrainingSession
from .serializers import (
    TrainingParticipantSerializer,
    TrainingSessionSerializer,
    TrainingSessionWriteSerializer,
)


class TrainingSessionViewSet(viewsets.ModelViewSet):
    queryset = TrainingSession.objects.select_related("school", "created_by").prefetch_related("participants").order_by("-date", "id")
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["school", "training_type", "status", "date"]
    search_fields = ["title", "school__name", "district_name"]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return TrainingSessionWriteSerializer
        return TrainingSessionSerializer


class TrainingParticipantViewSet(viewsets.ModelViewSet):
    queryset = TrainingParticipant.objects.select_related("session", "school", "contact", "teacher").order_by("session_id", "participant_name")
    serializer_class = TrainingParticipantSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["session", "school", "participant_role", "attended"]
    search_fields = ["participant_name", "phone", "email"]
