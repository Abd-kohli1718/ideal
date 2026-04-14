"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    async function handleCallback() {
      try {
        const supabase = getSupabaseBrowser();

        // Supabase automatically exchanges the code/hash for a session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!session) {
          // Wait a moment and retry — sometimes the hash exchange is async
          await new Promise((r) => setTimeout(r, 1500));
          const retry = await supabase.auth.getSession();
          if (retry.error) throw retry.error;
          if (!retry.data.session) {
            setStatus("No session found. Redirecting to login…");
            setTimeout(() => router.replace("/login"), 2000);
            return;
          }
          completeLogin(retry.data.session);
          return;
        }

        completeLogin(session);
      } catch (err) {
        console.error("OAuth callback error:", err);
        setStatus("Authentication failed. Redirecting…");
        setTimeout(() => router.replace("/login"), 2000);
      }
    }

    async function completeLogin(session) {
      const user = session.user;
      const savedRole = localStorage.getItem("resq_oauth_role") || "citizen";
      const role = user?.user_metadata?.role || savedRole;

      // Sync user profile to backend database
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ role })
        });
      } catch (err) {
        console.error("Failed to sync profile during OAuth callback:", err);
      }

      // Persist session just like email/password login does
      localStorage.setItem("resq_token", session.access_token);
      localStorage.setItem("resq_user", JSON.stringify(user));
      localStorage.setItem("resq_role", role);
      document.cookie = `resq_role=${role}; path=/; max-age=${60 * 60 * 24 * 7}`;
      document.cookie = `resq_authed=1; path=/; max-age=${60 * 60 * 24 * 7}`;

      // Clean up
      localStorage.removeItem("resq_oauth_role");

      setStatus("Success! Redirecting…");
      router.replace(`/${role}`);
    }

    handleCallback();
  }, [router]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 32,
          height: 32,
          border: "3px solid var(--purple)",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 16px",
        }} />
        <div style={{ fontSize: 14, color: "var(--muted)" }}>{status}</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
