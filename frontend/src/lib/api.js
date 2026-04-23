const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

let isRefreshing = false;
let refreshQueue = [];

function clearAuth() {
  localStorage.removeItem("resq_token");
  localStorage.removeItem("resq_user");
  localStorage.removeItem("resq_role");
  localStorage.removeItem("resq_refresh_token");
  document.cookie = "resq_role=; path=/; max-age=0";
  document.cookie = "resq_authed=; path=/; max-age=0";
}

async function tryRefreshToken() {
  const refreshToken = localStorage.getItem("resq_refresh_token");
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    // Refresh tokens aren't supported by current backend — return false
    // When backend adds /api/auth/refresh, update this
    return false;
  } catch {
    return false;
  }
}

export async function apiFetch(path, options = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("resq_token") : null;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      // Try token refresh (future-proofed)
      const refreshed = await tryRefreshToken();
      if (!refreshed) {
        clearAuth();
        // Throw instead of hard redirect (C9) — let components handle gracefully
        const err = new Error("Session expired. Please log in again.");
        err.code = "AUTH_EXPIRED";
        throw err;
      }
      // If refreshed, retry the original request
      const newToken = localStorage.getItem("resq_token");
      headers["Authorization"] = `Bearer ${newToken}`;
      const retry = await fetch(`${API_URL}${path}`, { ...options, headers });
      const retryJson = await retry.json();
      if (!retry.ok) throw new Error(retryJson.error || "Request failed");
      return retryJson;
    }
    throw new Error("Unauthorized");
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid response from server");
  }

  if (!res.ok) {
    throw new Error(json.error || "Request failed");
  }
  return json;
}
