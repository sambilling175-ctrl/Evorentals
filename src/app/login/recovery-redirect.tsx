"use client";

import { useEffect } from "react";

/**
 * Supabase may fall back to the configured Site URL when an email redirect is
 * unavailable. Recovery credentials are delivered in the URL fragment, which
 * never reaches the server, so forward them to the client callback before the
 * user can accidentally start a normal sign-in flow.
 */
export function RecoveryRedirect() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));

    if (hash.get("type") !== "recovery") return;

    window.location.replace(
      `/auth/callback?next=/update-password${window.location.hash}`,
    );
  }, []);

  return null;
}
