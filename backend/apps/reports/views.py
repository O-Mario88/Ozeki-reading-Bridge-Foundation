from __future__ import annotations

from django.db.models import Count
from rest_framework import generics, permissions, response, viewsets
from rest_framework.decorators import api_view, permission_classes

from apps.assessments.models import AssessmentResult, AssessmentSession
from apps.content.models import BlogPost, Story
from apps.evaluations.models import LessonEvaluation
from apps.finance.models import PublicFinanceSnapshot
from apps.learners.models import Learner
from apps.schools.models import School
from apps.training.models import TrainingParticipant, TrainingSession

from .models import ImpactReport, PublicDashboardAggregate
from .serializers import ImpactReportSerializer, PublicDashboardAggregateSerializer


class ImpactReportViewSet(viewsets.ModelViewSet):
    queryset = ImpactReport.objects.order_by("-published_at", "-created_at")
    serializer_class = ImpactReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["scope_type", "scope_value", "is_public"]
    search_fields = ["report_code", "title", "scope_value"]


class PublicDashboardAggregateViewSet(viewsets.ModelViewSet):
    queryset = PublicDashboardAggregate.objects.order_by("scope_type", "scope_value")
    serializer_class = PublicDashboardAggregateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["scope_type", "scope_value", "period_key"]


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def public_impact_summary(_request):
    schools_supported = School.objects.count()
    trainings_total = TrainingSession.objects.count()
    teachers_supported = TrainingParticipant.objects.filter(attended=True).count()
    learners_assessed = Learner.objects.filter(assessment_results__isnull=False).distinct().count()
    visits_total = LessonEvaluation.objects.count()

    latest_reports = ImpactReport.objects.filter(is_public=True).order_by("-published_at")[:8]

    payload = {
        "kpis": {
            "schools_supported": schools_supported,
            "training_sessions_total": trainings_total,
            "teachers_supported": teachers_supported,
            "learners_assessed_unique": learners_assessed,
            "visits_total": visits_total,
        },
        "reports": ImpactReportSerializer(latest_reports, many=True).data,
    }
    return response.Response(payload)


class PublicStoriesView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = None

    def get(self, request):
        stories = Story.objects.filter(publish_status="published", consent_status="approved").order_by("-published_at", "-created_at")[:100]
        return response.Response(
            [
                {
                    "slug": story.slug,
                    "title": story.title,
                    "excerpt": story.excerpt,
                    "language": story.language,
                    "published_at": story.published_at,
                    "school_id": story.school_id,
                }
                for story in stories
            ]
        )


class PublicStoryDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug: str):
        story = Story.objects.filter(slug=slug, publish_status="published", consent_status="approved").first()
        if not story:
            return response.Response({"detail": "Not found"}, status=404)
        return response.Response(
            {
                "slug": story.slug,
                "title": story.title,
                "excerpt": story.excerpt,
                "content_text": story.content_text,
                "language": story.language,
                "published_at": story.published_at,
                "school_id": story.school_id,
            }
        )


class PublicBlogView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        posts = BlogPost.objects.filter(publish_status="published").order_by("-published_at", "-created_at")[:100]
        return response.Response(
            [
                {
                    "slug": post.slug,
                    "title": post.title,
                    "summary": post.summary,
                    "category": post.category,
                    "published_at": post.published_at,
                    "author_name": post.author_name,
                }
                for post in posts
            ]
        )


class PublicBlogDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug: str):
        post = BlogPost.objects.filter(slug=slug, publish_status="published").first()
        if not post:
            return response.Response({"detail": "Not found"}, status=404)
        return response.Response(
            {
                "slug": post.slug,
                "title": post.title,
                "summary": post.summary,
                "content_markdown": post.content_markdown,
                "category": post.category,
                "published_at": post.published_at,
                "author_name": post.author_name,
            }
        )


class PublicReportsView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        reports = ImpactReport.objects.filter(is_public=True).order_by("-published_at", "-created_at")[:100]
        return response.Response(ImpactReportSerializer(reports, many=True).data)


class PublicReportDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, report_code: str):
        report = ImpactReport.objects.filter(report_code=report_code, is_public=True).first()
        if not report:
            return response.Response({"detail": "Not found"}, status=404)
        return response.Response(ImpactReportSerializer(report).data)


class PublicFinanceSnapshotsView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        snapshots = PublicFinanceSnapshot.objects.filter(status=PublicFinanceSnapshot.Status.PUBLISHED).order_by("-month")
        return response.Response(
            [
                {
                    "id": item.id,
                    "month": item.month,
                    "currency": item.currency,
                    "summary_json": item.summary_json,
                    "published_at": item.published_at,
                }
                for item in snapshots
            ]
        )
