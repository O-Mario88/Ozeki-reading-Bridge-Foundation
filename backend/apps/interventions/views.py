from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffRole

from .models import (
    GraduationSettings,
    InterventionAction,
    InterventionGroup,
    InterventionPlan,
    InterventionSession,
)
from .serializers import (
    GraduationSettingsSerializer,
    InterventionActionSerializer,
    InterventionGroupSerializer,
    InterventionPlanSerializer,
    InterventionSessionSerializer,
)


class InterventionPlanViewSet(viewsets.ModelViewSet):
    queryset = InterventionPlan.objects.select_related("school", "owner").order_by("-created_at")
    serializer_class = InterventionPlanSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["scope_type", "school", "status", "owner"]
    search_fields = ["title", "notes", "scope_reference"]


class InterventionActionViewSet(viewsets.ModelViewSet):
    queryset = InterventionAction.objects.select_related("plan").order_by("due_date", "id")
    serializer_class = InterventionActionSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["plan", "priority", "status"]
    search_fields = ["title", "notes"]


class InterventionGroupViewSet(viewsets.ModelViewSet):
    queryset = InterventionGroup.objects.select_related("school").prefetch_related("learners").order_by("school_id", "name")
    serializer_class = InterventionGroupSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["school", "grade", "target_reading_level"]
    search_fields = ["name"]


class InterventionSessionViewSet(viewsets.ModelViewSet):
    queryset = InterventionSession.objects.select_related("group").order_by("-date", "id")
    serializer_class = InterventionSessionSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["group", "date"]


class GraduationSettingsViewSet(viewsets.ModelViewSet):
    queryset = GraduationSettings.objects.order_by("id")
    serializer_class = GraduationSettingsSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not queryset.exists():
            GraduationSettings.objects.create(id=1)
            queryset = super().get_queryset()
        return queryset
