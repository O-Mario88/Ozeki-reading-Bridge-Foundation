from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffRole

from .models import SchoolVisit, VisitParticipant
from .serializers import SchoolVisitSerializer, VisitParticipantSerializer


class SchoolVisitViewSet(viewsets.ModelViewSet):
    queryset = SchoolVisit.objects.select_related("school", "coach").prefetch_related("participants").order_by("-visit_date", "id")
    serializer_class = SchoolVisitSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["school", "coach", "visit_type", "implementation_status", "visit_date"]
    search_fields = ["school__name", "visit_reason"]


class VisitParticipantViewSet(viewsets.ModelViewSet):
    queryset = VisitParticipant.objects.select_related("visit", "school", "contact").order_by("visit_id")
    serializer_class = VisitParticipantSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["visit", "school", "contact", "attended"]
