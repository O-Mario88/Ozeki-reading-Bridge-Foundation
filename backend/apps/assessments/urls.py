from rest_framework.routers import DefaultRouter

from .views import AssessmentResultViewSet, AssessmentSessionViewSet

router = DefaultRouter()
router.register("sessions", AssessmentSessionViewSet, basename="assessment-sessions")
router.register("results", AssessmentResultViewSet, basename="assessment-results")

urlpatterns = router.urls
