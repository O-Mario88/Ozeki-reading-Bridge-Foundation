from django.urls import include, path

urlpatterns = [
    path("accounts/", include("apps.accounts.urls")),
    path("geography/", include("apps.geography.urls")),
    path("schools/", include("apps.schools.urls")),
    path("learners/", include("apps.learners.urls")),
    path("training/", include("apps.training.urls")),
    path("visits/", include("apps.visits.urls")),
    path("evaluations/", include("apps.evaluations.urls")),
    path("assessments/", include("apps.assessments.urls")),
    path("content/", include("apps.content.urls")),
    path("interventions/", include("apps.interventions.urls")),
    path("finance/", include("apps.finance.urls")),
    path("reports/", include("apps.reports.urls")),
    path("audit/", include("apps.auditlog.urls")),
]
