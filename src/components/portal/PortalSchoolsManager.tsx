"use client";

import { FormEvent, useState } from "react";
import {
  allUgandaDistricts,
  getDistrictsByRegion,
  ugandaRegions,
} from "@/lib/uganda-locations";
import { SchoolDirectoryRecord } from "@/lib/types";

interface PortalSchoolsManagerProps {
  initialSchools: SchoolDirectoryRecord[];
}

type Feedback = {
  kind: "idle" | "success" | "error";
  message: string;
};

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function PortalSchoolsManager({ initialSchools }: PortalSchoolsManagerProps) {
  const [schools, setSchools] = useState(initialSchools);
  const [createRegion, setCreateRegion] = useState(ugandaRegions[0]?.region ?? "");
  const [createDistrict, setCreateDistrict] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [queryFilter, setQueryFilter] = useState("");
  const [savingSchool, setSavingSchool] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<Feedback>({
    kind: "idle",
    message: "",
  });
  const [directoryFeedback, setDirectoryFeedback] = useState<Feedback>({
    kind: "idle",
    message: "",
  });
  const createDistrictOptions = createRegion
    ? getDistrictsByRegion(createRegion)
    : allUgandaDistricts;
  const filterDistrictOptions = filterRegion
    ? getDistrictsByRegion(filterRegion)
    : allUgandaDistricts;

  async function fetchSchools(district: string, query: string) {
    setLoading(true);
    setDirectoryFeedback({ kind: "idle", message: "" });
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
      setDirectoryFeedback({ kind: "error", message });
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
    setCreateFeedback({ kind: "success", message: "Saving school..." });
    setSavingSchool(true);

    const formData = new FormData(event.currentTarget);
    const region = String(formData.get("region") ?? "").trim();
    const district = String(formData.get("district") ?? "").trim();
    const payload = {
      name: String(formData.get("name") ?? ""),
      district,
      subCounty: String(formData.get("subCounty") ?? ""),
      parish: String(formData.get("parish") ?? ""),
      village: String(formData.get("village") ?? ""),
      enrolledBoys: String(formData.get("enrolledBoys") ?? "0"),
      enrolledGirls: String(formData.get("enrolledGirls") ?? "0"),
      gpsLat: String(formData.get("gpsLat") ?? ""),
      gpsLng: String(formData.get("gpsLng") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
    };

    if (!region || !district) {
      setCreateFeedback({
        kind: "error",
        message: "Region and district are required.",
      });
      setSavingSchool(false);
      return;
    }

    const lat = parseOptionalNumber(payload.gpsLat);
    if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
      setCreateFeedback({
        kind: "error",
        message: "GPS latitude must be a valid number between -90 and 90.",
      });
      setSavingSchool(false);
      return;
    }
    const lng = parseOptionalNumber(payload.gpsLng);
    if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
      setCreateFeedback({
        kind: "error",
        message: "GPS longitude must be a valid number between -180 and 180.",
      });
      setSavingSchool(false);
      return;
    }
    if (payload.contactPhone.trim()) {
      const phoneOk = /^[+0-9()\s-]{7,20}$/.test(payload.contactPhone.trim());
      if (!phoneOk) {
        setCreateFeedback({
          kind: "error",
          message: "Contact phone format is invalid. Use digits and optional +, space, (), or -.",
        });
        setSavingSchool(false);
        return;
      }
    }
    const enrolledBoysValue = payload.enrolledBoys.trim();
    const enrolledGirlsValue = payload.enrolledGirls.trim();
    const enrolledBoys = enrolledBoysValue ? Number(enrolledBoysValue) : 0;
    const enrolledGirls = enrolledGirlsValue ? Number(enrolledGirlsValue) : 0;
    if (!Number.isInteger(enrolledBoys) || enrolledBoys < 0) {
      setCreateFeedback({
        kind: "error",
        message: "Enrolled boys must be a whole number greater than or equal to 0.",
      });
      setSavingSchool(false);
      return;
    }
    if (!Number.isInteger(enrolledGirls) || enrolledGirls < 0) {
      setCreateFeedback({
        kind: "error",
        message: "Enrolled girls must be a whole number greater than or equal to 0.",
      });
      setSavingSchool(false);
      return;
    }

    try {
      const response = await fetch("/api/portal/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          enrolledBoys,
          enrolledGirls,
        }),
      });

      const data = (await response.json()) as { error?: string; school?: SchoolDirectoryRecord };
      if (!response.ok || !data.school) {
        throw new Error(data.error ?? "Could not save school.");
      }

      setSchools((prev) => [data.school!, ...prev]);
      event.currentTarget.reset();
      setCreateRegion(ugandaRegions[0]?.region ?? "");
      setCreateDistrict("");
      setCreateFeedback({ kind: "success", message: `School ${data.school.schoolCode} saved.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save school.";
      setCreateFeedback({ kind: "error", message });
    } finally {
      setSavingSchool(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Add School</h2>
        <form className="form-grid portal-form-grid" onSubmit={handleCreateSchool}>
          <label>
            <span className="portal-field-label">
              <span>School Name</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <input
              name="name"
              required
              minLength={2}
              placeholder="e.g. Bright Future Primary"
              autoComplete="organization"
            />
          </label>
          <label>
            <span className="portal-field-label">
              <span>Region</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <select
              name="region"
              value={createRegion}
              onChange={(event) => {
                const nextRegion = event.target.value;
                const options = getDistrictsByRegion(nextRegion);
                setCreateRegion(nextRegion);
                setCreateDistrict((current) =>
                  options.includes(current) ? current : "",
                );
              }}
              required
            >
              <option value="">Select region</option>
              {ugandaRegions.map((entry) => (
                <option key={entry.region} value={entry.region}>
                  {entry.region}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">
              <span>District</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <select
              name="district"
              value={createDistrict}
              onChange={(event) => setCreateDistrict(event.target.value)}
              required
            >
              <option value="">Select district</option>
              {createDistrictOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">
              <span>Sub-county</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <input
              name="subCounty"
              required
              minLength={2}
              placeholder="e.g. Loro"
              autoComplete="address-level2"
            />
          </label>
          <label>
            <span className="portal-field-label">
              <span>Parish</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <input
              name="parish"
              required
              minLength={2}
              placeholder="e.g. Corner Parish"
              autoComplete="address-level3"
            />
          </label>
          <label>
            <span className="portal-field-label">Village (optional)</span>
            <input name="village" placeholder="e.g. Lukole" autoComplete="address-level4" />
          </label>
          <label>
            <span className="portal-field-label">Enrolled Boys</span>
            <input
              name="enrolledBoys"
              type="number"
              min={0}
              step={1}
              defaultValue={0}
              inputMode="numeric"
            />
          </label>
          <label>
            <span className="portal-field-label">Enrolled Girls</span>
            <input
              name="enrolledGirls"
              type="number"
              min={0}
              step={1}
              defaultValue={0}
              inputMode="numeric"
            />
          </label>
          <label>
            <span className="portal-field-label">GPS Latitude (optional)</span>
            <input name="gpsLat" placeholder="e.g. 2.7746" inputMode="decimal" />
          </label>
          <label>
            <span className="portal-field-label">GPS Longitude (optional)</span>
            <input name="gpsLng" placeholder="e.g. 32.2990" inputMode="decimal" />
          </label>
          <label>
            <span className="portal-field-label">Contact Name (optional)</span>
            <input name="contactName" placeholder="e.g. Headteacher name" autoComplete="name" />
          </label>
          <label>
            <span className="portal-field-label">Contact Phone (optional)</span>
            <input
              name="contactPhone"
              placeholder="+2567xxxxxxxx"
              inputMode="tel"
              autoComplete="tel"
            />
          </label>

          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={savingSchool}>
              {savingSchool ? "Saving..." : "Save School"}
            </button>
          </div>

          {createFeedback.message ? (
            <p
              role="status"
              className={`full-width form-message ${
                createFeedback.kind === "error" ? "error" : "success"
              }`}
            >
              {createFeedback.message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="card">
        <h2>Schools Directory</h2>
        <form className="portal-filter-grid" onSubmit={handleFilterSubmit}>
          <label>
            <span className="portal-field-label">Region</span>
            <select
              value={filterRegion}
              onChange={(event) => {
                const nextRegion = event.target.value;
                const options = nextRegion
                  ? getDistrictsByRegion(nextRegion)
                  : allUgandaDistricts;
                setFilterRegion(nextRegion);
                setDistrictFilter((current) =>
                  options.includes(current) ? current : "",
                );
              }}
            >
              <option value="">All regions</option>
              {ugandaRegions.map((entry) => (
                <option key={entry.region} value={entry.region}>
                  {entry.region}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">District</span>
            <select
              value={districtFilter}
              onChange={(event) => setDistrictFilter(event.target.value)}
            >
              <option value="">All districts</option>
              {filterDistrictOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">School name or ID</span>
            <input
              placeholder="Search by school name or code"
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
                setFilterRegion("");
                setDistrictFilter("");
                setQueryFilter("");
                void fetchSchools("", "");
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {directoryFeedback.message ? (
          <p
            role="status"
            className={`form-message ${
              directoryFeedback.kind === "error" ? "error" : "success"
            }`}
          >
            {directoryFeedback.message}
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
                <th>Boys</th>
                <th>Girls</th>
                <th>Total</th>
                <th>GPS</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={11}>No schools available.</td>
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
                    <td>{Number(school.enrolledBoys ?? 0).toLocaleString()}</td>
                    <td>{Number(school.enrolledGirls ?? 0).toLocaleString()}</td>
                    <td>{Number(school.enrolledLearners ?? 0).toLocaleString()}</td>
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
