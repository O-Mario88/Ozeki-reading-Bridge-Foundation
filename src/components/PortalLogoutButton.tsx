"use client";

import { useState } from "react";

export function PortalLogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/portal/login";
    }
  }

  return (
    <button className="button button-ghost" type="button" onClick={logout} disabled={loading}>
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
