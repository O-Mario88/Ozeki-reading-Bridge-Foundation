from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class FinanceContact(TimeStampedModel):
    class ContactType(models.TextChoices):
        DONOR = "donor", "Donor"
        PARTNER = "partner", "Partner"
        SPONSOR = "sponsor", "Sponsor"
        OTHER = "other", "Other"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    name = models.CharField(max_length=255)
    emails = models.JSONField(default=list, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    whatsapp = models.CharField(max_length=40, blank=True)
    address = models.TextField(blank=True)
    contact_type = models.CharField(max_length=24, choices=ContactType.choices, default=ContactType.OTHER)

    def __str__(self) -> str:
        return self.name


class Invoice(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        PARTIAL = "partial", "Partial"
        PAID = "paid", "Paid"
        VOID = "void", "Void"

    class Currency(models.TextChoices):
        UGX = "UGX", "UGX"
        USD = "USD", "USD"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    invoice_number = models.CharField(max_length=64, unique=True)
    contact = models.ForeignKey(FinanceContact, on_delete=models.PROTECT, related_name="invoices")
    category = models.CharField(max_length=120)
    issue_date = models.DateField()
    due_date = models.DateField()
    currency = models.CharField(max_length=8, choices=Currency.choices, default=Currency.UGX)
    notes = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        ordering = ["-issue_date", "-id"]


class InvoiceItem(TimeStampedModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    description = models.CharField(max_length=255)
    qty = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["invoice_id", "id"]


class Receipt(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ISSUED = "issued", "Issued"
        VOID = "void", "Void"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    receipt_number = models.CharField(max_length=64, unique=True)
    contact = models.ForeignKey(FinanceContact, on_delete=models.PROTECT, related_name="receipts")
    related_invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="receipts")
    category = models.CharField(max_length=120)
    received_from = models.CharField(max_length=255)
    receipt_date = models.DateField()
    amount_received = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, choices=Invoice.Currency.choices, default=Invoice.Currency.UGX)
    payment_method = models.CharField(max_length=32)
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT)
    issued_at = models.DateTimeField(null=True, blank=True)


class Expense(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        POSTED = "posted", "Posted"
        VOID = "void", "Void"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    expense_number = models.CharField(max_length=64, unique=True)
    vendor_name = models.CharField(max_length=255)
    date = models.DateField()
    category = models.CharField(max_length=120, default="Expense")
    subcategory = models.CharField(max_length=120, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, choices=Invoice.Currency.choices, default=Invoice.Currency.UGX)
    payment_method = models.CharField(max_length=32)
    description = models.TextField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT)
    submitted_at = models.DateTimeField(null=True, blank=True)
    posted_at = models.DateTimeField(null=True, blank=True)


class LedgerTransaction(TimeStampedModel):
    class TxnType(models.TextChoices):
        MONEY_IN = "money_in", "Money In"
        MONEY_OUT = "money_out", "Money Out"

    class SourceType(models.TextChoices):
        RECEIPT = "receipt", "Receipt"
        EXPENSE = "expense", "Expense"
        INVOICE = "invoice", "Invoice"
        MANUAL = "manual", "Manual"

    class PostedStatus(models.TextChoices):
        POSTED = "posted", "Posted"
        VOID = "void", "Void"

    txn_type = models.CharField(max_length=24, choices=TxnType.choices)
    source_type = models.CharField(max_length=24, choices=SourceType.choices)
    source_id = models.BigIntegerField(null=True, blank=True)
    date = models.DateField()
    category = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=8, choices=Invoice.Currency.choices, default=Invoice.Currency.UGX)
    posted_status = models.CharField(max_length=16, choices=PostedStatus.choices, default=PostedStatus.POSTED)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [
            models.Index(fields=["source_type", "source_id"]),
            models.Index(fields=["txn_type", "date"]),
        ]


class MonthlyStatement(TimeStampedModel):
    month = models.CharField(max_length=16)
    currency = models.CharField(max_length=8, choices=Invoice.Currency.choices, default=Invoice.Currency.UGX)
    period_type = models.CharField(max_length=24, default="monthly")
    total_money_in = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_money_out = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    breakdown_by_category = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-month", "-id"]
        unique_together = [("month", "currency", "period_type")]


class FinanceAuditException(TimeStampedModel):
    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ACKNOWLEDGED = "acknowledged", "Acknowledged"
        RESOLVED = "resolved", "Resolved"
        OVERRIDDEN = "overridden", "Overridden"

    entity_type = models.CharField(max_length=32)
    entity_id = models.BigIntegerField()
    severity = models.CharField(max_length=16, choices=Severity.choices)
    rule_code = models.CharField(max_length=64)
    message = models.TextField()
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.OPEN)
    amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=8, choices=Invoice.Currency.choices, default=Invoice.Currency.UGX)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="finance_exceptions_resolved",
    )


class PublicFinanceSnapshot(TimeStampedModel):
    class Status(models.TextChoices):
        PRIVATE_UPLOADED = "private_uploaded", "Private Uploaded"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    legacy_id = models.IntegerField(null=True, blank=True, unique=True)
    month = models.CharField(max_length=16)
    currency = models.CharField(max_length=8, choices=Invoice.Currency.choices, default=Invoice.Currency.UGX)
    summary_json = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PRIVATE_UPLOADED)
    published_at = models.DateTimeField(null=True, blank=True)


def rebuild_invoice_totals(invoice: Invoice) -> Invoice:
    subtotal = invoice.items.aggregate(sum=models.Sum("line_total"))["sum"] or Decimal("0")
    invoice.subtotal = subtotal
    invoice.total = subtotal
    paid_total = (
        Receipt.objects.filter(related_invoice=invoice, status=Receipt.Status.ISSUED).aggregate(sum=models.Sum("amount_received"))["sum"]
        or Decimal("0")
    )
    invoice.balance_due = max(Decimal("0"), invoice.total - paid_total)
    if invoice.balance_due == 0 and invoice.total > 0:
        invoice.status = Invoice.Status.PAID
    elif paid_total > 0:
        invoice.status = Invoice.Status.PARTIAL
    invoice.save(update_fields=["subtotal", "total", "balance_due", "status", "updated_at"])
    return invoice
