from rest_framework.routers import DefaultRouter

from .views import BlogPostViewSet, NewsletterIssueViewSet, ResourceViewSet, StoryAnthologyViewSet, StoryViewSet

router = DefaultRouter()
router.register("stories", StoryViewSet, basename="stories")
router.register("anthologies", StoryAnthologyViewSet, basename="anthologies")
router.register("blog", BlogPostViewSet, basename="blog-posts")
router.register("newsletter", NewsletterIssueViewSet, basename="newsletter-issues")
router.register("resources", ResourceViewSet, basename="resources")

urlpatterns = router.urls
