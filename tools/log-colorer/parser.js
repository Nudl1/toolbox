"use strict";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function parseLogLines(raw) {
  const lines = raw.split("\n");
  const entries = [];
  const raws = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("{")) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.timestamp && obj.request_method && obj.endpoint) {
        entries.push(obj);
        raws.push(trimmed);
      }
    } catch (_) {}
  }
  return { entries, raws };
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
