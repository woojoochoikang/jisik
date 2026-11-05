/* 👤 마이페이지 — 프로필 · 오늘의 영양 · 음식 사진 분석 · 주간 기록
 * Claude API 키가 있으면 실제 AI가 사진을 분석하고, 없으면 '데모 추정'(사진 색감 + 음식 DB)으로 동작합니다.
 */
(() => {
  "use strict";
  const App = window.JisikApp;
  if (!App || !document.getElementById("myPanel")) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = msg => { const t = $("toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); };

  // 1인분 기준 대략적인 영양 정보 [이름, 이모지, 양, kcal, 단백질g, 탄수g, 지방g, 나트륨mg, 색감]
  const FOOD_DB = [
    ["김치찌개", "🥘", "1그릇", 260, 18, 12, 15, 1800, "red"], ["떡볶이", "🍢", "1인분", 480, 10, 95, 6, 1300, "red"],
    ["제육볶음", "🥩", "1인분", 520, 30, 18, 36, 1200, "red"], ["김치볶음밥", "🍳", "1그릇", 620, 15, 90, 20, 1250, "red"],
    ["짬뽕", "🍜", "1그릇", 690, 30, 100, 18, 3300, "red"], ["라면", "🍜", "1봉지", 500, 10, 79, 16, 1800, "red"],
    ["순두부찌개", "🥘", "1그릇", 300, 18, 12, 20, 1500, "red"], ["과일 샐러드", "🍓", "1그릇", 150, 2, 35, 1, 5, "red"],
    ["비빔밥", "🍲", "1그릇", 600, 20, 90, 16, 1100, "mixed"], ["김밥", "🍙", "1줄", 480, 13, 75, 14, 1100, "mixed"],
    ["연어 포케", "🍣", "1볼", 560, 32, 58, 21, 610, "mixed"], ["짜장면", "🍜", "1그릇", 790, 20, 120, 24, 2400, "brown"],
    ["불고기 덮밥", "🍛", "1그릇", 720, 38, 82, 24, 980, "brown"], ["돈까스", "🍖", "1인분", 750, 30, 60, 42, 1100, "brown"],
    ["후라이드 치킨", "🍗", "3조각", 690, 45, 25, 45, 1300, "brown"], ["햄버거", "🍔", "1개", 540, 25, 45, 28, 1000, "brown"],
    ["고구마", "🍠", "1개", 200, 3, 46, 0, 20, "brown"], ["아메리카노", "☕", "1잔", 10, 0, 2, 0, 5, "brown"],
    ["피자", "🍕", "2조각", 560, 24, 60, 24, 1250, "yellow"], ["카레라이스", "🍛", "1그릇", 640, 15, 100, 18, 1200, "yellow"],
    ["계란말이", "🍳", "1접시", 230, 15, 3, 17, 400, "yellow"], ["오므라이스", "🍳", "1그릇", 680, 20, 95, 24, 1100, "yellow"],
    ["샌드위치", "🥪", "1개", 420, 20, 40, 18, 900, "yellow"], ["바나나", "🍌", "1개", 105, 1, 27, 0, 1, "yellow"],
    ["흰쌀밥", "🍚", "1공기", 300, 5, 66, 1, 0, "white"], ["우동", "🍜", "1그릇", 450, 13, 80, 6, 2000, "white"],
    ["설렁탕", "🍲", "1그릇", 420, 30, 40, 14, 1600, "white"], ["초밥", "🍣", "10개", 520, 25, 85, 8, 1200, "white"],
    ["그릭요거트 볼", "🫐", "1볼", 280, 20, 30, 9, 70, "white"], ["닭가슴살 샐러드", "🥗", "1볼", 380, 38, 18, 16, 480, "green"],
    ["그린 샐러드", "🥗", "1볼", 150, 4, 12, 10, 250, "green"], ["시금치 나물 정식", "🥬", "1인분", 450, 18, 65, 12, 900, "green"]
  ].map(([name, emoji, serving, kcal, protein, carbs, fat, sodium, tag]) => ({ name, emoji, serving, kcal, protein, carbs, fat, sodium, tag }));

  const MEALS = ["아침", "점심", "저녁", "간식"];
  const AVATARS = ["🧑‍🍳", "🐻", "🐰", "🦊", "🐼", "🐯", "🐶", "🐱"];
  let features = { aiScan: false };
  let result = null; // 분석 결과(1인분 기준) + portion, meal, photo

  const nowMeal = () => { const h = new Date().getHours(); return h < 10 ? "아침" : h < 15 ? "점심" : h < 17 ? "간식" : "저녁"; };
  const sum = (items, k) => Math.round(items.reduce((a, b) => a + (+b[k] || 0), 0));
  function targets(st) {
    const k = st.kcalTarget;
    const carbRatio = st.goal === "diabetes" ? 0.45 : st.goal === "bulk" ? 0.5 : 0.5;
    return { kcal: k, protein: st.proteinTarget, carbs: Math.round(k * carbRatio / 4), fat: Math.round(k * 0.25 / 9), sodium: st.goal === "hypertension" ? 1500 : 2000 };
  }
  const fmtDate = d => { const z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };

  // ---------- 그리기 ----------
  function render() {
    const st = App.getState(), items = st.log.items, tg = targets(st);
    const prof = { nick: "지식 사용자", avatar: "🧑‍🍳", ...st.profile };
    const g = App.goals[st.goal];

    // 기록 연속 일수
    const days = new Set(st.daily.filter(d => d.count).map(d => d.date));
    if (items.length) days.add(st.log.date);
    let streak = 0; const d = new Date();
    if (!days.has(fmtDate(d))) d.setDate(d.getDate() - 1);
    while (days.has(fmtDate(d))) { streak++; d.setDate(d.getDate() - 1); }
    const hit = st.daily.filter(x => x.kcal && Math.abs(x.kcal - st.kcalTarget) <= st.kcalTarget * 0.1).length;

    $("myProfile").innerHTML = `
      <button type="button" class="avatar" id="myAvatar" title="눌러서 바꾸기">${prof.avatar}</button>
      <div class="who">
        <input id="myNick" value="${esc(prof.nick)}" maxlength="12" aria-label="닉네임">
        <span class="goal-line">${g.label} · 하루 ${st.kcalTarget}kcal · 단백질 ${st.proteinTarget}g <a href="#meals">목표 바꾸기</a></span>
        <div class="my-badges"><span>🔥 ${streak}일 연속 기록</span><span>🎯 목표 달성 ${hit}일</span><span>🧊 냉장고 재료 ${st.fridge.length}개</span></div>
      </div>`;

    // 오늘의 영양
    const now = { kcal: sum(items, "kcal"), protein: sum(items, "protein"), carbs: sum(items, "carbs"), fat: sum(items, "fat"), sodium: sum(items, "sodium") };
    const pct = Math.min(100, Math.round(now.kcal / tg.kcal * 100));
    const over = now.kcal > tg.kcal;
    const row = (label, k, unit, cls) => {
      const p = Math.min(100, Math.round(now[k] / tg[k] * 100));
      const warn = (k === "sodium" || k === "fat") && now[k] > tg[k];
      return `<div class="nut-row"><span>${label}</span><div class="bar ${cls}"><div class="bar-fill ${warn ? "over" : ""}" style="width:${p}%"></div></div><b>${now[k]}<small>/${tg[k]}${unit}</small></b></div>`;
    };
    $("myToday").innerHTML = `
      <div class="my-card-head"><h2>📊 오늘의 영양</h2><span class="sub">${st.log.date.slice(5).replace("-", "/")} 기준</span></div>
      <div class="today-wrap">
        <div class="ring ${over ? "over" : ""}" style="--p:${pct}"><div><b>${now.kcal}</b><small>/ ${tg.kcal} kcal</small><em>${over ? `${now.kcal - tg.kcal} 초과` : `${tg.kcal - now.kcal} 남음`}</em></div></div>
        <div class="nut-rows">
          ${row("단백질", "protein", "g", "p")}${row("탄수화물", "carbs", "g", "c")}${row("지방", "fat", "g", "f")}${row("나트륨", "sodium", "mg", "s")}
        </div>
      </div>
      <p class="coach">${coach(st, now, tg)}</p>`;

    // 주간 그래프
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const ds = fmtDate(dt);
      const kc = ds === st.log.date ? now.kcal : (st.daily.find(x => x.date === ds)?.kcal || 0);
      week.push({ ds, kc, label: i === 0 ? "오늘" : "일월화수목금토"[dt.getDay()] });
    }
    const max = Math.max(tg.kcal * 1.3, ...week.map(w => w.kc));
    const hasPast = week.slice(0, 6).some(w => w.kc);
    const avg = Math.round(week.filter(w => w.kc).reduce((a, b) => a + b.kc, 0) / Math.max(1, week.filter(w => w.kc).length));
    $("myWeek").innerHTML = `
      <div class="my-card-head"><h2>📅 최근 7일</h2><span class="sub">${week.some(w => w.kc) ? `하루 평균 ${avg}kcal` : ""}</span></div>
      <div class="week">
        <div class="wplot">
          <div class="target-line" style="bottom:${tg.kcal / max * 100}%"><span>목표 ${tg.kcal}</span></div>
          ${week.map(w => `<div class="wcol"><div class="wbar ${w.kc > tg.kcal * 1.1 ? "over" : w.kc ? "" : "none"} ${w.label === "오늘" ? "today" : ""}" style="height:${Math.max(2, w.kc / max * 100)}%" title="${w.ds} · ${w.kc}kcal"><span>${w.kc || ""}</span></div></div>`).join("")}
        </div>
        <div class="wlabels">${week.map(w => `<small>${w.label}</small>`).join("")}</div>
      </div>
      ${hasPast ? "" : '<button type="button" class="ghost small" id="mySampleWeek">발표용 지난 6일 기록 채우기</button>'}`;

    // 오늘의 식사 목록
    $("myMealCount").textContent = items.length ? `${items.length}끼 · ${now.kcal}kcal` : "";
    $("myMeals").innerHTML = items.length ? items.map((it, i) => `
      <li>
        ${it.photo ? `<img src="${it.photo}" alt="">` : `<span class="em">${esc(it.emoji || "🍽️")}</span>`}
        <div><b>${esc(it.name)}</b><small>${esc(it.meal || "")}${it.meal ? " · " : ""}${it.time ? new Date(it.time).toTimeString().slice(0, 5) : ""} · ${it.source === "photo" ? "📸 사진 분석" : "🍳 레시피 완성"}</small></div>
        <span class="kc">${Math.round(it.kcal)}kcal<small>단백질 ${Math.round(it.protein || 0)}g</small></span>
        <button type="button" class="del" data-del="${i}" aria-label="${esc(it.name)} 기록 삭제">✕</button>
      </li>`).join("") : '<li class="empty-meal">아직 기록이 없어요. 위에서 음식 사진을 올려보세요!</li>';
  }

  function coach(st, now, tg) {
    if (!now.kcal) return "💡 첫 끼를 기록하면 오늘의 영양 균형을 분석해 드려요.";
    const tips = [];
    if (now.kcal > tg.kcal) tips.push(`목표보다 ${now.kcal - tg.kcal}kcal 더 드셨어요. 다음 끼는 샐러드나 두부 요리처럼 가볍게!`);
    else tips.push(`목표까지 ${tg.kcal - now.kcal}kcal 남았어요.`);
    if (now.protein < tg.protein * 0.5 && now.kcal > tg.kcal * 0.5) tips.push("단백질이 부족해요 — 닭가슴살·달걀·두부를 추천해요.");
    if (now.sodium > tg.sodium) tips.push(`나트륨이 ${now.sodium}mg로 권장량을 넘었어요. 국물은 남기는 걸 추천해요.`);
    if (st.goal === "diabetes" && now.carbs > tg.carbs * 0.8) tips.push("탄수화물 섭취가 많아요. 다음 끼는 잡곡·채소 위주로!");
    return "💡 " + tips.join(" ");
  }

  // ---------- 사진 분석 ----------
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 열 수 없어요"));
      img.src = URL.createObjectURL(file);
    });
  }
  function toCanvas(img, max) {
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  // 데모 추정: 사진 가운데 부분의 색감으로 음식 후보를 고름
  function demoGuess(img) {
    const c = toCanvas(img, 64), ctx = c.getContext("2d");
    const { data } = ctx.getImageData(Math.floor(c.width * .2), Math.floor(c.height * .2), Math.ceil(c.width * .6), Math.ceil(c.height * .6));
    let r = 0, g = 0, b = 0, n = 0, h = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; h = (h * 31 + data[i] + data[i + 1] * 3) >>> 0; }
    r /= n * 255; g /= n * 255; b /= n * 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, sat = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
    let hue = 0;
    if (mx !== mn) { hue = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4; hue = (hue * 60 + 360) % 360; }
    let tag = "mixed";
    if (sat < 0.18 && l > 0.6) tag = "white";
    else if (l < 0.28) tag = "brown";
    else if (hue < 22 || hue > 335) tag = sat > 0.35 ? "red" : "brown";
    else if (hue < 50) tag = l > 0.5 ? "yellow" : "brown";
    else if (hue < 70) tag = "yellow";
    else if (hue < 170) tag = "green";
    const pool = FOOD_DB.filter(f => f.tag === tag);
    const others = FOOD_DB.filter(f => f.tag !== tag);
    const pick = (arr, k) => arr.length ? arr[(h >>> k) % arr.length] : null;
    const main = pick(pool, 0) || pick(others, 0);
    const alt = [...new Set([pick(pool, 5), pick(pool, 9), pick(others, 3), pick(others, 7)].filter(x => x && x !== main))].slice(0, 3);
    return { ...main, confidence: 62 + h % 25, items: [main.name], comment: "", candidates: alt, demo: true };
  }

  async function analyze(file) {
    if (!file || !file.type.startsWith("image/")) { toast("이미지 파일을 선택해주세요"); return; }
    show("foodWork");
    $("foodPreview").src = URL.createObjectURL(file);
    $("foodMsg").textContent = "🔍 음식을 알아보는 중…";
    try {
      const img = await loadImage(file);
      const photo = toCanvas(img, 220).toDataURL("image/jpeg", 0.7); // 기록용 작은 사진
      let r = null;
      if (features.aiScan) {
        try {
          $("foodMsg").textContent = "🤖 AI가 메뉴와 양을 추정하는 중…";
          const res = await fetch("/api/food", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: toCanvas(img, 1280).toDataURL("image/jpeg", 0.85) }) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          if (data.name === "음식 아님") throw new Error("음식이 아닌 것 같아요");
          const alt = FOOD_DB.filter(f => f.name !== data.name && data.items?.some(x => f.name.includes(x) || x.includes(f.name))).slice(0, 3);
          r = { emoji: "🍽️", candidates: alt, ...data };
        } catch (e) { toast("AI 분석 실패 → 데모 추정으로 보여드려요"); console.warn(e); }
      }
      if (!r) { await new Promise(res => setTimeout(res, 1600)); r = demoGuess(img); }
      result = { ...r, portion: 1, meal: nowMeal(), photo };
      renderResult();
      show("foodResult");
    } catch (e) { show("foodPick"); toast("⚠️ " + e.message); }
  }

  function renderResult() {
    const r = result, k = r.portion;
    const st = App.getState(), tg = targets(st);
    const v = key => Math.round((+r[key] || 0) * k);
    const nowK = sum(st.log.items, "kcal");
    const after = nowK + v("kcal");
    const warn = [];
    if (st.goal === "hypertension" && v("sodium") > 800) warn.push(`나트륨 ${v("sodium")}mg — 고혈압 목표에는 조금 짜요`);
    if (st.goal === "diabetes" && v("carbs") > 70) warn.push(`탄수화물 ${v("carbs")}g — 혈당 관리에 주의`);
    if (st.goal === "diet" && v("kcal") > 650) warn.push("한 끼 열량이 높은 편이에요");
    if (st.goal === "bulk" && v("protein") < 20) warn.push("단백질을 조금 더 보충해 보세요");
    $("foodResult").innerHTML = `
      <div class="fr-top">
        <img src="${r.photo}" alt="">
        <div>
          <span class="fr-badge">${r.demo ? "데모 추정" : "AI 분석"} · 확신도 ${r.confidence ?? 80}%</span>
          <h3>${esc(r.emoji)} ${esc(r.name)}</h3>
          <small>${esc(r.serving || "1인분")} 기준${r.items?.length > 1 ? ` · ${r.items.map(esc).join(", ")}` : ""}</small>
        </div>
      </div>
      <div class="fr-row"><span>양</span><div class="seg-group">${[0.5, 1, 1.5, 2].map(p => `<button type="button" data-portion="${p}" class="${p === k ? "on" : ""}">×${p}</button>`).join("")}</div></div>
      <div class="fr-row"><span>식사</span><div class="seg-group">${MEALS.map(m => `<button type="button" data-meal="${m}" class="${m === r.meal ? "on" : ""}">${m}</button>`).join("")}</div></div>
      <div class="fr-nut">
        <div class="big"><b>${v("kcal")}</b><small>kcal</small></div>
        <div><b>${v("protein")}g</b><small>단백질</small></div><div><b>${v("carbs")}g</b><small>탄수화물</small></div>
        <div><b>${v("fat")}g</b><small>지방</small></div><div><b>${v("sodium")}mg</b><small>나트륨</small></div>
      </div>
      <div class="fr-goal">등록하면 오늘 <b>${after}</b> / ${tg.kcal}kcal <div class="bar"><div class="bar-fill ${after > tg.kcal ? "over" : ""}" style="width:${Math.min(100, after / tg.kcal * 100)}%"></div></div></div>
      ${r.comment ? `<p class="fr-comment">🤖 ${esc(r.comment)}</p>` : ""}
      ${warn.length ? `<p class="fr-warn">⚠️ ${warn.join(" · ")}</p>` : ""}
      <div class="fr-alt">
        <span>다른 음식인가요?</span>
        ${(r.candidates || []).map(c => `<button type="button" class="chip" data-food="${esc(c.name)}">${c.emoji} ${esc(c.name)}</button>`).join("")}
        <input list="foodDbList" id="foodSearch" placeholder="직접 검색 (예: 비빔밥)">
        <datalist id="foodDbList">${FOOD_DB.map(f => `<option value="${f.name}">`).join("")}</datalist>
      </div>
      ${r.demo ? '<p class="fr-note">데모 모드: 사진 색감으로 고른 예시 결과예요. 서버에 Claude API 키를 넣으면 실제 AI가 사진을 분석해요.</p>' : ""}
      <div class="fr-actions"><button type="button" class="ghost" id="foodRetry">↺ 다시 찍기</button><button type="button" class="primary big" id="foodSave">✅ 오늘 식단에 등록</button></div>`;
  }

  function useFood(name) {
    const f = FOOD_DB.find(x => x.name === name); if (!f) return;
    const old = result;
    result = { ...f, confidence: 100, items: [f.name], comment: "", demo: old.demo, candidates: (old.candidates || []).filter(c => c.name !== name).concat(FOOD_DB.find(x => x.name === old.name) ? [FOOD_DB.find(x => x.name === old.name)] : []).slice(0, 3), portion: old.portion, meal: old.meal, photo: old.photo };
    renderResult();
  }

  function saveMeal() {
    const r = result, k = r.portion, v = key => Math.round((+r[key] || 0) * k);
    App.addMeal({ name: r.name + (k !== 1 ? ` ×${k}` : ""), emoji: r.emoji, kcal: v("kcal"), protein: v("protein"), carbs: v("carbs"), fat: v("fat"), sodium: v("sodium"), meal: r.meal, photo: r.photo });
    toast(`📸 ${r.name} ${v("kcal")}kcal — 오늘 목표에 반영했어요`);
    result = null; show("foodPick");
  }

  const show = id => ["foodPick", "foodWork", "foodResult"].forEach(x => { $(x).hidden = x !== id; });

  // ---------- 이벤트 ----------
  function bind() {
    ["foodCamera", "foodFile"].forEach(id => $(id).addEventListener("change", e => { analyze(e.target.files[0]); e.target.value = ""; }));
    const drop = $("foodDrop");
    ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => analyze(e.dataTransfer.files[0]));

    $("foodResult").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.portion) { result.portion = +b.dataset.portion; renderResult(); }
      else if (b.dataset.meal) { result.meal = b.dataset.meal; renderResult(); }
      else if (b.dataset.food) useFood(b.dataset.food);
      else if (b.id === "foodRetry") { result = null; show("foodPick"); }
      else if (b.id === "foodSave") saveMeal();
    });
    $("foodResult").addEventListener("change", e => { if (e.target.id === "foodSearch") useFood(e.target.value.trim()); });

    $("myMeals").addEventListener("click", e => { const b = e.target.closest("[data-del]"); if (b) App.removeMeal(+b.dataset.del); });
    $("myProfile").addEventListener("click", e => {
      if (e.target.id !== "myAvatar") return;
      const cur = App.getState().profile.avatar || AVATARS[0];
      App.setProfile({ avatar: AVATARS[(AVATARS.indexOf(cur) + 1) % AVATARS.length] });
    });
    $("myProfile").addEventListener("change", e => { if (e.target.id === "myNick") App.setProfile({ nick: e.target.value.trim() || "지식 사용자" }); });
    $("myWeek").addEventListener("click", e => {
      if (e.target.id !== "mySampleWeek") return;
      const st = App.getState(), daily = st.daily.slice();
      for (let i = 6; i >= 1; i--) {
        const dt = new Date(); dt.setDate(dt.getDate() - i);
        const ds = fmtDate(dt);
        if (daily.some(x => x.date === ds)) continue;
        const kc = Math.round(st.kcalTarget * (0.78 + Math.random() * 0.42));
        daily.push({ date: ds, kcal: kc, protein: Math.round(st.proteinTarget * (0.6 + Math.random() * 0.5)), carbs: Math.round(kc * 0.5 / 4), fat: Math.round(kc * 0.25 / 9), sodium: Math.round(1500 + Math.random() * 1200), count: 3 });
      }
      App.setDaily(daily.sort((a, b) => a.date.localeCompare(b.date)));
      toast("📅 발표용 지난 기록을 채웠어요");
    });

    let raf = 0;
    window.addEventListener("jisik:change", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!document.activeElement || document.activeElement.id !== "myNick") render(); }); });
    fetch("/api/status").then(r => r.ok ? r.json() : {}).then(f => { features = { ...features, ...f }; mode(); }).catch(mode);
  }
  function mode() {
    $("foodMode").textContent = features.aiScan ? "🤖 Claude AI 분석" : "🧪 데모 모드";
    $("foodMode").className = "mode-badge " + (features.aiScan ? "on" : "");
  }

  bind();
  render();
})();
