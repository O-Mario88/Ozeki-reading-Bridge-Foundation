"use client";

import { FormEvent, useState } from "react";
import { GraduationSettingsRecord } from "@/lib/types";
import { LEARNING_DOMAIN_DICTIONARY } from "@/lib/domain-dictionary";
import { submitJsonWithOfflineQueue } from "@/lib/offline-form-queue";

type PortalGraduationSettingsManagerProps = {
  initialSettings: GraduationSettingsRecord;
};

const domainOptions = [
  { key: "letter_sounds", label: LEARNING_DOMAIN_DICTIONARY.letter_sounds.label_full },
  { key: "decoding", label: "Decoding" },
  { key: "fluency", label: "Fluency" },
  { key: "comprehension", label: LEARNING_DOMAIN_DICTIONARY.comprehension.label_full },
] as const;

export function PortalGraduationSettingsManager({
  initialSettings,
}: PortalGraduationSettingsManagerProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback("");
    try {
      const result = await submitJsonWithOfflineQueue<{ settings?: GraduationSettingsRecord; error?: string }>(
        "/api/portal/graduation/settings",
        {
          method: "PUT",
          payload: settings,
          label: "Graduation settings update",
        },
      );
      if (result.queued) {
        setFeedback("No internet connection. Graduation settings saved offline and queued for sync.");
        return;
      }
      const json = result.data ?? {};
      if (!result.response.ok || !json.settings) {
        throw new Error(json.error ?? "Failed to save graduation settings.");
      }
      setSettings(json.settings);
      setFeedback("Graduation settings saved.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to save graduation settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>School Graduation Criteria</h2>
      <p>Graduation is condition-based and computed from live submissions only.</p>
      <form className="portal-form-grid" onSubmit={handleSubmit}>
        <label>
          <span className="portal-field-label">Enable graduation workflow</span>
          <select
            value={settings.graduationEnabled ? "1" : "0"}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                graduationEnabled: event.target.value === "1",
              }))
            }
          >
            <option value="1">Enabled</option>
            <option value="0">Disabled</option>
          </select>
        </label>
        <label>
          <span className="portal-field-label">Domain proficiency target (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={settings.targetDomainProficiencyPct}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                targetDomainProficiencyPct: Number(event.target.value || 0),
              }))
            }
          />
        </label>
        <label>
          <span className="portal-field-label">Required reading level</span>
          <select
            value={settings.requiredReadingLevel}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                requiredReadingLevel: event.target.value as GraduationSettingsRecord["requiredReadingLevel"],
              }))
            }
          >
            <option value="Non-Reader">Non-Reader</option>
            <option value="Emerging">Emerging</option>
            <option value="Developing">Developing</option>
            <option value="Transitional">Transitional</option>
            <option value="Fluent">Fluent</option>
          </select>
        </label>
        <label>
          <span className="portal-field-label">Required share at/above reading level (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={settings.requiredFluentPct}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                requiredFluentPct: Number(event.target.value || 0),
              }))
            }
          />
        </label>
        <label>
          <span className="portal-field-label">Minimum published stories</span>
          <input
            type="number"
            min={0}
            value={settings.minPublishedStories}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                minPublishedStories: Number(event.target.value || 0),
              }))
            }
          />
        </label>
        <label>
          <span className="portal-field-label">Teaching quality target (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={settings.targetTeachingQualityPct}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                targetTeachingQualityPct: Number(event.target.value || 0),
              }))
            }
          />
        </label>
        <label>
          <span className="portal-field-label">Assessment cycle mode</span>
          <select
            value={settings.assessmentCycleMode}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                assessmentCycleMode: event.target.value as GraduationSettingsRecord["assessmentCycleMode"],
              }))
            }
          >
            <option value="latest_or_endline">Latest endline else latest</option>
            <option value="latest">Latest only</option>
            <option value="endline">Endline only</option>
          </select>
        </label>
        <label>
          <span className="portal-field-label">Dismiss/snooze days</span>
          <input
            type="number"
            min={1}
            value={settings.dismissSnoozeDays}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                dismissSnoozeDays: Number(event.target.value || 1),
              }))
            }
          />
        </label>
        <label>
          <span className="portal-field-label">Require latest assessment</span>
          <select
            value={settings.latestAssessmentRequired ? "1" : "0"}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                latestAssessmentRequired: event.target.value === "1",
              }))
            }
          >
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label>
        <label>
          <span className="portal-field-label">Require latest evaluation</span>
          <select
            value={settings.latestEvaluationRequired ? "1" : "0"}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                latestEvaluationRequired: event.target.value === "1",
              }))
            }
          >
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label>
        <label>
          <span className="portal-field-label">Require each teaching domain ≥ target</span>
          <select
            value={settings.requireTeachingDomains ? "1" : "0"}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                requireTeachingDomains: event.target.value === "1",
              }))
            }
          >
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </label>
        <label className="full-width">
          <span className="portal-field-label">Criteria version</span>
          <input
            value={settings.criteriaVersion}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                criteriaVersion: event.target.value,
              }))
            }
          />
        </label>
        <fieldset className="full-width">
          <legend className="portal-field-label">Required learner domains</legend>
          <div className="action-row">
            {domainOptions.map((domain) => {
              const checked = settings.requiredDomains.includes(domain.key);
              return (
                <label key={domain.key} className="search-chip">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      setSettings((previous) => {
                        const set = new Set(previous.requiredDomains);
                        if (event.target.checked) {
                          set.add(domain.key);
                        } else {
                          set.delete(domain.key);
                        }
                        return {
                          ...previous,
                          requiredDomains: Array.from(set),
                        };
                      });
                    }}
                  />
                  <span>{domain.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <h3 style={{ gridColumn: "1 / -1", margin: "0.5rem 0" }}>Evidence Gates</h3>
        <label>
          <span className="portal-field-label">Min learners assessed</span>
          <input
            type="number"
            min={0}
            value={settings.minLearnersAssessedN}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                minLearnersAssessedN: Number(event.target.value || 0),
              }))
            }
          />
        </label>
        <label>
          <span className="portal-field-label">Target grades (comma-separated)</span>
          <input
            value={settings.targetGrades.join(", ")}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                targetGrades: event.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
          />
        </label>
        <label>
          <span className="portal-field-label">Min teacher evaluations (total)</span>
          <input
            type="number"
            min={0}
            value={settings.minTeacherEvaluationsTotal}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                minTeacherEvaluationsTotal: Number(event.target.value || 0),
              }))
            }
          />
        </label>
        <label>
          <span className="portal-field-label">Min evaluations per reading teacher</span>
          <input
            type="number"
            min={0}
            value={settings.minEvaluationsPerReadingTeacher}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                minEvaluationsPerReadingTeacher: Number(event.target.value || 0),
              }))
            }
          />
        </label>
        <label>
          <span className="portal-field-label">Data completeness threshold (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={settings.dataCompletenessThreshold}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                dataCompletenessThreshold: Number(event.target.value || 0),
              }))
            }
          />
        </label>
        <h3 style={{ gridColumn: "1 / -1", margin: "0.5rem 0" }}>Sustainability Validation</h3>
        <label>
          <span className="portal-field-label">Require sustainability validation (two-pass)</span>
          <select
            value={settings.requireSustainabilityValidation ? "1" : "0"}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                requireSustainabilityValidation: event.target.value === "1",
              }))
            }
          >
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </label>
        <label className="full-width">
          <span className="portal-field-label">Sustainability checklist items (one per line)</span>
          <textarea
            rows={6}
            value={settings.sustainabilityChecklistItems.join("\n")}
            onChange={(event) =>
              setSettings((previous) => ({
                ...previous,
                sustainabilityChecklistItems: event.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
          />
        </label>
        <div className="full-width action-row">
          <button type="submit" className="button" disabled={saving}>
            {saving ? "Saving..." : "Save Graduation Settings"}
          </button>
          {feedback ? <span className="portal-muted">{feedback}</span> : null}
        </div>
      </form>
    </section>
  );
}
