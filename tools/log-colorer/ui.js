"use strict";

const LogColorerUI = {
  allLogs: [],
  rawLines: [],
  hideOptions: true,
  activeMethodFilters: new Set(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]),
  filterText: "",

  init() {
    document.getElementById("parseBtn").addEventListener("click", () => this.parse());
    document.getElementById("filterInput").addEventListener("input", (e) => {
      this.filterText = e.target.value;
      this.renderLogs();
    });
    document.getElementById("hideOptionsBtn").addEventListener("click", () => {
      this.hideOptions = !this.hideOptions;
      document.getElementById("hideOptionsBtn").classList.toggle("active", this.hideOptions);
      this.renderLogs();
    });
    document.getElementById("clearBtn").addEventListener("click", () => this.clear());
    document.getElementById("logInput").addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") this.parse();
    });
  },

  parse() {
    const raw = document.getElementById("logInput").value;
    const result = parseLogLines(raw);
    if (result.entries.length === 0) return;

    this.allLogs = result.entries;
    this.rawLines = result.raws;
    document.getElementById("pasteArea").style.display = "none";
    document.getElementById("appHeader").style.display = "flex";
    document.getElementById("logContainer").classList.add("visible");
    this.buildMethodFilters();
    this.renderLogs();
  },

  clear() {
    this.allLogs = [];
    this.rawLines = [];
    document.getElementById("logContainer").classList.remove("visible");
    document.getElementById("appHeader").style.display = "none";
    document.getElementById("pasteArea").style.display = "flex";
    document.getElementById("logInput").value = "";
    document.getElementById("logList").innerHTML = "";
  },

  shouldShow(entry) {
    if (this.hideOptions && entry.request_method === "OPTIONS") return false;
    if (!this.activeMethodFilters.has(entry.request_method)) return false;
    if (this.filterText) {
      const search = this.filterText.toLowerCase();
      const haystack = (
        entry.endpoint + " " +
        (entry.username || "") + " " +
        (entry.ip_address || "") + " " +
        entry.request_method + " " +
        entry.response_status + " " +
        (entry.thread_number || "")
      ).toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  },

  createLogRow(entry, index) {
    const isOptions = entry.request_method === "OPTIONS";
    const rowDiv = document.createElement("div");
    rowDiv.className = "log-row" + (isOptions ? " options-row" : "");

    const statusClass = getStatusClass(entry.response_status);
    const user = entry.username || "";
    const userClass = user ? "" : " empty";
    const methodClass = ["GET","POST","PUT","DELETE","PATCH","OPTIONS"].includes(entry.request_method) ? entry.request_method : "";

    rowDiv.innerHTML =
      '<span class="log-timestamp">' + escapeHtml(entry.timestamp) + "</span>" +
      '<span class="log-method ' + methodClass + '">' + escapeHtml(entry.request_method) + "</span>" +
      '<span class="log-status ' + statusClass + '">' + escapeHtml(entry.response_status) + "</span>" +
      '<span class="log-endpoint">' + formatEndpoint(entry.endpoint) + "</span>" +
      (entry.thread_number ? '<span class="thread-badge" title="Thread: ' + escapeHtml(entry.thread_number) + '">' + escapeHtml(entry.thread_number.substring(0, 8)) + "</span>" : "") +
      '<span class="log-user' + userClass + '">' + (user ? escapeHtml(user) : "—") + "</span>" +
      '<span class="log-ip">' + escapeHtml(entry.ip_address || "") + "</span>" +
      '<button class="copy-raw-btn">Copy</button>';

    const copyBtn = rowDiv.querySelector(".copy-raw-btn");
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(this.rawLines[index]).then(() => {
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("copied");
        setTimeout(() => { copyBtn.textContent = "Copy"; copyBtn.classList.remove("copied"); }, 1500);
      });
    });

    const detailsDiv = document.createElement("div");
    detailsDiv.className = "log-details";
    detailsDiv.innerHTML =
      '<div class="details-grid">' +
      '<div class="details-section"><h4>Request Headers</h4>' + renderHeaders(entry.request_headers) + "</div>" +
      '<div class="details-section"><h4>Response Headers</h4>' + renderHeaders(entry.response_headers) + "</div>" +
      (entry.request_payload !== undefined ? '<div class="details-section"><h4>Request Payload</h4>' + renderPayload(entry.request_payload) + "</div>" : "") +
      (entry.response_payload !== undefined ? '<div class="details-section"><h4>Response Payload</h4>' + renderPayload(entry.response_payload) + "</div>" : "") +
      "</div>";

    rowDiv.addEventListener("click", () => {
      detailsDiv.classList.toggle("visible");
      rowDiv.classList.toggle("expanded");
    });

    return { row: rowDiv, details: detailsDiv };
  },

  renderLogs() {
    const list = document.getElementById("logList");
    list.innerHTML = "";
    let shown = 0;

    for (let i = 0; i < this.allLogs.length; i++) {
      if (!this.shouldShow(this.allLogs[i])) continue;
      const { row, details } = this.createLogRow(this.allLogs[i], i);
      list.appendChild(row);
      list.appendChild(details);
      shown++;
    }

    document.getElementById("stats").textContent = shown + " / " + this.allLogs.length + " entries";
  },

  buildMethodFilters() {
    const container = document.getElementById("methodFilters");
    container.innerHTML = "";

    for (const m of ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]) {
      const btn = document.createElement("button");
      btn.className = "method-filter" + (this.activeMethodFilters.has(m) ? " active" : "");
      btn.dataset.method = m;
      btn.textContent = m;
      btn.addEventListener("click", () => {
        if (this.activeMethodFilters.has(m)) {
          this.activeMethodFilters.delete(m);
          btn.classList.remove("active");
        } else {
          this.activeMethodFilters.add(m);
          btn.classList.add("active");
        }
        this.renderLogs();
      });
      container.appendChild(btn);
    }
  }
};
