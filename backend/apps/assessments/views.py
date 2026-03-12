from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffRole

from .models import AssessmentResult, AssessmentSession
from .serializers import AssessmentResultSerializer, AssessmentSessionSerializer


class AssessmentSessionViewSet(viewsets.ModelViewSet):
    queryset = AssessmentSession.objects.select_related("school", "assessor").prefetch_related("results").order_by("-assessment_date", "id")
    serializer_class = AssessmentSessionSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["school", "assessment_type", "assessment_date", "class_grade"]
    search_fields = ["uid", "school__name"]


class AssessmentResultViewSet(viewsets.ModelViewSet):
    queryset = AssessmentResult.objects.select_related("session", "learner", "session__school").order_by("session_id", "id")
    serializer_class = AssessmentResultSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["session", "learner", "computed_reading_level"]
