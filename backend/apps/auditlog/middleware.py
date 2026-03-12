from __future__ import annotations

import uuid

from django.utils.deprecation import MiddlewareMixin

from .models import AuditLog


class AuditLogMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.audit_request_id = uuid.uuid4().hex

    def process_response(self, request, response):
        if request.path.startswith("/api/"):
            user = request.user if getattr(request, "user", None) and request.user.is_authenticated else None
            AuditLog.objects.create(
                user=user,
                method=request.method,
                path=request.path,
                status_code=response.status_code,
                ip_address=self._ip(request),
                request_id=getattr(request, "audit_request_id", ""),
            )
        return response

    @staticmethod
    def _ip(request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")
