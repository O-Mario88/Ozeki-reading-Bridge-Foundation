from rest_framework.routers import DefaultRouter

from .views import SchoolVisitViewSet, VisitParticipantViewSet

router = DefaultRouter()
router.register("records", SchoolVisitViewSet, basename="visits")
router.register("participants", VisitParticipantViewSet, basename="visit-participants")

urlpatterns = router.urls
