from decimal import Decimal

from django.test import TestCase

from .models import Expense, FinanceContact, Invoice, LedgerTransaction, Receipt
from .serializers import issue_receipt, post_expense


class FinanceWorkflowTests(TestCase):
    def test_issuing_receipt_creates_money_in_ledger_entry(self):
        contact = FinanceContact.objects.create(name="Donor A", contact_type=FinanceContact.ContactType.DONOR)
        invoice = Invoice.objects.create(
            invoice_number="INV-1001",
            contact=contact,
            category="Donation",
            issue_date="2026-03-01",
            due_date="2026-03-31",
            total=Decimal("500000"),
            balance_due=Decimal("500000"),
        )
        receipt = Receipt.objects.create(
            receipt_number="REC-1001",
            contact=contact,
            related_invoice=invoice,
            category="Donation",
            received_from="Donor A",
            receipt_date="2026-03-02",
            amount_received=Decimal("500000"),
            payment_method="bank_transfer",
        )

        issue_receipt(receipt)

        self.assertTrue(
            LedgerTransaction.objects.filter(
                txn_type=LedgerTransaction.TxnType.MONEY_IN,
                source_type=LedgerTransaction.SourceType.RECEIPT,
                source_id=receipt.id,
                amount=Decimal("500000"),
            ).exists()
        )

    def test_posting_expense_creates_money_out_ledger_entry(self):
        expense = Expense.objects.create(
            expense_number="EXP-2001",
            vendor_name="Vendor A",
            date="2026-03-03",
            category="Expense",
            subcategory="Transport",
            amount=Decimal("90000"),
            payment_method="cash",
            description="Transport reimbursement",
            status=Expense.Status.SUBMITTED,
        )

        post_expense(expense)

        self.assertTrue(
            LedgerTransaction.objects.filter(
                txn_type=LedgerTransaction.TxnType.MONEY_OUT,
                source_type=LedgerTransaction.SourceType.EXPENSE,
                source_id=expense.id,
                amount=Decimal("90000"),
            ).exists()
        )
