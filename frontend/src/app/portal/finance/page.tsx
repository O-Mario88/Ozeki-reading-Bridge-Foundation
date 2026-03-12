import { CrudPanel } from "@/components/CrudPanel";

export default function PortalFinancePage() {
  return (
    <>
      <CrudPanel
        title="Finance Contacts"
        endpoint="/api/v1/staff/finance/contacts/"
        fields={[
          { name: "name", label: "Name" },
          { name: "phone", label: "Phone" },
          { name: "contact_type", label: "Type" },
          { name: "address", label: "Address" },
          { name: "emails", label: "Emails JSON" },
        ]}
      />
      <CrudPanel
        title="Invoices"
        endpoint="/api/v1/staff/finance/invoices/"
        fields={[
          { name: "invoice_number", label: "Invoice Number" },
          { name: "contact", label: "Contact ID", type: "number" },
          { name: "category", label: "Category" },
          { name: "issue_date", label: "Issue Date", type: "date" },
          { name: "due_date", label: "Due Date", type: "date" },
        ]}
      />
      <CrudPanel
        title="Receipts"
        endpoint="/api/v1/staff/finance/receipts/"
        fields={[
          { name: "receipt_number", label: "Receipt Number" },
          { name: "contact", label: "Contact ID", type: "number" },
          { name: "category", label: "Category" },
          { name: "receipt_date", label: "Receipt Date", type: "date" },
          { name: "amount_received", label: "Amount", type: "number" },
        ]}
      />
      <CrudPanel
        title="Expenses"
        endpoint="/api/v1/staff/finance/expenses/"
        fields={[
          { name: "expense_number", label: "Expense Number" },
          { name: "vendor_name", label: "Vendor" },
          { name: "date", label: "Date", type: "date" },
          { name: "subcategory", label: "Subcategory" },
          { name: "amount", label: "Amount", type: "number" },
        ]}
      />
    </>
  );
}
