"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { fetchAuthed } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type Field = {
  name: string;
  label: string;
  type?: "text" | "date" | "number";
};

type CrudPanelProps = {
  title: string;
  endpoint: string;
  fields: Field[];
};

type ApiListResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

export function CrudPanel({ title, endpoint, fields }: CrudPanelProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => getAccessToken(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAuthed<ApiListResponse<Record<string, unknown>>>(endpoint, token);
      setRows(data.results ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      await fetchAuthed<Record<string, unknown>>(endpoint, token, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({});
      setSuccess("Saved successfully.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="card stack">
      <h2 className="section-title">{title}</h2>
      {error ? <div className="alert">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="stack" onSubmit={submit}>
        <div className="form-grid">
          {fields.map((field) => (
            <label key={field.name}>
              <div className="label">{field.label}</div>
              <input
                className="input"
                type={field.type ?? "text"}
                value={form[field.name] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                required
              />
            </label>
          ))}
        </div>
        <div>
          <button className="button" type="submit">
            Save
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              {fields.slice(0, 5).map((field) => (
                <th key={field.name}>{field.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.id ?? "")}</td>
                {fields.slice(0, 5).map((field) => (
                  <td key={field.name}>{String(row[field.name] ?? "")}</td>
                ))}
              </tr>
            ))}
            {!rows.length && !loading ? (
              <tr>
                <td colSpan={6}>No records yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
