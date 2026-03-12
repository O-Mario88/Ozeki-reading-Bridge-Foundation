from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Expense,
    FinanceAuditException,
    FinanceContact,
    Invoice,
    InvoiceItem,
    LedgerTransaction,
    MonthlyStatement,
    PublicFinanceSnapshot,
    Receipt,
    rebuild_invoice_totals,
)


class FinanceContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceContact
        fields = "__all__"


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = "__all__"


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = "__all__"

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        invoice = Invoice.objects.create(**validated_data)
        for item_data in items_data:
            qty = Decimal(item_data.get("qty", 0))
            unit_price = Decimal(item_data.get("unit_price", 0))
            line_total = qty * unit_price
            InvoiceItem.objects.create(invoice=invoice, line_total=line_total, **item_data)
        rebuild_invoice_totals(invoice)
        return invoice

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                qty = Decimal(item_data.get("qty", 0))
                unit_price = Decimal(item_data.get("unit_price", 0))
                line_total = qty * unit_price
                InvoiceItem.objects.create(invoice=instance, line_total=line_total, **item_data)
        rebuild_invoice_totals(instance)
        return instance


class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = "__all__"


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = "__all__"


class LedgerTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerTransaction
        fields = "__all__"


class MonthlyStatementSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyStatement
        fields = "__all__"


class FinanceAuditExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceAuditException
        fields = "__all__"


class PublicFinanceSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicFinanceSnapshot
        fields = "__all__"


def issue_receipt(receipt: Receipt) -> Receipt:
    if receipt.status == Receipt.Status.ISSUED:
        return receipt
    receipt.status = Receipt.Status.ISSUED
    receipt.issued_at = timezone.now()
    receipt.save(update_fields=["status", "issued_at", "updated_at"])

    LedgerTransaction.objects.create(
        txn_type=LedgerTransaction.TxnType.MONEY_IN,
        source_type=LedgerTransaction.SourceType.RECEIPT,
        source_id=receipt.id,
        date=receipt.receipt_date,
        category=receipt.category,
        amount=receipt.amount_received,
        currency=receipt.currency,
        posted_status=LedgerTransaction.PostedStatus.POSTED,
        notes=f"Receipt {receipt.receipt_number} issued",
    )

    if receipt.related_invoice_id:
        rebuild_invoice_totals(receipt.related_invoice)

    return receipt


def post_expense(expense: Expense) -> Expense:
    if expense.status == Expense.Status.POSTED:
        return expense
    expense.status = Expense.Status.POSTED
    expense.posted_at = timezone.now()
    expense.save(update_fields=["status", "posted_at", "updated_at"])

    LedgerTransaction.objects.create(
        txn_type=LedgerTransaction.TxnType.MONEY_OUT,
        source_type=LedgerTransaction.SourceType.EXPENSE,
        source_id=expense.id,
        date=expense.date,
        category=expense.category,
        amount=expense.amount,
        currency=expense.currency,
        posted_status=LedgerTransaction.PostedStatus.POSTED,
        notes=f"Expense {expense.expense_number} posted",
    )
    return expense
