from django.contrib import admin
from django.urls import include, path

from apps.common.views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health"),
    path("api/v1/auth/", include("apps.accounts.auth_urls")),
    path("api/v1/public/", include("apps.reports.public_urls")),
    path("api/v1/staff/", include("config.staff_urls")),
]
