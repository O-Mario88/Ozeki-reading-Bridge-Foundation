from __future__ import annotations

from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import decorators, response, status, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsFinanceRole

from .models import (
    Expense,
    FinanceAuditException,
    FinanceContact,
    Invoice,
    LedgerTransaction,
    MonthlyStatement,
    PublicFinanceSnapshot,
    Receipt,
)
from .serializers import (
    ExpenseSerializer,
    FinanceAuditExceptionSerializer,
    FinanceContactSerializer,
    InvoiceSerializer,
    LedgerTransactionSerializer,
    MonthlyStatementSerializer,
    PublicFinanceSnapshotSerializer,
    ReceiptSerializer,
    issue_receipt,
    post_expense,
)


class FinanceContactViewSet(viewsets.ModelViewSet):
    queryset = FinanceContact.objects.order_by("name")
    serializer_class = FinanceContactSerializer
    permission_classes = [IsAuthenticated, IsFinanceRole]
    search_fields = ["name", "phone", "emails"]
    filterset_fields = ["contact_type"]


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("contact").prefetch_related("items").order_by("-issue_date", "-id")
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsFinanceRole]
    filterset_fields = ["status", "contact", "currency", "category"]
    search_fields = ["invoice_number", "contact__name"]


class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.select_related("contact", "related_invoice").order_by("-receipt_date", "-id")
    serializer_class = ReceiptSerializer
    permission_classes = [IsAuthenticated, IsFinanceRole]
    filterset_fields = ["status", "contact", "currency", "category", "related_invoice"]
    search_fields = ["receipt_number", "received_from", "description"]

    @decorators.action(detail=True, methods=["post"])
    def issue(self, request, pk=None):
        receipt_obj = self.get_object()
        receipt_obj = issue_receipt(receipt_obj)
        return response.Response(self.get_serializer(receipt_obj).data)


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.order_by("-date", "-id")
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, IsFinanceRole]
    filterset_fields = ["status", "currency", "subcategory", "category"]
    search_fields = ["expense_number", "vendor_name", "description"]

    @decorators.action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        expense = self.get_object()
        expense.status = Expense.Status.SUBMITTED
        expense.submitted_at = timezone.now()
        expense.save(update_fields=["status", "submitted_at", "updated_at"])
        return response.Response(self.get_serializer(expense).data)

    @decorators.action(detail=True, methods=["post"])
    def post(self, request, pk=None):
        expense = self.get_object()
        if expense.status not in {Expense.Status.SUBMITTED, Expense.Status.POSTED}:
            return response.Response(
                {"detail": "Expense must be submitted before posting."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        expense = post_expense(expense)
        return response.Response(self.get_serializer(expense).data)


class LedgerTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LedgerTransaction.objects.order_by("-date", "-id")
    serializer_class = LedgerTransactionSerializer
    permission_classes = [IsAuthenticated, IsFinanceRole]
    filterset_fields = ["txn_type", "source_type", "posted_status", "currency", "category"]


class MonthlyStatementViewSet(viewsets.ModelViewSet):
    queryset = MonthlyStatement.objects.order_by("-month", "-id")
    serializer_class = MonthlyStatementSerializer
    permission_classes = [IsAuthenticated, IsFinanceRole]
    filterset_fields = ["month", "currency", "period_type"]

    @decorators.action(detail=False, methods=["post"])
    def generate(self, request):
        month = request.data.get("month")
        currency = request.data.get("currency", "UGX")
        period_type = request.data.get("period_type", "monthly")
        if not month:
            return response.Response({"detail": "month is required"}, status=status.HTTP_400_BAD_REQUEST)

        ledger = LedgerTransaction.objects.filter(date__startswith=month, currency=currency, posted_status=LedgerTransaction.PostedStatus.POSTED)
        money_in = ledger.filter(txn_type=LedgerTransaction.TxnType.MONEY_IN).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        money_out = ledger.filter(txn_type=LedgerTransaction.TxnType.MONEY_OUT).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        breakdown = {}
        for row in ledger.values("category").annotate(total=Sum("amount")).order_by("category"):
            breakdown[row["category"]] = float(row["total"] or 0)

        statement, _ = MonthlyStatement.objects.update_or_create(
            month=month,
            currency=currency,
            period_type=period_type,
            defaults={
                "total_money_in": money_in,
                "total_money_out": money_out,
                "net": money_in - money_out,
                "breakdown_by_category": breakdown,
            },
        )
        return response.Response(self.get_serializer(statement).data)


class FinanceAuditExceptionViewSet(viewsets.ModelViewSet):
    queryset = FinanceAuditException.objects.order_by("-created_at", "-id")
    serializer_class = FinanceAuditExceptionSerializer
    permission_classes = [IsAuthenticated, IsFinanceRole]
    filterset_fields = ["severity", "status", "entity_type", "rule_code"]


class PublicFinanceSnapshotViewSet(viewsets.ModelViewSet):
    queryset = PublicFinanceSnapshot.objects.order_by("-month", "-id")
    serializer_class = PublicFinanceSnapshotSerializer
    permission_classes = [IsAuthenticated, IsFinanceRole]
    filterset_fields = ["status", "currency"]
