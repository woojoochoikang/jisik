/* 지식 — 지루하지 않은 식단
 * 데이터는 각 방문자의 브라우저(localStorage)에 저장됩니다.
 */
(() => {
  "use strict";

  // ---------- 설정 ----------
  const GOALS = {
    diet:         { label: "🥗 다이어트",   kcal: 1500, protein: 90,  desc: "1회 400kcal 안팎의 가볍고 포만감 있는 메뉴, 단백질은 충분히 챙겨요." },
    bulk:         { label: "💪 벌크업",     kcal: 2800, protein: 150, desc: "단백질 30g 이상, 칼로리가 넉넉한 메뉴를 우선 추천해요." },
    diabetes:     { label: "🩸 당뇨 관리",  kcal: 1800, protein: 80,  desc: "당류·정제 탄수화물이 적고 혈당이 완만하게 오르는 메뉴를 골라요." },
    hypertension: { label: "❤️ 고혈압 관리", kcal: 1900, protein: 80,  desc: "1회 나트륨 600mg 이하의 저염 메뉴를 우선 추천해요." },
    balance:      { label: "⚖️ 균형 식단",  kcal: 2000, protein: 70,  desc: "영양소가 고르게 들어간 메뉴를 다양하게 추천해요." }
  };

  const ACTS = {
    cut:       { tool: "🔪", label: "썰기",        bg: "linear-gradient(135deg,#ffe8cc,#fff4e6)" },
    mix:       { tool: "🥣", label: "섞기",        bg: "linear-gradient(135deg,#d0ebff,#e7f5ff)" },
    stir:      { tool: "🥄", label: "저으며 익히기", bg: "linear-gradient(135deg,#fff3bf,#fff9db)" },
    fry:       { tool: "🍳", label: "볶기·굽기",    bg: "linear-gradient(135deg,#ffd8d8,#fff0f0)" },
    boil:      { tool: "🍲", label: "끓이기·삶기",  bg: "linear-gradient(135deg,#c5f6fa,#e3fafc)", steam: true },
    steam:     { tool: "♨️", label: "찌기",        bg: "linear-gradient(135deg,#e5dbff,#f3f0ff)", steam: true },
    bake:      { tool: "🔥", label: "오븐·에어프라이어", bg: "linear-gradient(135deg,#ffd8a8,#fff4e6)" },
    microwave: { tool: "⏲️", label: "전자레인지",   bg: "linear-gradient(135deg,#e9ecef,#f8f9fa)" },
    plate:     { tool: "🍽️", label: "담기",        bg: "linear-gradient(135deg,#d3f9d8,#ebfbee)" },
    wash:      { tool: "🚰", label: "씻기",        bg: "linear-gradient(135deg,#d0ebff,#f1f8ff)" },
    soak:      { tool: "💧", label: "불리기·재우기", bg: "linear-gradient(135deg,#c3fae8,#e6fcf5)" },
    season:    { tool: "🧂", label: "밑간",        bg: "linear-gradient(135deg,#eebefa,#f8f0fc)" }
  };

  // 사용자가 다르게 입력해도 같은 재료로 인식
  const ALIAS = {
    계란: "달걀", 파: "대파", 쪽파: "대파", 닭가슴: "닭가슴살", 양송이: "버섯", 표고: "버섯", 느타리: "버섯", 팽이버섯: "버섯",
    새송이: "버섯", 양송이버섯: "버섯", 표고버섯: "버섯", 느타리버섯: "버섯", 새송이버섯: "버섯", 계란후라이: "달걀", 닭안심: "닭가슴살", 요거트: "그릭요거트", 요구르트: "그릭요거트", 오트밀: "귀리", 오트: "귀리", 쌀밥: "밥", 흰쌀밥: "밥",
    삼겹살: "돼지고기", 목살: "돼지고기", 앞다리살: "돼지고기", 우삼겹: "소고기", 다진소고기: "소고기", 참치: "참치캔",
    피망: "파프리카", 상추: "양상추", 토마토즙: "토마토", 호박: "애호박", 땅콩: "견과류", 아몬드: "견과류", 호두: "견과류",
    식빵: "통밀빵", 빵: "통밀빵", 마늘쪽: "마늘", 깐마늘: "마늘", 메밀국수: "메밀면", 소바: "메밀면", 체다치즈: "치즈"
  };

  let features = { shop: false, aiScan: false };

  const QUICK = ["달걀", "두부", "닭가슴살", "양파", "대파", "우유", "토마토", "김치", "시금치", "버섯"];

  // ---------- 저장소 ----------
  const KEY = "jisik.v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장 불가 환경 */ }
    // 다른 화면(카메라 시뮬레이션 등)이 실시간으로 따라 그릴 수 있게 알림
    window.dispatchEvent(new CustomEvent("jisik:change"));
  };

  const todayStr = () => fmt(new Date());
  function fmt(d) { const z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; }
  function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return fmt(d); }
  function dday(exp) {
    const a = new Date(todayStr() + "T00:00:00"), b = new Date(exp + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }
  const uid = () => Math.random().toString(36).slice(2, 9);

  let state = load() || {
    goal: "diet", kcalTarget: GOALS.diet.kcal, proteinTarget: GOALS.diet.protein,
    fridge: [], log: { date: todayStr(), items: [] }, history: [], firstVisit: true
  };
  if (state.log.date !== todayStr()) state.log = { date: todayStr(), items: [] };

  // ---------- 유틸 ----------
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => { const t = String(s).trim().replace(/\s+/g, ""); return ALIAS[t] || t; };
  const emojiOf = n => EMOJI[norm(n)] || EMOJI[n] || "🥄";
  const isPantry = n => PANTRY.includes(n);
  function sameIng(a, b) {
    a = norm(a); b = norm(b);
    if (a === b) return true;
    if (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))) return true;
    return false;
  }
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }
  function ddayBadge(d) {
    if (d > 10) return "";
    if (d < 0) return `<span class="dday expired">${-d}일 지남</span>`;
    if (d === 0) return `<span class="dday today">D-day</span>`;
    if (d <= 3) return `<span class="dday soon">D-${d}</span>`;
    return `<span class="dday">D-${d}</span>`;
  }
  function hue(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }

  // ---------- 추천 점수 ----------
  function goalFit(r) {
    const g = state.goal; let s = 0; const good = [], bad = [];
    if (g === "diet") {
      if (r.kcal <= 400) { s += 15; good.push("저칼로리"); } else if (r.kcal <= 550) s += 8; else if (r.kcal > 650) { s -= 10; bad.push("고칼로리"); }
      if (r.protein >= 20) { s += 6; good.push(`단백질 ${r.protein}g`); }
    } else if (g === "bulk") {
      if (r.protein >= 35) { s += 15; good.push(`고단백 ${r.protein}g`); } else if (r.protein >= 25) { s += 8; good.push(`단백질 ${r.protein}g`); } else if (r.protein < 15) { s -= 8; bad.push("단백질 부족"); }
      if (r.kcal >= 550) { s += 8; good.push("고열량"); } else if (r.kcal < 300) s -= 5;
    } else if (g === "diabetes") {
      if (r.tags.includes("lowgi")) { s += 12; good.push("혈당 완만"); }
      if (r.sugar <= 8) { s += 6; good.push(`당류 ${r.sugar}g`); } else if (r.sugar > 15) { s -= 12; bad.push(`당류 ${r.sugar}g`); }
      if (r.carbs <= 50) s += 6; else if (r.carbs > 70) { s -= 8; bad.push("탄수화물 많음"); }
    } else if (g === "hypertension") {
      if (r.sodium <= 500) { s += 15; good.push(`나트륨 ${r.sodium}mg`); } else if (r.sodium <= 650) { s += 8; good.push(`나트륨 ${r.sodium}mg`); } else if (r.sodium > 900) { s -= 15; bad.push(`나트륨 ${r.sodium}mg`); }
      if (r.tags.includes("lowsalt")) { s += 5; good.push("저염"); }
    } else {
      if (r.protein >= 15) s += 5;
      if (r.sodium <= 800) s += 5; else bad.push(`나트륨 ${r.sodium}mg`);
      if (r.kcal >= 350 && r.kcal <= 700) { s += 8; good.push("균형 잡힌 열량"); }
    }
    return { s, good: [...new Set(good)], bad };
  }

  let jitter = {};
  function analyze(r) {
    const usable = state.fridge.filter(f => dday(f.exp) >= 0);
    const rows = r.ingredients.map(ing => {
      if (isPantry(ing.n)) return { ...ing, status: "pantry" };
      const hit = usable.filter(f => sameIng(f.name, ing.n)).sort((a, b) => dday(a.exp) - dday(b.exp))[0];
      return hit ? { ...ing, status: "have", item: hit, d: dday(hit.exp) } : { ...ing, status: ing.opt ? "optmiss" : "miss" };
    });
    const req = rows.filter(x => x.status !== "pantry" && !x.opt);
    const have = req.filter(x => x.status === "have");
    const missing = rows.filter(x => x.status === "miss");
    const used = rows.filter(x => x.status === "have");
    const urgent = used.filter(x => x.d <= 3);

    let score = req.length ? (have.length / req.length) * 40 : 20;
    score -= missing.length * 8;
    score += used.filter(x => x.opt).length * 3;
    urgent.forEach(x => { score += (4 - x.d) * 6; });

    const fit = goalFit(r); score += fit.s;

    const eaten = state.log.items.reduce((a, b) => a + b.kcal, 0);
    const remain = state.kcalTarget - eaten;
    let overKcal = false;
    if (r.kcal > remain + 150) { score -= 10; overKcal = true; }

    // 지루하지 않게: 최근에 먹은 메뉴는 순위를 내림
    let recent = null;
    const last = state.history.filter(h => h.id === r.id).map(h => -dday(h.date)).sort((a, b) => a - b)[0];
    if (last !== undefined && last <= 3) { score -= last <= 1 ? 22 : 12; recent = last; }

    score += jitter[r.id] || 0;
    return { r, rows, req, have, missing, used, urgent, fit, score, overKcal, recent, remain };
  }

  // ---------- 렌더링: 목표 ----------
  function renderGoal() {
    $("#goalChips").innerHTML = Object.entries(GOALS).map(([k, g]) =>
      `<button class="chip" role="radio" aria-checked="${state.goal === k}" data-goal="${k}">${g.label}</button>`).join("");
    $("#goalDesc").textContent = GOALS[state.goal].desc;
    $("#kcalTarget").value = state.kcalTarget;
    $("#proteinTarget").value = state.proteinTarget;
    renderIntake();
  }
  function renderIntake() {
    const k = state.log.items.reduce((a, b) => a + b.kcal, 0);
    const p = state.log.items.reduce((a, b) => a + b.protein, 0);
    $("#kcalText").textContent = `${k} / ${state.kcalTarget} kcal`;
    $("#proteinText").textContent = `${p} / ${state.proteinTarget} g`;
    const kb = $("#kcalBar"); kb.style.width = Math.min(100, k / state.kcalTarget * 100) + "%"; kb.classList.toggle("over", k > state.kcalTarget);
    $("#proteinBar").style.width = Math.min(100, p / state.proteinTarget * 100) + "%";
    $("#eatenList").innerHTML = state.log.items.map((it, i) =>
      `<li>${esc(it.name)} <small>${it.kcal}kcal</small><button data-uneat="${i}" aria-label="기록 삭제">✕</button></li>`).join("");
  }

  // ---------- 렌더링: 냉장고 ----------
  function renderFridge() {
    if (window.Fridge3D) {
      let changed = false;
      state.fridge.forEach(f => {
        if (!window.Fridge3D.validLocation(f.location)) {
          f.location = window.Fridge3D.nextLocation(state.fridge);
          changed = true;
        }
      });
      if (changed) save();
      window.Fridge3D.render(state.fridge);
    }
    const list = [...state.fridge].sort((a, b) => a.exp.localeCompare(b.exp));
    $("#fridgeList").innerHTML = list.map(f => {
      const d = dday(f.exp);
      return `<li><span class="em">${emojiOf(f.name)}</span>
        <span class="nm">${esc(f.name)}<br><span class="dt">~ ${f.exp.slice(5).replace("-", "/")}</span></span>
        ${ddayBadge(d)}<button class="del" data-del="${f.id}" aria-label="${esc(f.name)} 삭제">✕</button></li>`;
    }).join("");
    $("#fridgeEmpty").hidden = list.length > 0;
    $("#quickAdd").innerHTML = QUICK.map(n => `<button data-quick="${n}">${EMOJI[n] || ""} ${n}</button>`).join("");
  }
  function addItem(name, exp, opts = {}) {
    name = name.trim(); if (!name) return null;
    const n = norm(name);
    if (!exp) exp = addDays(SHELF_DAYS[n] ?? 7);
    const item = { id: uid(), name, exp };
    if (opts.location) item.location = opts.location;
    state.fridge.push(item);
    save(); renderFridge(); renderRecs();
    if (!opts.silent) toast(`${emojiOf(name)} ${name} 추가 (${ddayText(dday(exp))})`);
    return item;
  }
  function removeItem(id) {
    const before = state.fridge.length;
    state.fridge = state.fridge.filter(f => f.id !== id);
    if (state.fridge.length !== before) { save(); renderFridge(); renderRecs(); }
  }
  function topRecipe() {
    const best = RECIPES.map(analyze).sort((a, b) => b.score - a.score)[0];
    return best ? { id: best.r.id, name: best.r.name, emoji: best.r.emoji, missing: best.missing.length, urgent: best.urgent.map(u => u.n) } : null;
  }
  const ddayText = d => d < 0 ? `${-d}일 지남` : d === 0 ? "오늘까지" : d <= 10 ? `D-${d}` : "기한 여유";

  // ---------- 렌더링: 추천 ----------
  function renderRecs() {
    const meal = $("#mealFilter").value, ready = $("#readyOnly").checked;
    let list = RECIPES.map(analyze);
    if (meal) list = list.filter(x => x.r.meal.includes(meal));
    if (ready) list = list.filter(x => x.missing.length === 0);
    list.sort((a, b) => b.score - a.score);

    const urgentItems = state.fridge.filter(f => { const d = dday(f.exp); return d >= 0 && d <= 3; })
      .sort((a, b) => a.exp.localeCompare(b.exp));
    const expired = state.fridge.filter(f => dday(f.exp) < 0);
    const ub = $("#urgentBanner");
    if (urgentItems.length || expired.length) {
      ub.hidden = false;
      ub.innerHTML = (urgentItems.length ? `<strong class="urgent-title">⏰ ${urgentItems.length}개 재료, 3일 안에 먼저 드세요!</strong>${urgentItems.map(f => `<span class="urgent-ingredient">${emojiOf(f.name)} ${esc(f.name)} <b>${ddayText(dday(f.exp))}</b></span>`).join(" ")}` : "")
        + (expired.length ? `<br>🗑️ 유통기한 지난 재료: ${expired.map(f => esc(f.name)).join(", ")} (추천에서 제외)` : "");
    } else ub.hidden = true;

    const eaten = state.log.items.reduce((a, b) => a + b.kcal, 0);
    $("#recSub").textContent = `${GOALS[state.goal].label} 목표 · 오늘 남은 칼로리 약 ${Math.max(0, state.kcalTarget - eaten)}kcal · 냉장고 재료 ${state.fridge.length}개 기준`;

    $("#recEmpty").hidden = list.length > 0;
    $("#recGrid").innerHTML = list.slice(0, 12).map((x, i) => card(x, i)).join("");
  }

  function card(x, i) {
    const { r } = x, h = hue(r.id);
    const badges = [];
    x.urgent.forEach(u => badges.push(`<span class="badge hot">⏰ ${esc(u.n)} ${ddayText(u.d)}</span>`));
    x.fit.good.slice(0, 2).forEach(g => badges.push(`<span class="badge">✓ ${esc(g)}</span>`));
    x.fit.bad.slice(0, 1).forEach(g => badges.push(`<span class="badge bad">! ${esc(g)}</span>`));
    if (x.recent !== null) badges.push(`<span class="badge miss">🔁 ${x.recent === 0 ? "오늘" : x.recent + "일 전"} 먹음</span>`);

    let reason;
    if (x.urgent.length) reason = `🔥 <b>${x.urgent.map(u => esc(u.n)).join("·")}</b>을(를) 버리기 전에 먼저 써요`;
    else if (x.missing.length === 0) reason = "✅ 지금 냉장고 재료로 바로 만들 수 있어요";
    else reason = `🛒 부족: ${x.missing.map(m => esc(m.n)).join(", ")}`;
    if (x.overKcal) reason += `<br>⚠️ 오늘 남은 칼로리보다 많아요`;

    const pct = x.req.length ? Math.round(x.have.length / x.req.length * 100) : 100;
    return `<button class="rcard" data-open="${r.id}">
      <div class="thumb" style="background:linear-gradient(135deg,hsl(${h} 80% 88%),hsl(${(h + 40) % 360} 85% 94%))">
        <span class="rank">${i + 1}위</span><span class="score">매칭 ${pct}%</span>${r.emoji}</div>
      <div class="rbody">
        <div class="rname">${esc(r.name)}</div>
        <div class="rmeta"><span>⏱ ${r.time}분</span><span>🔥 ${r.kcal}kcal</span><span>💪 ${r.protein}g</span><span>🧂 ${r.sodium}mg</span></div>
        <div class="badges">${badges.join("")}</div>
        <div class="match">보유 재료 ${x.have.length}/${x.req.length}<div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div></div>
        <div class="reason">${reason}</div>
      </div></button>`;
  }

  // ---------- 레시피 상세 & 단계별 플레이어 ----------
  let cur = null, stepIdx = 0, playing = false, playTimer = null, cookTimer = null, cookLeft = 0;
  const STEP_MS = 4500;

  function openRecipe(id) {
    const r = RECIPES.find(x => x.id === id); if (!r) return;
    cur = analyze(r); stepIdx = 0; stopPlay(); stopCook();
    const h = hue(r.id);
    $("#mEmoji").textContent = r.emoji;
    $("#mEmoji").style.background = `linear-gradient(135deg,hsl(${h} 80% 88%),hsl(${(h + 40) % 360} 85% 94%))`;
    $("#mTitle").textContent = r.name;
    $("#mMeta").innerHTML = [`⏱ ${r.time}분`, `🔥 ${r.kcal}kcal`, `💪 단백질 ${r.protein}g`, `🍚 탄수 ${r.carbs}g`, `🥑 지방 ${r.fat}g`, `🍬 당류 ${r.sugar}g`, `🧂 나트륨 ${r.sodium}mg`]
      .map(t => `<span>${t}</span>`).join("");
    $("#mBadges").innerHTML = [
      ...cur.urgent.map(u => `<span class="badge hot">⏰ ${esc(u.n)} ${ddayText(u.d)}</span>`),
      ...cur.fit.good.map(g => `<span class="badge">✓ ${esc(g)}</span>`),
      ...cur.fit.bad.map(g => `<span class="badge bad">! ${esc(g)}</span>`)
    ].join("");

    $("#mIngredients").innerHTML = cur.rows.map(x => {
      const cls = x.status === "have" ? "have" : x.status === "pantry" ? "pantry" : x.opt ? "miss opt" : "miss";
      const st = x.status === "have" ? `보유 ${ddayText(x.d)}` : x.status === "pantry" ? "기본 양념" : x.opt ? "선택" : "부족";
      return `<li class="${cls}"><span>${emojiOf(x.n)}</span><span>${esc(x.n)}${x.opt ? " <small>(선택)</small>" : ""} <span class="amt">${esc(x.a)}</span></span><span class="st">${st}</span></li>`;
    }).join("");
    const need = cur.rows.filter(x => x.status === "miss" || x.status === "optmiss");
    renderShop(need);

    $("#stepList").innerHTML = r.steps.map((s, i) => `<li><span class="n">${i + 1}</span><span class="ic">${ACTS[s.act].tool}</span>
      <span>${esc(s.text)}<small>${ACTS[s.act].label} · 약 ${fmtSec(s.sec)}</small></span></li>`).join("");
    $("#stepProgress").innerHTML = r.steps.map(() => "<span><i></i></span>").join("");
    $("#videoLink").href = "https://www.youtube.com/results?search_query=" + encodeURIComponent(r.name + " 레시피");
    setView("player");
    renderStep();
    $("#recipeModal").showModal();
  }

  function fmtSec(s) { return s >= 60 ? `${Math.round(s / 60)}분` : `${s}초`; }

  function renderStep() {
    const r = cur.r, s = r.steps[stepIdx], a = ACTS[s.act];
    const items = s.items.map(n => `<span>${emojiOf(n)}</span>`).join("");
    const stage = $("#stage");
    stage.className = `stage act-${s.act}`;
    stage.style.background = a.bg;
    stage.innerHTML = `<div class="snum">STEP ${stepIdx + 1} / ${r.steps.length}</div>
      <span class="act-label">${a.tool} ${a.label}</span>
      <div class="scene anim-in">
        ${a.steam ? '<span class="steamfx">♨️</span><span class="steamfx">♨️</span><span class="steamfx">♨️</span>' : ""}
        <div class="items">${items}</div><div class="tool">${a.tool}</div>
      </div>
      <div class="anim-in"><div class="stext">${esc(s.text)}</div><div class="stime" style="margin-top:6px">⏱ 약 ${fmtSec(s.sec)}</div></div>`;
    [...$("#stepProgress").children].forEach((el, i) => {
      el.classList.toggle("done", i < stepIdx);
      const bar = el.firstElementChild;
      bar.style.transition = "none"; bar.style.width = i < stepIdx ? "100%" : "0";
      if (i === stepIdx && playing) { void bar.offsetWidth; bar.style.transition = `width ${STEP_MS}ms linear`; bar.style.width = "100%"; }
    });
    $("#prevStep").disabled = stepIdx === 0;
    $("#nextStep").textContent = stepIdx === r.steps.length - 1 ? "처음으로 ↺" : "다음 ▶";
    stopCook(); $("#timerText").textContent = "";
  }

  function go(delta) {
    const n = cur.r.steps.length;
    stepIdx = (stepIdx + delta + n) % n;
    renderStep();
  }
  function startPlay() {
    playing = true; $("#playBtn").textContent = "⏸ 일시정지";
    if (stepIdx === cur.r.steps.length - 1) stepIdx = 0;
    renderStep();
    playTimer = setInterval(() => {
      if (stepIdx >= cur.r.steps.length - 1) { stopPlay(); toast("🎉 모든 단계를 봤어요! 이제 따라 만들어 보세요."); return; }
      stepIdx++; renderStep();
    }, STEP_MS);
  }
  function stopPlay() {
    playing = false; clearInterval(playTimer); playTimer = null;
    const b = $("#playBtn"); if (b) b.textContent = "▶ 자동 재생";
    document.querySelectorAll("#stepProgress i").forEach((bar, i) => {
      if (i === stepIdx) { const w = getComputedStyle(bar).width; bar.style.transition = "none"; bar.style.width = w; }
    });
  }

  // 실제 조리 타이머
  function startCook() {
    stopPlay();
    cookLeft = cur.r.steps[stepIdx].sec;
    const tick = () => {
      const m = Math.floor(cookLeft / 60), s = cookLeft % 60;
      $("#timerText").textContent = `${m}:${String(s).padStart(2, "0")}`;
      if (cookLeft <= 0) { stopCook(); $("#timerText").textContent = "⏰ 완료!"; beep(); toast(`STEP ${stepIdx + 1} 시간이 다 됐어요!`); return; }
      cookLeft--;
    };
    tick(); cookTimer = setInterval(tick, 1000);
    $("#timerBtn").textContent = "⏹ 타이머 멈추기";
  }
  function stopCook() { clearInterval(cookTimer); cookTimer = null; const b = $("#timerBtn"); if (b) b.textContent = "⏱ 실제 조리 타이머 시작"; }
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, .25, .5].forEach(t => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(.2, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + .2);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .2);
      });
    } catch { /* 오디오 미지원 */ }
  }

  function setView(v) {
    document.querySelectorAll(".seg").forEach(b => b.classList.toggle("active", b.dataset.view === v));
    $("#player").hidden = v !== "player";
    $("#stepList").hidden = v !== "list";
    if (v !== "player") { stopPlay(); }
  }

  function finishCooking() {
    const r = cur.r;
    state.log.items.push({ id: r.id, name: r.name, kcal: r.kcal, protein: r.protein });
    state.history.push({ id: r.id, date: todayStr() });
    state.history = state.history.filter(h => dday(h.date) >= -14);
    let removed = [];
    if ($("#useUp").checked) {
      const ids = new Set(cur.used.map(u => u.item.id));
      removed = state.fridge.filter(f => ids.has(f.id)).map(f => f.name);
      state.fridge = state.fridge.filter(f => !ids.has(f.id));
    }
    save(); stopPlay(); stopCook();
    $("#recipeModal").close();
    renderIntake(); renderFridge(); renderRecs();
    toast(`🍽️ ${r.name} 기록 완료!${removed.length ? ` 냉장고에서 ${removed.join(", ")} 정리` : ""}`);
  }

  // ---------- 최저가 구매 링크 ----------
  // 쇼핑몰에서 잘 검색되는 이름으로 바꿔서 검색
  const SEARCH_TERM = {
    달걀: "계란", 밥: "즉석밥", 현미밥: "현미 즉석밥", 귀리: "오트밀", 견과류: "하루견과", 버섯: "양송이버섯",
    김치: "포기김치", 통밀빵: "통밀식빵", 메밀면: "메밀국수", 미역: "건미역", 고등어: "순살 고등어", 연어: "생연어",
    소고기: "소고기 불고기용", 돼지고기: "돼지고기 앞다리살", 닭다리살: "닭다리살 정육", 새우: "냉동 새우", 그릭요거트: "그릭요거트",
    방울토마토: "방울토마토", 단호박: "단호박", 렌틸콩: "렌틸콩", 참치캔: "참치캔", 두유: "무가당 두유"
  };
  const term = n => SEARCH_TERM[norm(n)] || norm(n);
  const won = n => n.toLocaleString("ko-KR") + "원";
  const MALLS = [
    ["네이버쇼핑 낮은가격순", q => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}&sort=price_asc`],
    ["쿠팡 낮은가격순", q => `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}&sorter=salePriceAsc`],
    ["컬리", q => `https://www.kurly.com/search?sword=${encodeURIComponent(q)}`],
    ["SSG", q => `https://www.ssg.com/search.ssg?query=${encodeURIComponent(q)}&sort=prcasc`]
  ];
  const shopCache = {};

  function renderShop(need) {
    const box = $("#mShop");
    if (!need.length) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="box">🛒 <b>장보기 목록</b><br>${need.map(x => `${esc(x.n)} ${esc(x.a)}${x.opt ? " (선택)" : ""}`).join(", ")}<br><button class="ghost small" id="copyShop" style="margin-top:8px">목록 복사</button></div>
      <div class="price-wrap">
        <div class="price-head"><h4>💸 최저가로 사기</h4><span class="total" id="shopTotal"></span></div>
        ${need.map((x, i) => `<details class="pitem" data-q="${esc(term(x.n))}" ${i === 0 ? "open" : ""}>
          <summary>${emojiOf(x.n)} ${esc(x.n)}${x.opt ? " <small>(선택)</small>" : ""}<span class="low" data-low></span></summary>
          <div data-body>${features.shop ? '<div class="ploading">최저가 찾는 중…</div>' : ""}</div>
          <div class="mall-links">${MALLS.map(([label, f]) => `<a href="${f(term(x.n))}" target="_blank" rel="noopener">${label} ↗</a>`).join("")}</div>
          ${features.shop ? "" : '<p class="pnote">버튼을 누르면 쇼핑몰에서 가격 낮은 순으로 바로 보여줘요. 서버에 네이버 쇼핑 API 키를 넣으면 실시간 최저가 순위가 여기에 표시돼요.</p>'}
        </details>`).join("")}
      </div>`;
    if (features.shop) {
      const reqd = need.filter(x => !x.opt).map(x => term(x.n));
      Promise.all([...box.querySelectorAll(".pitem")].map(loadPrices)).then(results => {
        const sum = results.filter(r => r && reqd.includes(r.q) && r.items[0]).reduce((a, r) => a + r.items[0].price, 0);
        const el = $("#shopTotal"); if (el && sum) el.innerHTML = `필수 재료 최저가 합계 <b>${won(sum)}</b>`;
      });
    }
  }

  async function loadPrices(det) {
    const q = det.dataset.q, body = det.querySelector("[data-body]");
    try {
      const data = shopCache[q] || await fetch("/api/shop?q=" + encodeURIComponent(q)).then(r => r.ok ? r.json() : Promise.reject(r.status));
      shopCache[q] = data;
      if (!data.items.length) { body.innerHTML = '<div class="ploading">검색 결과가 없어요. 아래 쇼핑몰 링크를 이용해주세요.</div>'; return data; }
      det.querySelector("[data-low]").textContent = "최저 " + won(data.items[0].price);
      body.innerHTML = `<ul class="plist">${data.items.map((it, i) => `<li><a href="${esc(it.link)}" target="_blank" rel="noopener">
        <span class="rk">${i + 1}</span><img src="${esc(it.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">
        <span><span class="pt">${esc(it.title)}</span><span class="pm">${esc(it.mall)}</span></span>
        <span class="pp">${won(it.price)}</span></a></li>`).join("")}</ul>
        <p class="pnote">가격 낮은 순 · 용량이 달라 단위 가격은 상품마다 달라요. 배송비 별도일 수 있어요.</p>`;
      return data;
    } catch {
      body.innerHTML = '<div class="ploading">실시간 가격을 불러오지 못했어요. 아래 링크로 확인해주세요.</div>';
      return null;
    }
  }

  // ---------- 영수증·라벨 인식 ----------
  const KNOWN = [...new Set([...Object.keys(SHELF_DAYS), ...Object.keys(ALIAS)])];
  // 긴 이름부터 찾고, 기본 양념(고추장 등)은 '자리 차지'만 해서 '고추'가 잘못 잡히지 않게 함
  const MATCH_WORDS = [...KNOWN.map(w => ({ w, skip: false })), ...PANTRY.map(w => ({ w, skip: true })),
    ...["양파링", "오이지", "사과식초", "사과주스", "우유식빵", "버섯볶음", "두부과자", "김치찌개", "김밥", "봉투", "종량제"].map(w => ({ w, skip: true }))]
    .filter(x => x.w.length >= 2).sort((a, b) => b.w.length - a.w.length);

  function findDates(text) {
    const out = [];
    const re = /(20\d{2}|\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/g;
    let m;
    while ((m = re.exec(text))) {
      let y = +m[1]; if (y < 100) y += 2000;
      const mo = +m[2], d = +m[3];
      if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2020 || y > 2040) continue;
      const z = n => String(n).padStart(2, "0");
      out.push({ date: `${y}-${z(mo)}-${z(d)}`, index: m.index });
    }
    return out;
  }

  function parseText(text) {
    const found = new Map();
    text.split(/\n+/).forEach(line => {
      const compact = line.replace(/[\s*·.,()\[\]]/g, "");
      if (!compact) return;
      const used = new Array(compact.length).fill(false);
      for (const { w, skip } of MATCH_WORDS) {
        let from = 0, i;
        while ((i = compact.indexOf(w, from)) !== -1) {
          from = i + 1;
          if (used.slice(i, i + w.length).some(Boolean)) continue;
          for (let k = i; k < i + w.length; k++) used[k] = true;
          if (skip) continue;
          const key = norm(w);
          if (!found.has(key)) found.set(key, { name: w, product: line.trim().slice(0, 40), expiry: null });
        }
      }
    });
    // 라벨: '소비기한/유통기한/까지' 근처의 날짜를 유통기한으로 사용. 영수증 날짜(구매일)는 무시.
    const kw = /(소비\s*기한|유통\s*기한|까지|EXP|BEST\s*BEFORE)/i.exec(text);
    const dates = findDates(text).filter(d => dday(d.date) >= -1);
    let expiry = null, type = "receipt";
    if (kw && dates.length) {
      type = "label";
      dates.sort((a, b) => Math.abs(a.index - kw.index) - Math.abs(b.index - kw.index));
      expiry = dates[0].date;
    }
    const items = [...found.values()].map(it => ({ ...it, expiry }));
    if (type === "label" && !items.length) items.push({ name: "", product: "라벨에서 날짜만 찾았어요 — 재료 이름을 입력해주세요", expiry });
    return { type, items };
  }

  let scanRows = [];
  const scanShow = id => ["scanPick", "scanWork", "scanResult"].forEach(x => { $("#" + x).hidden = x !== id; });

  function openScan() {
    scanShow("scanPick");
    $("#scanText").value = ""; $(".paste").open = false;
    $("#scanEngine").innerHTML = features.aiScan
      ? "🤖 인식 방식: <b>Claude AI 이미지 인식</b> (영수증 약어·손상된 글자도 잘 읽어요)"
      : "🔎 인식 방식: <b>브라우저 무료 OCR</b> (처음 한 번은 한글 인식 데이터를 내려받느라 10~20초 걸려요)";
    $("#scanModal").showModal();
  }

  function shrink(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const max = 1800, s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c);
      };
      img.onerror = () => reject(new Error("이미지를 열 수 없어요"));
      img.src = URL.createObjectURL(file);
    });
  }

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      s.onload = resolve; s.onerror = () => reject(new Error("OCR 엔진을 불러오지 못했어요 (인터넷 연결 확인)"));
      document.head.appendChild(s);
    });
  }

  async function ocr(canvas) {
    const msg = $("#scanMsg"), bar = $("#scanBar");
    msg.textContent = "OCR 엔진 준비 중…"; bar.style.width = "5%";
    await loadTesseract();
    // 흑백 + 대비 강화로 인식률 개선
    const g = document.createElement("canvas"); g.width = canvas.width; g.height = canvas.height;
    const ctx = g.getContext("2d"); ctx.filter = "grayscale(1) contrast(1.6)"; ctx.drawImage(canvas, 0, 0);
    const worker = await Tesseract.createWorker("kor+eng", 1, {
      logger: m => {
        if (m.status === "recognizing text") { msg.textContent = `글자 읽는 중… ${Math.round(m.progress * 100)}%`; bar.style.width = 30 + m.progress * 70 + "%"; }
        else if (/load|initiali/i.test(m.status)) { msg.textContent = "한글 인식 데이터 준비 중… (처음 한 번만)"; bar.style.width = 5 + (m.progress || 0) * 25 + "%"; }
      }
    });
    try { const { data } = await worker.recognize(g); return data.text; }
    finally { worker.terminate(); }
  }

  async function handleImage(file) {
    if (!file || !file.type.startsWith("image/")) { toast("이미지 파일을 선택해주세요"); return; }
    scanShow("scanWork");
    $("#scanPreview").src = URL.createObjectURL(file);
    $("#scanBar").style.width = "5%";
    try {
      const canvas = await shrink(file);
      let result = null, raw = "";
      if (features.aiScan) {
        $("#scanMsg").textContent = "🤖 AI가 사진을 읽는 중…"; $("#scanBar").style.width = "50%";
        try {
          const r = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: canvas.toDataURL("image/jpeg", 0.85), known: KNOWN.filter(k => !ALIAS[k]) }) });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          result = { type: data.type, items: (data.items || []).filter(i => i.name) };
          raw = data.items.map(i => `${i.product || i.name}${i.expiry ? "  ~" + i.expiry : ""}`).join("\n");
        } catch (e) { toast("AI 인식 실패 → 무료 OCR로 다시 시도해요"); console.warn(e); }
      }
      if (!result) { raw = await ocr(canvas); result = parseText(raw); }
      showResult(result, raw);
    } catch (e) {
      scanShow("scanPick"); toast("⚠️ " + e.message);
    }
  }

  function showResult(result, raw) {
    scanRows = result.items.map(it => {
      const n = norm(it.name);
      const got = !!(it.expiry && /^\d{4}-\d{2}-\d{2}$/.test(it.expiry));
      return { on: true, name: it.name, product: it.product || "", exp: got ? it.expiry : addDays(SHELF_DAYS[n] ?? 7), got };
    });
    $("#scanRaw").textContent = raw || "(글자를 찾지 못했어요)";
    $("#scanSummary").textContent = scanRows.length
      ? `${result.type === "label" ? "🏷️ 라벨" : "🧾 영수증"}에서 재료 ${scanRows.filter(r => r.name).length}개를 찾았어요. 이름과 날짜를 확인해주세요.`
      : "재료를 찾지 못했어요. 더 밝고 가까이 다시 찍거나, 아래에서 직접 추가해주세요.";
    renderScanRows();
    scanShow("scanResult");
  }

  function renderScanRows() {
    $("#scanList").innerHTML = scanRows.map((r, i) => `<li class="${r.on ? "" : "off"}">
      <input type="checkbox" data-i="${i}" data-f="on" ${r.on ? "checked" : ""} aria-label="추가 여부">
      <span class="em">${r.name ? emojiOf(r.name) : "❔"}</span>
      <span class="nmcol"><input data-i="${i}" data-f="name" value="${esc(r.name)}" placeholder="재료 이름" list="ingredientList">${r.product ? `<small title="${esc(r.product)}">${esc(r.product)}</small>` : ""}</span>
      <span class="dcol"><input type="date" data-i="${i}" data-f="exp" value="${r.exp}" aria-label="유통기한"><small class="${r.got ? "got" : ""}">${r.got ? "라벨에서 읽은 날짜" : "보관 기간 기본값"}</small></span>
    </li>`).join("");
  }

  function confirmScan() {
    const add = scanRows.filter(r => r.on && r.name.trim());
    if (!add.length) { toast("추가할 재료를 선택해주세요"); return; }
    add.forEach(r => state.fridge.push({ id: uid(), name: r.name.trim(), exp: r.exp || addDays(7) }));
    save(); renderFridge(); renderRecs();
    $("#scanModal").close();
    toast(`📷 ${add.map(r => emojiOf(r.name) + " " + r.name).join(", ")} 추가 완료!`);
  }

  function bindScan() {
    $("#scanOpen").addEventListener("click", openScan);
    document.querySelectorAll("[data-close-scan]").forEach(b => b.addEventListener("click", () => $("#scanModal").close()));
    $("#scanModal").addEventListener("click", e => { if (e.target.id === "scanModal") $("#scanModal").close(); });
    ["#scanCamera", "#scanFile"].forEach(s => $(s).addEventListener("change", e => { handleImage(e.target.files[0]); e.target.value = ""; }));
    const drop = $("#scanDrop");
    ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => handleImage(e.dataTransfer.files[0]));
    $("#scanTextBtn").addEventListener("click", () => {
      const t = $("#scanText").value.trim(); if (!t) { toast("글자를 붙여넣어 주세요"); return; }
      showResult(parseText(t), t);
    });
    $("#scanList").addEventListener("input", e => {
      const i = e.target.dataset.i, f = e.target.dataset.f; if (i === undefined) return;
      if (f === "on") { scanRows[i].on = e.target.checked; e.target.closest("li").classList.toggle("off", !e.target.checked); }
      if (f === "name") {
        scanRows[i].name = e.target.value;
        e.target.closest("li").querySelector(".em").textContent = e.target.value ? emojiOf(e.target.value) : "❔";
      }
      if (f === "exp") { scanRows[i].exp = e.target.value; scanRows[i].got = false; }
    });
    $("#scanAddRow").addEventListener("click", () => { scanRows.push({ on: true, name: "", product: "", exp: addDays(7), got: false }); renderScanRows(); $("#scanList").lastElementChild.querySelector("[data-f=name]").focus(); });
    $("#scanRetry").addEventListener("click", () => scanShow("scanPick"));
    $("#scanConfirm").addEventListener("click", confirmScan);
  }

  // ---------- 예시 데이터 ----------
  function fillSample() {
    const sample = [["시금치", 1], ["두부", 2], ["닭가슴살", 2], ["현미밥", 1], ["바나나", 2], ["버섯", 3], ["브로콜리", 3],
      ["방울토마토", 4], ["대파", 6], ["달걀", 12], ["양파", 20], ["김치", 40], ["귀리", 100], ["우유", 5]];
    sample.forEach(([n, d]) => { if (!state.fridge.some(f => norm(f.name) === n)) state.fridge.push({ id: uid(), name: n, exp: addDays(d) }); });
    save(); renderFridge(); renderRecs();
    toast("🧊 예시 재료를 채웠어요");
  }

  // ---------- 이벤트 ----------
  function bind() {
    $("#todayLabel").textContent = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
    $("#ingredientList").innerHTML = [...new Set([...Object.keys(SHELF_DAYS), ...Object.keys(ALIAS)])].map(n => `<option value="${n}">`).join("");
    $("#ingDate").value = addDays(7);

    $("#goalChips").addEventListener("click", e => {
      const b = e.target.closest("[data-goal]"); if (!b) return;
      state.goal = b.dataset.goal;
      state.kcalTarget = GOALS[state.goal].kcal; state.proteinTarget = GOALS[state.goal].protein;
      save(); renderGoal(); renderRecs();
    });
    $("#kcalTarget").addEventListener("change", e => { state.kcalTarget = Math.max(800, +e.target.value || 2000); save(); renderIntake(); renderRecs(); });
    $("#proteinTarget").addEventListener("change", e => { state.proteinTarget = Math.max(10, +e.target.value || 60); save(); renderIntake(); });
    $("#eatenList").addEventListener("click", e => {
      const b = e.target.closest("[data-uneat]"); if (!b) return;
      const [it] = state.log.items.splice(+b.dataset.uneat, 1);
      const hi = state.history.findLastIndex(h => h.id === it.id && h.date === todayStr());
      if (hi >= 0) state.history.splice(hi, 1);
      save(); renderIntake(); renderRecs();
    });

    $("#ingName").addEventListener("input", e => {
      const n = norm(e.target.value);
      if (SHELF_DAYS[n] !== undefined) $("#ingDate").value = addDays(SHELF_DAYS[n]);
    });
    $("#addForm").addEventListener("submit", e => {
      e.preventDefault();
      addItem($("#ingName").value, $("#ingDate").value);
      $("#ingName").value = ""; $("#ingDate").value = addDays(7); $("#ingName").focus();
    });
    $("#quickAdd").addEventListener("click", e => { const b = e.target.closest("[data-quick]"); if (b) addItem(b.dataset.quick); });
    $("#fridgeList").addEventListener("click", e => {
      const b = e.target.closest("[data-del]"); if (!b) return;
      state.fridge = state.fridge.filter(f => f.id !== b.dataset.del);
      save(); renderFridge(); renderRecs();
    });
    $("#sampleBtn").addEventListener("click", fillSample);

    $("#mealFilter").addEventListener("change", renderRecs);
    $("#readyOnly").addEventListener("change", renderRecs);
    $("#shuffleBtn").addEventListener("click", () => {
      jitter = Object.fromEntries(RECIPES.map(r => [r.id, Math.random() * 16 - 8]));
      renderRecs(); toast("🔀 비슷한 점수의 메뉴를 섞었어요");
    });
    $("#recGrid").addEventListener("click", e => { const c = e.target.closest("[data-open]"); if (c) openRecipe(c.dataset.open); });

    $("#closeModal").addEventListener("click", () => $("#recipeModal").close());
    $("#recipeModal").addEventListener("close", () => { stopPlay(); stopCook(); });
    $("#recipeModal").addEventListener("click", e => { if (e.target.id === "recipeModal") $("#recipeModal").close(); });
    $("#prevStep").addEventListener("click", () => { stopPlay(); go(-1); });
    $("#nextStep").addEventListener("click", () => { stopPlay(); go(1); });
    $("#playBtn").addEventListener("click", () => playing ? stopPlay() : startPlay());
    $("#timerBtn").addEventListener("click", () => cookTimer ? (stopCook(), $("#timerText").textContent = "") : startCook());
    document.querySelectorAll(".seg").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
    $("#doneBtn").addEventListener("click", finishCooking);
    $("#mShop").addEventListener("click", e => {
      if (e.target.id !== "copyShop") return;
      const txt = cur.rows.filter(x => x.status === "miss" || x.status === "optmiss").map(x => `- ${x.n} ${x.a}`).join("\n");
      navigator.clipboard?.writeText(`[${cur.r.name}] 장보기\n${txt}`).then(() => toast("📋 장보기 목록을 복사했어요"), () => toast("복사할 수 없어요"));
    });
    document.addEventListener("keydown", e => {
      if (!$("#recipeModal").open) return;
      if (e.key === "ArrowRight") { stopPlay(); go(1); }
      if (e.key === "ArrowLeft") { stopPlay(); go(-1); }
    });
  }

  bind();
  bindScan();
  // 서버의 선택 기능(최저가 API, AI 인식) 확인 — 정적 서버로 열었으면 자동으로 무료 방식 사용
  fetch("/api/status").then(r => r.ok ? r.json() : {}).then(f => { features = { ...features, ...f }; }).catch(() => {});
  if (state.firstVisit) { state.firstVisit = false; fillSample(); }
  renderGoal(); renderFridge(); renderRecs();

  // 다른 스크립트(카메라 시뮬레이션)에서 쓰는 공개 API
  window.JisikApp = {
    addItem, removeItem, topRecipe, emojiOf, norm, dday, addDays,
    getFridge: () => state.fridge.map(f => ({ ...f })),
    clearFridge: () => { state.fridge = []; save(); renderFridge(); renderRecs(); },
    openRecipe: id => openRecipe(id)
  };
})();
