"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  portalResourceSections,
  PortalResourceSection,
  ResourceGrade,
  ResourceSkill,
  ResourceType,
} from "@/lib/types";

type PortalResourceView = {
  id: number;
  slug: string;
  title: string;
  description: string;
  grade: ResourceGrade;
  skill: ResourceSkill;
  type: ResourceType;
  section: PortalResourceSection;
  fileName: string | null;
  externalUrl: string | null;
  downloadLabel: string | null;
  isPublished: boolean;
  createdByName: string;
  createdAt: string;
  downloadUrl: string;
};

interface PortalResourcesManagerProps {
  initialResources: PortalResourceView[];
}

const gradeOptions: ResourceGrade[] = ["Nursery", "P1-P2", "P3-P4", "P5-P7", "All Primary"];
const skillOptions: ResourceSkill[] = [
  "Phonics",
  "Fluency",
  "Comprehension",
  "Assessment",
  "Remedial",
  "Writing",
];
const typeOptions: ResourceType[] = [
  "Toolkit",
  "Lesson Plan",
  "Assessment",
  "Poster",
  "Guide",
  "Reader",
];
const sectionOptions: PortalResourceSection[] = [...portalResourceSections];

export function PortalResourcesManager({ initialResources }: PortalResourcesManagerProps) {
  const [resources, setResources] = useState(initialResources);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const counts = useMemo(
    () => ({
      total: resources.length,
      uploadedFiles: resources.filter((item) => Boolean(item.fileName)).length,
      linkedUrls: resources.filter((item) => Boolean(item.externalUrl)).length,
    }),
    [resources],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("Saving resource...");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/portal/resources", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        resource?: PortalResourceView;
      };

      if (!response.ok || !data.resource) {
        throw new Error(data.error ?? "Could not save resource.");
      }

      setResources((prev) => [data.resource as PortalResourceView, ...prev]);
      event.currentTarget.reset();
      setSelectedFileName("");
      setFormKey((value) => value + 1);
      setStatus("Resource saved. Download button now points to the uploaded file/link.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save resource.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="portal-kpis">
        <article className="portal-kpi-card">
          <p>Total library entries</p>
          <strong>{counts.total.toLocaleString()}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Uploaded files</p>
          <strong>{counts.uploadedFiles.toLocaleString()}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>External download links</p>
          <strong>{counts.linkedUrls.toLocaleString()}</strong>
        </article>
      </section>

      <section className="card">
        <h2>Upload Resource / Configure Download Link</h2>
        <p>
          Upload a file or provide an external URL, then choose where it should
          appear on the public website.
        </p>
        <form key={formKey} className="form-grid portal-form-grid" onSubmit={handleSubmit}>
          <label>
            <span className="portal-field-label">Title</span>
            <input name="title" required minLength={3} placeholder="e.g. Decodable Readers Set 4" />
          </label>
          <label>
            <span className="portal-field-label">Download Button Label (optional)</span>
            <input name="downloadLabel" placeholder="e.g. Download Decodable Set 4 (PDF)" />
          </label>
          <label className="full-width">
            <span className="portal-field-label">Description</span>
            <textarea
              name="description"
              required
              minLength={8}
              rows={4}
              placeholder="Short description shown in the resource card."
            />
          </label>

          <label>
            <span className="portal-field-label">Grade</span>
            <select name="grade" defaultValue="All Primary" required>
              {gradeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">Skill</span>
            <select name="skill" defaultValue="Phonics" required>
              {skillOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">Resource Type</span>
            <select name="type" defaultValue="Toolkit" required>
              {typeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">Document Area</span>
            <select name="section" defaultValue="Resources Library" required>
              {sectionOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="full-width">
            <span className="portal-field-label">External Download URL (optional)</span>
            <input
              name="externalUrl"
              type="url"
              placeholder="https://drive.google.com/... or any direct download URL"
            />
            <small className="portal-field-help">
              Provide this if the resource is hosted elsewhere. Otherwise upload a file below.
            </small>
          </label>

          <label className="full-width">
            <span className="portal-field-label">Upload Resource File (optional)</span>
            <input
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip"
              onChange={(event) =>
                setSelectedFileName(event.currentTarget.files?.[0]?.name ?? "")
              }
            />
            <small className="portal-field-help">
              Allowed: PDF, DOCX, PPTX, XLSX, CSV, TXT, ZIP (max 120MB).
            </small>
            {selectedFileName ? <small className="portal-field-help">Selected: {selectedFileName}</small> : null}
          </label>

          <label>
            <span className="portal-field-label">Publish now</span>
            <select name="isPublished" defaultValue="true">
              <option value="true">Yes (visible in public resources)</option>
              <option value="false">No (save as hidden)</option>
            </select>
          </label>

          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save resource"}
            </button>
            <button
              className="button button-ghost"
              type="button"
              disabled={saving}
              onClick={() => {
                setFormKey((value) => value + 1);
                setSelectedFileName("");
                setStatus("");
              }}
            >
              Reset form
            </button>
          </div>
        </form>
        {status ? <p className="form-message success">{status}</p> : null}
      </section>

      <section className="card">
        <h2>Recent Resource Entries</h2>
        {resources.length === 0 ? (
          <p>No resources uploaded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Grade / Skill</th>
                  <th>Type</th>
                  <th>Area</th>
                  <th>Source</th>
                  <th>Download</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                    </td>
                    <td>
                      {item.grade} / {item.skill}
                    </td>
                    <td>{item.type}</td>
                    <td>{item.section}</td>
                    <td>{item.fileName ? "Uploaded file" : "External URL"}</td>
                    <td>
                      <a href={item.downloadUrl} target="_blank" rel="noreferrer">
                        {item.downloadLabel || "Open download"}
                      </a>
                    </td>
                    <td>
                      {item.createdByName} · {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
