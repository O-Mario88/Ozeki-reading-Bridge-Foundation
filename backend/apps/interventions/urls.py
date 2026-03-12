from rest_framework.routers import DefaultRouter

from .views import (
    GraduationSettingsViewSet,
    InterventionActionViewSet,
    InterventionGroupViewSet,
    InterventionPlanViewSet,
    InterventionSessionViewSet,
)

router = DefaultRouter()
router.register("plans", InterventionPlanViewSet, basename="intervention-plans")
router.register("actions", InterventionActionViewSet, basename="intervention-actions")
router.register("groups", InterventionGroupViewSet, basename="intervention-groups")
router.register("sessions", InterventionSessionViewSet, basename="intervention-sessions")
router.register("graduation-settings", GraduationSettingsViewSet, basename="graduation-settings")

urlpatterns = router.urls
