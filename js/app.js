/*
 * FixFirst · app.js
 * Interface logic: the report form with its live work order, the priority board,
 * problem map, community pulse and the "how the AI works" page.
 * Everything is saved in this browser with localStorage.
 */
(function () {
  "use strict";

  const D = window.FixFirstData;
  const AI = window.FixFirstAI;
  const DAY = 86400000;
  const TABS = ["report", "board", "map", "insights", "ai"];
  const STATUS = { open: "Open", in_progress: "In progress", resolved: "Resolved" };
  const CAT = {};
  D.CATEGORIES.forEach(function (c) { CAT[c.id] = c; });
  const DEFAULT_SETTINGS = { community: null, center: null, role: "resident", theme: "system", confirmed: [] };

  /* ---------------- small helpers ---------------- */
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (x) => Math.round(x * 100) + "%";
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  const refOf = (id) => "FF-" + String(id).padStart(4, "0");
  const daysSince = (iso) => Math.max(0, (Date.now() - Date.parse(iso)) / DAY);
  const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmtDistance = (m) => (m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(1) + " km");

  function ago(iso) {
    const d = Math.floor(daysSince(iso));
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : d + " days ago";
  }
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return String(iso).slice(0, 10); }
  }
  function titleOf(text) {
    const m = String(text).match(/^[^.!?]*[.!?]?/);
    let t = (m && m[0] ? m[0] : String(text)).trim();
    if (t.length > 96) t = t.slice(0, 93).trimEnd() + "…";
    return t;
  }

  /* ---------------- icons (road-sign style pictograms) ---------------- */
  const ICONS = {
    roads: '<path d="M9 3 5 21M15 3l4 18M12 5v2.5M12 10.5V13M12 16v3"/>',
    water: '<path d="M12 3.5s-6 6.9-6 11a6 6 0 0 0 12 0c0-4.1-6-11-6-11Z"/>',
    waste: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
    power: '<path d="M13.5 2.5 5.5 13.5h6l-1.5 8 8-11h-6l1.5-8Z"/>',
    drainage: '<path d="M3 8.5c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 3.3-1.5 5 0M3 14.5c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 3.3-1.5 5 0M3 20c2.2-1.6 4.3-1.6 6.5 0s4.3 1.6 6.5 0"/>',
    safety: '<path d="M12 3.5 21.5 20h-19L12 3.5ZM12 10v4.5M12 17.2v.3"/>',
    parks: '<path d="M12 3 6 11.5h3.5L5.5 17h13l-4-5.5H18L12 3ZM12 17v4"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8M15.5 6a3 3 0 0 1 0 5.6M17.5 14.6c1.6.6 2.7 2.1 3 4.4"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
    building: '<path d="M3.5 20h17M5.5 20v-9.5M18.5 20v-9.5M9.5 20v-5.5h5V20M3 10.5 12 4l9 6.5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>'
  };
  function icon(name, label) {
    const a11y = label ? 'role="img" aria-label="' + esc(label) + '"' : 'aria-hidden="true"';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' + a11y + ">" + (ICONS[name] || "") + "</svg>";
  }

  /* ---------------- storage ---------------- */
  const NS = "fixfirst:v1:";
  let storageWarned = false;
  const store = {
    get(key, fallback) {
      try { const raw = localStorage.getItem(NS + key); return raw ? JSON.parse(raw) : fallback; }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    }
  };

  /* ---------------- state ---------------- */
  const state = {
    reports: store.get("reports", null),
    corrections: store.get("corrections", []),
    settings: Object.assign({}, DEFAULT_SETTINGS, store.get("settings", {})),
    tab: "report",
    filter: { status: "active", category: "all", q: "" },
    expanded: null,
    flash: null,
    photo: null,
    pin: null,
    mapFilter: { status: "active", category: "all" }
  };
  if (!Array.isArray(state.settings.confirmed)) state.settings.confirmed = [];
  if (!Array.isArray(state.corrections)) state.corrections = [];
  // Older versions saved the default name with the settings; now js/data.js decides it.
  if (state.settings.community === "Riverside") state.settings.community = null;

  const communityName = () => state.settings.community || D.COMMUNITY.name;
  const mapCenter = () => (Array.isArray(state.settings.center) ? state.settings.center : D.COMMUNITY.center);
  // Where a report sits on the map: its own pin, or (demo reports) an offset from the community centre.
  function posOf(r) {
    if (typeof r.lat === "number" && typeof r.lng === "number") return [r.lat, r.lng];
    if (Array.isArray(r.at)) return AI.offsetPoint(mapCenter(), r.at);
    return null;
  }

  let model = null;
  let evalResult = null;

  function trainModel() {
    const examples = D.TRAINING.concat(state.corrections);
    model = new AI.NaiveBayes(1).train(examples);
    evalResult = AI.evaluate(examples);
  }
  function classify(text, location) {
    return model.predict(text, AI.placeWords(location));
  }

  function saveReports() {
    if (store.set("reports", state.reports)) return true;
    // Most likely out of space because of photos: drop the oldest photos and retry.
    const withPhotos = state.reports.filter((r) => r.photo).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    while (withPhotos.length) {
      withPhotos.shift().photo = null;
      if (store.set("reports", state.reports)) { toast("Storage was full, so the oldest photos were removed."); return true; }
    }
    if (!storageWarned) {
      storageWarned = true;
      toast("This browser is blocking storage, so changes will be lost when you close the page.");
    }
    return false;
  }
  const saveSettings = () => store.set("settings", state.settings);
  const saveCorrections = () => store.set("corrections", state.corrections);
  const byId = (id) => state.reports.find((r) => r.id === id);
  const nextId = () => state.reports.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  const lastChange = (r) => r.history[r.history.length - 1].at;

  function buildReport(o) {
    const pred = classify(o.text, o.location);
    const category = o.category || pred.top.label;
    const createdAt = o.createdAt || new Date().toISOString();
    return {
      id: o.id,
      ref: refOf(o.id),
      text: o.text.trim(),
      location: (o.location || "").trim(),
      category: category,
      categorySource: o.category ? "resident" : "ai",
      aiCategory: pred.top.label,
      aiConfidence: pred.top.prob,
      urgency: AI.scoreUrgency(o.text, category, D),
      confirmations: o.confirmations || 1,
      createdAt: createdAt,
      status: "open",
      photo: o.photo || null,
      lat: o.pin ? o.pin[0] : null,
      lng: o.pin ? o.pin[1] : null,
      at: Array.isArray(o.at) ? o.at : null,
      history: [{ status: "open", at: createdAt }]
    };
  }

  function seedDemo() {
    const now = Date.now();
    state.reports = D.DEMO_REPORTS.map(function (d, i) {
      const created = new Date(now - d.daysAgo * DAY - (i + 1) * 37 * 60000).toISOString();
      const r = buildReport({ id: i + 1, text: d.text, location: d.location, category: d.category, confirmations: d.confirmations, createdAt: created, at: d.at });
      r.categorySource = r.aiCategory === d.category ? "ai" : "official";
      if (d.status && d.status !== "open") {
        const at = new Date(Math.min(now - 3600000, Date.parse(created) + Math.max(0.5, d.daysAgo / 3) * DAY)).toISOString();
        r.status = d.status;
        r.history.push({ status: d.status, at: at });
      }
      return r;
    });
    state.settings.confirmed = [];
    saveReports();
    saveSettings();
  }

  function ranked() {
    const now = Date.now();
    const list = state.reports
      .filter((r) => r.status !== "resolved")
      .map((r) => ({ r: r, p: AI.priority(r, now) }));
    list.sort((a, b) => (b.p.critical - a.p.critical) || (b.p.total - a.p.total) || (Date.parse(a.r.createdAt) - Date.parse(b.r.createdAt)));
    list.forEach((x, i) => { x.rank = i + 1; });
    return list;
  }

  /* ---------------- toast, announcements, theme ---------------- */
  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 4200);
  }
  let announceTimer = null;
  function announce(msg) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { $("#sr-status").textContent = msg; }, 900);
  }
  function applyTheme() {
    const t = state.settings.theme;
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }

  /* ---------------- tabs ---------------- */
  function tabFromHash() {
    const h = (location.hash || "").replace("#", "");
    return TABS.indexOf(h) >= 0 ? h : "report";
  }
  function go(tab) {
    if (tabFromHash() === tab && location.hash) showTab(tab);
    else location.hash = tab;
  }
  function showTab(tab, keepScroll) {
    state.tab = tab;
    $$(".tab").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    $$(".panel").forEach((p) => { p.hidden = p.id !== "panel-" + tab; });
    if (!keepScroll) window.scrollTo(0, 0);
    render();
  }

  /* ---------------- render ---------------- */
  function render() {
    const focus = captureFocus();
    renderChrome();
    if (state.tab === "report") { renderTicket(); ensurePicker(); }
    else if (state.tab === "board") renderBoard();
    else if (state.tab === "map") renderMap();
    else if (state.tab === "insights") renderInsights();
    else renderAI();
    paintBars();
    restoreFocus(focus);
  }
  function captureFocus() {
    const a = document.activeElement;
    if (!a || !a.dataset || !a.dataset.action) return null;
    return { action: a.dataset.action, id: a.dataset.id, value: a.dataset.value };
  }
  function restoreFocus(f) {
    if (!f) return;
    const cur = document.activeElement;
    if (cur && cur !== document.body && document.contains(cur)) return;
    let sel = '[data-action="' + f.action + '"]';
    if (f.id) sel += '[data-id="' + f.id + '"]';
    if (f.value) sel += '[data-value="' + f.value + '"]';
    const el = $(sel);
    if (el) el.focus({ preventScroll: true });
  }
  // Bar widths are set from JS (not inline style attributes) so the page also works under strict CSP.
  function paintBars() {
    $$("[data-w]").forEach((el) => { el.style.width = Math.max(0, Math.min(100, Number(el.dataset.w))) + "%"; });
  }
  function renderChrome() {
    $("#community-name").textContent = communityName();
    $$("[data-community]").forEach((el) => { el.textContent = communityName(); });
    $$(".role-btn").forEach((b) => b.setAttribute("aria-pressed", b.dataset.value === state.settings.role ? "true" : "false"));
    $("#board-count").textContent = state.reports.filter((r) => r.status !== "resolved").length;
  }

  /* ---------------- 1. report + live work order ---------------- */
  let ticketTimer = null;
  function scheduleTicket() {
    clearTimeout(ticketTimer);
    ticketTimer = setTimeout(() => { renderTicket(); paintBars(); }, 120);
  }

  function renderTicket() {
    const text = $("#f-text").value;
    const location = $("#f-location").value;
    const chosen = $("#f-category").value;
    const ready = text.trim().length >= 12;
    $("#f-send").disabled = !ready;
    $("#ticket-ref").textContent = "Draft " + refOf(nextId());
    const box = $("#ticket-body");
    if (!ready) {
      box.innerHTML =
        '<div class="t-empty"><p>Start describing the problem and this work order fills itself in: the problem type, how urgent it is, the office that should fix it, and whether a neighbor already reported it.</p>' +
        '<div class="ghost" aria-hidden="true"><span></span><span></span><span></span><span></span></div></div>';
      return;
    }

    const pred = classify(text, location);
    const auto = chosen === "auto";
    const catId = auto ? pred.top.label : chosen;
    const c = CAT[catId];
    const u = AI.scoreUrgency(text, catId, D);
    const dupes = AI.findSimilar(text, location, state.reports, { category: catId, point: state.pin, pointOf: posOf });

    let note = "";
    if (auto && pred.known === 0) note = '<p class="t-note">These words are new to the model. Add what the problem is and how bad it is.</p>';
    else if (auto && pred.top.prob < 0.45) note = '<p class="t-note">Not sure about this one. If it looks wrong, pick the problem type yourself.</p>';

    const catSec =
      '<section class="t-sec">' +
        '<h3 class="t-label">Problem type <span class="how">' + (auto ? "Naive Bayes classifier" : "chosen by you") + "</span></h3>" +
        '<p class="t-value">' + icon(catId) + "<span>" + esc(c.name) + "</span>" + (auto ? '<span class="conf">' + pct(pred.top.prob) + "</span>" : "") + "</p>" +
        (auto
          ? '<ul class="alts" aria-label="Most likely problem types">' + pred.ranked.slice(0, 3).map((x) =>
              "<li><span>" + esc(CAT[x.label].name) + '</span><span class="bar"><span data-w="' + Math.round(x.prob * 100) + '"></span></span><span class="alt-p">' + pct(x.prob) + "</span></li>").join("") + "</ul>"
          : "") +
        note +
      "</section>";

    const filled = Math.round(u.score);
    const urgSec =
      '<section class="t-sec lvl-' + u.level + '">' +
        '<h3 class="t-label">Urgency <span class="how">risk signals</span></h3>' +
        '<p class="t-value"><span class="badge badge-lg">' + esc(u.label) + '</span><span class="conf">' + u.score + " / 10</span></p>" +
        '<div class="gauge" aria-hidden="true">' + Array.from({ length: 10 }, (_, i) => '<i class="' + (i < filled ? "on" : "") + '"></i>').join("") + "</div>" +
        (u.reasons.length
          ? '<div class="chips">' + u.reasons.map((r) => '<span class="chip">' + esc(r) + "</span>").join("") + "</div>"
          : '<p class="t-note">No risk signals yet. Mention anything dangerous, such as exposed wires, injuries or children nearby.</p>') +
      "</section>";

    const routeSec =
      '<section class="t-sec"><h3 class="t-label">Send to</h3>' +
      '<p class="t-value t-dept">' + icon("building") + "<span>" + esc(c.dept) + "</span></p>" +
      '<p class="t-note">' + (state.pin ? "Crews will get the exact map pin." : "Add a map pin so crews can find the spot.") + "</p></section>";

    const dupSec =
      '<section class="t-sec"><h3 class="t-label">Already reported? <span class="how">TF-IDF similarity</span></h3>' +
      (dupes.length
        ? '<ul class="dupes">' + dupes.map(dupeItem).join("") + "</ul>"
        : '<p class="t-ok">' + icon("check") + "No similar open reports. This looks new.</p>") +
      "</section>";

    box.innerHTML = catSec + urgSec + routeSec + dupSec;
    announce(c.name + ". Urgency " + u.label + "." + (dupes.length ? " A similar report already exists." : ""));
  }

  function dupeItem(d) {
    const r = d.report;
    return '<li class="dupe">' +
      '<div class="dupe-top"><span>' + (d.similarity >= 0.5 ? "Very likely the same problem" : "Possibly the same problem") + "</span><span>" + pct(d.similarity) + " match</span></div>" +
      '<p class="dupe-text">' + esc(titleOf(r.text)) + "</p>" +
      '<div class="meta"><span>' + icon("pin") + esc(r.location || "No location given") + (d.distance != null ? ", " + fmtDistance(d.distance) + " away" : "") + "</span><span>" + icon("people") + plural(r.confirmations, "resident", "residents") + "</span><span>" + r.ref + "</span></div>" +
      '<button type="button" class="btn btn-small" data-action="merge" data-id="' + r.id + '">Same problem: count me too</button>' +
      "</li>";
  }

  function sendReport() {
    const text = $("#f-text").value.trim();
    const location = $("#f-location").value.trim();
    const chosen = $("#f-category").value;
    if (text.length < 12) {
      toast("Describe the problem in a few more words first.");
      $("#f-text").focus();
      return;
    }
    const id = nextId();
    const r = buildReport({ id: id, text: text, location: location, category: chosen === "auto" ? null : chosen, photo: state.photo, pin: state.pin });
    state.reports.push(r);
    state.settings.confirmed.push(id);
    saveReports();
    saveSettings();
    clearForm();
    openOnBoard(id);
    toast("Report " + r.ref + " sent to " + CAT[r.category].dept + ".");
  }

  function openOnBoard(id) {
    const target = byId(id);
    state.filter = { status: target && target.status === "resolved" ? "resolved" : "active", category: "all", q: "" };
    $("#b-search").value = "";
    state.expanded = id;
    state.flash = id;
    go("board");
  }

  function clearForm() {
    $("#f-text").value = "";
    $("#f-location").value = "";
    $("#f-category").value = "auto";
    $("#f-photo").value = "";
    state.photo = null;
    renderPhoto();
    setDraftPin(null);
  }

  function fillExample(i) {
    const e = D.EXAMPLES[i];
    if (!e) return;
    $("#f-text").value = e.text;
    $("#f-location").value = e.location;
    $("#f-category").value = "auto";
    setDraftPin(Array.isArray(e.at) ? AI.offsetPoint(mapCenter(), e.at) : null, true);
    renderTicket();
    paintBars();
  }

  function renderPhoto() {
    $("#photo-preview").innerHTML = state.photo
      ? '<img src="' + esc(state.photo) + '" alt="Photo to attach"><button type="button" class="link-btn" data-action="remove-photo">Remove photo</button>'
      : "";
    $("#photo-btn-text").textContent = state.photo ? "Change photo" : "Add a photo";
  }

  function onPhoto(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast("Choose an image file, such as a JPG or PNG."); return; }
    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        // Shrink the photo so it fits comfortably in browser storage.
        const max = 560;
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(img.width * s));
        cv.height = Math.max(1, Math.round(img.height * s));
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        state.photo = cv.toDataURL("image/jpeg", 0.72);
        renderPhoto();
      };
      img.onerror = () => toast("That image couldn't be opened. Try a JPG or PNG.");
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------------- 2. priority board ---------------- */
  function renderBoard() {
    const f = state.filter;
    const q = f.q.trim().toLowerCase();
    const active = ranked();
    const resolved = state.reports
      .filter((r) => r.status === "resolved")
      .map((r) => ({ r: r, p: AI.priority(r), rank: null }))
      .sort((a, b) => Date.parse(lastChange(b.r)) - Date.parse(lastChange(a.r)));
    let items = f.status === "resolved" ? resolved : f.status === "all" ? active.concat(resolved) : active;

    $$('[data-action="fstatus"]').forEach((b) => b.setAttribute("aria-pressed", b.dataset.value === f.status ? "true" : "false"));
    renderCatChips(items);

    items = items.filter((x) =>
      (f.category === "all" || x.r.category === f.category) &&
      (!q || (x.r.text + " " + x.r.location + " " + x.r.ref + " " + CAT[x.r.category].name).toLowerCase().indexOf(q) >= 0));

    const crit = items.filter((x) => x.r.status !== "resolved" && x.p.critical);
    const queue = items.filter((x) => x.r.status !== "resolved" && !x.p.critical);
    const done = items.filter((x) => x.r.status === "resolved");

    let html = "";
    if (!state.reports.length) {
      html = empty("No reports yet", "Problems reported in " + communityName() + " will be ranked here.", "Report a problem");
    } else if (!items.length) {
      html = empty("Nothing matches", "Try another problem type, switch between Open and Resolved, or clear the search.");
    } else {
      if (crit.length) html += group("Fix immediately", "Critical hazards skip the queue.", crit);
      if (queue.length) html += group(crit.length ? "Then fix in this order" : "Fix in this order", "Ranked by FixFirst score: urgency, residents affected and time waiting.", queue);
      if (done.length) html += group("Resolved", "Most recently fixed first.", done);
    }
    $("#board-list").innerHTML = html;

    if (state.flash) {
      const el = document.getElementById("issue-" + state.flash);
      state.flash = null;
      if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" }));
    }
  }

  function renderCatChips(items) {
    const counts = {};
    items.forEach((x) => { counts[x.r.category] = (counts[x.r.category] || 0) + 1; });
    const chip = (id, label, n, ic) =>
      '<button type="button" class="cat-chip" data-action="fcat" data-value="' + id + '" aria-pressed="' + (state.filter.category === id) + '">' +
      (ic || "") + "<span>" + esc(label) + '</span><span class="n">' + n + "</span></button>";
    $("#b-cats").innerHTML = chip("all", "All types", items.length) + D.CATEGORIES.map((c) => chip(c.id, c.name, counts[c.id] || 0, icon(c.id))).join("");
  }

  function empty(title, text, cta) {
    return '<div class="empty"><h2>' + esc(title) + "</h2><p>" + esc(text) + "</p>" +
      (cta ? '<button type="button" class="btn btn-primary" data-action="tab" data-tab="report">' + esc(cta) + "</button>" : "") + "</div>";
  }

  function group(title, sub, list) {
    return '<section class="group"><div class="group-head"><h2>' + esc(title) + "</h2><p>" + esc(sub) + '</p></div><ol class="issues">' + list.map(card).join("") + "</ol></section>";
  }

  function card(x) {
    const r = x.r;
    const c = CAT[r.category];
    const u = r.urgency;
    const open = state.expanded === r.id;
    const counted = state.settings.confirmed.indexOf(r.id) >= 0;
    const resolved = r.status === "resolved";
    const plate = x.rank ? "#" + x.rank : icon("check", "Resolved");
    return '<li class="issue lvl-' + u.level + " st-" + r.status + (state.flash === r.id ? " flash" : "") + '" id="issue-' + r.id + '">' +
      '<div class="issue-row">' +
        '<button type="button" class="issue-head" data-action="toggle" data-id="' + r.id + '" aria-expanded="' + open + '" aria-controls="issue-body-' + r.id + '">' +
          '<span class="plate">' + plate + "</span>" +
          '<span class="issue-main">' +
            '<span class="issue-tags"><span class="cat-name">' + icon(r.category) + esc(c.name) + '</span><span class="badge">' + esc(u.label) + '</span><span class="status s-' + r.status + '">' + STATUS[r.status] + "</span></span>" +
            '<span class="issue-title">' + esc(open ? r.text : titleOf(r.text)) + "</span>" +
            '<span class="meta">' +
              (r.location ? "<span>" + icon("pin") + esc(r.location) + "</span>" : "") +
              "<span>" + icon("clock") + ago(r.createdAt) + "</span>" +
              "<span>" + r.ref + "</span>" +
              (resolved ? "" : '<span class="meta-score">Score ' + x.p.total + "</span>") +
            "</span>" +
          "</span>" +
          (resolved ? "<span></span>" : '<span class="score"><b>' + x.p.total + "</b><small>FixFirst score</small></span>") +
        "</button>" +
        '<button type="button" class="metoo" data-action="metoo" data-id="' + r.id + '" aria-pressed="' + counted + '"' + (resolved ? " disabled" : "") +
          ' aria-label="' + (counted ? "You are counted. " : "Me too: I'm affected. ") + plural(r.confirmations, "resident", "residents") + ' affected">' +
          "<b>" + r.confirmations + "</b><small>" + (counted ? "Counted" : "Me too") + "</small>" +
        "</button>" +
      "</div>" +
      '<div class="issue-body" id="issue-body-' + r.id + '"' + (open ? "" : " hidden") + ">" + (open ? cardBody(x) : "") + "</div>" +
    "</li>";
  }

  function cardBody(x) {
    const r = x.r;
    const c = CAT[r.category];
    const u = r.urgency;
    const p = x.p;
    const official = state.settings.role === "official";
    const source = r.categorySource === "official" ? "corrected by an official"
      : r.categorySource === "resident" ? "chosen by the resident"
      : "set by the AI, " + pct(r.aiConfidence) + " confident";
    const row = (cls, name, val, max, detail) =>
      '<div class="bd-row ' + cls + '"><span>' + name + "<small>" + detail + '</small></span><span class="bar"><span data-w="' + Math.round(val / max * 100) + '"></span></span><span class="bd-val">' + Math.round(val) + "/" + max + "</span></div>";

    return (r.photo ? '<img class="issue-photo" src="' + esc(r.photo) + '" alt="Photo attached to ' + r.ref + '">' : "") +
      '<div class="body-grid">' +
        "<section>" +
          '<h3 class="mini-h">Why it ranks here</h3>' +
          '<div class="breakdown">' +
            row("bd-urgency", "Urgency", p.urgency, 70, esc(u.label) + ", " + u.score + " of 10") +
            row("", "Residents affected", p.support, 20, plural(r.confirmations, "resident", "residents")) +
            row("", "Time waiting", p.waiting, 10, plural(Math.floor(p.days), "day", "days")) +
          "</div>" +
          (u.reasons.length ? '<div class="chips">' + u.reasons.map((t) => '<span class="chip">' + esc(t) + "</span>").join("") + "</div>" : "") +
        "</section>" +
        "<section>" +
          '<h3 class="mini-h">Routing</h3>' +
          '<dl class="facts">' +
            "<dt>Office</dt><dd>" + esc(c.dept) + "</dd>" +
            "<dt>Problem type</dt><dd>" + esc(c.name) + ' <span class="muted">(' + source + ")</span></dd>" +
            "<dt>Reported</dt><dd>" + fmtDate(r.createdAt) + "</dd>" +
          "</dl>" +
          '<h3 class="mini-h">Timeline</h3>' +
          '<ol class="timeline">' + r.history.map((h) => '<li><span class="dot s-' + h.status + '"></span>' + STATUS[h.status] + ", " + fmtDate(h.at) + "</li>").join("") + "</ol>" +
        "</section>" +
      "</div>" +
      '<div class="issue-actions">' +
        '<button type="button" class="btn" data-action="letter" data-id="' + r.id + '">' + icon("mail") + "Draft letter to the office</button>" +
        (posOf(r) ? '<button type="button" class="btn" data-action="show-on-map" data-id="' + r.id + '">' + icon("pin") + "Show on map</button>" : "") +
        (official ? officialControls(r) : '<p class="hint">Switch to <b>Official</b> at the top to update the status or correct the problem type.</p>') +
      "</div>";
  }

  function officialControls(r) {
    const options = D.CATEGORIES.map((c) => '<option value="' + c.id + '"' + (c.id === r.category ? " selected" : "") + ">" + esc(c.name) + "</option>").join("");
    return '<div class="official">' +
      '<div class="seg" role="group" aria-label="Status">' +
        ["open", "in_progress", "resolved"].map((s) =>
          '<button type="button" class="seg-btn" data-action="status" data-id="' + r.id + '" data-value="' + s + '" aria-pressed="' + (r.status === s) + '">' + STATUS[s] + "</button>").join("") +
      "</div>" +
      '<div class="correct"><label>Problem type<select data-role="correct" data-id="' + r.id + '">' + options + "</select></label>" +
      '<button type="button" class="btn btn-small" data-action="correct" data-id="' + r.id + '">Correct and retrain AI</button></div>' +
    "</div>";
  }

  function meToo(id, fromTicket) {
    const r = byId(id);
    if (!r || r.status === "resolved") return;
    if (state.settings.confirmed.indexOf(id) >= 0) {
      toast("You're already counted on " + r.ref + ".");
    } else {
      r.confirmations += 1;
      state.settings.confirmed.push(id);
      saveReports();
      saveSettings();
      toast("Counted you on " + r.ref + ". " + plural(r.confirmations, "resident", "residents") + " affected now.");
    }
    if (fromTicket) { clearForm(); openOnBoard(id); }
    else render();
  }

  function setStatus(id, s) {
    const r = byId(id);
    if (!r || r.status === s || !STATUS[s]) return;
    r.status = s;
    r.history.push({ status: s, at: new Date().toISOString() });
    saveReports();
    if (s === "resolved" && state.filter.status === "active") state.expanded = null;
    toast(r.ref + " is now " + STATUS[s].toLowerCase() + ".");
    render();
  }

  function correctCategory(id, cat) {
    const r = byId(id);
    if (!r || !CAT[cat]) return;
    if (r.category === cat) { toast("Pick a different problem type to correct it."); return; }
    r.category = cat;
    r.categorySource = "official";
    r.urgency = AI.scoreUrgency(r.text, cat, D);
    state.corrections.push({ text: r.text, label: cat });
    saveCorrections();
    trainModel();
    saveReports();
    toast("Moved " + r.ref + " to " + CAT[cat].name + ". The AI retrained with this example.");
    render();
  }

  /* ---------------- letter ---------------- */
  function pinLine(r) {
    const p = posOf(r);
    if (!p) return "";
    const lat = p[0].toFixed(5), lng = p[1].toFixed(5);
    return "\nMap pin: " + lat + ", " + lng + " (https://www.openstreetmap.org/?mlat=" + lat + "&mlon=" + lng + "#map=18/" + lat + "/" + lng + ")";
  }

  function letterFor(r) {
    const c = CAT[r.category];
    const list = ranked();
    const x = list.find((y) => y.r.id === r.id);
    const p = x ? x.p : AI.priority(r);
    const community = communityName() || "our community";
    const who = r.confirmations === 1 ? "a resident" : r.confirmations + " residents";
    const days = Math.floor(daysSince(r.createdAt));
    const urgent = r.urgency.level === "critical" || r.urgency.level === "high";
    return [
      "To: " + c.dept,
      "Date: " + fmtDate(new Date().toISOString()),
      "Reference: " + r.ref,
      "",
      "Subject: " + r.urgency.label + " urgency " + c.name.toLowerCase() + " problem" + (r.location ? " at " + r.location : ""),
      "",
      "Dear Sir or Madam,",
      "",
      "I am writing on behalf of " + who + " of " + community + " to ask for " + (urgent ? "urgent " : "") + "action on the following problem, first reported on " + fmtDate(r.createdAt) + (days > 0 ? " (" + plural(days, "day", "days") + " ago)" : "") + ":",
      "",
      "\u201C" + r.text + "\u201D",
      "",
      "Location: " + (r.location || "Not given") + pinLine(r),
      "Problem type: " + c.name,
      "Urgency: " + r.urgency.label + " (" + r.urgency.score + " of 10)" + (r.urgency.reasons.length ? ", because of: " + r.urgency.reasons.join(", ") : ""),
      "Community priority: FixFirst score " + p.total + " of 100" + (x ? ", number " + x.rank + " of " + list.length + " open problems" : ""),
      "Current status: " + STATUS[r.status],
      "",
      "Please inspect the site and let residents know when repairs are expected. Residents can follow progress using reference " + r.ref + ".",
      "",
      "Thank you for your attention to this matter.",
      "",
      "Yours faithfully,",
      "",
      "",
      "On behalf of the residents of " + community
    ].join("\n");
  }

  function openLetter(id) {
    const r = byId(id);
    if (!r) return;
    openModal("Letter to the office",
      '<p class="help">Addressed to the ' + esc(CAT[r.category].dept) + ". It includes the evidence FixFirst collected: residents affected, urgency and time waiting. Edit anything before you copy it.</p>" +
      '<label class="visually-hidden" for="letter-text">Letter text</label>' +
      '<textarea id="letter-text" class="letter" rows="18">' + esc(letterFor(r)) + "</textarea>" +
      '<div class="modal-actions"><button type="button" class="btn btn-primary" data-action="copy-letter">Copy letter</button><button type="button" class="btn" data-action="close-modal">Close</button></div>');
  }

  function copyLetter() {
    const ta = $("#letter-text");
    if (!ta) return;
    const fallback = () => {
      ta.focus();
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      toast(ok ? "Letter copied." : "Select the text and press Ctrl+C (or Cmd+C) to copy it.");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => toast("Letter copied."), fallback);
    else fallback();
  }

  /* ---------------- modal & settings ---------------- */
  let lastFocus = null;
  function openModal(title, html) {
    lastFocus = document.activeElement;
    $("#modal-title").textContent = title;
    $("#modal-body").innerHTML = html;
    $("#modal").hidden = false;
    document.body.classList.add("modal-open");
    const first = $("#modal-body").querySelector("input, select, textarea, button");
    (first || $("#modal .icon-btn")).focus();
  }
  function closeModal() {
    if ($("#modal").hidden) return;
    $("#modal").hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function openSettings() {
    const s = state.settings;
    const mc = mapCenter();
    openModal("Settings",
      '<div class="field"><label class="label" for="s-community">Community name</label>' +
      '<input id="s-community" type="text" maxlength="60" value="' + esc(communityName()) + '">' +
      '<p class="help">Shown in the header and used to sign letters to offices.</p></div>' +
      '<div class="field"><span class="label">Map location</span>' +
      '<div class="coord-row"><label class="coord">Latitude<input id="s-lat" type="text" inputmode="decimal" autocomplete="off" value="' + mc[0].toFixed(5) + '"></label>' +
      '<label class="coord">Longitude<input id="s-lng" type="text" inputmode="decimal" autocomplete="off" value="' + mc[1].toFixed(5) + '"></label></div>' +
      '<div class="modal-actions"><button type="button" class="btn btn-small" data-action="settings-locate">Use my location</button></div>' +
      '<p class="help">Demo pins move with the map location. These settings only change this browser. To set the name and map for everyone who opens your link, edit COMMUNITY at the top of js/data.js.</p></div>' +
      '<div class="field"><label class="label" for="s-theme">Appearance</label>' +
      '<select id="s-theme"><option value="system">Match my device</option><option value="light">Light</option><option value="dark">Dark</option></select></div>' +
      '<div class="modal-actions"><button type="button" class="btn btn-primary" data-action="save-settings">Save settings</button></div>' +
      '<div class="danger"><h3>Data on this device</h3>' +
      '<p class="help">Reports are stored in this browser only. Resetting brings back the demo reports and forgets AI corrections.</p>' +
      '<div class="modal-actions"><button type="button" class="btn" data-action="reset-demo">Reset to demo data</button><button type="button" class="btn" data-action="clear-all">Remove all reports</button></div></div>');
    $("#s-theme").value = s.theme;
  }
  function saveSettingsFromModal() {
    const name = $("#s-community").value.trim();
    const latRaw = $("#s-lat").value.trim();
    const lngRaw = $("#s-lng").value.trim();
    let center = null;
    if (latRaw || lngRaw) {
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (latRaw === "" || lngRaw === "" || !isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        toast("Enter a latitude between -90 and 90 and a longitude between -180 and 180.");
        $("#s-lat").focus();
        return;
      }
      const d = D.COMMUNITY.center;
      center = Math.abs(lat - d[0]) < 1e-5 && Math.abs(lng - d[1]) < 1e-5 ? null : [lat, lng];
    }
    const centerChanged = JSON.stringify(center) !== JSON.stringify(state.settings.center || null);
    const themeChanged = state.settings.theme !== $("#s-theme").value;
    state.settings.community = name && name !== D.COMMUNITY.name ? name : null;
    state.settings.center = center;
    state.settings.theme = $("#s-theme").value;
    saveSettings();
    applyTheme();
    if (themeChanged) swapTiles();
    if (centerChanged && picker) picker.setView(state.pin || mapCenter(), state.pin ? 17 : D.COMMUNITY.zoom);
    closeModal();
    render();
    toast("Settings saved.");
  }
  // Two-step confirmation without window.confirm (which some embedded pages block).
  function confirmTwice(btn, fn) {
    if (btn.dataset.armed === "1") { fn(); return; }
    const label = btn.textContent;
    btn.dataset.armed = "1";
    btn.textContent = "Click again to confirm";
    setTimeout(() => { if (document.contains(btn)) { btn.dataset.armed = ""; btn.textContent = label; } }, 3500);
  }
  function resetDemo() {
    state.corrections = [];
    saveCorrections();
    trainModel();
    seedDemo();
    state.expanded = null;
    closeModal();
    render();
    toast("Demo data restored.");
  }
  function clearAll() {
    state.reports = [];
    state.settings.confirmed = [];
    saveReports();
    saveSettings();
    state.expanded = null;
    closeModal();
    render();
    toast("All reports removed.");
  }
  function setRole(role) {
    if (state.settings.role === role) return;
    state.settings.role = role;
    saveSettings();
    render();
    toast(role === "official" ? "Official view: open any problem to update its status or correct its type." : "Resident view.");
  }

  /* ---------------- 3. community pulse ---------------- */
  function renderInsights() {
    const all = state.reports;
    if (!all.length) { $("#insights-body").innerHTML = empty("No data yet", "Once problems are reported, you'll see where they pile up.", "Report a problem"); return; }
    const active = all.filter((r) => r.status !== "resolved");
    const done = all.filter((r) => r.status === "resolved");
    const crit = active.filter((r) => r.urgency.level === "critical").length;
    const high = active.filter((r) => r.urgency.level === "high").length;
    const voices = active.reduce((s, r) => s + r.confirmations, 0);
    const fixDays = done.map((r) => {
      const h = r.history.filter((e) => e.status === "resolved").pop();
      return h ? Math.max(0, (Date.parse(h.at) - Date.parse(r.createdAt)) / DAY) : null;
    }).filter((v) => v !== null);
    const avgFix = fixDays.length ? fixDays.reduce((a, b) => a + b, 0) / fixDays.length : null;

    let sentence = esc(communityName()) + " has <b>" + active.length + "</b> open " + (active.length === 1 ? "problem" : "problems");
    if (crit) sentence += ", <b>" + crit + "</b> of them critical";
    else if (high) sentence += ", <b>" + high + "</b> of them high urgency";
    sentence += ". Residents have flagged them <b>" + voices + "</b> times";
    if (avgFix !== null) sentence += ", and fixed problems took <b>" + (avgFix < 1 ? "under 1" : avgFix.toFixed(1)) + "</b> " + (avgFix < 1.05 ? "day" : "days") + " on average";
    sentence += ".";

    const byCat = D.CATEGORIES.map((c) => {
      const list = active.filter((r) => r.category === c.id);
      return { c: c, n: list.length, v: list.reduce((s, r) => s + r.confirmations, 0) };
    }).sort((a, b) => b.n - a.n || b.v - a.v);
    const maxN = Math.max(1, ...byCat.map((x) => x.n));

    const spots = {};
    active.forEach((r) => {
      const parts = (r.location || "").split(/,|&|\/|\band\b/i).map((s) => s.trim()).filter(Boolean);
      (parts.length ? parts : ["No location given"]).forEach((p) => {
        const k = p.toLowerCase().replace(/\s+/g, " ");
        const s = spots[k] || (spots[k] = { name: p, n: 0, v: 0, cats: [] });
        s.n++;
        s.v += r.confirmations;
        if (s.cats.indexOf(r.category) < 0) s.cats.push(r.category);
      });
    });
    const top = Object.keys(spots).map((k) => spots[k]).sort((a, b) => b.n - a.n || b.v - a.v).slice(0, 5);
    const oldest = active.slice().sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0];

    $("#insights-body").innerHTML =
      '<p class="pulse">' + sentence + "</p>" +
      '<div class="ins-grid">' +
        "<section><h2>Open problems by type</h2>" +
          '<ul class="cat-bars">' + byCat.map((x) =>
            '<li class="cat-bar"><span class="cb-name">' + icon(x.c.id) + esc(x.c.name) + '</span><span class="bar"><span data-w="' + Math.round(x.n / maxN * 100) + '"></span></span><span class="cb-n">' + x.n + "</span></li>").join("") +
          "</ul></section>" +
        "<section><h2>Hotspots</h2><p class=\"sub\">Places with the most open problems.</p>" +
          (top.length
            ? '<ol class="spots">' + top.map((s, i) =>
                '<li><span class="plate plate-sm">' + (i + 1) + '</span><span class="spot-name">' + esc(s.name) + "<small>" + s.cats.map((id) => esc(CAT[id].name)).join(", ") + "</small></span>" +
                '<span class="spot-n"><b>' + s.n + "</b><small>" + (s.n === 1 ? "problem" : "problems") + ", flagged " + plural(s.v, "time", "times") + "</small></span></li>").join("") + "</ol>"
            : '<p class="help">No open problems right now.</p>') +
        "</section>" +
      "</div>" +
      (oldest
        ? '<div class="longest"><div><h2>Waiting longest</h2><p class="issue-title">' + esc(titleOf(oldest.text)) + "</p><p>" +
            plural(Math.floor(daysSince(oldest.createdAt)), "day", "days") + " open, " + plural(oldest.confirmations, "resident", "residents") + " affected, " + esc(CAT[oldest.category].dept) + ".</p></div>" +
          '<button type="button" class="btn" data-action="open-issue" data-id="' + oldest.id + '">Open on the board</button></div>'
        : "");
  }

  /* ---------------- 4. how the AI works ---------------- */
  function renderAI() {
    const ev = evalResult;
    const nCorr = state.corrections.length;
    const signals = D.URGENCY_SIGNALS.slice().sort((a, b) => b.w - a.w);
    $("#ai-body").innerHTML =
      '<div class="ai-grid">' +
        "<section><h2>The model right now</h2>" +
          '<div class="table-wrap"><table class="model-card"><tbody>' +
            "<tr><th>Accuracy on unseen reports</th><td><b>" + pct(ev.accuracy) + "</b><br>Leave-one-out test: each training sentence is hidden in turn, the model retrains without it, then guesses its type.</td></tr>" +
            "<tr><th>Trained on</th><td>" + plural(ev.n, "labelled report", "labelled reports") + (nCorr ? ", including " + plural(nCorr, "correction", "corrections") + " from officials" : "") + "</td></tr>" +
            "<tr><th>Vocabulary</th><td>" + model.V.toLocaleString() + " word stems and word pairs</td></tr>" +
            "<tr><th>Method</th><td>Multinomial Naive Bayes with Laplace smoothing, written from scratch in JavaScript</td></tr>" +
            "<tr><th>Where it runs</th><td>On this device. Reports are never sent to a server, and no API key is needed.</td></tr>" +
          "</tbody></table></div></section>" +
        "<section><h2>Accuracy by problem type</h2><p class=\"sub\">With the words that most strongly point to each type.</p>" +
          '<ul class="acc-list">' + D.CATEGORIES.map((c) => {
            const p = ev.per[c.id] || { n: 0, ok: 0 };
            const acc = p.n ? p.ok / p.n : 0;
            return "<li>" +
              '<div class="acc-top"><span class="cb-name">' + icon(c.id) + esc(c.name) + '</span><span class="bar"><span data-w="' + Math.round(acc * 100) + '"></span></span><b>' + pct(acc) + "</b></div>" +
              '<div class="chips">' + model.topTerms(c.id, 6).map((t) => '<span class="chip">' + esc(t) + "</span>").join("") + "</div>" +
            "</li>";
          }).join("") + "</ul></section>" +
      "</div>" +
      '<section class="signals"><h2>What raises urgency</h2><p class="sub">Each signal found in a report adds points; the total is capped at 10. Critical starts at 8.5, high at 6, moderate at 3.5.</p>' +
        '<div class="chips">' + signals.map((s) => '<span class="chip">' + esc(s.why) + " <b>+" + s.w + "</b></span>").join("") + "</div>" +
      "</section>";
  }

  /* ---------------- maps: Leaflet + OpenStreetMap data (CARTO tiles) ---------------- */
  const hasLeaflet = () => typeof window.L === "object" && typeof window.L.map === "function";
  const PIN_SIZE = { critical: 42, high: 36, moderate: 32, low: 28 };
  const PIN_Z = { critical: 400, high: 300, moderate: 200, low: 100 };
  let picker = null;
  let pickerMarker = null;
  let bigMap = null;
  let bigLayer = null;
  let mapFocus = null;

  function isDark() {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function mapMissing(el, msg) {
    if (!el.querySelector(".map-missing")) el.innerHTML = '<div class="map-missing">' + esc(msg) + "</div>";
  }
  function addTiles(map, el) {
    if (map._ffTiles) map.removeLayer(map._ffTiles);
    let loaded = 0;
    let failed = 0;
    const layer = L.tileLayer("https://{s}.basemaps.cartocdn.com/" + (isDark() ? "dark_all" : "light_all") + "/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    });
    layer.on("tileload", function () {
      loaded++;
      const note = el.querySelector(".map-note");
      if (note) note.remove();
    });
    layer.on("tileerror", function () {
      failed++;
      if (!loaded && failed >= 3 && !el.querySelector(".map-note")) {
        const note = document.createElement("div");
        note.className = "map-note";
        note.textContent = "Street map images can't load here, but pins still work. Open your FixFirst web address directly to see the streets.";
        el.appendChild(note);
      }
    });
    layer.addTo(map);
    map._ffTiles = layer;
  }
  function makeMap(el, wheelZoom) {
    const map = L.map(el, { scrollWheelZoom: wheelZoom, zoomControl: true });
    addTiles(map, el);
    return map;
  }
  function swapTiles() {
    if (picker) addTiles(picker, $("#f-map"));
    if (bigMap) addTiles(bigMap, $("#map-view"));
  }

  // Small map on the report form: tap to drop a pin, drag to adjust.
  function ensurePicker() {
    const el = $("#f-map");
    if (!hasLeaflet()) { mapMissing(el, "The map couldn't load. Check your internet connection. You can still send the report without a pin."); return; }
    if (!picker) {
      picker = makeMap(el, false);
      picker.setView(state.pin || mapCenter(), state.pin ? 17 : D.COMMUNITY.zoom);
      picker.on("click", function (e) { setDraftPin([e.latlng.lat, e.latlng.lng], false); });
      if (state.pin) setDraftPin(state.pin, false);
    } else {
      picker.invalidateSize();
    }
  }
  function setDraftPin(p, pan) {
    state.pin = p;
    if (picker) {
      if (!p) {
        if (pickerMarker) { picker.removeLayer(pickerMarker); pickerMarker = null; }
      } else {
        if (!pickerMarker) {
          pickerMarker = L.marker(p, {
            draggable: true,
            title: "Problem location (drag to adjust)",
            icon: L.divIcon({ className: "pin-wrap", html: '<span class="pin-draft"></span>', iconSize: [28, 28], iconAnchor: [14, 34] })
          }).addTo(picker);
          pickerMarker.on("dragend", function () {
            const ll = pickerMarker.getLatLng();
            state.pin = [ll.lat, ll.lng];
            updatePinStatus();
            scheduleTicket();
          });
        } else {
          pickerMarker.setLatLng(p);
        }
        if (pan) picker.setView(p, Math.max(picker.getZoom(), 16));
      }
    }
    updatePinStatus();
    scheduleTicket();
  }
  function updatePinStatus() {
    $("#pin-status").textContent = state.pin
      ? "Pinned at " + state.pin[0].toFixed(5) + ", " + state.pin[1].toFixed(5) + "."
      : "No pin yet. Tap the map where the problem is.";
    $('[data-action="clear-pin"]').hidden = !state.pin;
  }
  function locate(onFound) {
    if (!navigator.geolocation) { toast("This browser can't share your location. Tap the map instead."); return; }
    toast("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      function (pos) { onFound([pos.coords.latitude, pos.coords.longitude]); },
      function () { toast("Couldn't get your location. Allow location access, or tap the map instead."); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  // Full map of every problem.
  function pinIcon(r) {
    const s = r.status === "resolved" ? 26 : PIN_SIZE[r.urgency.level];
    return L.divIcon({
      className: "pin-wrap",
      html: '<span class="pin lvl-' + r.urgency.level + " st-" + r.status + '">' + icon(r.category) + "</span>",
      iconSize: [s, s],
      iconAnchor: [s / 2, s / 2],
      popupAnchor: [0, -s / 2 - 2]
    });
  }
  function popupHtml(r, x) {
    const c = CAT[r.category];
    return '<div class="pop lvl-' + r.urgency.level + '">' +
      '<div class="issue-tags"><span class="cat-name">' + icon(r.category) + esc(c.name) + '</span><span class="badge">' + esc(r.urgency.label) + '</span><span class="status s-' + r.status + '">' + STATUS[r.status] + "</span></div>" +
      '<p class="pop-title">' + esc(titleOf(r.text)) + "</p>" +
      '<div class="meta">' + (x ? "<span>Rank #" + x.rank + "</span><span>Score " + x.p.total + "</span>" : "") +
        "<span>" + icon("people") + plural(r.confirmations, "resident", "residents") + "</span><span>" + r.ref + "</span></div>" +
      '<button type="button" class="btn btn-small" data-action="open-issue" data-id="' + r.id + '">Open on the board</button>' +
    "</div>";
  }
  function renderMap() {
    const el = $("#map-view");
    const f = state.mapFilter;
    $$('[data-action="mstatus"]').forEach((b) => b.setAttribute("aria-pressed", b.dataset.value === f.status ? "true" : "false"));
    const base = state.reports.filter((r) => f.status === "all" || r.status !== "resolved");
    const counts = {};
    base.forEach((r) => { counts[r.category] = (counts[r.category] || 0) + 1; });
    const chip = (id, label, n, ic) =>
      '<button type="button" class="cat-chip" data-action="mcat" data-value="' + id + '" aria-pressed="' + (f.category === id) + '">' +
      (ic || "") + "<span>" + esc(label) + '</span><span class="n">' + n + "</span></button>";
    $("#m-cats").innerHTML = chip("all", "All types", base.length) + D.CATEGORIES.map((c) => chip(c.id, c.name, counts[c.id] || 0, icon(c.id))).join("");

    const items = base.filter((r) => f.category === "all" || r.category === f.category);
    const pinned = items.filter((r) => posOf(r));
    const missing = items.length - pinned.length;
    $("#map-count").textContent = items.length
      ? "Showing " + plural(pinned.length, "problem", "problems") + "." + (missing ? " " + plural(missing, "report has", "reports have") + " no map pin." : "")
      : "No problems match these filters.";

    if (!hasLeaflet()) { mapMissing(el, "The map couldn't load. Check your internet connection. Everything else in FixFirst still works."); return; }
    if (!bigMap) {
      bigMap = makeMap(el, true);
      bigLayer = L.layerGroup().addTo(bigMap);
      bigMap.setView(mapCenter(), D.COMMUNITY.zoom);
    } else {
      bigMap.invalidateSize();
    }
    bigLayer.clearLayers();
    const ranks = {};
    ranked().forEach((x) => { ranks[x.r.id] = x; });
    const markers = {};
    pinned.forEach((r) => {
      const m = L.marker(posOf(r), {
        icon: pinIcon(r),
        title: r.ref + ": " + titleOf(r.text),
        riseOnHover: true,
        zIndexOffset: r.status === "resolved" ? 0 : PIN_Z[r.urgency.level]
      });
      m.bindPopup(popupHtml(r, ranks[r.id]), { maxWidth: 300, minWidth: 220 });
      m.addTo(bigLayer);
      markers[r.id] = m;
    });
    if (mapFocus && markers[mapFocus]) {
      bigMap.setView(markers[mapFocus].getLatLng(), 17);
      markers[mapFocus].openPopup();
    } else if (pinned.length) {
      bigMap.fitBounds(L.latLngBounds(pinned.map(posOf)), { padding: [48, 48], maxZoom: 17 });
    } else {
      bigMap.setView(mapCenter(), D.COMMUNITY.zoom);
    }
    mapFocus = null;
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const id = el.dataset.id ? Number(el.dataset.id) : null;
    switch (el.dataset.action) {
      case "tab": go(el.dataset.tab); break;
      case "toggle": state.expanded = state.expanded === id ? null : id; render(); break;
      case "metoo": meToo(id, false); break;
      case "merge": meToo(id, true); break;
      case "send": sendReport(); break;
      case "example": fillExample(Number(el.dataset.value)); break;
      case "remove-photo": state.photo = null; $("#f-photo").value = ""; renderPhoto(); $("#f-photo").focus(); break;
      case "fstatus": state.filter.status = el.dataset.value; state.expanded = null; render(); break;
      case "fcat": state.filter.category = el.dataset.value; render(); break;
      case "letter": openLetter(id); break;
      case "status": setStatus(id, el.dataset.value); break;
      case "correct": {
        const sel = $('select[data-role="correct"][data-id="' + id + '"]');
        if (sel) correctCategory(id, sel.value);
        break;
      }
      case "role": setRole(el.dataset.value); break;
      case "settings": openSettings(); break;
      case "close-modal": closeModal(); break;
      case "copy-letter": copyLetter(); break;
      case "save-settings": saveSettingsFromModal(); break;
      case "reset-demo": confirmTwice(el, resetDemo); break;
      case "clear-all": confirmTwice(el, clearAll); break;
      case "open-issue": openOnBoard(id); break;
      case "locate": locate(function (p) { setDraftPin(p, true); toast("Pinned at your location."); }); break;
      case "clear-pin": setDraftPin(null); break;
      case "mstatus": state.mapFilter.status = el.dataset.value; render(); break;
      case "mcat": state.mapFilter.category = el.dataset.value; render(); break;
      case "show-on-map": {
        const r = byId(id);
        if (r) { mapFocus = id; state.mapFilter = { status: r.status === "resolved" ? "all" : "active", category: "all" }; go("map"); }
        break;
      }
      case "settings-locate": locate(function (p) {
        const a = $("#s-lat");
        const b = $("#s-lng");
        if (a && b) { a.value = p[0].toFixed(5); b.value = p[1].toFixed(5); toast("Location filled in. Select Save settings to use it."); }
      }); break;
    }
  });

  document.addEventListener("keydown", function (e) {
    if ($("#modal").hidden) return;
    if (e.key === "Escape") { closeModal(); return; }
    if (e.key !== "Tab") return;
    const f = $$("#modal button, #modal textarea, #modal input, #modal select").filter((el) => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  $(".tabs").addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TABS.indexOf(state.tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length];
    go(next);
    $('.tab[data-tab="' + next + '"]').focus();
  });

  $("#f-text").addEventListener("input", scheduleTicket);
  $("#f-location").addEventListener("input", scheduleTicket);
  $("#f-category").addEventListener("change", function () { renderTicket(); paintBars(); });
  $("#f-photo").addEventListener("change", onPhoto);
  $("#f-text").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendReport(); }
  });
  $("#b-search").addEventListener("input", function (e) { state.filter.q = e.target.value; render(); });
  window.addEventListener("hashchange", function () { showTab(tabFromHash()); });

  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = function () { if (state.settings.theme === "system") swapTiles(); };
    if (mq.addEventListener) mq.addEventListener("change", onScheme);
    else if (mq.addListener) mq.addListener(onScheme);
  }

  /* ---------------- start ---------------- */
  function init() {
    applyTheme();
    trainModel();
    if (!Array.isArray(state.reports)) seedDemo();
    // Reports saved before the map existed: give the demo ones their map positions.
    state.reports.forEach((r) => {
      if (r.at == null && r.lat == null) {
        const d = D.DEMO_REPORTS.find((x) => x.text === r.text);
        if (d) r.at = d.at;
      }
    });
    $("#f-category").innerHTML = '<option value="auto">Let FixFirst decide</option>' +
      D.CATEGORIES.map((c) => '<option value="' + c.id + '">' + esc(c.name) + "</option>").join("");
    $("#examples").innerHTML = D.EXAMPLES.map((x, i) =>
      '<button type="button" class="chip-btn" data-action="example" data-value="' + i + '">' + esc(x.label) + "</button>").join("");
    renderPhoto();
    updatePinStatus();
    showTab(tabFromHash(), true);
  }
  init();
})();
