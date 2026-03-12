from rest_framework.routers import DefaultRouter

from .views import ImpactReportViewSet, PublicDashboardAggregateViewSet

router = DefaultRouter()
router.register("impact-reports", ImpactReportViewSet, basename="impact-reports")
router.register("public-aggregates", PublicDashboardAggregateViewSet, basename="public-aggregates")

urlpatterns = router.urls
