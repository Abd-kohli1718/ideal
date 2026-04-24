"use client";

import { AuthProvider } from "@/lib/auth";
import { Toaster } from "react-hot-toast";
import RouteGuard from "@/components/RouteGuard";
import BottomNav from "@/components/BottomNav";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function CitizenGroupLayout({ children }) {
  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            borderRadius: 14,
          },
        }}
      />
      <RouteGuard requiredRole="citizen">
        <AnimatedBackground />
        <div className="citizen-page" style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
        <BottomNav />
      </RouteGuard>
    </AuthProvider>
  );
}
