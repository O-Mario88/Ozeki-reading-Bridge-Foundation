"use client";

import { FormEvent, useState } from "react";
import { FormModal } from "@/components/forms";
import type { RecordedLessonRow } from "@/lib/server/postgres/repositories/recorded-lessons";

interface Props {
  initialLessons: RecordedLessonRow[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateStr));
}

export function PortalRecordedLessonsManager({ initialLessons }: Props) {
  const [lessons, _setLessons] = useState(initialLessons);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [targetLessonId, setTargetLessonId] = useState<number | null>(null);
  const [driveFiles, setDriveFiles] = useState<Array<{ id: string; name: string; createdTime: string; size: string }>>([]);
  const [fetchingDrive, setFetchingDrive] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMsg("Saving lesson record...");

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/portal/recorded-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to schedule lesson");
      }

      const _data = await res.json();
      
      // We do a hard refresh here for simplicity since server components handle the true state, 
      // but ideally we'd optimistic append.
      window.location.reload();
      
    } catch (error) {
      setStatusMsg(error instanceof Error ? error.message : "Error saving.");
      setSaving(false);
    }
  }

  async function openDriveModal(lessonId: number) {
    setTargetLessonId(lessonId);
    setIsDriveModalOpen(true);
    setFetchingDrive(true);
    setDriveFiles([]);
    try {
       const res = await fetch("/api/portal/recorded-lessons/drive");
       const json = await res.json();
       if (json.files) setDriveFiles(json.files);
    } catch {
       setStatusMsg("Failed to fetch drive files.");
    } finally {
       setFetchingDrive(false);
    }
  }

  async function handleBindDriveFile(fileId: string, fileName: string) {
    if (!targetLessonId) return;
    setStatusMsg(`Binding ${fileName}...`);
    setIsDriveModalOpen(false);
    try {
       const res = await fetch(`/api/portal/recorded-lessons/${targetLessonId}`, {
          method: "PATCH",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ googleDriveFileId: fileId, googleDriveFileName: fileName })
       });
       if (res.ok) window.location.reload();
    } catch (_err) {
       setStatusMsg("Failed to bind recording.");
    }
  }

  async function handlePushToVimeo(lessonId: number) {
    setStatusMsg("Streaming direct Google Drive file to Vimeo API...");
    try {
      const res = await fetch(`/api/portal/recorded-lessons/${lessonId}/upload`, { method: "POST" });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      setStatusMsg("Failed to push to Vimeo.");
    }
  }

  async function handlePublishToggle(lessonId: number, willPublish: boolean) {
    setStatusMsg(willPublish ? "Publishing live..." : "Unpublishing...");
    try {
       const res = await fetch(`/api/portal/recorded-lessons/${lessonId}`, {
          method: "PATCH",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ isPublished: willPublish, status: willPublish ? "Published" : "Ready for Review" })
       });
       if (res.ok) window.location.reload();
    } catch {
       setStatusMsg("Failed to change published status.");
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Add Recorded Lesson</h2>
        <p>Schedule a new Google Meet recording, or manually paste a Vimeo Embed URL right now to publish immediately (MVP Phase 1 feature).</p>
        <div className="action-row portal-form-actions">
          <button className="button" onClick={() => setIsFormOpen(true)}>+ Schedule / Add Lesson</button>
        </div>
        {statusMsg && <p className="form-message">{statusMsg}</p>}
      </section>

      <section className="card">
        <h2>Master Library Records</h2>
        {lessons.length === 0 ? (
          <p>No lessons recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Level / Class</th>
                  <th>Teacher</th>
                  <th>Status</th>
                  <th>Published?</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map(lesson => (
                  <tr key={lesson.id}>
                    <td><strong>{lesson.title}</strong><br/><span className="text-xs text-gray-500">{formatDate(lesson.createdAt)}</span></td>
                    <td>{lesson.phonicsLevel || '-'} / {lesson.classLevel || '-'}</td>
                    <td>{lesson.teacherName || '-'}</td>
                    <td>
                      <span className={`badge ${lesson.status === 'Published' ? 'badge-success' : 'badge-warning'}`}>
                        {lesson.status}
                      </span>
                    </td>
                    <td>{lesson.isPublished ? 'Yes' : 'No'}</td>
                    <td>
                      <div className="action-row">
                        {lesson.vimeoEmbedUrl && (
                          <a href={`/recorded-lessons/${lesson.slug}`} target="_blank" rel="noreferrer" className="text-sm border p-1 rounded hover:bg-gray-50">
                            Watch
                          </a>
                        )}
                        {(!lesson.googleDriveFileId && !lesson.vimeoEmbedUrl) && (
                           <button className="button button-ghost" style={{fontSize: "0.8rem", padding: "0.2rem"}} onClick={() => openDriveModal(lesson.id)}>Sync Drive</button>
                        )}
                        {lesson.status === "Ready for Import" && (
                           <button className="button text-brand-primary border border-brand-primary hover:bg-brand-primary hover:text-white" style={{fontSize: "0.8rem", padding: "0.2rem"}} onClick={() => handlePushToVimeo(lesson.id)}>Push to Vimeo</button>
                        )}
                        {lesson.vimeoEmbedUrl && (
                             <button 
                                className="button button-ghost" 
                                style={{fontSize: "0.8rem", padding: "0.2rem"}} 
                                onClick={() => handlePublishToggle(lesson.id, !lesson.isPublished)}
                             >
                                 {lesson.isPublished ? 'Unpublish' : 'Publish'}
                             </button>
                        )}
                        <button className="button button-ghost" style={{fontSize: "0.8rem", padding: "0.2rem"}}>Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <FormModal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Schedule / Add Recorded Lesson"
        description="Enter the live lesson details. If you already uploaded this to Vimeo manually, paste the Embed URL directly to publish it!"
        closeLabel="Close"
        maxWidth="800px"
      >
        <form className="form-grid portal-form-grid" onSubmit={handleSubmit}>
          <label>
            <span className="portal-field-label">Lesson Title</span>
            <input name="title" required placeholder="e.g. Phonics Level 1 Demo" />
          </label>
          <label>
            <span className="portal-field-label">Teacher / Trainer</span>
            <input name="teacherName" placeholder="e.g. Ojok Amos" />
          </label>
          <label>
            <span className="portal-field-label">Class Level</span>
            <select name="classLevel">
              <option value="">-- Select Class --</option>
              <option value="K3">K3</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="Teacher Training">Teacher Training</option>
            </select>
          </label>
          <label>
            <span className="portal-field-label">Phonics Level</span>
            <select name="phonicsLevel">
              <option value="">-- Select Level --</option>
              <option value="Level 1">Level 1</option>
              <option value="Level 2">Level 2</option>
              <option value="Level 3">Level 3</option>
              <option value="General Literacy">General Literacy</option>
            </select>
          </label>
          <label className="full-width">
            <span className="portal-field-label">Description / Concepts</span>
            <textarea name="description" rows={3} placeholder="Concepts covered in this recording..." />
          </label>
          
          <div className="full-width" style={{ borderTop: "1px solid #eee", margin: "1rem 0", paddingTop: "1rem" }}>
            <h3 style={{fontSize: "1rem", marginBottom: "0.5rem"}}>MVP Manual Vimeo Bypass</h3>
            <p className="text-sm text-gray-500 mb-4">Paste the Vimeo Embed SRC url (e.g. https://player.vimeo.com/video/123456) to immediately publish this without waiting on the Drive Synchronizer.</p>
            <label className="full-width">
              <span className="portal-field-label">Vimeo Embed URL (Optional)</span>
              <input name="vimeoEmbedUrl" type="url" placeholder="https://player.vimeo.com/video/..." />
            </label>
          </div>

          <div className="full-width action-row portal-form-actions">
             <button type="submit" className="button" disabled={saving}>
               {saving ? "Saving..." : "Save Record"}
             </button>
          </div>
        </form>
      </FormModal>

      <FormModal
        open={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        title="Link Google Drive Recording"
        description="Select the matched Google Meet recording MP4 from the organization Drive."
        closeLabel="Cancel"
      >
        <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #eee", borderRadius: "8px", padding: "1rem" }}>
           {fetchingDrive ? (
              <p className="text-sm text-gray-500 text-center py-8">Scanning Google Drive for MP4s...</p>
           ) : driveFiles.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No MP4 files found in the configured Google Drive.</p>
           ) : (
              <ul className="flex flex-col gap-2">
                 {driveFiles.map(file => (
                    <li key={file.id} className="flex flex-col gap-1 p-3 bg-gray-50 rounded shadow-sm border border-gray-100 hover:bg-white cursor-pointer" onClick={() => handleBindDriveFile(file.id, file.name)}>
                       <span className="font-semibold text-sm break-all text-blue-800">{file.name}</span>
                       <div className="flex justify-between text-xs text-gray-500">
                          <span>{new Date(file.createdTime).toLocaleDateString()}</span>
                          <span>{(Number(file.size) / (1024*1024)).toFixed(1)} MB</span>
                       </div>
                    </li>
                 ))}
              </ul>
           )}
        </div>
      </FormModal>
    </div>
  );
}
