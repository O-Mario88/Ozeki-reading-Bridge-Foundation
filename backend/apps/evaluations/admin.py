from django.contrib import admin

from .models import LessonEvaluation, LessonEvaluationItem

admin.site.register(LessonEvaluation)
admin.site.register(LessonEvaluationItem)
