from django.contrib import admin

from .models import AssessmentResult, AssessmentSession

admin.site.register(AssessmentSession)
admin.site.register(AssessmentResult)
