"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { API_BASE_URL } from "@/lib/config";
import { saveTokens } from "@/lib/auth";

type TokenResponse = {
  access: string;
  refresh: string;
};

export default function PortalLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        throw new Error("Invalid credentials.");
      }
      const data = (await response.json()) as TokenResponse;
      saveTokens(data.access, data.refresh);
      router.replace("/portal");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Portal Login</h1>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>
          Sign in with your Django staff account.
        </p>
        {error ? <div className="alert">{error}</div> : null}
        <form className="stack" onSubmit={submit}>
          <label>
            <div className="label">Username</div>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>
            <div className="label">Password</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </div>
  );
}
