from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import User
from .permissions import IsAdminRole
from .serializers import UserSerializer, UserWriteSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.order_by("id")
    permission_classes = [IsAuthenticated, IsAdminRole]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["id", "email", "role", "date_joined"]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return UserWriteSerializer
        return UserSerializer
