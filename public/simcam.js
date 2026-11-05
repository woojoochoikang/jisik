/* 📹 냉장고 카메라 시뮬레이션 (발표용)
 * 냉장고 천장 카메라가 넣은 재료를 인식해 앱(냉장고 목록·3D 냉장고·추천)에 실시간 등록하는 과정을 재현합니다.
 * 데이터는 app.js의 window.JisikApp API로만 읽고 씁니다.
 */
(() => {
  "use strict";
  const App = window.JisikApp;
  if (!App || !document.getElementById("simPanel")) return;

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COLS = ["왼쪽", "가운데", "오른쪽"];
  const TOP = 6, BAND = 21.5;               // 화면 높이 기준 % — 선반 4칸
  const TRAY = ["우유", "달걀", "그릭요거트", "치즈", "두부", "김치", "닭가슴살", "돼지고기",
    "연어", "새우", "시금치", "토마토", "양파", "브로콜리", "버섯", "바나나"];
  const AUTO = ["우유", "두부", "닭가슴살", "시금치", "토마토", "그릭요거트", "연어", "브로콜리"];
  // 재료 종류별로 보관하기 좋은 층 (0 = 맨 위 4층, 3 = 맨 아래 1층 야채칸)
  const PREF = [
    ["우유", "그릭요거트", "치즈", "두유", "달걀"],
    ["두부", "김치", "현미밥", "밥", "참치캔", "통밀빵"],
    ["닭가슴살", "닭다리살", "돼지고기", "소고기", "연어", "고등어", "새우"]
  ];

  const cam = $("simCam"), scene = $("simScene");
  let selected = null, fresh = new Set(), queue = [], busy = false, auto = false, lastTop = null;

  const emoji = n => FoodPhotos.ingredient(n);
  const posText = p => `${4 - p.shelf}층 ${COLS[p.column]} ${p.depth ? "뒤" : "앞"}`;
  const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const conf = f => 91 + hash(f.name + f.id) % 9;
  const status = f => { const d = App.dday(f.exp); return d < 0 ? "expired" : d <= 3 ? "soon" : ""; };
  const valid = p => p && Number.isInteger(p.shelf) && Number.isInteger(p.column) && Number.isInteger(p.depth);
  const key = p => `${p.shelf}-${p.column}-${p.depth}`;
  const fmtDate = s => s.slice(5).replace("-", "/");

  // ---------- 좌표 ----------
  function place(p, i, n) {
    const y1 = TOP + (p.shelf + 1) * BAND;
    const back = p.depth === 1;
    const base = 50 + (p.column - 1) * (back ? 21 : 29);
    const spread = (back ? 4.5 : 6.5) * Math.min(1, 3 / Math.max(n, 1));
    return {
      x: base + (i - (n - 1) / 2) * spread,
      y: back ? y1 - 10.5 : y1 - 2.2,
      s: back ? 0.72 : 1,
      z: (back ? 10 : 30) + p.shelf + i
    };
  }
  function slotRect(p) {
    const y1 = TOP + (p.shelf + 1) * BAND, back = p.depth === 1;
    const cx = 50 + (p.column - 1) * (back ? 21 : 29), w = back ? 19 : 27;
    return back ? { l: cx - w / 2, t: y1 - 17, w, h: 8 } : { l: cx - w / 2, t: y1 - 10, w, h: 9.5 };
  }
  function slotFromPoint(clientX, clientY) {
    const r = scene.getBoundingClientRect();
    const px = (clientX - r.left) / r.width * 100, py = (clientY - r.top) / r.height * 100;
    const shelf = Math.max(0, Math.min(3, Math.floor((py - TOP) / BAND)));
    const frac = (py - (TOP + shelf * BAND)) / BAND;
    return { shelf, column: px < 36 ? 0 : px > 64 ? 2 : 1, depth: frac < 0.55 ? 1 : 0 };
  }
  function pickSlot(name) {
    const n = App.norm(name);
    let shelf = PREF.findIndex(list => list.includes(n));
    if (shelf < 0) shelf = 3;
    const counts = new Map();
    App.getFridge().forEach(f => { if (valid(f.location)) counts.set(key(f.location), (counts.get(key(f.location)) || 0) + 1); });
    let best = null, min = Infinity;
    for (const depth of [0, 1]) for (const column of [0, 1, 2]) {
      const p = { shelf, column, depth }, c = (counts.get(key(p)) || 0) + depth * 0.5; // 앞칸을 조금 더 선호
      if (c < min) { min = c; best = p; }
    }
    return best;
  }

  // ---------- 그리기 ----------
  function drawShelves() {
    $("simShelves").innerHTML = [0, 1, 2, 3].map(s => {
      const top = TOP + s * BAND;
      return `<div class="sim-shelf ${s === 3 ? "veg" : ""}" style="top:${top}%;height:${BAND}%">
        <div class="glass"></div><div class="edge"></div><span class="lbl">${4 - s}F${s === 3 ? " 야채칸" : ""}</span></div>`;
    }).join("") + '<div class="sim-drawer"><span>야채칸 서랍</span></div>';
  }

  function render() {
    const items = App.getFridge();
    const groups = new Map();
    items.forEach(f => { if (!valid(f.location)) return; const k = key(f.location); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); });
    let html = "";
    groups.forEach(list => list.forEach((f, i) => {
      const p = place(f.location, i, list.length), st = status(f), d = App.dday(f.exp);
      const tag = `${esc(f.name)} ${conf(f)}%${st === "soon" ? ` · D-${d}` : st === "expired" ? " · 기한지남" : ""}`;
      html += `<button type="button" class="cam-item ${f.location.depth ? "back" : "front"} ${st} ${f.id === selected ? "sel" : ""} ${fresh.has(f.id) ? "fresh" : ""}" data-id="${f.id}"
        style="--x:${p.x}%;--y:${p.y}%;--s:${p.s};--z:${p.z}" aria-label="${esc(f.name)}, ${posText(f.location)}">
        <span class="obj">${emoji(f.name)}</span><span class="box"><b>${tag}</b></span>
        ${f.id === selected ? `<span class="take-out" data-out="${f.id}">✋ 꺼내기</span>` : ""}</button>`;
    }));
    $("simItems").innerHTML = html;
    const hud = $("simCount");
    hud.textContent = `AI 인식 ON · ${items.length}개 감지`;
  }

  function updateTop() {
    const t = App.topRecipe(), box = $("simTop");
    if (!t) { box.innerHTML = ""; return; }
    const changed = lastTop !== null && lastTop !== t.id;
    lastTop = t.id;
    const why = t.urgent.length ? `⏰ ${t.urgent.map(esc).join("·")} 먼저 사용` : t.missing ? `🛒 재료 ${t.missing}개 부족` : "✅ 지금 바로 만들 수 있어요";
    box.innerHTML = `<span class="em">${FoodPhotos.recipe(t.id)}</span><div><small>지금 추천 1위${changed ? '<span class="new">NEW</span>' : ""}</small><b>${esc(t.name)}</b><span class="why">${why}</span></div>
      <button type="button" class="ghost small" data-recipe="${t.id}">보기</button>`;
    if (changed) { box.classList.remove("changed"); void box.offsetWidth; box.classList.add("changed"); }
  }

  let raf = 0;
  const refresh = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { render(); updateTop(); }); };

  // ---------- 상태 표시 · 기록 · 소리 ----------
  let statusTimer;
  function say(text, kind = "", ms = 0) {
    const el = $("simStatus");
    el.className = `cam-status show ${kind}`; el.textContent = text;
    clearTimeout(statusTimer);
    if (ms) statusTimer = setTimeout(() => el.classList.remove("show"), ms);
  }
  function log(kind, icon, text, meta) {
    const ol = $("simLog");
    ol.querySelector(".empty-log")?.remove();
    const now = new Date().toTimeString().slice(0, 8);
    ol.insertAdjacentHTML("afterbegin", `<li class="${kind}"><time>${now}</time><span>${icon} ${text}</span><small>${meta}</small></li>`);
    while (ol.children.length > 30) ol.lastElementChild.remove();
  }
  let actx;
  function beep(freqs) {
    if (!$("simSound").checked) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.12;
        o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.start(t); o.stop(t + 0.2);
      });
    } catch { /* 소리 미지원 */ }
  }
  function pulseSync() { const s = document.querySelector(".sync-flow"); s.classList.remove("pulse"); void s.offsetWidth; s.classList.add("pulse"); }

  // ---------- 넣기 ----------
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function put(name, slot) { queue.push({ name, slot }); if (!busy) run(); }

  async function run() {
    busy = true;
    while (queue.length) {
      const { name, slot } = queue.shift();
      await insert(name, slot || pickSlot(name));
      await wait(auto ? 900 : 300);
    }
    busy = false;
    if (auto) stopAuto(true);
  }

  async function insert(name, loc) {
    selected = null;
    const sameSlot = App.getFridge().filter(f => valid(f.location) && key(f.location) === key(loc)).length;
    const p = place(loc, sameSlot, sameSlot + 1);
    const el = document.createElement("div");
    el.className = "pending-item";
    el.style.cssText = `--x:${p.x}%;--y:${p.y}%;--s:${p.s}`;
    el.innerHTML = `<span class="obj">${emoji(name)}</span><span class="hand">🫳</span><span class="scan"><b>분석 중…</b></span>`;
    $("simPending").appendChild(el);
    say("🚪 문 열림 · 새 물체 감지");
    await wait(900);
    el.classList.add("scanning");
    say("🔍 AI가 재료를 인식하는 중…");
    await wait(1100);

    const item = App.addItem(name, null, { location: loc, silent: true });
    el.remove();
    if (!item) return;
    fresh.add(item.id); setTimeout(() => { fresh.delete(item.id); refresh(); }, 1700);
    refresh();
    const c = conf(item);
    say(`✅ ${name} 인식 ${c}% · ${posText(loc)} · 소비기한 ${fmtDate(item.exp)}`, "ok", 2600);
    log("in", emoji(name), `<b>${esc(name)}</b> 넣음 → 자동 등록`, `${posText(loc)} · 신뢰도 ${c}% · 소비기한 ${fmtDate(item.exp)}`);
    beep([880, 1320]); pulseSync();
  }

  function takeOut(id) {
    const f = App.getFridge().find(x => x.id === id);
    const el = $("simItems").querySelector(`[data-id="${id}"]`);
    if (!f || !el) return;
    selected = null;
    el.querySelector(".take-out")?.remove();
    el.classList.add("leaving");
    say(`✋ ${f.name} 꺼냄 감지 · 목록에서 뺐어요`, "out", 2200);
    beep([660, 440]);
    setTimeout(() => {
      App.removeItem(id);
      log("out", emoji(f.name), `<b>${esc(f.name)}</b> 꺼냄 → 자동 삭제`, posText(f.location));
      pulseSync();
    }, 650);
  }

  // ---------- 자동 시연 ----------
  function startAuto() {
    auto = true;
    $("simAuto").textContent = "■ 시연 멈춤"; $("simAuto").classList.add("running");
    AUTO.forEach(n => queue.push({ name: n }));
    if (!busy) run();
  }
  function stopAuto(done) {
    auto = false;
    if (!done) queue.length = 0;
    $("simAuto").textContent = "▶ 자동 시연"; $("simAuto").classList.remove("running");
  }

  // ---------- 이벤트 ----------
  function bind() {
    $("simTray").innerHTML = TRAY.map(n => `<button type="button" draggable="true" data-name="${n}" title="${n} 넣기 (끌어다 놓으면 원하는 칸에)"><span>${emoji(n)}</span>${n}</button>`).join("");
    $("simTray").addEventListener("click", e => { const b = e.target.closest("[data-name]"); if (b) put(b.dataset.name); });
    $("simTray").addEventListener("dragstart", e => {
      const b = e.target.closest("[data-name]"); if (!b) return;
      e.dataTransfer.setData("text/plain", b.dataset.name); e.dataTransfer.effectAllowed = "copy";
    });

    let hl = null;
    const clearHl = () => { cam.classList.remove("dragging"); hl?.remove(); hl = null; };
    cam.addEventListener("dragover", e => {
      e.preventDefault(); e.dataTransfer.dropEffect = "copy";
      cam.classList.add("dragging");
      const r = slotRect(slotFromPoint(e.clientX, e.clientY));
      if (!hl) { hl = document.createElement("div"); hl.className = "slot-hl"; scene.appendChild(hl); }
      hl.style.cssText = `left:${r.l}%;top:${r.t}%;width:${r.w}%;height:${r.h}%`;
    });
    cam.addEventListener("dragleave", e => { if (!cam.contains(e.relatedTarget)) clearHl(); });
    cam.addEventListener("drop", e => {
      e.preventDefault();
      const name = e.dataTransfer.getData("text/plain");
      const slot = slotFromPoint(e.clientX, e.clientY);
      clearHl();
      if (name) put(name, slot);
    });

    $("simItems").addEventListener("click", e => {
      const out = e.target.closest("[data-out]");
      if (out) { e.stopPropagation(); takeOut(out.dataset.out); return; }
      const it = e.target.closest("[data-id]");
      if (it) { e.stopPropagation(); selected = selected === it.dataset.id ? null : it.dataset.id; render(); }
    });
    scene.addEventListener("click", () => { if (selected) { selected = null; render(); } });

    $("simBoxes").addEventListener("change", e => cam.classList.toggle("show-boxes", e.target.checked));
    cam.classList.add("show-boxes");
    $("simAuto").addEventListener("click", () => auto ? stopAuto() : startAuto());

    let armed = 0;
    $("simReset").addEventListener("click", e => {
      const b = e.currentTarget;
      if (!armed) {
        b.textContent = "정말 비울까요? 한 번 더"; b.classList.add("confirm");
        armed = setTimeout(() => { armed = 0; b.textContent = "🧹 냉장고 비우기"; b.classList.remove("confirm"); }, 3000);
        return;
      }
      clearTimeout(armed); armed = 0; b.textContent = "🧹 냉장고 비우기"; b.classList.remove("confirm");
      stopAuto(); App.clearFridge(); selected = null;
      $("simLog").innerHTML = '<li class="empty-log">냉장고를 비웠어요. 재료를 넣어보세요!</li>';
      say("🧊 냉장고가 비었어요", "", 1800);
    });

    $("simTop").addEventListener("click", e => { const b = e.target.closest("[data-recipe]"); if (b) App.openRecipe(b.dataset.recipe); });

    const tick = () => {
      const d = new Date(), z = n => String(n).padStart(2, "0");
      $("simClock").textContent = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
    };
    tick(); setInterval(tick, 1000);

    window.addEventListener("jisik:change", refresh);
  }

  drawShelves();
  bind();
  render();
  updateTop();
})();
