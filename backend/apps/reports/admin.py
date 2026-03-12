from django.contrib import admin

from .models import ImpactReport, PublicDashboardAggregate

admin.site.register(ImpactReport)
admin.site.register(PublicDashboardAggregate)
