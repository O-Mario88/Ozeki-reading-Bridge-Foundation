from rest_framework import serializers

from .models import BlogPost, NewsletterIssue, Resource, Story, StoryAnthology


class StoryAnthologySerializer(serializers.ModelSerializer):
    class Meta:
        model = StoryAnthology
        fields = "__all__"


class StorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Story
        fields = "__all__"


class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = "__all__"


class NewsletterIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterIssue
        fields = "__all__"


class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = "__all__"
