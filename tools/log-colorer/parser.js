"use strict";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const VALID_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]);

function parseLogLines(raw) {
  if (!raw || !raw.trim()) {
    return { entries: [], raws: [], errors: [{ line: 0, text: "", error: "Input is empty" }] };
  }

  const lines = raw.split("\n");
  const entries = [];
  const raws = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (!trimmed.startsWith("{")) {
      errors.push({ line: i + 1, text: trimmed, error: "Not a JSON object (must start with \"{\")" });
      continue;
    }

    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch (e) {
      errors.push({ line: i + 1, text: trimmed, error: "Invalid JSON: " + e.message });
      continue;
    }

    if (typeof obj !== "object" || Array.isArray(obj)) {
      errors.push({ line: i + 1, text: trimmed, error: "Expected a JSON object, got " + (Array.isArray(obj) ? "array" : typeof obj) });
      continue;
    }

    const missing = [];
    if (!obj.timestamp) missing.push("timestamp");
    if (!obj.request_method) missing.push("request_method");
    if (!obj.endpoint) missing.push("endpoint");
    if (missing.length > 0) {
      errors.push({ line: i + 1, text: trimmed, error: "Missing required field" + (missing.length > 1 ? "s" : "") + ": " + missing.join(", ") });
      continue;
    }

    if (!VALID_METHODS.has(obj.request_method.toUpperCase())) {
      errors.push({ line: i + 1, text: trimmed, error: "Unknown HTTP method: \"" + obj.request_method + "\"" });
      continue;
    }

    if (obj.response_status !== undefined) {
      const code = parseInt(obj.response_status, 10);
      if (isNaN(code) || code < 100 || code > 599) {
        errors.push({ line: i + 1, text: trimmed, error: "Invalid status code: \"" + obj.response_status + "\" (expected 100–599)" });
        continue;
      }
    }

    entries.push(obj);
    raws.push(trimmed);
  }

  return { entries, raws, errors };
}

function getStatusClass(status) {
  const code = parseInt(status, 10);
  if (code >= 200 && code < 300) return "s2xx";
  if (code >= 300 && code < 400) return "s3xx";
  if (code >= 400 && code < 500) return "s4xx";
  if (code >= 500) return "s5xx";
  return "";
}

function formatEndpoint(endpoint) {
  const qIdx = endpoint.indexOf("?");
  let path = qIdx >= 0 ? endpoint.substring(0, qIdx) : endpoint;
  const query = qIdx >= 0 ? endpoint.substring(qIdx) : "";

  const formatted = path.split("/").map((seg) => {
    if (/^\d+$/.test(seg)) {
      return '<span class="path-param">' + escapeHtml(seg) + "</span>";
    }
    return escapeHtml(seg);
  }).join("/");

  if (query) {
    return formatted + '<span class="query-string">' + escapeHtml(query) + "</span>";
  }
  return formatted;
}

function renderHeaders(headers) {
  if (!headers || typeof headers !== "object") return '<span class="payload-null">none</span>';
  const keys = Object.keys(headers);
  if (keys.length === 0) return '<span class="payload-null">empty</span>';

  return keys.map((key) => {
    const val = headers[key];
    const isSensitive = key.toLowerCase() === "authorization";
    const valClass = isSensitive ? "header-val auth-token" : "header-val";
    return '<div class="header-line"><span class="header-key">' +
      escapeHtml(key) + '</span><span class="' + valClass + '" title="' +
      escapeHtml(String(val)) + '">' + escapeHtml(String(val)) + "</span></div>";
  }).join("");
}

function renderPayload(payload) {
  if (payload === null || payload === undefined) {
    return '<span class="payload-null">null</span>';
  }
  if (typeof payload === "object") {
    return '<pre class="payload-content">' + escapeHtml(JSON.stringify(payload, null, 2)) + "</pre>";
  }
  return '<pre class="payload-content">' + escapeHtml(String(payload)) + "</pre>";
}
