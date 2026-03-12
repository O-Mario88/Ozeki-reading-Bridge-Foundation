from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffRole

from .models import LessonEvaluation, LessonEvaluationItem
from .serializers import LessonEvaluationItemSerializer, LessonEvaluationSerializer


class LessonEvaluationViewSet(viewsets.ModelViewSet):
    queryset = LessonEvaluation.objects.select_related("school", "teacher", "visit", "evaluator").prefetch_related("items").order_by("-lesson_date", "id")
    serializer_class = LessonEvaluationSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["school", "teacher", "visit", "status", "lesson_date"]
    search_fields = ["school__name", "teacher__full_name"]


class LessonEvaluationItemViewSet(viewsets.ModelViewSet):
    queryset = LessonEvaluationItem.objects.select_related("evaluation").order_by("evaluation_id", "domain_key", "item_key")
    serializer_class = LessonEvaluationItemSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["evaluation", "domain_key"]
