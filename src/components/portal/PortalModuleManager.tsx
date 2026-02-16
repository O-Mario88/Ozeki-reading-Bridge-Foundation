"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PortalFieldConfig,
  PortalModuleConfig,
  portalStatusOptions,
} from "@/lib/portal-config";
import {
  PortalRecord,
  PortalRecordStatus,
  PortalUser,
} from "@/lib/types";

type FilterState = {
  dateFrom: string;
  dateTo: string;
  district: string;
  school: string;
  status: string;
  createdBy: string;
  programType: string;
};

type FormPayloadState = Record<string, string | string[]>;

type FormState = {
  id: number | null;
  date: string;
  district: string;
  schoolName: string;
  programType: string;
  followUpDate: string;
  status: PortalRecordStatus;
  reviewNote: string;
  payload: FormPayloadState;
};

type FeedbackState = {
  kind: "success" | "error" | "idle";
  message: string;
};

type EvidenceItem = {
  id: number;
  fileName: string;
  createdAt: string;
  downloadUrl: string;
};

type OfflineQueueItem = {
  action: "create" | "update";
  id?: number;
  body: {
    module: string;
    date: string;
    district: string;
    schoolName: string;
    programType?: string;
    followUpDate?: string;
    status: PortalRecordStatus;
    payload: Record<string, string | number | boolean | string[] | null | undefined>;
  };
};

interface PortalModuleManagerProps {
  config: PortalModuleConfig;
  initialRecords: PortalRecord[];
  initialUsers: Array<{ id: number; fullName: string }>;
  currentUser: PortalUser;
}

const queueStorageKey = "portal-offline-queue";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeForInput(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function buildDefaultPayload(config: PortalModuleConfig): FormPayloadState {
  const payload: FormPayloadState = {};
  config.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === "multiselect") {
        payload[field.key] = [];
      } else if (field.type === "select") {
        payload[field.key] = field.options?.[0]?.value ?? "";
      } else {
        payload[field.key] = "";
      }
    });
  });
  return payload;
}

function isNumberField(field: PortalFieldConfig) {
  return field.type === "number";
}

function findField(config: PortalModuleConfig, key: string) {
  for (const section of config.sections) {
    const field = section.fields.find((entry) => entry.key === key);
    if (field) {
      return field;
    }
  }
  return undefined;
}

