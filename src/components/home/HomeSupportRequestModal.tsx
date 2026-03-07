"use client";

import { FormEvent, useState } from "react";
import { FloatingFormModal } from "@/components/FloatingFormModal";
import { submitJsonWithOfflineQueue } from "@/lib/offline-form-queue";
import { SupportRequestUrgency, SupportType } from "@/lib/types";
import styles from "./HomeSupportRequestModal.module.css";

type HomeSupportRequestModalProps = {
  triggerLabel: string;
  title: string;
  description: string;
  triggerClassName?: string;
  presetMessage?: string;
  presetSupportTypes?: SupportType[];
  presetUrgency?: SupportRequestUrgency;
};

type FormState = {
  locationText: string;
  contactName: string;
  contactRole: string;
  contactInfo: string;
  supportTypes: SupportType[];
  urgency: SupportRequestUrgency;
  message: string;
};

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const SUPPORT_OPTIONS: Array<{ value: SupportType; label: string }> = [
  { value: "phonics training", label: "Phonics training" },
  { value: "coaching visit", label: "Coaching visit" },
  { value: "learner assessment", label: "Learner assessment" },
  { value: "1001 story", label: "1001 Story activation" },
];

const URGENCY_OPTIONS: Array<{ value: SupportRequestUrgency; label: string }> = [
  { value: "high", label: "High (this term)" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function createInitialFormState(
  presetMessage?: string,
  presetSupportTypes?: SupportType[],
  presetUrgency?: SupportRequestUrgency,
): FormState {
  return {
    locationText: "",
    contactName: "",
    contactRole: "",
    contactInfo: "",
    supportTypes: presetSupportTypes ?? [],
    urgency: presetUrgency ?? "medium",
    message: presetMessage ?? "",
  };
}

function SupportRequestPopupForm({
  close,
  presetMessage,
  presetSupportTypes,
  presetUrgency,
}: {
  close: () => void;
  presetMessage?: string;
  presetSupportTypes?: SupportType[];
  presetUrgency?: SupportRequestUrgency;
}) {
  const [form, setForm] = useState<FormState>(() =>
    createInitialFormState(presetMessage, presetSupportTypes, presetUrgency),
  );
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "",
  });

  const toggleSupportType = (type: SupportType) => {
    setForm((prev) => {
      const isSelected = prev.supportTypes.includes(type);
      return {
        ...prev,
        supportTypes: isSelected
          ? prev.supportTypes.filter((value) => value !== type)
          : [...prev.supportTypes, type],
      };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState({ status: "submitting", message: "Submitting request..." });

    if (form.supportTypes.length === 0) {
      setSubmitState({
        status: "error",
        message: "Select at least one support type before submitting.",
      });
      return;
    }

    try {
      const payload = {
        locationText: form.locationText.trim(),
        contactName: form.contactName.trim(),
        contactRole: form.contactRole.trim(),
        contactInfo: form.contactInfo.trim(),
        supportTypes: form.supportTypes,
        urgency: form.urgency,
        message: form.message.trim(),
      };
      const result = await submitJsonWithOfflineQueue<{ error?: string }>("/api/portal/support", {
        payload,
        label: "School support request",
      });

      if (result.queued) {
        setSubmitState({
          status: "success",
          message:
            "No internet connection. Request saved on this device and will sync automatically when connected.",
        });
        setForm(createInitialFormState(presetMessage, presetSupportTypes, presetUrgency));
        return;
      }

      if (!result.response.ok) {
        throw new Error(result.data?.error ?? "Could not submit support request.");
      }

      setSubmitState({
        status: "success",
        message: "Request submitted. The support team will follow up shortly.",
      });
      setForm(createInitialFormState(presetMessage, presetSupportTypes, presetUrgency));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not submit support request.";
      setSubmitState({ status: "error", message });
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={`${styles.label} ${styles.fullWidth}`}>
        School name and location
        <input
          className={styles.input}
          type="text"
          placeholder="e.g., Bright Future Primary School, Gulu District"
          value={form.locationText}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, locationText: event.target.value }))
          }
          required
        />
      </label>

      <label className={styles.label}>
        Contact name
        <input
          className={styles.input}
          type="text"
          value={form.contactName}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, contactName: event.target.value }))
          }
          required
        />
      </label>

      <label className={styles.label}>
        Role
        <input
          className={styles.input}
          type="text"
          placeholder="Head Teacher, Proprietor, DOS..."
          value={form.contactRole}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, contactRole: event.target.value }))
          }
          required
        />
      </label>

      <label className={`${styles.label} ${styles.fullWidth}`}>
        Phone or email
        <input
          className={styles.input}
          type="text"
          value={form.contactInfo}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, contactInfo: event.target.value }))
          }
          required
        />
      </label>

      <div className={`${styles.label} ${styles.fullWidth}`}>
        Support needed
        <div className={styles.supportTypes}>
          {SUPPORT_OPTIONS.map((option) => {
            const selected = form.supportTypes.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.supportTypeBtn} ${
                  selected ? styles.supportTypeBtnActive : ""
                }`}
                onClick={() => toggleSupportType(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className={`${styles.label} ${styles.fullWidth}`}>
        Urgency
        <select
          className={styles.select}
          value={form.urgency}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              urgency: event.target.value as SupportRequestUrgency,
            }))
          }
        >
          {URGENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className={`${styles.label} ${styles.fullWidth}`}>
        Request details
        <textarea
          className={styles.textarea}
          value={form.message}
          placeholder="Describe the support your school needs and preferred timeline."
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          required
        />
      </label>

      <div className={`${styles.submitRow} ${styles.fullWidth}`}>
        <button className="button" type="submit" disabled={submitState.status === "submitting"}>
          {submitState.status === "submitting" ? "Submitting..." : "Submit request"}
        </button>
        <button className="button button-ghost" type="button" onClick={close}>
          Close
        </button>
      </div>

      {submitState.status === "error" ? (
        <p className={`${styles.error} ${styles.fullWidth}`}>{submitState.message}</p>
      ) : null}
      {submitState.status === "success" ? (
        <p className={`${styles.success} ${styles.fullWidth}`}>{submitState.message}</p>
      ) : null}
    </form>
  );
}

export function HomeSupportRequestModal({
  triggerLabel,
  title,
  description,
  triggerClassName = "button",
  presetMessage,
  presetSupportTypes,
  presetUrgency,
}: HomeSupportRequestModalProps) {
  return (
    <FloatingFormModal
      triggerLabel={triggerLabel}
      title={title}
      description={description}
      triggerClassName={triggerClassName}
    >
      {({ close }) => (
        <SupportRequestPopupForm
          close={close}
          presetMessage={presetMessage}
          presetSupportTypes={presetSupportTypes}
          presetUrgency={presetUrgency}
        />
      )}
    </FloatingFormModal>
  );
}
