from rest_framework.routers import DefaultRouter

from .views import DistrictViewSet, ParishViewSet, RegionViewSet, SubCountyViewSet, SubRegionViewSet

router = DefaultRouter()
router.register("regions", RegionViewSet, basename="regions")
router.register("subregions", SubRegionViewSet, basename="subregions")
router.register("districts", DistrictViewSet, basename="districts")
router.register("subcounties", SubCountyViewSet, basename="subcounties")
router.register("parishes", ParishViewSet, basename="parishes")

urlpatterns = router.urls
