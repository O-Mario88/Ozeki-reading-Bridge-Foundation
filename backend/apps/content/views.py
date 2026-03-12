from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffRole

from .models import BlogPost, NewsletterIssue, Resource, Story, StoryAnthology
from .serializers import (
    BlogPostSerializer,
    NewsletterIssueSerializer,
    ResourceSerializer,
    StoryAnthologySerializer,
    StorySerializer,
)


class StoryViewSet(viewsets.ModelViewSet):
    queryset = Story.objects.select_related("school", "anthology").order_by("-published_at", "-created_at")
    serializer_class = StorySerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["school", "anthology", "publish_status", "consent_status", "language"]
    search_fields = ["slug", "title", "public_author_display"]


class StoryAnthologyViewSet(viewsets.ModelViewSet):
    queryset = StoryAnthology.objects.select_related("school").order_by("-featured", "featured_rank", "title")
    serializer_class = StoryAnthologySerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["school", "publish_status", "featured"]
    search_fields = ["slug", "title"]


class BlogPostViewSet(viewsets.ModelViewSet):
    queryset = BlogPost.objects.order_by("-published_at", "-created_at")
    serializer_class = BlogPostSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["publish_status", "category"]
    search_fields = ["slug", "title", "summary", "category"]


class NewsletterIssueViewSet(viewsets.ModelViewSet):
    queryset = NewsletterIssue.objects.order_by("-published_at", "-created_at")
    serializer_class = NewsletterIssueSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["status"]
    search_fields = ["slug", "title"]


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.order_by("title")
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated, IsStaffRole]
    filterset_fields = ["is_published"]
    search_fields = ["slug", "title", "description"]
