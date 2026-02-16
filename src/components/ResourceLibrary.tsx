"use client";

import { FormEvent, useMemo, useState } from "react";
import { ResourceItem } from "@/lib/types";

interface Lead {
  name: string;
  email: string;
  organization: string;
}

const emptyLead: Lead = { name: "", email: "", organization: "" };

export function ResourceLibrary({ resources }: { resources: ResourceItem[] }) {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("all");
  const [skill, setSkill] = useState("all");
  const [type, setType] = useState("all");
  const [lead, setLead] = useState<Lead>(emptyLead);
  const [leadReady, setLeadReady] = useState(false);
  const [status, setStatus] = useState("");

  const grades = Array.from(new Set(resources.map((resource) => resource.grade)));
  const skills = Array.from(new Set(resources.map((resource) => resource.skill)));
  const types = Array.from(new Set(resources.map((resource) => resource.type)));

  const filtered = useMemo(() => {
    return resources.filter((resource) => {
      const matchesQuery =
        resource.title.toLowerCase().includes(query.toLowerCase()) ||
        resource.description.toLowerCase().includes(query.toLowerCase());
      const matchesGrade = grade === "all" || resource.grade === grade;
      const matchesSkill = skill === "all" || resource.skill === skill;
      const matchesType = type === "all" || resource.type === type;

      return matchesQuery && matchesGrade && matchesSkill && matchesType;
    });
  }, [grade, query, resources, skill, type]);

  async function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead.email || !lead.name) {
      setStatus("Please enter your name and email to access downloads.");
      return;
    }

    try {
      const response = await fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lead,
          resourceSlug: "library-access",
        }),
      });

      if (!response.ok) {
        throw new Error("Could not unlock downloads.");
      }

      setLeadReady(true);
      setStatus("Downloads unlocked. Select any toolkit below.");
    } catch {
      setStatus("Unable to unlock downloads right now. Please retry.");
    }
  }

  async function handleDownload(resource: ResourceItem) {
    if (!leadReady) {
      setStatus("Please complete the download form first.");
      return;
    }

    await fetch("/api/downloads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...lead,
        resourceSlug: resource.slug,
      }),
    });

    window.location.href = resource.filePath;
  }

  return (
    <div className="library-layout">
      <section className="card lead-capture">
        <h2>Download Access</h2>
        <p>Enter your details once to access all resources and bundles.</p>
        <form onSubmit={saveLead} className="lead-form">
          <input
            placeholder="Full name"
            value={lead.name}
            onChange={(event) =>
              setLead((prev) => ({ ...prev, name: event.target.value }))
            }
            required
          />
          <input
            type="email"
            placeholder="Email address"
            value={lead.email}
            onChange={(event) =>
              setLead((prev) => ({ ...prev, email: event.target.value }))
            }
            required
          />
          <input
            placeholder="School / Organization"
            value={lead.organization}
            onChange={(event) =>
              setLead((prev) => ({ ...prev, organization: event.target.value }))
            }
          />
          <button className="button" type="submit">
            {leadReady ? "Access active" : "Unlock downloads"}
          </button>
        </form>
        {status ? <p className="form-message success">{status}</p> : null}
      </section>

      <section>
        <div className="filters">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search resources"
            aria-label="Search resources"
          />
          <select value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="all">All grades</option>
            {grades.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={skill} onChange={(event) => setSkill(event.target.value)}>
            <option value="all">All skills</option>
            {skills.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All resource types</option>
            {types.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="cards-grid">
          {filtered.map((resource) => (
            <article key={resource.slug} className="card">
              <p className="meta-pill">{resource.type}</p>
              <h3>{resource.title}</h3>
              <p>{resource.description}</p>
              <p className="meta-line">
                {resource.grade} · {resource.skill}
              </p>
              <button className="button" onClick={() => handleDownload(resource)}>
                {resource.downloadLabel || "Preview + Download"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
