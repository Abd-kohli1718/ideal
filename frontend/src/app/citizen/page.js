"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FREE_DARK_MAP_STYLE } from "@/lib/mapStyle";
import SOSButton from "@/components/SOSButton";
import ReportForm from "@/components/ReportForm";
import StatusPill from "@/components/StatusPill";
import MapMarker from "@/components/MapMarker";
import toast from "react-hot-toast";

export default function CitizenPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [myAlerts, setMyAlerts] = useState([]);
  const [userPos, setUserPos] = useState({ latitude: 12.9716, longitude: 77.5946 });
  const [loading, setLoading] = useState(false);
  const posReady = useRef(false);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPos({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          posReady.current = true;
        },
        () => { posReady.current = true; }
      );
    }
  }, []);

  // Load alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/alerts?status=active");
      setAlerts(res.data?.alerts || []);
    } catch {}
  }, []);

  const fetchMyAlerts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/alerts");
      const mine = (res.data?.alerts || []).filter((a) => a.user_id === user?.id);
      setMyAlerts(mine);
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchAlerts();
    fetchMyAlerts();
  }, [fetchAlerts, fetchMyAlerts]);

  // SOS handler
  const handleSOS = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch("/api/alerts", {
        method: "POST",
        body: JSON.stringify({
          type: "sos_button",
          message: "SOS triggered",
          latitude: userPos.latitude,
          longitude: userPos.longitude,
        }),
      });
      toast.success("SOS sent! Help is on the way.");
      fetchAlerts();
      fetchMyAlerts();
    } catch (err) {
      toast.error(err.message || "Failed to send SOS");
    } finally {
      setLoading(false);
    }
  }, [userPos, fetchAlerts, fetchMyAlerts]);

  // Report handler
  const handleReport = useCallback(async ({ message, type }) => {
    setLoading(true);
    try {
      await apiFetch("/api/alerts", {
        method: "POST",
        body: JSON.stringify({
          type,
          message,
          latitude: userPos.latitude,
          longitude: userPos.longitude,
        }),
      });
      toast.success("Report submitted!");
      fetchAlerts();
      fetchMyAlerts();
    } catch (err) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  }, [userPos, fetchAlerts, fetchMyAlerts]);

  // Simulate social post
  const handleSimulate = useCallback(async () => {
    setLoading(true);
    try {
      const json = await apiFetch("/api/simulate/social", { method: "POST" });
      const src = json.data?.simulation_meta?.source;
      if (src === "reddit") {
        toast.success("Simulated from Reddit (public hot posts)");
      } else if (src === "mastodon") {
        toast.success("Simulated from live Mastodon public feed");
      } else {
        toast.success("Social post simulated (demo text)");
      }
      fetchAlerts();
      fetchMyAlerts();
    } catch (err) {
      toast.error(err.message || "Simulation failed");
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts, fetchMyAlerts]);

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="citizen-grid">
      {/* Left Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SOSButton onTrigger={handleSOS} />
        <ReportForm onSubmit={handleReport} onSimulate={handleSimulate} loading={loading} />
      </div>

      {/* Right Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Map */}
        <div style={{ height: 200, borderRadius: 12, overflow: "hidden" }}>
          <Map
            initialViewState={{
              latitude: userPos.latitude,
              longitude: userPos.longitude,
              zoom: 12,
            }}
            style={{ width: "100%", height: "100%" }}
            mapStyle={FREE_DARK_MAP_STYLE}
          >
            {/* User location */}
            <Marker latitude={userPos.latitude} longitude={userPos.longitude}>
              <div className="map-marker-self">
                <div className="map-marker-self-dot" />
              </div>
            </Marker>

            {/* Alert pins */}
            {alerts.map((a) => (
              <Marker key={a.id} latitude={a.latitude} longitude={a.longitude}>
                <MapMarker severity={a.triage_result?.severity || a.severity} />
              </Marker>
            ))}
          </Map>
        </div>

        {/* My Submissions */}
        <div className="card" style={{ padding: 14, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, fontWeight: 500 }}>
            My submissions
          </div>
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {myAlerts.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--faint)", textAlign: "center", padding: 20 }}>
                No submissions yet
              </div>
            )}
            {myAlerts.map((a) => {
              const sev = a.triage_result?.severity || a.severity || "low";
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className={`sev-dot sev-dot-${sev}`} style={{ marginTop: 5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#ccc8e8", lineHeight: 1.4, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.message}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{timeAgo(a.created_at)}</span>
                      <span style={{ fontSize: 10, color: "var(--faint)" }}>·</span>
                      <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "capitalize" }}>{(a.type || "").replace(/_/g, " ")}</span>
                      <StatusPill status={a.status} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
