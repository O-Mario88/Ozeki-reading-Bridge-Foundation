"use client";

import { useState } from "react";

export function PortalLogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Server failed to log out. Please check your connection or try again later.");
      }
      window.location.href = "/portal/login";
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not sign out completely.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="button button-ghost" type="button" onClick={logout} disabled={loading}>
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
