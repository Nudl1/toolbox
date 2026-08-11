"use strict";

var ALL = [];
var curEnv = "all";

function showError(msg) {
  var e = document.getElementById("err");
  e.textContent = msg;
  e.style.display = "block";
}

function clearError() {
  document.getElementById("err").style.display = "none";
}

function resetFilters() {
  curEnv = "all";
  document.getElementById("search").value = "";
  var btns = document.querySelectorAll(".filters button");
  for (var i = 0; i < btns.length; i++) {
    btns[i].setAttribute("aria-pressed", btns[i].dataset.env === "all");
  }
}

function applyFilters() {
  var q = document.getElementById("search").value.trim().toLowerCase();
  var tests = document.querySelectorAll("#content .test");
  var shown = 0;
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var okEnv = curEnv === "all" || (t.dataset.env || "").split(",").indexOf(curEnv) !== -1;
    var okQ = !q || t.dataset.title.indexOf(q) !== -1;
    var on = okEnv && okQ;
    t.style.display = on ? "" : "none";
    if (on) shown++;
  }

  var tocItems = document.querySelectorAll("#aside .toc-group li");
  for (var j = 0; j < tocItems.length; j++) {
    var li = tocItems[j];
    var eOk = curEnv === "all" || (li.dataset.env || "").split(",").indexOf(curEnv) !== -1;
    var qOk = !q || (li.dataset.title || "").indexOf(q) !== -1;
    li.style.display = (eOk && qOk) ? "" : "none";
  }

  var folders = document.querySelectorAll("#content .folder");
  for (var k = 0; k < folders.length; k++) {
    var cards = folders[k].querySelectorAll(".test");
    var any = false;
    for (var m = 0; m < cards.length; m++) { if (cards[m].style.display !== "none") { any = true; break; } }
    folders[k].style.display = any ? "" : "none";
  }

  var tocGroups = document.querySelectorAll("#aside .toc-group");
  for (var n = 0; n < tocGroups.length; n++) {
    var items = tocGroups[n].querySelectorAll("li");
    var vis = false;
    for (var p = 0; p < items.length; p++) { if (items[p].style.display !== "none") { vis = true; break; } }
    tocGroups[n].style.display = vis ? "" : "none";
  }

  document.getElementById("empty").style.display = shown ? "none" : "block";
}

function render(owner) {
  var subset = owner === "__all__" ? ALL : ALL.filter(function(t) { return t.owner === owner; });

  var groups = {};
  for (var i = 0; i < subset.length; i++) {
    var f = subset[i].folder;
    if (!groups[f]) groups[f] = [];
    groups[f].push(subset[i]);
  }
  var folders = Object.keys(groups).sort(cmpFolder);

  var tocParts = [], contentParts = [];
  for (var fi = 0; fi < folders.length; fi++) {
    var fname = folders[fi], fid = slug(fname), rows = groups[fname];
    var cards = "", tocItems = "";
    for (var ri = 0; ri < rows.length; ri++) {
      var r = renderTest(rows[ri]);
      cards += r.html;
      tocItems += '<li data-env="' + r.envAttr + '" data-title="' + esc(rows[ri].title.toLowerCase()) + '">' +
        '<a href="#' + r.tid + '">' + esc(rows[ri].title) + '</a></li>';
    }
    tocParts.push('<li class="toc-group"><span class="toc-folder">' +
      '<svg class="toc-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l5 5-5 5"/></svg>' +
      esc(fname) +
      '<span class="toc-count">' + rows.length + '</span></span><ul>' + tocItems + '</ul></li>');
    contentParts.push('<section class="folder" id="' + fid + '"><h2 class="folder-title">' +
      '<span class="folder-count">' + rows.length + '</span>' + esc(fname) + '</h2>' + cards + '</section>');
  }

  document.getElementById("aside").innerHTML =
    '<p class="toc-title">Contents</p><ul>' + tocParts.join("") + '</ul>';
  document.getElementById("content").innerHTML = contentParts.join("");

  var tocFolders = document.querySelectorAll("#aside .toc-folder");
  for (var ci = 0; ci < tocFolders.length; ci++) {
    tocFolders[ci].addEventListener("click", function() {
      this.parentNode.classList.toggle("collapsed");
    });
  }

  var withSteps = 0, nAT = 0, nSI = 0;
  for (var si = 0; si < subset.length; si++) {
    if (subset[si].steps.length) withSteps++;
    for (var ti = 0; ti < subset[si].tags.length; ti++) {
      if (subset[si].tags[ti] === "100") { nAT++; break; }
    }
    for (var ui = 0; ui < subset[si].tags.length; ui++) {
      if (subset[si].tags[ui] === "111") { nSI++; break; }
    }
  }

  var who = owner === "__all__" ? "All assignees" : owner;
  var stats = [
    [subset.length, "Test cases"], [folders.length, "Folders"],
    [withSteps, "With steps"], [nAT, "Tagged AT"], [nSI, "Tagged SI"]
  ];
  var statsHtml = '<div class="lead"><div class="eyebrow">Assigned to</div><div class="who">' + esc(who) + '</div></div>';
  for (var xi = 0; xi < stats.length; xi++) {
    statsHtml += '<div class="stat"><span class="stat-num">' + stats[xi][0] +
      '</span><span class="stat-lbl">' + stats[xi][1] + '</span></div>';
  }
  document.getElementById("statsbar").innerHTML = statsHtml;

  resetFilters();
  applyFilters();
}

