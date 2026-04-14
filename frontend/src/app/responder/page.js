"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Map, { Marker, Popup } from "react-map-gl/maplibre";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getSupabaseBrowser } from "@/lib/supabase";
import { FREE_DARK_MAP_STYLE } from "@/lib/mapStyle";
import AlertCard from "@/components/AlertCard";
import MapMarker from "@/components/MapMarker";
import MapPopup from "@/components/MapPopup";
import FilterPills from "@/components/FilterPills";
import toast from "react-hot-toast";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
];

export default function ResponderPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [userPos, setUserPos] = useState({ latitude: 12.9716, longitude: 77.5946 });
  const [showSidebar, setShowSidebar] = useState(false);
  const locationInterval = useRef(null);

  // Get location + update every 10s
  useEffect(() => {
    function updatePos() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            setUserPos(coords);
            try {
              await apiFetch("/api/responder/location", {
                method: "PATCH",
                body: JSON.stringify(coords),
              });
            } catch {}
          },
          () => {}
        );
      }
    }
    updatePos();
    locationInterval.current = setInterval(updatePos, 10000);
    return () => clearInterval(locationInterval.current);
  }, []);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/alerts");
      setAlerts(res.data?.alerts || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Supabase Realtime
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("alerts")
      .on("broadcast", { event: "new_alert" }, (payload) => {
        const newAlert = payload.payload?.alert;
        if (newAlert) {
          setAlerts((prev) => {
            if (prev.find((a) => a.id === newAlert.id)) return prev;
            return [newAlert, ...prev];
          });
          toast("New alert received!", {
            icon: "🚨",
            style: {
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            },
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Actions
  const handleAccept = useCallback(async (id) => {
    try {
      await apiFetch(`/api/alerts/${id}/accept`, { method: "PATCH" });
      toast.success("Alert accepted");
      fetchAlerts();
      setSelectedId(null);
    } catch (err) {
      toast.error(err.message || "Failed to accept");
    }
  }, [fetchAlerts]);

  const handleResolve = useCallback(async (id) => {
    try {
      await apiFetch(`/api/alerts/${id}/resolve`, { method: "PATCH" });
      toast.success("Alert resolved");
      fetchAlerts();
      setSelectedId(null);
    } catch (err) {
      toast.error(err.message || "Failed to resolve");
    }
  }, [fetchAlerts]);

  // Filtering
  const filteredAlerts = alerts.filter((a) => {
    if (a.status === "resolved") return false;
    if (filter === "all") return true;
    const sev = a.triage_result?.severity || a.severity;
    return sev === filter;
  });

  // Stats
  const activeCount = alerts.filter((a) => a.status === "active" || a.status === "accepted").length;
  const criticalCount = alerts.filter((a) => (a.triage_result?.severity || a.severity) === "high" && a.status !== "resolved").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;

  const selectedAlert = selectedId ? alerts.find((a) => a.id === selectedId) : null;

  return (
    <div className="responder-grid">
      {/* Map Area */}
      <div style={{ position: "relative", height: "100%" }}>
        <Map
          initialViewState={{
            latitude: userPos.latitude,
            longitude: userPos.longitude,
            zoom: 12,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={FREE_DARK_MAP_STYLE}
        >
          {/* Responder's location */}
          <Marker latitude={userPos.latitude} longitude={userPos.longitude}>
            <div className="map-marker-self">
              <div className="map-marker-self-dot" />
            </div>
          </Marker>

          {/* Alert markers */}
          {alerts
            .filter((a) => a.status !== "resolved")
            .map((a) => {
              const sev = a.triage_result?.severity || a.severity || "low";
              return (
                <Marker
                  key={a.id}
                  latitude={a.latitude}
                  longitude={a.longitude}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedId(a.id);
                  }}
                >
                  <MapMarker severity={sev} />
                </Marker>
              );
            })}

          {/* Popup */}
          {selectedAlert && (
            <Popup
              latitude={selectedAlert.latitude}
              longitude={selectedAlert.longitude}
              closeOnClick={false}
              onClose={() => setSelectedId(null)}
              anchor="bottom"
              offset={15}
            >
              <MapPopup
                alert={selectedAlert}
                onAccept={handleAccept}
                onResolve={handleResolve}
              />
            </Popup>
          )}
        </Map>

        {/* Floating stat chips */}
        <div className="responder-stats-float">
          <div className="glass-chip">
            <div style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>{activeCount}</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>Total active</div>
          </div>
          <div className="glass-chip">
            <div style={{ fontSize: 17, fontWeight: 600, color: "#fca5a5" }}>{criticalCount}</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>Critical</div>
          </div>
          <div className="glass-chip">
            <div style={{ fontSize: 17, fontWeight: 600, color: "#86efac" }}>{resolvedCount}</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>Resolved</div>
          </div>
        </div>

        {/* Mobile toggle button for sidebar */}
        <button
          className="responder-sidebar-toggle"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          {showSidebar ? "✕ Close" : `🚨 Alerts (${filteredAlerts.length})`}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`responder-sidebar ${showSidebar ? "open" : ""}`}>
        {/* Sidebar header */}
        <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Alert feed</span>
          <FilterPills options={FILTER_OPTIONS} active={filter} onChange={setFilter} />
        </div>

        {/* Alert list */}
        <div style={{ flex: 1, overflow: "auto", padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredAlerts.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--faint)", textAlign: "center", padding: 30 }}>
              No alerts match filter
            </div>
          )}
          {filteredAlerts.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              onAccept={handleAccept}
              onResolve={handleResolve}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
