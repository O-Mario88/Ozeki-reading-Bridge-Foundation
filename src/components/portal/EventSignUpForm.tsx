"use client";

import { FormEvent, useState } from "react";
import type { OnlineTrainingEventRecord, EventParticipantRecord } from "@/lib/types";
import { FormModal } from "@/components/forms";
import { submitJsonWithOfflineQueue } from "@/lib/offline-form-queue";

interface ContactRow {
  key: number;
  fullName: string;
  role: string;
  gender: "Male" | "Female" | "";
  phone: string;
  email: string;
}

function createContact(key: number): ContactRow {
  return { key, fullName: "", role: "Teacher", gender: "", phone: "", email: "" };
}

interface EventSignUpFormProps {
  events: OnlineTrainingEventRecord[];
  open: boolean;
  onClose: () => void;
  onRegistered?: (registration: EventParticipantRecord) => void;
  preselectedEventId?: number | null;
}

export function EventSignUpForm({
  events,
  open,
  onClose,
  onRegistered,
  preselectedEventId,
}: EventSignUpFormProps) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [contacts, setContacts] = useState<ContactRow[]>([createContact(1)]);
  const [nextKey, setNextKey] = useState(2);

  function addContact() {
    setContacts((prev) => [...prev, createContact(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function removeContact(key: number) {
    setContacts((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev));
  }

  function updateContact(key: number, field: keyof ContactRow, value: string) {
    setContacts((prev) =>
      prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("Registering school and contacts...");

    const formData = new FormData(event.currentTarget);
    const payload = {
      eventId: Number(formData.get("eventId")),
      schoolName: String(formData.get("schoolName") ?? "").trim(),
      district: String(formData.get("district") ?? "").trim(),
      region: String(formData.get("region") ?? "").trim(),
      subRegion: String(formData.get("subRegion") ?? "").trim(),
      subCounty: String(formData.get("subCounty") ?? "").trim(),
      parish: String(formData.get("parish") ?? "").trim(),
      contacts: contacts.map((c) => ({
        fullName: c.fullName.trim(),
        role: c.role,
        gender: c.gender,
        phone: c.phone.trim(),
        email: c.email.trim(),
      })).filter((c) => c.fullName.length >= 2),
    };

    if (payload.contacts.length === 0) {
      setStatus("At least one contact with a valid name is required.");
      setSaving(false);
      return;
    }

    try {
      const result = await submitJsonWithOfflineQueue<{
        error?: string;
        registration?: EventParticipantRecord;
      }>("/api/portal/event-registration", {
        payload,
        label: "Event school registration",
      });

      if (result.queued) {
        onClose();
        setStatus("No internet. Registration queued for sync.");
        return;
      }

      const data = result.data ?? {};
      if (!result.response.ok || !data.registration) {
        throw new Error(data.error ?? "Could not register for event.");
      }

      setStatus(
        `Registered ${data.registration.contactsRegistered} contact(s) from ${data.registration.schoolName}.`,
      );
      setContacts([createContact(1)]);
      setNextKey(2);
      onRegistered?.(data.registration);
      onClose();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not register.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Sign Up School for Event"
      description="Register a school and its attendees for an upcoming event."
      closeLabel="Close"
      maxWidth="980px"
    >
      <form className="form-grid portal-form-grid" onSubmit={handleSubmit}>
        {/* Event selector */}
        <label>
          <span className="portal-field-label">Event</span>
          <select name="eventId" required defaultValue={preselectedEventId ?? events[0]?.id}>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({new Date(ev.startDateTime).toLocaleDateString()})
              </option>
            ))}
          </select>
        </label>

        {/* School details */}
        <label>
          <span className="portal-field-label">School Name</span>
          <input name="schoolName" required minLength={2} placeholder="e.g. Sunrise Primary School" />
        </label>
        <label>
          <span className="portal-field-label">District</span>
          <input name="district" required minLength={2} placeholder="e.g. Lira" />
        </label>
        <label>
          <span className="portal-field-label">Region</span>
          <input name="region" placeholder="e.g. Northern" />
        </label>
        <label>
          <span className="portal-field-label">Sub-Region</span>
          <input name="subRegion" placeholder="e.g. Lango" />
        </label>
        <label>
          <span className="portal-field-label">Sub-County</span>
          <input name="subCounty" placeholder="Optional" />
        </label>
        <label>
          <span className="portal-field-label">Parish</span>
          <input name="parish" placeholder="Optional" />
        </label>

        {/* Contacts */}
        <div className="full-width">
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span className="portal-field-label" style={{ marginBottom: 0 }}>Attendees</span>
            <button className="button button-ghost" type="button" onClick={addContact} style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}>
              + Add attendee
            </button>
          </div>

          {contacts.map((c, index) => (
            <div
              key={c.key}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 7rem 5.5rem 8rem 1fr auto",
                gap: "0.5rem",
                marginBottom: "0.5rem",
                alignItems: "end",
              }}
            >
              <input
                placeholder={`Full name ${index + 1}`}
                value={c.fullName}
                required
                minLength={2}
                onChange={(e) => updateContact(c.key, "fullName", e.target.value)}
              />
              <select
                value={c.role}
                onChange={(e) => updateContact(c.key, "role", e.target.value)}
              >
                <option value="Teacher">Teacher</option>
                <option value="School Leader">School Leader</option>
                <option value="Deputy Head">Deputy Head</option>
                <option value="Head Teacher">Head Teacher</option>
                <option value="Other">Other</option>
              </select>
              <select
                value={c.gender}
                onChange={(e) => updateContact(c.key, "gender", e.target.value as "Male" | "Female" | "")}
              >
                <option value="">Gender</option>
                <option value="Male">M</option>
                <option value="Female">F</option>
              </select>
              <input
                type="tel"
                placeholder="Phone"
                value={c.phone}
                onChange={(e) => updateContact(c.key, "phone", e.target.value)}
              />
              <input
                type="email"
                placeholder="Email"
                value={c.email}
                onChange={(e) => updateContact(c.key, "email", e.target.value)}
              />
              <button
                type="button"
                className="button button-ghost"
                style={{ padding: "0.25rem 0.4rem", fontSize: "0.85rem", color: "var(--color-danger, #c0392b)" }}
                onClick={() => removeContact(c.key)}
                title="Remove attendee"
                disabled={contacts.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {status ? <p className="full-width form-message success">{status}</p> : null}

        <div className="full-width action-row portal-form-actions">
          <button className="button" type="submit" disabled={saving}>
            {saving ? "Registering..." : "Register school"}
          </button>
          <button
            className="button button-ghost"
            type="button"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </FormModal>
  );
}
