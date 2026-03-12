from rest_framework.routers import DefaultRouter

from .views import LessonEvaluationItemViewSet, LessonEvaluationViewSet

router = DefaultRouter()
router.register("lessons", LessonEvaluationViewSet, basename="lesson-evaluations")
router.register("items", LessonEvaluationItemViewSet, basename="lesson-evaluation-items")

urlpatterns = router.urls
