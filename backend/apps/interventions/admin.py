from django.contrib import admin

from .models import (
    GraduationSettings,
    InterventionAction,
    InterventionGroup,
    InterventionPlan,
    InterventionSession,
)

admin.site.register(InterventionPlan)
admin.site.register(InterventionAction)
admin.site.register(InterventionGroup)
admin.site.register(InterventionSession)
admin.site.register(GraduationSettings)
