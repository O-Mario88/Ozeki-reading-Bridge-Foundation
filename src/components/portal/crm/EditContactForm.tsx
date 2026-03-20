"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface EditContactFormProps {
  initialData: {
    uid: string;
    id: number;
    fullName: string;
    gender: "Male" | "Female" | "Other" | string;
    category: string;
    roleTitle?: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    contactRecordType?: string;
    nickname?: string;
    leadershipRole?: boolean;
    subRole?: string;
    roleFormula?: string;
    lastSsaSent?: string;
    trainer?: boolean;
    notes?: string;
    classTaught?: string;
    subjectTaught?: string;
  };
}

export function EditContactForm({ initialData }: EditContactFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/portal/schools/roster", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: form.uid,
          type: "contact",
          fullName: form.fullName,
          gender: form.gender,
          category: form.category,
          roleTitle: form.roleTitle || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          whatsapp: form.whatsapp || undefined,
          contactRecordType: form.contactRecordType || undefined,
          nickname: form.nickname || undefined,
          leadershipRole: form.leadershipRole,
          subRole: form.subRole || undefined,
          roleFormula: form.roleFormula || undefined,
          lastSsaSent: form.lastSsaSent || undefined,
          trainer: form.trainer,
          notes: form.notes || undefined,
          classTaught: form.classTaught || undefined,
          subjectTaught: form.subjectTaught || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update contact.");
      }

      router.push(`/portal/contacts/${initialData.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="crm-edit-form-container">
      <form onSubmit={handleSubmit} className="crm-form">
        <div className="crm-form-section">
          <h3>Basic Details</h3>
          <div className="crm-form-grid">
            <label>
              <span>Full Name *</span>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </label>
            <label>
              <span>Gender *</span>
              <select
                required
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <label>
              <span>Category *</span>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Select</option>
                <option value="Proprietor">Proprietor</option>
                <option value="Head Teacher">Head Teacher</option>
                <option value="Deputy Head Teacher">Deputy Head Teacher</option>
                <option value="DOS">DOS</option>
                <option value="Head Teacher Lower">Head Teacher Lower</option>
                <option value="Teacher">Teacher</option>
                <option value="Administrator">Administrator</option>
                <option value="Accountant">Accountant</option>
              </select>
            </label>
            <label>
              <span>Role Title</span>
              <input
                type="text"
                value={form.roleTitle || ""}
                onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
              />
            </label>
            <label>
              <span>Contact Record Type</span>
              <input
                type="text"
                value={form.contactRecordType || ""}
                onChange={(e) => setForm({ ...form, contactRecordType: e.target.value })}
              />
            </label>
            <label>
              <span>Nickname</span>
              <input
                type="text"
                value={form.nickname || ""}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="crm-form-section">
          <h3>Contact Information</h3>
          <div className="crm-form-grid">
            <label>
              <span>Phone Number</span>
              <input
                type="tel"
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              <span>Email Address</span>
              <input
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              <span>WhatsApp Number</span>
              <input
                type="tel"
                value={form.whatsapp || ""}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="crm-form-section">
          <h3>Additional Roles & Classification</h3>
          <div className="crm-form-grid">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.leadershipRole || false}
                onChange={(e) => setForm({ ...form, leadershipRole: e.target.checked })}
              />
              <span>Has Leadership Role</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.trainer || false}
                onChange={(e) => setForm({ ...form, trainer: e.target.checked })}
              />
              <span>Is Trainer / Presenter</span>
            </label>
            <label>
              <span>Sub-role</span>
              <input
                type="text"
                value={form.subRole || ""}
                onChange={(e) => setForm({ ...form, subRole: e.target.value })}
              />
            </label>
            <label>
              <span>Role Formula</span>
              <input
                type="text"
                value={form.roleFormula || ""}
                onChange={(e) => setForm({ ...form, roleFormula: e.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="crm-form-section">
          <h3>Teaching Details</h3>
          <div className="crm-form-grid">
            <label>
              <span>Class Taught</span>
              <input
                type="text"
                value={form.classTaught || ""}
                onChange={(e) => setForm({ ...form, classTaught: e.target.value })}
              />
            </label>
            <label>
              <span>Subject Taught</span>
              <input
                type="text"
                value={form.subjectTaught || ""}
                onChange={(e) => setForm({ ...form, subjectTaught: e.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="crm-form-section">
          <h3>Notes</h3>
          <div className="crm-form-grid" style={{ gridTemplateColumns: "1fr" }}>
            <label>
              <span>General Notes</span>
              <textarea
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
              />
            </label>
          </div>
        </div>

        {error && <div className="crm-form-error">{error}</div>}

        <div className="crm-form-actions">
          <Link href={`/portal/contacts/${initialData.id}`} className="crm-button-ghost">
            Cancel
          </Link>
          <button type="submit" className="crm-button" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
      <style jsx>{`
        .crm-edit-form-container {
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-top: 1.5rem;
        }
        .crm-form-section {
          margin-bottom: 2rem;
        }
        .crm-form-section h3 {
          font-size: 1.1rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
          color: #111827;
        }
        .crm-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
        }
        .crm-form label {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.9rem;
          color: #374151;
        }
        .crm-form label.checkbox-label {
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          cursor: pointer;
        }
        .crm-form label span {
          font-weight: 500;
        }
        .crm-form input[type="text"],
        .crm-form input[type="tel"],
        .crm-form input[type="email"],
        .crm-form select,
        .crm-form textarea {
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.95rem;
          background: #f9fafb;
        }
        .crm-form input:focus,
        .crm-form select:focus,
        .crm-form textarea:focus {
          outline: none;
          border-color: #14532d;
          box-shadow: 0 0 0 2px rgba(20, 83, 45, 0.1);
        }
        .crm-form-error {
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #f87171;
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
        }
        .crm-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }
        .crm-button {
          background: #14532d;
          color: #ffffff;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.95rem;
          transition: background-color 0.2s;
        }
        .crm-button:hover:not(:disabled) {
          background: #166534;
        }
        .crm-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .crm-button-ghost {
          background: transparent;
          color: #4b5563;
          border: 1px solid #d1d5db;
          padding: 0.6rem 1.2rem;
          border-radius: 0.375rem;
          text-decoration: none;
          font-weight: 500;
        }
        .crm-button-ghost:hover {
          background: #f3f4f6;
        }
      `}</style>
    </div>
  );
}
