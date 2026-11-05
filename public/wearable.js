/* ⌚ 웨어러블 건강 데이터 연동 시뮬레이션 (발표용)
 * 스마트워치·연속혈당측정기(CGM)에서 혈당·혈압·심박·활동량을 받아오는 상황을 재현하고,
 * 현재 몸 상태에 맞춰 앱의 추천 레시피 순위를 다시 매깁니다. (실제 기기와 연결되지 않는 시뮬레이션)
 */
(() => {
  "use strict";
  const App = window.JisikApp;
  if (!App || !document.getElementById("wearPanel")) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const SCEN = {
    normal:   { label: "😊 평소 상태", glu: 104, sys: 118, dia: 76, hr: 72, step: 6 },
    postmeal: { label: "🍚 식후 혈당 급상승", glu: 194, sys: 124, dia: 80, hr: 82, step: 2 },
    highbp:   { label: "🧂 짠 음식 후 혈압 상승", glu: 112, sys: 154, dia: 98, hr: 88, step: 2 },
    exercise: { label: "🏃 운동 직후", glu: 86, sys: 130, dia: 78, hr: 138, step: 55 },
    hypo:     { label: "😵 저혈당 주의", glu: 61, sys: 110, dia: 70, hr: 94, step: 3 }
  };
  const AUTO = ["postmeal", "normal", "highbp", "exercise", "hypo", "normal"];
  const DEVICES = [
    { id: "watch", icon: "⌚", name: "스마트워치", data: "심박 · 혈압 · 걸음 · 수면" },
    { id: "cgm", icon: "🩸", name: "연속혈당측정기 (CGM)", data: "5분마다 혈당" }
  ];

  let connected = false, timer = null, autoTimer = null, autoIdx = 0, scen = "normal";
  let dev = { watch: "off", cgm: "off" };
  const v = { glu: 104, sys: 118, dia: 76, hr: 72, steps: 4820, spo2: 98 };
  const hist = { glu: [], hr: [] };
  let lastState = "", lastTopId = null, changedAt = 0;

  // ---------- 상태 판정 ----------
  const gluState = g => (g = Math.round(g)) < 70 ? "low" : g <= 140 ? "normal" : g <= 180 ? "elevated" : "high";
  const bpState = (s, d) => s >= 140 || d >= 90 ? "high" : s >= 130 || d >= 85 ? "elevated" : "normal";
  const LABEL = { low: "낮음", normal: "정상", elevated: "주의", high: "높음" };
  const activeKcal = () => Math.round(v.steps * 0.042 + (scen === "exercise" ? 180 : 0));
  function body() {
    return { glu: gluState(v.glu), bp: bpState(v.sys, v.dia), ex: v.hr >= 115 || scen === "exercise" };
  }
  function trend() {
    const h = hist.glu; if (h.length < 4) return "→";
    const d = h[h.length - 1] - h[h.length - 4];
    return d > 12 ? "⬆" : d > 4 ? "↗" : d < -12 ? "⬇" : d < -4 ? "↘" : "→";
  }

  // ---------- 건강 상태 기반 추천 ----------
  function recommend() {
    const b = body();
    const list = App.topRecipes(24).map(r => {
      let h = 0; const why = [];
      if (b.glu === "high" || b.glu === "elevated") {
        if (r.tags.includes("lowgi")) { h += 14; why.push("혈당 완만"); }
        if (r.sugar <= 8) { h += 6; why.push(`당류 ${r.sugar}g`); }
        if (r.carbs > 60) h -= 16;
        if (r.sugar > 15) h -= 18;
      }
      if (b.glu === "low") {
        if (r.carbs >= 45 && r.sugar >= 12) { h += 22; why.push("빠른 탄수화물"); }
        if (r.time <= 7) { h += 8; why.push(`${r.time}분 완성`); }
      }
      if (b.bp === "high" || b.bp === "elevated") {
        if (r.sodium <= 500) { h += 16; why.push(`나트륨 ${r.sodium}mg`); }
        if (r.sodium > 900) h -= 24;
        if (r.tags.includes("lowsalt")) h += 5;
      }
      if (b.ex) {
        if (r.protein >= 25) { h += 14; why.push(`단백질 ${r.protein}g`); }
        if (r.kcal >= 450) { h += 4; why.push("회복 열량"); }
      }
      if (!why.length) why.push(...r.good.slice(0, 2));
      return { ...r, total: r.score * 0.6 + h * 2, why: [...new Set(why)].slice(0, 3) };
    }).sort((a, b2) => b2.total - a.total);

    let head, tone = "", tip = "";
    if (b.glu === "low") {
      tone = "danger"; head = `😵 혈당 ${Math.round(v.glu)}mg/dL — 저혈당 주의`;
      tip = "지금 바로 당 15g(바나나 1개, 주스 반 컵 등)을 먹고 15분 뒤 다시 측정하세요. 증상이 계속되면 의료진에게 연락하세요.";
    } else if (b.glu !== "normal") {
      tone = "warn"; head = `🩸 혈당 ${Math.round(v.glu)}mg/dL ${trend()} — 다음 끼니는 저GI·저당 메뉴로`;
      tip = "채소 → 단백질 → 탄수화물 순서로 먹고, 식후 10~15분 가볍게 걸으면 혈당이 완만해져요.";
    } else if (b.bp !== "normal") {
      tone = "warn"; head = `❤️ 혈압 ${Math.round(v.sys)}/${Math.round(v.dia)}mmHg — 저염 메뉴로 바꿨어요`;
      tip = "국물은 남기고 간장 대신 저염간장을, 칼륨이 많은 채소를 곁들여 보세요.";
    } else if (b.ex) {
      tone = "ok"; head = `🏃 운동 감지 (심박 ${Math.round(v.hr)}bpm) — 회복용 고단백 메뉴`;
      tip = `오늘 활동으로 약 ${activeKcal()}kcal를 썼어요. 운동 후 1시간 안에 단백질을 챙기면 회복에 좋아요.`;
    } else {
      tone = "ok"; head = "😊 모든 수치가 안정적이에요 — 평소 목표대로 추천해요";
      tip = "지금처럼 규칙적으로 드시면 돼요.";
    }
    return { head, tone, tip, top: list.slice(0, 3), b };
  }

  // ---------- 그리기 ----------
  function spark(data, lo, hi, band, color) {
    const W = 300, H = 90;
    const y = val => H - (Math.max(lo, Math.min(hi, val)) - lo) / (hi - lo) * H;
    const pts = data.map((d, i) => `${(i / Math.max(1, 35)) * W},${y(d).toFixed(1)}`).join(" ");
    const last = data[data.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="spark" aria-hidden="true">
      ${band ? `<rect x="0" y="${y(band[1])}" width="${W}" height="${y(band[0]) - y(band[1])}" class="band"/>` : ""}
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      ${data.length ? `<circle cx="${((data.length - 1) / 35) * W}" cy="${y(last)}" r="4" fill="${color}"/>` : ""}
    </svg>`;
  }

  function renderDevices() {
    $("wearDevices").innerHTML = DEVICES.map(d => {
      const st = dev[d.id];
      return `<li class="${st}"><span class="di">${d.icon}</span><div><b>${d.name}</b><small>${d.data}</small></div>
        <span class="ds">${st === "on" ? "● 연결됨" : st === "pairing" ? '<i class="spin"></i> 연결 중' : "연결 안 됨"}</span></li>`;
    }).join("");
  }

  function render() {
    const b = body();
    // 시계 화면
    $("wearFace").className = `watch-face ${connected ? b.glu : ""}`;
    $("wearFace").innerHTML = connected ? `
      <small>혈당</small><b>${Math.round(v.glu)}<span>${trend()}</span></b><small>mg/dL · ${LABEL[b.glu]}</small>
      <div class="wf-row"><span>❤ ${Math.round(v.hr)}</span><span>👟 ${v.steps.toLocaleString()}</span></div>` : '<span class="wf-off">⌚<br>연결 대기 중</span>';

    if (!connected) {
      $("wearMetrics").innerHTML = `<div class="metric wide off"><b>📡 기기를 연결해 주세요</b><p>위의 <b>🔗 기기 연결하기</b>를 누르면 스마트워치와 혈당 센서의 데이터가 실시간으로 들어와요.</p></div>`;
      $("wearReco").innerHTML = "";
      return;
    }
    const bp = bpState(v.sys, v.dia);
    $("wearMetrics").innerHTML = `
      <div class="metric wide ${b.glu}">
        <div class="m-top"><span>🩸 혈당 (CGM)</span><em class="st ${b.glu}">${LABEL[b.glu]}</em></div>
        <div class="m-val"><b>${Math.round(v.glu)}</b><small>mg/dL</small><span class="trend">${trend()}</span></div>
        ${spark(hist.glu, 40, 240, [70, 140], b.glu === "normal" ? "#2f8f4e" : b.glu === "low" ? "#d6336c" : "#e8590c")}
        <div class="m-foot"><span>최근 3시간</span><span>정상 범위 70~140</span></div>
      </div>
      <div class="metric ${bp}">
        <div class="m-top"><span>❤️ 혈압</span><em class="st ${bp}">${LABEL[bp]}</em></div>
        <div class="m-val"><b>${Math.round(v.sys)}/${Math.round(v.dia)}</b><small>mmHg</small></div>
        <div class="bp-bar"><i style="left:${Math.min(100, Math.max(0, (v.sys - 90) / 80 * 100))}%"></i></div>
        <div class="m-foot"><span>90</span><span>130</span><span>170</span></div>
      </div>
      <div class="metric ${b.ex ? "elevated" : "normal"}">
        <div class="m-top"><span>💓 심박</span><em class="st ${b.ex ? "elevated" : "normal"}">${b.ex ? "운동 중" : "안정"}</em></div>
        <div class="m-val"><b>${Math.round(v.hr)}</b><small>bpm</small></div>
        ${spark(hist.hr, 50, 170, null, "#d6336c")}
      </div>
      <div class="metric">
        <div class="m-top"><span>👟 활동</span><em class="st normal">${Math.round(v.steps / 100)}%</em></div>
        <div class="m-val"><b>${v.steps.toLocaleString()}</b><small>걸음</small></div>
        <div class="bar"><div class="bar-fill" style="width:${Math.min(100, v.steps / 100)}%"></div></div>
        <div class="m-foot"><span>활동 칼로리 ${activeKcal()}kcal</span><span>목표 10,000</span></div>
      </div>
      <div class="metric">
        <div class="m-top"><span>😴 수면 · 산소</span><em class="st normal">양호</em></div>
        <div class="m-val"><b>6:48</b><small>어젯밤 수면</small></div>
        <div class="m-foot"><span>SpO₂ ${v.spo2}%</span><span>깊은 잠 1:32</span></div>
      </div>`;

    const rc = recommend();
    const changed = lastTopId !== null && lastTopId !== rc.top[0]?.id;
    lastTopId = rc.top[0]?.id;
    if (changed) changedAt = Date.now();
    const recent = Date.now() - changedAt < 6000;
    $("wearReco").innerHTML = `
      <div class="reco-head ${rc.tone}"><b>${esc(rc.head)}</b><p>${esc(rc.tip)}</p></div>
      <div class="reco-sub">지금 몸 상태 + <b>${esc(App.getState().goalLabel)}</b> 목표 + 냉장고 재료로 다시 고른 추천 ${recent ? '<span class="new">추천 변경됨</span>' : ""}</div>
      <div class="reco-cards">${rc.top.map((r, i) => `
        <button type="button" class="reco-card ${changed && i === 0 ? "pop" : ""}" data-recipe="${r.id}">
          <span class="rk">${i + 1}</span><span class="em">${r.emoji}</span>
          <b>${esc(r.name)}</b><small>${r.kcal}kcal · ${r.time}분${r.missing.length ? ` · 🛒 ${r.missing.length}개 부족` : ""}</small>
          <span class="whys">${r.why.map(w => `<i>✓ ${esc(w)}</i>`).join("")}</span>
        </button>`).join("")}</div>`;

    // 상태가 바뀌면 알림 기록
    const key = `${b.glu}-${bpState(v.sys, v.dia)}-${b.ex}`;
    if (key !== lastState) {
      if (lastState) log(rc.tone === "danger" ? "out" : rc.tone === "warn" ? "warn" : "in", `${rc.head} → 1위 ${rc.top[0]?.emoji || ""} ${rc.top[0]?.name || ""}`);
      lastState = key;
    }
  }

  function log(kind, text) {
    const ol = $("wearLog");
    ol.querySelector(".empty-log")?.remove();
    ol.insertAdjacentHTML("afterbegin", `<li class="${kind}"><time>${new Date().toTimeString().slice(0, 8)}</time><span>${esc(text)}</span></li>`);
    while (ol.children.length > 30) ol.lastElementChild.remove();
  }

  function renderScenarios() {
    $("wearScenarios").innerHTML = Object.entries(SCEN).map(([k, s]) =>
      `<button type="button" data-scen="${k}" class="${k === scen ? "on" : ""}" ${connected ? "" : "disabled"}>${s.label}</button>`).join("");
  }

  // ---------- 시뮬레이션 ----------
  const noise = a => (Math.random() - 0.5) * a;
  function step() {
    const t = SCEN[scen];
    v.glu += (t.glu - v.glu) * 0.35 + noise(4);
    v.sys += (t.sys - v.sys) * 0.35 + noise(2.5);
    v.dia += (t.dia - v.dia) * 0.35 + noise(2);
    v.hr += (t.hr - v.hr) * 0.4 + noise(3);
    v.steps += Math.round(t.step * (0.6 + Math.random() * 0.8));
    v.spo2 = Math.round(97 + Math.random() * 2);
    hist.glu.push(v.glu); hist.hr.push(v.hr);
    if (hist.glu.length > 36) { hist.glu.shift(); hist.hr.shift(); }
    window.JisikHealth.vals = { ...v };
    render();
  }
  function setScen(k) {
    scen = k; renderScenarios();
    log("info", `${SCEN[k].label} 상황으로 바꿨어요`);
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  async function connect() {
    const btn = $("wearConnect");
    if (connected) {
      connected = false; clearInterval(timer); stopAuto();
      dev = { watch: "off", cgm: "off" }; renderDevices(); renderScenarios(); render();
      btn.textContent = "🔗 기기 연결하기"; $("wearAuto").disabled = true;
      window.JisikHealth.connected = false;
      log("info", "기기 연결을 해제했어요");
      return;
    }
    btn.disabled = true;
    for (const d of DEVICES) {
      dev[d.id] = "pairing"; renderDevices(); await wait(900);
      dev[d.id] = "on"; renderDevices(); log("in", `${d.icon} ${d.name} 연결됨 — ${d.data} 수신 시작`);
    }
    // 처음 그래프가 비어 보이지 않게 최근 기록을 채워 넣음
    hist.glu = []; hist.hr = [];
    for (let i = 0; i < 36; i++) { hist.glu.push(100 + Math.sin(i / 5) * 12 + noise(6)); hist.hr.push(70 + noise(6)); }
    connected = true; window.JisikHealth.connected = true;
    btn.disabled = false; btn.textContent = "🔌 연결 해제"; $("wearAuto").disabled = false;
    renderScenarios(); step();
    timer = setInterval(step, 1200);
  }
  function startAuto() {
    $("wearAuto").textContent = "■ 시나리오 멈춤"; $("wearAuto").classList.add("running");
    autoIdx = 0; setScen(AUTO[autoIdx]);
    autoTimer = setInterval(() => { autoIdx = (autoIdx + 1) % AUTO.length; setScen(AUTO[autoIdx]); }, 9000);
  }
  function stopAuto() {
    clearInterval(autoTimer); autoTimer = null;
    $("wearAuto").textContent = "▶ 자동 시나리오"; $("wearAuto").classList.remove("running");
  }

  // AI 상담에서도 쓸 수 있게 공개
  window.JisikHealth = {
    connected: false, vals: { ...v },
    summary: () => {
      if (!connected) return null;
      const b = body(), rc = recommend();
      return { 혈당: `${Math.round(v.glu)}mg/dL(${LABEL[b.glu]})`, 혈압: `${Math.round(v.sys)}/${Math.round(v.dia)}mmHg(${LABEL[bpState(v.sys, v.dia)]})`, 심박: `${Math.round(v.hr)}bpm`, 걸음: v.steps, 활동칼로리: activeKcal(), 상태: rc.head, 조언: rc.tip, 추천: rc.top.map(r => ({ id: r.id, name: r.name, emoji: r.emoji, why: r.why })) };
    }
  };

  function bind() {
    $("wearConnect").addEventListener("click", connect);
    $("wearAuto").addEventListener("click", () => autoTimer ? stopAuto() : startAuto());
    $("wearScenarios").addEventListener("click", e => { const b = e.target.closest("[data-scen]"); if (b && connected) { stopAuto(); setScen(b.dataset.scen); } });
    $("wearReco").addEventListener("click", e => { const b = e.target.closest("[data-recipe]"); if (b) App.openRecipe(b.dataset.recipe); });
    window.addEventListener("jisik:change", () => { if (connected) render(); });
  }

  bind(); renderDevices(); renderScenarios(); render();
})();
