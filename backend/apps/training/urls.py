from rest_framework.routers import DefaultRouter

from .views import TrainingParticipantViewSet, TrainingSessionViewSet

router = DefaultRouter()
router.register("sessions", TrainingSessionViewSet, basename="training-sessions")
router.register("participants", TrainingParticipantViewSet, basename="training-participants")

urlpatterns = router.urls
