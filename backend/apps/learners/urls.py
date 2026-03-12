from rest_framework.routers import DefaultRouter

from .views import LearnerViewSet

router = DefaultRouter()
router.register("learners", LearnerViewSet, basename="learners")

urlpatterns = router.urls
