from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffRole

from .models import District, Parish, Region, SubCounty, SubRegion
from .serializers import (
    DistrictSerializer,
    ParishSerializer,
    RegionSerializer,
    SubCountySerializer,
    SubRegionSerializer,
)


class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.order_by("name")
    serializer_class = RegionSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    search_fields = ["name", "code"]


class SubRegionViewSet(viewsets.ModelViewSet):
    queryset = SubRegion.objects.select_related("region").order_by("name")
    serializer_class = SubRegionSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["region"]
    search_fields = ["name", "code"]


class DistrictViewSet(viewsets.ModelViewSet):
    queryset = District.objects.select_related("region", "subregion").order_by("name")
    serializer_class = DistrictSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["region", "subregion"]
    search_fields = ["name", "code"]


class SubCountyViewSet(viewsets.ModelViewSet):
    queryset = SubCounty.objects.select_related("district").order_by("name")
    serializer_class = SubCountySerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["district"]
    search_fields = ["name", "code"]


class ParishViewSet(viewsets.ModelViewSet):
    queryset = Parish.objects.select_related("subcounty").order_by("name")
    serializer_class = ParishSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["subcounty"]
    search_fields = ["name", "code"]
