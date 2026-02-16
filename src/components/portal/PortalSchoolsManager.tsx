"use client";

import { FormEvent, useState } from "react";
import { SchoolDirectoryRecord } from "@/lib/types";

interface PortalSchoolsManagerProps {
  initialSchools: SchoolDirectoryRecord[];
}

type Feedback = {
  kind: "idle" | "success" | "error";
  message: string;
};

export function PortalSchoolsManager({ initialSchools }: PortalSchoolsManagerProps) {
  const [schools, setSchools] = useState(initialSchools);
  const [districtFilter, setDistrictFilter] = useState("");
  const [queryFilter, setQueryFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle", message: "" });

  async function fetchSchools(district: string, query: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (district.trim()) params.set("district", district.trim());
      if (query.trim()) params.set("query", query.trim());

      const response = await fetch(`/api/portal/schools?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { error?: string; schools?: SchoolDirectoryRecord[] };
      if (!response.ok || !data.schools) {
        throw new Error(data.error ?? "Could not load schools.");
      }
      setSchools(data.schools);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load schools.";
      setFeedback({ kind: "error", message });
    } finally {
      setLoading(false);
    }
  }

  async function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetchSchools(districtFilter, queryFilter);
  }

  async function handleCreateSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback({ kind: "success", message: "Saving school..." });

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      district: String(formData.get("district") ?? ""),
      subCounty: String(formData.get("subCounty") ?? ""),
      parish: String(formData.get("parish") ?? ""),
      village: String(formData.get("village") ?? ""),
      gpsLat: String(formData.get("gpsLat") ?? ""),
      gpsLng: String(formData.get("gpsLng") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
    };

    try {
      const response = await fetch("/api/portal/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; school?: SchoolDirectoryRecord };
      if (!response.ok || !data.school) {
        throw new Error(data.error ?? "Could not save school.");
      }

      setSchools((prev) => [data.school!, ...prev]);
      event.currentTarget.reset();
      setFeedback({ kind: "success", message: `School ${data.school.schoolCode} saved.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save school.";
      setFeedback({ kind: "error", message });
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Add School</h2>
        <form className="form-grid" onSubmit={handleCreateSchool}>
          <label>
            School Name
            <input name="name" required />
          </label>
          <label>
            District
            <input name="district" required />
          </label>
          <label>
            Sub-county
            <input name="subCounty" required />
          </label>
          <label>
            Parish
            <input name="parish" required />
          </label>
          <label>
            Village (optional)
            <input name="village" />
          </label>
          <label>
            GPS Latitude (optional)
            <input name="gpsLat" />
          </label>
          <label>
            GPS Longitude (optional)
            <input name="gpsLng" />
          </label>
          <label>
            Contact Name (optional)
            <input name="contactName" />
          </label>
          <label>
            Contact Phone (optional)
            <input name="contactPhone" />
          </label>

          <button className="button" type="submit">
            Save School
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Schools Directory</h2>
        <form className="portal-filter-grid" onSubmit={handleFilterSubmit}>
          <label>
            District
            <input
              value={districtFilter}
              onChange={(event) => setDistrictFilter(event.target.value)}
            />
          </label>
          <label>
            School name or ID
            <input
              value={queryFilter}
              onChange={(event) => setQueryFilter(event.target.value)}
            />
          </label>
          <div className="action-row portal-filter-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "Filtering..." : "Apply"}
            </button>
            <button
              className="button button-ghost"
              type="button"
              onClick={() => {
                setDistrictFilter("");
                setQueryFilter("");
                void fetchSchools("", "");
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {feedback.message ? (
          <p className={`form-message ${feedback.kind === "error" ? "error" : "success"}`}>
            {feedback.message}
          </p>
        ) : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>School ID</th>
                <th>Name</th>
                <th>District</th>
                <th>Sub-county</th>
                <th>Parish</th>
                <th>Village</th>
                <th>GPS</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={8}>No schools available.</td>
                </tr>
              ) : (
                schools.map((school) => (
                  <tr key={school.id}>
                    <td>{school.schoolCode}</td>
                    <td>{school.name}</td>
                    <td>{school.district}</td>
                    <td>{school.subCounty}</td>
                    <td>{school.parish}</td>
                    <td>{school.village ?? "-"}</td>
                    <td>
                      {school.gpsLat && school.gpsLng
                        ? `${school.gpsLat}, ${school.gpsLng}`
                        : "-"}
                    </td>
                    <td>
                      {school.contactName ?? "-"}
                      {school.contactPhone ? ` (${school.contactPhone})` : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
