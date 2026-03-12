from rest_framework.routers import DefaultRouter

from .views import SchoolContactViewSet, SchoolGraduationWorkflowViewSet, SchoolViewSet, TeacherViewSet

router = DefaultRouter()
router.register("schools", SchoolViewSet, basename="schools")
router.register("contacts", SchoolContactViewSet, basename="school-contacts")
router.register("teachers", TeacherViewSet, basename="teachers")
router.register("graduation-workflows", SchoolGraduationWorkflowViewSet, basename="graduation-workflows")

urlpatterns = router.urls
