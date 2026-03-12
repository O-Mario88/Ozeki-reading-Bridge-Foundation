from django.contrib import admin

from .models import TrainingParticipant, TrainingSession

admin.site.register(TrainingSession)
admin.site.register(TrainingParticipant)
