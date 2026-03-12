from django.contrib import admin

from .models import BlogPost, NewsletterIssue, Resource, Story, StoryAnthology

admin.site.register(Story)
admin.site.register(StoryAnthology)
admin.site.register(BlogPost)
admin.site.register(NewsletterIssue)
admin.site.register(Resource)
