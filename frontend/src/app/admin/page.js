"use client";

import { useState, useEffect, useCallback } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import { apiFetch } from "@/lib/api";
import { FREE_DARK_MAP_STYLE } from "@/lib/mapStyle";
import StatCard from "@/components/StatCard";
import SeverityBadge from "@/components/SeverityBadge";
import StatusPill from "@/components/StatusPill";
import AIChip from "@/components/AIChip";
import MapMarker from "@/components/MapMarker";

export default function AdminPage() {
  const [alerts, setAlerts] = useState([]);
  const [responders, setResponders] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [alertsRes, respondersRes] = await Promise.all([
        apiFetch("/api/alerts"),
        apiFetch("/api/responders"),
      ]);
      setAlerts(alertsRes.data?.alerts || []);
      setResponders(respondersRes.data?.responders || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stats
  const totalAlerts = alerts.length;
  const activeAlerts = alerts.filter((a) => a.status === "active" || a.status === "accepted").length;
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved").length;

  // Avg response time (mock based on created_at differences)
  const resolvedWithTime = alerts.filter((a) => a.status === "resolved");
  const avgResponseMins = resolvedWithTime.length > 0
    ? Math.round(resolvedWithTime.reduce((sum, a) => {
        const created = new Date(a.created_at).getTime();
        const now = Date.now();
        return sum + (now - created) / 60000;
      }, 0) / resolvedWithTime.length)
    : 0;

  // Alerts by source
  const sourceCount = {};
  alerts.forEach((a) => {
    const src = (a.type || "unknown").replace(/_/g, " ");
    sourceCount[src] = (sourceCount[src] || 0) + 1;
  });
  const maxSource = Math.max(1, ...Object.values(sourceCount));

  // Recent alerts (last 10)
  const recentAlerts = alerts.slice(0, 10);

  // Active alerts for map
  const activeMapAlerts = alerts.filter((a) => a.status !== "resolved");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats Row */}
      <div className="admin-stats-grid">
        <StatCard number={totalAlerts} label="Total alerts" delta="+12%" deltaType="positive" />
        <StatCard number={activeAlerts} label="Active" delta="+3" deltaType="positive" />
        <StatCard number={resolvedAlerts} label="Resolved" delta="+8" deltaType="positive" />
        <StatCard number={`${avgResponseMins}m`} label="Avg response time" delta="-2m" deltaType="positive" />
      </div>

      {/* Two-column panels */}
      <div className="admin-panels-grid">
        {/* Recent alerts table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", fontSize: 13, fontWeight: 500, color: "var(--text)", borderBottom: "1px solid var(--border)" }}>
            Recent alerts
          </div>
          <div style={{ overflow: "auto", maxHeight: 320 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>AI Type</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.map((a) => {
                  const triage = a.triage_result;
                  const sev = triage?.severity || a.severity || "low";
                  return (
                    <tr key={a.id}>
                      <td style={{ textTransform: "capitalize" }}>{(a.type || "").replace(/_/g, " ")}</td>
                      <td><SeverityBadge severity={sev} /></td>
                      <td><StatusPill status={a.status} /></td>
                      <td>{triage?.response_type ? <AIChip responseType={triage.response_type} /> : "—"}</td>
                    </tr>
                  );
                })}
                {recentAlerts.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--faint)", padding: 20 }}>No alerts</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts by source */}
        <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
            Alerts by source
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(sourceCount).map(([src, count]) => (
              <div key={src}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "capitalize" }}>{src}</span>
                  <span className="tabular-nums" style={{ fontSize: 11, color: "var(--text)", fontWeight: 500 }}>{count}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(count / maxSource) * 100}%` }} />
                </div>
              </div>
            ))}
            {Object.keys(sourceCount).length === 0 && (
              <div style={{ fontSize: 11, color: "var(--faint)", textAlign: "center" }}>No data</div>
            )}
          </div>

          <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>Avg response time</div>
            <div className="tabular-nums" style={{ fontSize: 20, fontWeight: 600, color: "#fff" }}>
              {avgResponseMins}m
            </div>
          </div>
        </div>
      </div>

      {/* Map Overview */}
      <div style={{ borderRadius: 12, overflow: "hidden", height: 260 }}>
        <Map
          initialViewState={{
            latitude: 12.9716,
            longitude: 77.5946,
            zoom: 11,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={FREE_DARK_MAP_STYLE}
          interactive={false}
        >
          {activeMapAlerts.map((a) => (
            <Marker key={a.id} latitude={a.latitude} longitude={a.longitude}>
              <MapMarker severity={a.triage_result?.severity || a.severity} />
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  );
}
