from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel
from apps.schools.models import School


class StoryAnthology(TimeStampedModel):
    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    slug = models.SlugField(max_length=160, unique=True)
    title = models.CharField(max_length=255)
    school = models.ForeignKey(School, null=True, blank=True, on_delete=models.SET_NULL, related_name="anthologies")
    edition = models.CharField(max_length=64, blank=True)
    publish_status = models.CharField(max_length=24, default="draft")
    consent_status = models.CharField(max_length=24, default="pending")
    featured = models.BooleanField(default=False)
    featured_rank = models.IntegerField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-featured", "featured_rank", "-published_at", "title"]


class Story(TimeStampedModel):
    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    slug = models.SlugField(max_length=200, unique=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="stories")
    anthology = models.ForeignKey(StoryAnthology, null=True, blank=True, on_delete=models.SET_NULL, related_name="stories")
    title = models.CharField(max_length=255)
    excerpt = models.TextField(blank=True)
    content_text = models.TextField(blank=True)
    grade = models.CharField(max_length=32, blank=True)
    language = models.CharField(max_length=64, default="English")
    tags = models.JSONField(default=list, blank=True)
    publish_status = models.CharField(max_length=24, default="draft")
    consent_status = models.CharField(max_length=24, default="pending")
    public_author_display = models.CharField(max_length=255, blank=True)
    view_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]


class BlogPost(TimeStampedModel):
    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    slug = models.SlugField(max_length=200, unique=True)
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    content_markdown = models.TextField(blank=True)
    category = models.CharField(max_length=120, blank=True)
    cover_image_url = models.URLField(blank=True)
    publish_status = models.CharField(max_length=24, default="draft")
    published_at = models.DateTimeField(null=True, blank=True)
    author_name = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]


class NewsletterIssue(TimeStampedModel):
    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    slug = models.SlugField(max_length=200, unique=True)
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    html_content = models.TextField(blank=True)
    status = models.CharField(max_length=24, default="draft")
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]


class Resource(TimeStampedModel):
    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    external_url = models.URLField(blank=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ["title"]
