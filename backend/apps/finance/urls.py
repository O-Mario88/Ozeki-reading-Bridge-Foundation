from rest_framework.routers import DefaultRouter

from .views import (
    ExpenseViewSet,
    FinanceAuditExceptionViewSet,
    FinanceContactViewSet,
    InvoiceViewSet,
    LedgerTransactionViewSet,
    MonthlyStatementViewSet,
    PublicFinanceSnapshotViewSet,
    ReceiptViewSet,
)

router = DefaultRouter()
router.register("contacts", FinanceContactViewSet, basename="finance-contacts")
router.register("invoices", InvoiceViewSet, basename="finance-invoices")
router.register("receipts", ReceiptViewSet, basename="finance-receipts")
router.register("expenses", ExpenseViewSet, basename="finance-expenses")
router.register("ledger", LedgerTransactionViewSet, basename="finance-ledger")
router.register("statements", MonthlyStatementViewSet, basename="finance-statements")
router.register("audit-exceptions", FinanceAuditExceptionViewSet, basename="finance-audit-exceptions")
router.register("public-snapshots", PublicFinanceSnapshotViewSet, basename="finance-public-snapshots")

urlpatterns = router.urls