function handleFile(file) {
  clearError();
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var wb = XLSX.read(new Uint8Array(ev.target.result), { type: "array" });
      var sheet = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
      ALL = parseWorkbook(rows);

      var owners = [];
      var seen = {};
      for (var i = 0; i < ALL.length; i++) {
        if (!seen[ALL[i].owner]) { owners.push(ALL[i].owner); seen[ALL[i].owner] = true; }
      }
      owners.sort();
      var sel = document.getElementById("owner");
      sel.innerHTML = '<option value="__all__">All assignees (' + ALL.length + ')</option>';
      for (var j = 0; j < owners.length; j++) {
        var count = 0;
        for (var k = 0; k < ALL.length; k++) { if (ALL[k].owner === owners[j]) count++; }
        sel.innerHTML += '<option value="' + esc(owners[j]) + '">' + esc(owners[j]) + ' (' + count + ')</option>';
      }

      document.getElementById("landing").style.display = "none";
      document.getElementById("statsbar").style.display = "flex";
      document.getElementById("wrap").style.display = "grid";
      document.getElementById("ownerWrap").style.display = "flex";
      render("__all__");
    } catch (err) {
      showError("Could not read that file: " + err.message);
    }
  };
  reader.onerror = function() { showError("Could not read that file."); };
  reader.readAsArrayBuffer(file);
}

(function wire() {
  var fileInput = document.getElementById("file");

  document.getElementById("loadBtn").addEventListener("click", function() { fileInput.click(); });
  document.getElementById("dropzone").addEventListener("click", function() { fileInput.click(); });
  document.getElementById("dropzone").addEventListener("keydown", function(e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", function(e) {
    if (e.target.files[0]) handleFile(e.target.files[0]);
    e.target.value = "";
  });

  var dz = document.getElementById("dropzone");
  ["dragenter", "dragover"].forEach(function(ev) {
    dz.addEventListener(ev, function(e) { e.preventDefault(); dz.classList.add("drag"); });
  });
  ["dragleave", "drop"].forEach(function(ev) {
    dz.addEventListener(ev, function(e) { e.preventDefault(); dz.classList.remove("drag"); });
  });
  dz.addEventListener("drop", function(e) {
    var f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  window.addEventListener("dragover", function(e) { e.preventDefault(); });
  window.addEventListener("drop", function(e) { e.preventDefault(); });

  document.getElementById("owner").addEventListener("change", function(e) { render(e.target.value); });
  document.getElementById("search").addEventListener("input", applyFilters);

  var filterBtns = document.querySelectorAll(".filters button");
  for (var i = 0; i < filterBtns.length; i++) {
    (function(btn) {
      btn.addEventListener("click", function() {
        for (var j = 0; j < filterBtns.length; j++) {
          filterBtns[j].setAttribute("aria-pressed", filterBtns[j] === btn);
        }
        curEnv = btn.dataset.env;
        applyFilters();
      });
    })(filterBtns[i]);
  }
})();
