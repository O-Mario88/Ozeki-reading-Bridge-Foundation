from django.urls import path

from .views import (
    PublicBlogDetailView,
    PublicBlogView,
    PublicFinanceSnapshotsView,
    PublicReportDetailView,
    PublicReportsView,
    PublicStoryDetailView,
    PublicStoriesView,
    public_impact_summary,
)

urlpatterns = [
    path("impact/summary", public_impact_summary, name="public-impact-summary"),
    path("stories", PublicStoriesView.as_view(), name="public-stories"),
    path("stories/<slug:slug>", PublicStoryDetailView.as_view(), name="public-story-detail"),
    path("blog", PublicBlogView.as_view(), name="public-blog"),
    path("blog/<slug:slug>", PublicBlogDetailView.as_view(), name="public-blog-detail"),
    path("reports", PublicReportsView.as_view(), name="public-reports"),
    path("reports/<str:report_code>", PublicReportDetailView.as_view(), name="public-report-detail"),
    path("finance/snapshots", PublicFinanceSnapshotsView.as_view(), name="public-finance-snapshots"),
]
