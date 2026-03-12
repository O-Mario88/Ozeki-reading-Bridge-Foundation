from django.contrib import admin

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
)

admin.site.register(FinanceContact)
admin.site.register(Invoice)
admin.site.register(InvoiceItem)
admin.site.register(Receipt)
admin.site.register(Expense)
admin.site.register(LedgerTransaction)
admin.site.register(MonthlyStatement)
admin.site.register(FinanceAuditException)
admin.site.register(PublicFinanceSnapshot)
