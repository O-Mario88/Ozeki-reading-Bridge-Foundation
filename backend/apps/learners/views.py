from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffRole

from .models import Learner
from .serializers import LearnerSerializer


class LearnerViewSet(viewsets.ModelViewSet):
    queryset = Learner.objects.select_related("school").order_by("school_id", "class_grade", "full_name")
    serializer_class = LearnerSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["school", "class_grade", "gender"]
    search_fields = ["full_name", "uid", "internal_child_id", "school__name"]