function readQueue() {
  if (typeof window === "undefined") {
    return [] as OfflineQueueItem[];
  }

  try {
    const raw = window.localStorage.getItem(queueStorageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineQueueItem[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(queueStorageKey, JSON.stringify(items));
}

export function PortalModuleManager({
  config,
  initialRecords,
  initialUsers,
  currentUser,
}: PortalModuleManagerProps) {
  const searchParams = useSearchParams();
  const canReview = currentUser.isSupervisor || currentUser.isME || currentUser.isAdmin;
  const draftStorageKey = `portal-form-draft-${config.module}`;

  const [records, setRecords] = useState(initialRecords);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ kind: "idle", message: "" });
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: "",
    dateTo: "",
    district: "",
    school: "",
    status: "",
    createdBy: "",
    programType: "",
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [urlInitialized, setUrlInitialized] = useState(false);
  const [autosaveAt, setAutosaveAt] = useState("");
  const [offlineCount, setOfflineCount] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);

  const [formState, setFormState] = useState<FormState>(() => ({
    id: null,
    date: getToday(),
    district: "",
    schoolName: "",
    programType: config.programTypeOptions[0]?.value ?? "",
    followUpDate: "",
    status: "Draft",
    reviewNote: "",
    payload: buildDefaultPayload(config),
  }));

  const refreshOfflineCount = useCallback(() => {
    setOfflineCount(readQueue().length);
  }, []);

  const loadEvidence = useCallback(async (recordId: number) => {
    try {
      const params = new URLSearchParams({
        recordId: String(recordId),
        module: config.module,
      });
      const response = await fetch(`/api/portal/evidence?${params.toString()}`);
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { evidence?: EvidenceItem[] };
      setEvidenceItems(data.evidence ?? []);
    } catch {
      // No-op: evidence listing is auxiliary.
    }
  }, [config.module]);

  const newFormState = useCallback((): FormState => {
    const defaults = buildDefaultPayload(config);
    return {
      id: null,
      date: getToday(),
      district: "",
      schoolName: "",
      programType: config.programTypeOptions[0]?.value ?? "",
      followUpDate: "",
      status: "Draft",
      reviewNote: "",
      payload: defaults,
    };
  }, [config]);

  const openNewForm = useCallback(() => {
    setFormState(newFormState());
    setIsFormOpen(true);
    setSelectedFiles([]);
    setFileInputKey((value) => value + 1);
    setEvidenceItems([]);
    setFeedback({ kind: "idle", message: "" });
  }, [newFormState]);

  const openRecordForm = useCallback((record: PortalRecord) => {
    const defaultPayload = buildDefaultPayload(config);
    const nextPayload = { ...defaultPayload };

    Object.entries(record.payload).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        nextPayload[key] = value.map((item) => String(item));
      } else {
        nextPayload[key] = sanitizeForInput(value);
      }
    });

    setFormState({
      id: record.id,
      date: record.date,
      district: record.district,
      schoolName: record.schoolName,
      programType: record.programType ?? config.programTypeOptions[0]?.value ?? "",
      followUpDate: record.followUpDate ?? "",
      status: record.status,
      reviewNote: record.reviewNote ?? "",
      payload: nextPayload,
    });
    setIsFormOpen(true);
    setSelectedFiles([]);
    setFileInputKey((value) => value + 1);
    setFeedback({ kind: "idle", message: "" });
  }, [config]);

  const fetchRecords = useCallback(async (nextFilters: FilterState) => {
    setLoadingRecords(true);
    try {
      const params = new URLSearchParams({
        module: config.module,
      });
      if (nextFilters.dateFrom) params.set("dateFrom", nextFilters.dateFrom);
      if (nextFilters.dateTo) params.set("dateTo", nextFilters.dateTo);
      if (nextFilters.district) params.set("district", nextFilters.district);
      if (nextFilters.school) params.set("school", nextFilters.school);
      if (nextFilters.status) params.set("status", nextFilters.status);
      if (nextFilters.createdBy) params.set("createdBy", nextFilters.createdBy);
      if (nextFilters.programType) params.set("programType", nextFilters.programType);

      const response = await fetch(`/api/portal/records?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { error?: string; records?: PortalRecord[] };
      if (!response.ok || !data.records) {
        throw new Error(data.error ?? "Could not load records.");
      }
      setRecords(data.records);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load records.";
      setFeedback({ kind: "error", message });
    } finally {
      setLoadingRecords(false);
    }
  }, [config.module]);

  const syncOfflineQueue = useCallback(async () => {
    const queue = readQueue();
    if (queue.length === 0) {
      setFeedback({ kind: "success", message: "No offline records waiting to sync." });
      return;
    }

    setSyncing(true);
    const pending: OfflineQueueItem[] = [];
    let synced = 0;

    for (const item of queue) {
      try {
        const url =
          item.action === "update" && item.id
            ? `/api/portal/records/${item.id}`
            : "/api/portal/records";
        const method = item.action === "update" ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.body),
        });

        if (!response.ok) {
          pending.push(item);
          continue;
        }
        synced += 1;
      } catch {
        pending.push(item);
      }
    }

    writeQueue(pending);
    refreshOfflineCount();
    setSyncing(false);

    if (synced > 0) {
      await fetchRecords(filters);
    }

    if (pending.length > 0) {
      setFeedback({
        kind: "error",
        message: `${synced} item(s) synced. ${pending.length} item(s) still queued.`,
      });
      return;
    }

    setFeedback({ kind: "success", message: `Offline queue synced (${synced} item(s)).` });
  }, [fetchRecords, filters, refreshOfflineCount]);

  useEffect(() => {
    refreshOfflineCount();
  }, [refreshOfflineCount]);

  useEffect(() => {
    const onOnline = () => {
      void syncOfflineQueue();
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [syncOfflineQueue]);

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    const interval = window.setInterval(() => {
      const snapshot = {
        ...formState,
        module: config.module,
        savedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
      setAutosaveAt(snapshot.savedAt);
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [config.module, draftStorageKey, formState, isFormOpen]);

  useEffect(() => {
    if (urlInitialized) {
      return;
    }

    const recordQuery = searchParams.get("record");
    const isNew = searchParams.get("new") === "1";

    if (recordQuery) {
      const targetId = Number(recordQuery);
      if (Number.isInteger(targetId)) {
        const existing = records.find((row) => row.id === targetId);
        if (existing) {
          openRecordForm(existing);
          void loadEvidence(existing.id);
          setUrlInitialized(true);
          return;
        }

        void (async () => {
          try {
            const response = await fetch(`/api/portal/records/${targetId}`, { cache: "no-store" });
            const data = (await response.json()) as { record?: PortalRecord };
            if (response.ok && data.record) {
              openRecordForm(data.record);
              await loadEvidence(data.record.id);
              setUrlInitialized(true);
            }
          } catch {
            // No-op
          }
        })();
      }
      setUrlInitialized(true);
      return;
    }

    if (!isNew) {
      setUrlInitialized(true);
      return;
    }

    const rawDraft = window.localStorage.getItem(draftStorageKey);
    if (rawDraft) {
      try {
        const parsed = JSON.parse(rawDraft) as FormState & { module?: string };
        if (parsed.module === config.module || !parsed.module) {
          setFormState({
            id: parsed.id ?? null,
            date: parsed.date ?? getToday(),
            district: parsed.district ?? "",
            schoolName: parsed.schoolName ?? "",
            programType: parsed.programType || config.programTypeOptions[0]?.value || "",
            followUpDate: parsed.followUpDate ?? "",
            status: parsed.status ?? "Draft",
            reviewNote: parsed.reviewNote ?? "",
            payload: { ...buildDefaultPayload(config), ...(parsed.payload ?? {}) },
          });
          setIsFormOpen(true);
          setUrlInitialized(true);
          return;
        }
      } catch {
        // No-op
      }
    }

    openNewForm();
    setUrlInitialized(true);
  }, [
    config,
    draftStorageKey,
    loadEvidence,
    openNewForm,
    openRecordForm,
    records,
    searchParams,
    urlInitialized,
  ]);

  const updatePayloadField = useCallback((key: string, value: string | string[]) => {
    setFormState((prev) => ({
      ...prev,
      payload: {
        ...prev.payload,
        [key]: value,
      },
    }));
  }, []);

  const validateForm = useCallback(() => {
    if (!formState.date || !formState.district.trim() || !formState.schoolName.trim()) {
      return "Date, district, and school are required.";
    }
    if (!formState.programType.trim()) {
      return `${config.programTypeLabel} is required.`;
    }

    for (const section of config.sections) {
      for (const field of section.fields) {
        if (!field.required) {
          continue;
        }
        const value = formState.payload[field.key];
        if (field.type === "multiselect") {
          if (!Array.isArray(value) || value.length === 0) {
            return `${field.label} is required.`;
          }
          continue;
        }
        if (!String(value ?? "").trim()) {
          return `${field.label} is required.`;
        }
      }
    }

    return "";
  }, [config, formState]);

  const buildRequestBody = useCallback(
    (nextStatus: PortalRecordStatus) => {
      const payload: Record<string, string | number | boolean | string[] | null | undefined> = {};

      Object.entries(formState.payload).forEach(([key, value]) => {
        const field = findField(config, key);
        if (!field) {
          return;
        }

        if (field.type === "multiselect") {
          payload[key] = Array.isArray(value) ? value : [];
          return;
        }

        if (field.type === "number") {
          const raw = String(value ?? "").trim();
          payload[key] = raw ? Number(raw) : 0;
          return;
        }

        payload[key] = String(value ?? "").trim();
      });

      return {
        module: config.module,
        date: formState.date,
        district: formState.district.trim(),
        schoolName: formState.schoolName.trim(),
        programType: formState.programType.trim(),
        followUpDate: formState.followUpDate.trim() || undefined,
        status: nextStatus,
        payload,
      };
    },
    [config, formState],
  );

  const uploadEvidence = useCallback(
    async (recordId: number, body: ReturnType<typeof buildRequestBody>) => {
      if (selectedFiles.length === 0) {
        return;
      }

      for (const file of selectedFiles) {
        const evidenceForm = new FormData();
        evidenceForm.append("file", file);
        evidenceForm.append("module", config.module);
        evidenceForm.append("date", body.date);
        evidenceForm.append("schoolName", body.schoolName);
        evidenceForm.append("recordId", String(recordId));

        const response = await fetch("/api/portal/evidence", {
          method: "POST",
          body: evidenceForm,
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Evidence upload failed.");
        }
      }

      setSelectedFiles([]);
      setFileInputKey((value) => value + 1);
      await loadEvidence(recordId);
    },
    [buildRequestBody, config.module, loadEvidence, selectedFiles],
  );

  const submitRecord = useCallback(
    async (nextStatus: PortalRecordStatus) => {
      const validationError = validateForm();
      if (validationError) {
        setFeedback({ kind: "error", message: validationError });
        return;
      }

      const body = buildRequestBody(nextStatus);
      setSaving(true);
      setFeedback({
        kind: "success",
        message: nextStatus === "Draft" ? "Saving draft..." : "Submitting record...",
      });

      try {
        const endpoint = formState.id ? `/api/portal/records/${formState.id}` : "/api/portal/records";
        const method = formState.id ? "PUT" : "POST";
        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json()) as { error?: string; record?: PortalRecord };

        if (!response.ok || !data.record) {
          throw new Error(data.error ?? "Could not save record.");
        }

        const saved = data.record;
        setRecords((prev) => {
          const exists = prev.some((item) => item.id === saved.id);
          if (exists) {
            return prev.map((item) => (item.id === saved.id ? saved : item));
          }
          return [saved, ...prev];
        });
        setFormState((prev) => ({
          ...prev,
          id: saved.id,
          status: saved.status,
          reviewNote: saved.reviewNote ?? prev.reviewNote,
        }));
        window.localStorage.removeItem(draftStorageKey);

        await uploadEvidence(saved.id, body);

        setFeedback({
          kind: "success",
          message:
            nextStatus === "Draft"
              ? `Draft saved as ${saved.recordCode}.`
              : `Record submitted as ${saved.recordCode}.`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save record.";
        const offline = typeof navigator !== "undefined" && !navigator.onLine;

        if (offline) {
          const queue = readQueue();
          queue.push({
            action: formState.id ? "update" : "create",
            id: formState.id ?? undefined,
            body,
          });
          writeQueue(queue);
          refreshOfflineCount();
          setFeedback({
            kind: "error",
            message: "No network connection. Record stored in offline queue for sync.",
          });
        } else {
          setFeedback({ kind: "error", message });
        }
      } finally {
        setSaving(false);
      }
    },
    [
      buildRequestBody,
      draftStorageKey,
      formState.id,
      refreshOfflineCount,
      uploadEvidence,
      validateForm,
    ],
  );

  const submitReviewStatus = useCallback(
    async (nextStatus: PortalRecordStatus) => {
      if (!formState.id) {
        return;
      }
      setSaving(true);
      try {
        const response = await fetch(`/api/portal/records/${formState.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            reviewNote: formState.reviewNote,
          }),
        });
        const data = (await response.json()) as { error?: string; record?: PortalRecord };
        if (!response.ok || !data.record) {
          throw new Error(data.error ?? "Could not update status.");
        }

        setRecords((prev) => prev.map((item) => (item.id === data.record?.id ? data.record : item)));
        setFormState((prev) => ({
          ...prev,
          status: data.record?.status ?? prev.status,
        }));
        setFeedback({
          kind: "success",
          message: `Record ${data.record.recordCode} marked ${data.record.status}.`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update status.";
        setFeedback({ kind: "error", message });
      } finally {
        setSaving(false);
      }
    },
    [formState.id, formState.reviewNote],
  );

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({
      module: config.module,
    });
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.district) params.set("district", filters.district);
    if (filters.school) params.set("school", filters.school);
    if (filters.status) params.set("status", filters.status);
    if (filters.createdBy) params.set("createdBy", filters.createdBy);
    if (filters.programType) params.set("programType", filters.programType);
    return `/api/portal/records/export?${params.toString()}`;
  }, [config.module, filters]);

  const handleFiltersSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await fetchRecords(filters);
    },
    [fetchRecords, filters],
  );

  const resetFilters = useCallback(async () => {
    const empty: FilterState = {
      dateFrom: "",
      dateTo: "",
      district: "",
      school: "",
      status: "",
      createdBy: "",
      programType: "",
    };
    setFilters(empty);
    await fetchRecords(empty);
  }, [fetchRecords]);

  return (
    <>
      <section className="card portal-module-header">
        <div>
          <h2>{config.pageTitle}</h2>
          <p>{config.description}</p>
        </div>
        <div className="action-row">
          <button className="button" type="button" onClick={openNewForm}>
            {config.newLabel}
          </button>
          <button className="button button-ghost" type="button" onClick={() => void syncOfflineQueue()} disabled={syncing}>
            {syncing ? "Syncing..." : `Sync Offline (${offlineCount})`}
          </button>
        </div>
      </section>

      <section className="card">
        <form className="portal-filter-grid" onSubmit={handleFiltersSubmit}>
          <label>
            Date from
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
            />
          </label>
          <label>
            Date to
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
            />
          </label>
          <label>
            District
            <input
              value={filters.district}
              onChange={(event) => setFilters((prev) => ({ ...prev, district: event.target.value }))}
            />
          </label>
          <label>
            School
            <input
              value={filters.school}
              onChange={(event) => setFilters((prev) => ({ ...prev, school: event.target.value }))}
            />
          </label>
          <label>
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">All</option>
              {portalStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Created by
            <select
              value={filters.createdBy}
              onChange={(event) => setFilters((prev) => ({ ...prev, createdBy: event.target.value }))}
              disabled={!canReview}
            >
              <option value="">All</option>
              {initialUsers.map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Program type
            <input
              value={filters.programType}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, programType: event.target.value }))
              }
            />
          </label>

          <div className="action-row portal-filter-actions">
            <button className="button" type="submit" disabled={loadingRecords}>
              {loadingRecords ? "Applying..." : "Apply"}
            </button>
            <button className="button button-ghost" type="button" onClick={() => void resetFilters()}>
              Reset
            </button>
            <a href={exportUrl} className="button button-ghost">
              Export
            </a>
          </div>
        </form>
      </section>

      {feedback.message ? (
        <p className={`form-message ${feedback.kind === "error" ? "error" : "success"}`}>
          {feedback.message}
        </p>
      ) : null}

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>District</th>
                <th>School</th>
                <th>Type</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8}>No records found for this module.</td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.recordCode}</td>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>{record.district}</td>
                    <td>{record.schoolName}</td>
                    <td>{record.programType ?? "-"}</td>
                    <td>{record.status}</td>
                    <td>{new Date(record.updatedAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => {
                          openRecordForm(record);
                          void loadEvidence(record.id);
                        }}
                      >
                        View/Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isFormOpen ? (
        <section className="card portal-form-card">
          <div className="portal-form-header">
            <div>
              <h2>
                {config.pageTitle} Form {formState.id ? `(${records.find((row) => row.id === formState.id)?.recordCode ?? `#${formState.id}`})` : ""}
              </h2>
              <p>Status: {formState.status}</p>
              {autosaveAt ? (
                <p className="portal-muted">
                  Autosaved at {new Date(autosaveAt).toLocaleTimeString()}
                </p>
              ) : null}
            </div>
            <button className="button button-ghost" type="button" onClick={() => setIsFormOpen(false)}>
              Close form
            </button>
          </div>

          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label>
              Date
              <input
                type="date"
                value={formState.date}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, date: event.target.value }))
                }
                required
              />
            </label>
            <label>
              District
              <input
                value={formState.district}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, district: event.target.value }))
                }
                required
              />
            </label>
            <label>
              School
              <input
                value={formState.schoolName}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, schoolName: event.target.value }))
                }
                required
              />
            </label>
            <label>
              {config.programTypeLabel}
              <select
                value={formState.programType}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, programType: event.target.value }))
                }
                required
              >
                <option value="">Select</option>
                {config.programTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Follow-up date
              <input
                type="date"
                value={formState.followUpDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, followUpDate: event.target.value }))
                }
              />
            </label>
            <label>
              Workflow status
              <input value={formState.status} readOnly />
            </label>

            {config.sections.map((section) => (
              <fieldset key={section.id} className="card full-width">
                <legend>{section.title}</legend>
                <div className="form-grid">
                  {section.fields.map((field) => {
                    const value = formState.payload[field.key];
                    if (field.type === "textarea") {
                      return (
                        <label key={field.key} className="full-width">
                          {field.label}
                          <textarea
                            rows={3}
                            value={Array.isArray(value) ? value.join(", ") : sanitizeForInput(value)}
                            placeholder={field.placeholder}
                            onChange={(event) => updatePayloadField(field.key, event.target.value)}
                          />
                          {field.helperText ? <small>{field.helperText}</small> : null}
                        </label>
                      );
                    }

                    if (field.type === "select") {
                      return (
                        <label key={field.key}>
                          {field.label}
                          <select
                            value={Array.isArray(value) ? value[0] ?? "" : sanitizeForInput(value)}
                            onChange={(event) => updatePayloadField(field.key, event.target.value)}
                            required={field.required}
                          >
                            <option value="">Select</option>
                            {(field.options ?? []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    }

                    if (field.type === "multiselect") {
                      const selected = Array.isArray(value) ? value : [];
                      return (
                        <fieldset key={field.key} className="card full-width">
                          <legend>{field.label}</legend>
                          <div className="portal-multiselect">
                            {(field.options ?? []).map((option) => {
                              const checked = selected.includes(option.value);
                              return (
                                <label key={option.value}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => {
                                      const next = new Set(selected);
                                      if (event.target.checked) {
                                        next.add(option.value);
                                      } else {
                                        next.delete(option.value);
                                      }
                                      updatePayloadField(field.key, Array.from(next));
                                    }}
                                  />
                                  <span>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                      );
                    }

                    return (
                      <label key={field.key}>
                        {field.label}
                        <input
                          type={field.type}
                          min={isNumberField(field) ? field.min : undefined}
                          max={isNumberField(field) ? field.max : undefined}
                          step={isNumberField(field) ? field.step ?? 1 : undefined}
                          value={Array.isArray(value) ? value.join(", ") : sanitizeForInput(value)}
                          placeholder={field.placeholder}
                          onChange={(event) => updatePayloadField(field.key, event.target.value)}
                          required={field.required}
                        />
                        {field.helperText ? <small>{field.helperText}</small> : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <fieldset className="card full-width">
              <legend>Evidence Locker</legend>
              <div className="form-grid">
                <label className="full-width">
                  Attach files (photo/PDF/document)
                  <input
                    key={fileInputKey}
                    type="file"
                    multiple
                    onChange={(event) =>
                      setSelectedFiles(event.target.files ? Array.from(event.target.files) : [])
                    }
                  />
                </label>
                <div className="full-width">
                  {selectedFiles.length > 0 ? (
                    <p>{selectedFiles.length} file(s) selected. Files upload when you save/submit.</p>
                  ) : (
                    <p>No new files selected.</p>
                  )}
                </div>
                {evidenceItems.length > 0 ? (
                  <div className="full-width table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>File</th>
                          <th>Uploaded</th>
                          <th>Download</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evidenceItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.fileName}</td>
                            <td>{new Date(item.createdAt).toLocaleString()}</td>
                            <td>
                              <a href={item.downloadUrl}>Download</a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </fieldset>

            {canReview && formState.id ? (
              <label className="full-width">
                Supervisor review note
                <textarea
                  rows={2}
                  value={formState.reviewNote}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, reviewNote: event.target.value }))
                  }
                />
              </label>
            ) : null}

            <div className="full-width action-row">
              <button className="button" type="button" disabled={saving} onClick={() => void submitRecord("Draft")}>
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                className="button button-ghost"
                type="button"
                disabled={saving}
                onClick={() => void submitRecord("Submitted")}
              >
                {saving ? "Saving..." : "Submit"}
              </button>
              {canReview && formState.id ? (
                <>
                  <button
                    className="button"
                    type="button"
                    disabled={saving}
                    onClick={() => void submitReviewStatus("Approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    disabled={saving}
                    onClick={() => void submitReviewStatus("Returned")}
                  >
                    Return
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
