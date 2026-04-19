"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type WorkQueueItem = {
  id: string;
  category: "assessment" | "coaching" | "certificate" | "finance" | "action_plan" | "training_follow_up" | "at_risk";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  subtitle: string;
  dueDate: string | null;
  daysOverdue: number | null;
  ownerUserId: number | null;
  ownerName: string | null;
  schoolId: number | null;
  schoolName: string | null;
  district: string | null;
  actionHref: string;
  payload: Record<string, unknown>;
};

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "assessment", label: "Assessments" },
  { value: "coaching", label: "Coaching" },
  { value: "certificate", label: "Certificates" },
  { value: "finance", label: "Finance" },
  { value: "action_plan", label: "Action plans" },
  { value: "training_follow_up", label: "Training follow-ups" },
];

type Props = {
  initialWorkQueue: WorkQueueItem[];
  canBulk: boolean;
};

export function CommandCenterClient({ initialWorkQueue, canBulk }: Props) {
  const [queue, setQueue] = useState(initialWorkQueue);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPanel, setBulkPanel] = useState<"none" | "coach" | "training">("none");
  const [coachUserId, setCoachUserId] = useState("");
  const [trainingTopic, setTrainingTopic] = useState("");
  const [trainingDate, setTrainingDate] = useState("");
  const [trainingVenue, setTrainingVenue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return queue;
    return queue.filter((i) => i.category === activeCategory);
  }, [queue, activeCategory]);

  const selectableSchoolItems = filtered.filter((i) => i.schoolId !== null);
  const selectedSchoolIds = useMemo(() => {
    const ids = new Set<number>();
    for (const item of filtered) {
      if (selectedIds.has(item.id) && item.schoolId !== null) {
        ids.add(item.schoolId);
      }
    }
    return Array.from(ids);
  }, [filtered, selectedIds]);

  const toggleAll = () => {
    if (selectedIds.size === selectableSchoolItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableSchoolItems.map((i) => i.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkCoachAssign = async () => {
    if (selectedSchoolIds.length === 0 || !coachUserId) {
      alert("Select schools and enter a coach user ID.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/portal/command-center/bulk/coach-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolIds: selectedSchoolIds,
          coachUserId: Number(coachUserId),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${json.error ?? "Failed"}`);
      } else {
        setMessage(`✓ Coach assigned to ${json.assigned} school(s). ${json.skipped ? `${json.skipped} skipped.` : ""}`);
        setSelectedIds(new Set());
        setBulkPanel("none");
      }
    } catch (e) {
      setMessage(`Error: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkScheduleTraining = async () => {
    if (selectedSchoolIds.length === 0 || !trainingTopic || !trainingDate) {
      alert("Select schools, enter a topic and date.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/portal/command-center/bulk/schedule-training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolIds: selectedSchoolIds,
          topic: trainingTopic,
          scheduledDate: trainingDate,
          venue: trainingVenue || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${json.error ?? "Failed"}`);
      } else {
        setMessage(`✓ Training #${json.trainingScheduleId} scheduled with ${json.registrations} school registrations.`);
        setSelectedIds(new Set());
        setBulkPanel("none");
        setTrainingTopic("");
        setTrainingDate("");
        setTrainingVenue("");
      }
    } catch (e) {
      setMessage(`Error: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const dismissItem = (id: string) => {
    setQueue(queue.filter((i) => i.id !== id));
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
  };

  return (
    <div className="cc-work-queue">
      {/* Filter pills */}
      <div className="cc-filters">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            className={activeCategory === c.value ? "active" : ""}
            onClick={() => setActiveCategory(c.value)}
          >
            {c.label}
            {c.value !== "all" ? (
              <span className="cc-filter-count">
                {queue.filter((i) => i.category === c.value).length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Bulk toolbar */}
      {canBulk && selectedSchoolIds.length > 0 ? (
        <div className="cc-bulk-toolbar">
          <span><strong>{selectedSchoolIds.length}</strong> school{selectedSchoolIds.length === 1 ? "" : "s"} selected</span>
          <button type="button" onClick={() => setBulkPanel("coach")}>Assign coach</button>
          <button type="button" onClick={() => setBulkPanel("training")}>Schedule training</button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="cc-bulk-clear">Clear</button>
        </div>
      ) : null}

      {bulkPanel === "coach" ? (
        <div className="cc-bulk-panel">
          <h4>Bulk assign coach to {selectedSchoolIds.length} schools</h4>
          <label>
            Coach user ID
            <input
              type="number"
              value={coachUserId}
              onChange={(e) => setCoachUserId(e.target.value)}
              placeholder="e.g. 42"
            />
          </label>
          <div className="cc-bulk-actions">
            <button type="button" onClick={handleBulkCoachAssign} disabled={submitting} className="primary">
              {submitting ? "Assigning…" : "Assign"}
            </button>
            <button type="button" onClick={() => setBulkPanel("none")}>Cancel</button>
          </div>
        </div>
      ) : null}

      {bulkPanel === "training" ? (
        <div className="cc-bulk-panel">
          <h4>Schedule training for {selectedSchoolIds.length} schools</h4>
          <label>
            Topic
            <input
              type="text"
              value={trainingTopic}
              onChange={(e) => setTrainingTopic(e.target.value)}
              placeholder="e.g. Phonics Refresher"
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={trainingDate}
              onChange={(e) => setTrainingDate(e.target.value)}
            />
          </label>
          <label>
            Venue (optional)
            <input
              type="text"
              value={trainingVenue}
              onChange={(e) => setTrainingVenue(e.target.value)}
              placeholder="e.g. District Education Office"
            />
          </label>
          <div className="cc-bulk-actions">
            <button type="button" onClick={handleBulkScheduleTraining} disabled={submitting} className="primary">
              {submitting ? "Scheduling…" : "Schedule"}
            </button>
            <button type="button" onClick={() => setBulkPanel("none")}>Cancel</button>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className={`cc-message ${message.startsWith("✓") ? "success" : "error"}`}>{message}</div>
      ) : null}

      {/* Queue list */}
      {filtered.length === 0 ? (
        <p className="text-gray-400 cc-empty">No items in this category. You are caught up.</p>
      ) : (
        <ul className="cc-queue-list">
          {canBulk && selectableSchoolItems.length > 0 ? (
            <li className="cc-queue-header">
              <input
                type="checkbox"
                checked={selectedIds.size > 0 && selectedIds.size === selectableSchoolItems.length}
                onChange={toggleAll}
                aria-label="Select all school items"
              />
              <span className="cc-queue-header-text">Select all {selectableSchoolItems.length} school-level items</span>
            </li>
          ) : null}
          {filtered.map((item) => (
            <li key={item.id} className={`cc-queue-item cc-priority-${item.priority}`}>
              {canBulk && item.schoolId !== null ? (
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleOne(item.id)}
                  aria-label={`Select ${item.title}`}
                />
              ) : (
                <span className="cc-checkbox-placeholder" />
              )}
              <span className={`cc-priority-pill cc-priority-${item.priority}`}>{item.priority}</span>
              <div className="cc-queue-body">
                <Link href={item.actionHref}><strong>{item.title}</strong></Link>
                {item.subtitle ? <><br /><small>{item.subtitle}</small></> : null}
                <div className="cc-queue-meta">
                  <small className={`cc-category-tag cc-tag-${item.category}`}>{item.category.replace("_", " ")}</small>
                  {item.ownerName ? <small>· {item.ownerName}</small> : null}
                  {item.daysOverdue !== null && item.daysOverdue > 0 ? (
                    <small className="cc-overdue">· {item.daysOverdue}d overdue</small>
                  ) : item.dueDate ? (
                    <small>· due {item.dueDate}</small>
                  ) : null}
                </div>
              </div>
              <div className="cc-queue-actions">
                <Link href={item.actionHref} className="cc-queue-action">Open →</Link>
                <button
                  type="button"
                  className="cc-queue-dismiss"
                  onClick={() => dismissItem(item.id)}
                  title="Dismiss (from this view only)"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
