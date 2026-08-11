"use strict";

var ENV_LABEL = {"100": "AT", "111": "SI"};

function esc(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"]/g, function(c) {
    return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c];
  });
}

function slug(s) {
  return "x-" + (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function tagList(s) {
  return (s || "").split(",").map(function(t) { return t.trim(); }).filter(Boolean);
}

function splitItems(cell) {
  if (!cell || !cell.trim()) return [];
  var out = [];
  var lines = cell.split("\n");
  for (var i = 0; i < lines.length; i++) {
    if (/^<[a-zA-Z]/.test(lines[i]) || out.length === 0) out.push(lines[i]);
    else out[out.length - 1] += "\n" + lines[i];
  }
  return out;
}

function folderKey(name) {
  var m = /^\s*(\d+)/.exec(name);
  return m ? [0, parseInt(m[1], 10), name.toLowerCase()] : [1, 0, name.toLowerCase()];
}

function cmpFolder(a, b) {
  var ka = folderKey(a), kb = folderKey(b);
  return ka[0] - kb[0] || ka[1] - kb[1] || (ka[2] < kb[2] ? -1 : ka[2] > kb[2] ? 1 : 0);
}

function parseWorkbook(rows) {
  if (!rows.length) throw new Error("The sheet is empty.");
  var header = rows[0].map(function(h) { return (h == null ? "" : String(h)).trim(); });

  function idx(name) { return header.indexOf(name); }
  function idxAll(name) {
    var result = [];
    for (var i = 0; i < header.length; i++) { if (header[i] === name) result.push(i); }
    return result;
  }

  if (idx("Test") === -1) throw new Error('Missing expected column "Test". Is this a Testmo export?');

  var AI = idx("Assigned to"), TI = idx("Test"), CI = idx("Case ID"), TID = idx("Test ID"),
      FI = idx("Folder"), PRE = idx("Preconditions"), SI = idx("Steps (Step)"),
      EI = idx("Steps (Expected)"), TAG = idx("Tags"), DESCS = idxAll("Description");

  function get(r, i) { return i >= 0 && i < r.length ? String(r[i] == null ? "" : r[i]) : ""; }
  function firstDesc(r) {
    for (var j = 0; j < DESCS.length; j++) { var v = get(r, DESCS[j]); if (v.trim()) return v; }
    return "";
  }

  var tests = [];
  for (var k = 1; k < rows.length; k++) {
    var r = rows[k];
    if (!r || !get(r, TI).trim()) continue;
    var tags = tagList(get(r, TAG));
    var envSet = {};
    for (var ti = 0; ti < tags.length; ti++) {
      if (ENV_LABEL[tags[ti]]) envSet[ENV_LABEL[tags[ti]]] = true;
    }
    var envs = Object.keys(envSet).sort();
    tests.push({
      owner: get(r, AI).trim() || "(unassigned)",
      title: get(r, TI).trim() || "(untitled)",
      caseId: get(r, CI).trim(), testId: get(r, TID).trim(),
      folder: get(r, FI).trim() || "Uncategorised",
      tags: tags, envs: envs, desc: firstDesc(r).trim(),
      pre: tagList(get(r, PRE)),
      steps: splitItems(get(r, SI)), exps: splitItems(get(r, EI))
    });
  }
  if (!tests.length) throw new Error("No test rows found in the file.");
  return tests;
}

function renderTest(t) {
  var tid = "t-" + (t.caseId || t.testId || Math.random().toString(36).slice(2));
  var envAttr = t.envs.length ? t.envs.join(",") : "other";

  var chips = "";
  for (var ci = 0; ci < t.tags.length; ci++) {
    var tag = t.tags[ci];
    if (ENV_LABEL[tag]) {
      chips += '<span class="chip chip-env chip-' + ENV_LABEL[tag].toLowerCase() + '">' +
        ENV_LABEL[tag] + '<span class="chip-sub">' + tag + '</span></span>';
    } else {
      chips += '<span class="chip chip-mvno">MVNO ' + esc(tag) + '</span>';
    }
  }

  var descHtml = t.desc ? '<div class="rte desc">' + t.desc + '</div>' : "";

  var preHtml = "";
  if (t.pre.length) {
    preHtml = '<div class="pre"><span class="pre-label">Preconditions</span>';
    for (var pi = 0; pi < t.pre.length; pi++) {
      preHtml += '<span class="pre-pill">' + esc(t.pre[pi]) + '</span>';
    }
    preHtml += '</div>';
  }

  var stepsHtml;
  if (t.steps.length) {
    var s = t.steps, e = t.exps;
    var pad = e.slice();
    while (pad.length < s.length) pad.push("");
    var body = "";
    for (var i = 0; i < s.length; i++) {
      var exp = pad[i] || "";
      var expCell = (exp && exp.trim())
        ? '<div class="rte exp">' + exp + '</div>'
        : '<div class="exp-empty">&mdash;</div>';
      body += '<div class="step"><div class="step-no">' + (i + 1) +
        '</div><div class="rte act">' + s[i] + '</div>' + expCell + '</div>';
    }
    var note = (s.length !== e.length && e.length)
      ? '<p class="align-note">Expected results were authored as a single block for this case; shown against the first step.</p>'
      : "";
    stepsHtml = '<div class="steps">' +
      '<div class="step step-head"><div class="step-no">#</div><div class="col-h">Action</div><div class="col-h">Expected result</div></div>' +
      body + '</div>' + note;
  } else {
    stepsHtml = '<p class="nosteps">No steps recorded for this case.</p>';
  }

  var idParts = [];
  if (t.caseId) idParts.push("Case " + t.caseId);
  if (t.testId) idParts.push("Test " + t.testId);
  var idline = idParts.join(" · ");

  return { tid: tid, envAttr: envAttr, html:
    '<article class="test" id="' + tid + '" data-env="' + envAttr + '" data-title="' + esc(t.title.toLowerCase()) + '">' +
      '<header class="test-head"><div class="test-heading">' +
        '<span class="test-id">' + esc(idline) + '</span><h3>' + esc(t.title) + '</h3></div>' +
        '<div class="chips">' + chips + '</div></header>' +
      descHtml + preHtml + stepsHtml +
    '</article>'
  };
}
