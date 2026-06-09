const API_BASE = "/api/v1";
const PUBLIC_SESSION_KEY = "nourish.publicSession";
const ADMIN_SESSION_KEY = "nourish.adminSession";

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function readSession(storage, key) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function writeSession(storage, key, session) {
  storage.setItem(key, JSON.stringify(session));
  return session;
}

function removeSession(storage, key) {
  storage.removeItem(key);
}

function sessionStore(kind) {
  if (kind === "admin") {
    return {
      storage: window.sessionStorage,
      key: ADMIN_SESSION_KEY
    };
  }

  return {
    storage: window.localStorage,
    key: PUBLIC_SESSION_KEY
  };
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      response.status,
      "invalid_response",
      "The server returned an invalid response"
    );
  }

  const body = await response.json();
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error?.code ?? "request_failed",
      body.error?.message ?? "The request failed",
      body.error?.details
    );
  }
  return body;
}

async function refreshSession(kind) {
  const { storage, key } = sessionStore(kind);
  const current = readSession(storage, key);
  if (!current?.refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken })
    });
    return writeSession(storage, key, await parseResponse(response));
  } catch {
    removeSession(storage, key);
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    auth = null,
    retry = true
  } = options;
  const headers = { Accept: "application/json" };

  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const { storage, key } = sessionStore(auth);
    const session = readSession(storage, key);
    if (!session?.accessToken) {
      throw new ApiError(401, "unauthorized", "Please sign in to continue");
    }
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (response.status === 401 && auth && retry) {
    const refreshed = await refreshSession(auth);
    if (refreshed) {
      return apiRequest(path, { method, body, auth, retry: false });
    }
  }

  return parseResponse(response);
}

export async function ensureAnonymousSession() {
  const { storage, key } = sessionStore("public");
  const existing = readSession(storage, key);
  if (existing?.accessToken) return existing;

  const session = await apiRequest("/auth/anonymous", { method: "POST" });
  return writeSession(storage, key, session);
}

export async function signInAdmin(email, password) {
  const session = await apiRequest("/auth/admin/login", {
    method: "POST",
    body: { email, password }
  });
  return writeSession(window.sessionStorage, ADMIN_SESSION_KEY, session);
}

export function getAdminSession() {
  return readSession(window.sessionStorage, ADMIN_SESSION_KEY);
}

export function clearAdminSession() {
  removeSession(window.sessionStorage, ADMIN_SESSION_KEY);
}

export function getPublicSession() {
  return readSession(window.localStorage, PUBLIC_SESSION_KEY);
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function setStatus(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.dataset.type = type;
  element.hidden = !message;
}

