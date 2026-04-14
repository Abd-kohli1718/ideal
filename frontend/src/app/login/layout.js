"use client";

import { AuthProvider } from "@/lib/auth";
import { Toaster } from "react-hot-toast";

export default function LoginLayout({ children }) {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
          },
        }}
      />
      {children}
    </AuthProvider>
  );
}
