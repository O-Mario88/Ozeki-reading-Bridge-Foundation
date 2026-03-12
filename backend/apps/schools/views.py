from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffRole

from .models import School, SchoolContact, SchoolGraduationWorkflow, Teacher
from .serializers import (
    SchoolContactSerializer,
    SchoolGraduationWorkflowSerializer,
    SchoolSerializer,
    TeacherSerializer,
)


class SchoolViewSet(viewsets.ModelViewSet):
    queryset = School.objects.select_related(
        "region", "subregion", "district", "subcounty", "parish"
    ).order_by("name")
    serializer_class = SchoolSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    search_fields = ["name", "code", "district_name", "sub_county_name", "parish_name"]
    filterset_fields = ["program_status", "district", "subregion", "region"]


class SchoolContactViewSet(viewsets.ModelViewSet):
    queryset = SchoolContact.objects.select_related("school").order_by("school_id", "full_name")
    serializer_class = SchoolContactSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    search_fields = ["full_name", "email", "phone", "school__name"]
    filterset_fields = ["school", "category", "is_primary_contact"]


class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.select_related("school").order_by("school_id", "full_name")
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    search_fields = ["full_name", "uid", "school__name"]
    filterset_fields = ["school", "status", "is_reading_teacher"]


class SchoolGraduationWorkflowViewSet(viewsets.ModelViewSet):
    queryset = SchoolGraduationWorkflow.objects.select_related("school", "assigned_supervisor").order_by("school_id")
    serializer_class = SchoolGraduationWorkflowSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["state", "assigned_supervisor", "school"]
