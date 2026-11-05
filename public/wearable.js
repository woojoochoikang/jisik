/* ⌚ 웨어러블 건강 데이터 시연 페이지
 * 7개 항목(혈당·혈압·심박수·산소포화도·심전도·체온·활동량)의 현재값과 개인 기준 범위 판정,
 * 항목별 시간대별 그래프와 기준 범위 설정, 건강 상태에 맞춘 식단 추천을 보여줍니다. (데이터: health.js)
 */
(() => {
  "use strict";
  const App = window.JisikApp, H = window.JisikHealth;
  const panel = document.getElementById("wearPanel");
  if (!App || !H || !panel) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = msg => { const t = $("toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); };
  const ORDER = ["glu", "bp", "hr", "spo2", "ecg", "temp", "act"];
  const LV_ICON = { ok: "✅", warn: "⚠️", bad: "🚨" };
  const COLOR = { glu: "#e8590c", sys: "#d6336c", dia: "#1c7ed6", hr: "#c2255c", spo2: "#1971c2", qtc: "#7048e8", temp: "#f08c00", steps: "#2f8f4e" };
  const AUTO = ["postmeal", "normal", "highbp", "exercise", "hypo", "fever", "normal"];
  const fmt = (k, v) => k === "temp" ? (+v).toFixed(1) : k === "steps" ? Math.round(v).toLocaleString() : Math.round(v);
  const hhmm = d => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  let collected = false, measuring = false; // '건강 데이터 수집' 버튼을 눌러야 데이터가 보임
  let openKey = null, autoTimer = null, autoIdx = 0, lastKey = "", lastTop = null, changedAt = 0;

  // ---------- 화면 뼈대 ----------
  panel.innerHTML = `
    <div class="sim-head">
      <div>
        <span class="sim-eyebrow">WEARABLE HEALTH · 시연용 가상 데이터</span>
        <h1>⌚건강 데이터</h1>
        <p>황성욱님의 스마트워치·연속혈당측정기 데이터를 <b>개인 기준 범위</b>로 판정해요. <b>항목을 누르면</b> 시간대별 그래프와 기준 설정이 열려요.</p>
      </div>
      <div class="wear-live">
        <span class="live" id="wLive" hidden><i></i>실시간 수신 중</span>
        <span class="dev">⌚ 스마트워치 연결됨</span><span class="dev">🩸 CGM 연결됨</span>
        <button type="button" class="primary collect-btn" id="wCollect">📡 건강 데이터 수집</button>
      </div>
    </div>
    <div class="wear-legend"><span class="lv lv-ok">✅ 안정 · 목표 범위 안</span><span class="lv lv-warn">⚠️ 주의 · 범위에 근접하거나 벗어남</span><span class="lv lv-bad">🚨 확인 필요 · 위험 기준을 크게 벗어남</span></div>
    <div class="wgrid" id="wGrid"></div>
    <div class="measuring" id="wMeasure" hidden role="status" aria-live="assertive"></div>
    <div class="wear-scen">
      <b>🎬 상황 시뮬레이션</b>
      <div class="scen-btns" id="wScen"></div>
      <button type="button" class="ghost small" id="wAuto">▶ 자동 시나리오</button>
    </div>
    <div class="wear-reco" id="wearReco"></div>
    <div class="sim-card"><h2>🔔 건강 알림</h2><ol class="sim-log" id="wearLog"><li class="empty-log">상태가 바뀌면 여기에 기록돼요.</li></ol></div>
    <p class="wear-note">※ 모든 수치와 그래프는 발표용 가상 데이터예요. 실제 기기와 연결되지 않으며 의학적 진단을 대신하지 않아요.</p>`;

  document.body.insertAdjacentHTML("beforeend", `
    <dialog id="wearDetail" class="wd" aria-labelledby="wdTitle">
      <div class="modal">
        <button type="button" class="close" data-wd-close aria-label="닫기">✕</button>
        <div class="wd-head" id="wdHead"></div>
        <div class="wd-chart" id="wdChart"><div class="wd-tip" id="wdTip" hidden></div></div>
        <div class="wd-extra" id="wdExtra"></div>
        <div class="wd-stats" id="wdStats"></div>
        <form class="wd-form" id="wdForm"></form>
      </div>
    </dialog>`);

  // ---------- 작은 그림들 ----------
  function spark(k, n = 18) {
    const d = H.series(k).slice(-n), r = H.ranges()[k];
    const vals = d.concat(r && r.lo !== undefined ? [r.lo, r.hi] : []);
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.15 || 1;
    const y = v => 40 - (v - lo + pad) / (hi - lo + pad * 2) * 40;
    const pts = d.map((v, i) => `${(i / (d.length - 1)) * 200},${y(v).toFixed(1)}`).join(" ");
    const band = r && r.lo !== undefined ? `<rect x="0" y="${y(r.hi)}" width="200" height="${Math.max(0, y(r.lo) - y(r.hi))}" class="band"/>` : "";
    return `<svg viewBox="0 0 200 40" preserveAspectRatio="none" class="wspark">${band}<polyline points="${pts}" fill="none" stroke="${COLOR[k]}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }
  // 심전도 파형 (시연용 PQRST 반복)
  function ecgPath(beats, w, hr) {
    const bw = w / beats, y0 = 30;
    let d = `M0 ${y0}`;
    for (let b = 0; b < beats; b++) {
      const x = b * bw, s = bw / 100;
      d += ` L${x + 10 * s} ${y0} Q${x + 15 * s} ${y0 - 6} ${x + 20 * s} ${y0} L${x + 30 * s} ${y0} L${x + 33 * s} ${y0 + 5} L${x + 37 * s} ${y0 - 26} L${x + 41 * s} ${y0 + 10} L${x + 45 * s} ${y0} L${x + 58 * s} ${y0} Q${x + 66 * s} ${y0 - 10} ${x + 74 * s} ${y0} L${x + 100 * s} ${y0}`;
    }
    return d;
  }
  function ecgSvg(cls = "") {
    const hr = H.cur.hr, beats = Math.max(3, Math.round(hr / 20));
    const dur = (60 / hr) * beats; // 실제 박동 속도에 맞춰 흐르게
    return `<div class="ecg ${cls}"><svg viewBox="0 0 400 46" preserveAspectRatio="none"><g style="animation-duration:${dur.toFixed(2)}s"><path d="${ecgPath(beats, 400)}"/><path d="${ecgPath(beats, 400)}" transform="translate(400 0)"/></g></svg></div>`;
  }

  // ---------- 카드 ----------
  function rangeText(mk) {
    const r = H.ranges();
    if (mk === "bp") return `목표 수축기 ${r.sys.lo}–${r.sys.hi} / 이완기 ${r.dia.lo}–${r.dia.hi}`;
    if (mk === "act") return `목표 ${r.steps.goal.toLocaleString()}걸음 · 활동 ${r.steps.kcalGoal}kcal`;
    if (mk === "ecg") return `기준 QTc ${r.qtc.lo}–${r.qtc.hi}ms · 심박 60–100`;
    const k = Object.keys(H.METRICS[mk].series)[0];
    return `목표 ${r[k].lo}–${r[k].hi}${H.METRICS[mk].unit}`;
  }
  function card(mk) {
    const m = H.METRICS[mk], st = H.status(mk), c = H.cur;
    let val;
    if (mk === "bp") {
      const s = H.levelOf("sys", c.sys).level, d = H.levelOf("dia", c.dia).level;
      val = `<div class="wc-bp"><div class="lvt-${s}"><small>수축기</small><b>${c.sys}</b></div><span>/</span><div class="lvt-${d}"><small>이완기</small><b>${c.dia}</b></div><em>mmHg</em></div>`;
    } else if (mk === "act") {
      const a = H.activity();
      val = `<div class="wc-val"><b>${c.steps.toLocaleString()}</b><em>걸음</em></div>
        <div class="bar"><div class="bar-fill" style="width:${Math.min(100, a.rate)}%"></div></div>
        <div class="wc-sub">달성률 <b>${a.rate}%</b> · 활동 ${a.kcal}kcal</div>`;
    } else if (mk === "ecg") {
      const e = H.ecg();
      val = `${ecgSvg()}<div class="wc-sub"><b>${e.rhythm}</b> · QTc ${c.qtc}ms</div>`;
    } else {
      const k = Object.keys(m.series)[0];
      val = `<div class="wc-val"><b>${fmt(k, c[k])}</b><em>${m.unit}</em></div>`;
    }
    const sp = mk === "bp" ? spark("sys") : mk === "ecg" || mk === "act" ? "" : spark(Object.keys(m.series)[0]);
    return `<button type="button" class="wcard lv-${st.level} ${mk === "glu" || mk === "bp" ? "big" : ""} ${mk === "ecg" ? "wide" : ""}" data-m="${mk}" aria-label="${m.name} ${H.LEVEL[st.level]}, 눌러서 그래프 보기">
      <div class="wc-top"><span class="wc-name">${m.icon} ${m.name}</span><span class="lv lv-${st.level}">${LV_ICON[st.level]} ${H.LEVEL[st.level]}</span></div>
      ${val}
      ${sp}
      <div class="wc-range">${rangeText(mk)}</div>
      <div class="wc-foot"><span class="why">${esc(st.why)}</span><span class="more">그래프 · 기준 설정 ›</span></div>
    </button>`;
  }

  // ---------- 건강 상태 기반 추천 ----------
  function reco() {
    const c = H.cur, r = H.ranges();
    const gHigh = c.glu > r.glu.hi, gLow = c.glu < r.glu.lo, bpHigh = H.status("bp").level !== "ok" && (c.sys > r.sys.hi - 3 || c.dia > r.dia.hi - 2);
    const ex = c.hr > 110 || H.scenario() === "exercise", fever = c.temp > r.temp.hi;
    const list = App.topRecipes(24).map(x => {
      let h = 0; const why = [];
      if (gHigh) { if (x.tags.includes("lowgi")) { h += 14; why.push("혈당 완만"); } if (x.sugar <= 8) { h += 6; why.push(`당류 ${x.sugar}g`); } if (x.carbs > 60) h -= 16; if (x.sugar > 15) h -= 18; }
      if (gLow) { if (x.carbs >= 45 && x.sugar >= 12) { h += 22; why.push("빠른 탄수화물"); } if (x.time <= 7) { h += 8; why.push(`${x.time}분 완성`); } }
      if (bpHigh) { if (x.sodium <= 500) { h += 16; why.push(`나트륨 ${x.sodium}mg`); } if (x.sodium > 900) h -= 24; }
      if (ex) { if (x.protein >= 25) { h += 14; why.push(`단백질 ${x.protein}g`); } }
      if (fever && /수프|국|죽|찌개/.test(x.name)) { h += 10; why.push("따뜻하고 소화 쉬움"); }
      if (!why.length) why.push(...x.good.slice(0, 2));
      return { ...x, total: x.score * 0.6 + h * 2, why: [...new Set(why)].slice(0, 3) };
    }).sort((a, b) => b.total - a.total);
    let head, tone = "ok", tip;
    if (gLow) { tone = "danger"; head = `😵 혈당 ${c.glu}mg/dL — 저혈당 주의`; tip = "지금 바로 당 15g(바나나 1개, 주스 반 컵)을 먹고 15분 뒤 다시 측정하세요. 증상이 계속되면 의료진에게 연락하세요."; }
    else if (gHigh) { tone = c.glu > r.glu.dhi ? "danger" : "warn"; head = `🩸 혈당 ${c.glu}mg/dL — 다음 끼니는 저GI·저당 메뉴로`; tip = "채소 → 단백질 → 탄수화물 순서로 먹고, 식후 10~15분 가볍게 걸으면 혈당이 완만해져요."; }
    else if (bpHigh) { tone = H.status("bp").level === "bad" ? "danger" : "warn"; head = `❤️ 혈압 ${c.sys}/${c.dia}mmHg — 저염 메뉴로 추천해요`; tip = "국물은 남기고 저염간장을 쓰세요. 칼륨이 많은 시금치·토마토가 도움이 돼요."; }
    else if (ex) { head = `🏃 운동 감지 (심박 ${c.hr}bpm) — 회복용 고단백 메뉴`; tip = `오늘 활동 ${H.activity().kcal}kcal. 운동 후 1시간 안에 단백질을 챙기세요.`; }
    else if (fever) { tone = "warn"; head = `🌡️ 체온 ${c.temp}℃ — 따뜻하고 소화가 쉬운 메뉴`; tip = "수분을 충분히 마시고 무리한 운동은 쉬어 주세요."; }
    else { head = "😊 수치가 대체로 안정적이에요 — 평소 목표대로 추천해요"; tip = "지금처럼 규칙적으로 드시면 돼요."; }
    return { head, tone, tip, top: list.slice(0, 3) };
  }

  // ---------- 그리기 ----------
  function renderEmpty() {
    $("wGrid").innerHTML = ORDER.map(mk => { const m = H.METRICS[mk]; return `
      <div class="wcard empty ${mk === "ecg" ? "wide" : ""}">
        <div class="wc-top"><span class="wc-name">${m.icon} ${m.name}</span><span class="lv lv-none">수집 전</span></div>
        <div class="wc-val"><b>--</b><em>${mk === "bp" ? "mmHg" : mk === "act" ? "걸음" : mk === "ecg" ? "" : m.unit}</em></div>
        <div class="wc-range">${rangeText(mk)}</div>
      </div>`; }).join("");
    $("wScen").innerHTML = Object.values(H.SCEN).map(s => `<button type="button" disabled>${s.label}</button>`).join("");
    $("wearReco").innerHTML = `<div class="collect-hint"><span>📡</span><div><b>아직 오늘의 건강 데이터를 수집하지 않았어요</b><p>위의 <b>건강 데이터 수집</b> 버튼을 누르면 스마트워치와 혈당 센서에서 측정값을 받아와 상태를 판정하고 식단을 추천해요.</p></div><button type="button" class="primary" data-collect>📡 지금 수집하기</button></div>`;
  }

  // 측정 중 화면 (약 1.6초) → 수집 완료
  const STEPS = ["⌚ 스마트워치 연결 확인", "💓 심박·혈압·산소포화도 측정", "📈 심전도 파형 기록", "🩸 연속혈당 데이터 동기화", "🌡️ 체온·활동량 정리"];
  function collect() {
    if (measuring) return Promise.resolve();
    measuring = true;
    const box = $("wMeasure"), btn = $("wCollect");
    btn.disabled = true; btn.textContent = "⏳ 측정 중…";
    box.innerHTML = `<div class="m-card"><div class="m-ring"><span>⌚</span></div><b>건강 데이터 측정 중…</b>
      <ul>${STEPS.map((t, i) => `<li style="--d:${i * 0.3}s"><i></i>${t}</li>`).join("")}</ul><div class="m-bar"><span></span></div></div>`;
    box.hidden = false; requestAnimationFrame(() => box.classList.add("show"));
    return new Promise(res => setTimeout(() => {
      box.classList.remove("show");
      setTimeout(() => { box.hidden = true; }, 250);
      collected = true; measuring = false;
      btn.disabled = false; btn.textContent = "🔄 다시 측정";
      $("wLive").hidden = false;
      lastKey = ""; render();
      $("wGrid").classList.add("fresh"); setTimeout(() => $("wGrid").classList.remove("fresh"), 900);
      log("ok", `✅ 건강 데이터 수집 완료 — 7개 항목 (${new Date().toTimeString().slice(0, 5)})`);
      toast("✅ 건강 데이터 수집 완료");
      res();
    }, 1700));
  }

  function render() {
    if (!collected) { renderEmpty(); return; }
    $("wGrid").innerHTML = ORDER.map(card).join("");
    $("wScen").innerHTML = Object.entries(H.SCEN).map(([k, s]) => `<button type="button" data-scen="${k}" class="${H.scenario() === k ? "on" : ""}">${s.label}</button>`).join("");
    const rc = reco();
    if (lastTop !== null && lastTop !== rc.top[0]?.id) changedAt = Date.now();
    lastTop = rc.top[0]?.id;
    $("wearReco").innerHTML = `
      <div class="reco-head ${rc.tone}"><b>${esc(rc.head)}</b><p>${esc(rc.tip)}</p></div>
      <div class="reco-sub">지금 건강 상태 + <b>${esc(App.getState().goalLabel)}</b> 목표 + 냉장고 재료로 고른 추천 ${Date.now() - changedAt < 6000 ? '<span class="new">추천 변경됨</span>' : ""}</div>
      <div class="reco-cards">${rc.top.map((r, i) => `
        <button type="button" class="reco-card" data-recipe="${r.id}"><span class="rk">${i + 1}</span><span class="em">${r.emoji}</span>
          <b>${esc(r.name)}</b><small>${r.kcal}kcal · ${r.time}분${r.missing.length ? ` · 🛒 ${r.missing.length}개 부족` : ""}</small>
          <span class="whys">${r.why.map(w => `<i>✓ ${esc(w)}</i>`).join("")}</span></button>`).join("")}</div>`;
    // 상태 변화 알림
    const levels = ORDER.map(k => H.status(k).level), key = levels.join("|");
    if (key !== lastKey) {
      if (lastKey) {
        const prev = lastKey.split("|");
        const changed = ORDER.filter((k, i) => prev[i] !== levels[i]);
        changed.forEach(k => { const st = H.status(k); log(st.level, `${H.METRICS[k].icon} ${H.METRICS[k].name} ${LV_ICON[st.level]} ${H.LEVEL[st.level]} — ${st.why}`); });
      }
      lastKey = key;
    }
    if (openKey) renderDetail(true);
  }
  function log(level, text) {
    const ol = $("wearLog");
    ol.querySelector(".empty-log")?.remove();
    ol.insertAdjacentHTML("afterbegin", `<li class="${level === "ok" ? "in" : level === "warn" ? "warn" : "out"}"><time>${new Date().toTimeString().slice(0, 8)}</time><span>${esc(text)}</span></li>`);
    while (ol.children.length > 30) ol.lastElementChild.remove();
  }

  // ---------- 상세: 시간대별 그래프 ----------
  const W = 780, HT = 300, L = 50, R = 122, T = 16, B = 34;
  let geo = null;
  function chartSvg(mk) {
    const m = H.METRICS[mk], keys = Object.keys(m.series), rg = H.ranges(), times = H.times, n = times.length;
    const all = keys.flatMap(k => H.series(k));
    let lo, hi;
    if (mk === "act") { lo = 0; hi = Math.max(rg.steps.goal * 1.15, ...all); }
    else {
      const lims = keys.flatMap(k => [rg[k].lo, rg[k].hi, rg[k].dlo, rg[k].dhi]);
      lo = Math.min(...all, ...lims); hi = Math.max(...all, ...lims);
      const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      if (mk === "spo2") hi = Math.min(hi, 100.5);
    }
    const x = i => L + i / (n - 1) * (W - L - R);
    const y = v => T + (1 - (v - lo) / (hi - lo)) * (HT - T - B);
    geo = { x, y, n, keys, mk, lo, hi };
    let g = "";
    // 가로 눈금
    for (let i = 0; i <= 5; i++) {
      const v = lo + (hi - lo) * i / 5, yy = y(v);
      g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" class="grid"/><text x="${L - 8}" y="${yy + 4}" class="ax" text-anchor="end">${mk === "temp" ? v.toFixed(1) : mk === "act" ? Math.round(v / 100) / 10 + "k" : Math.round(v)}</text>`;
    }
    // 시간 눈금 (2시간마다)
    times.forEach((t, i) => { if (t.getMinutes() === 0 && t.getHours() % 2 === 0) g += `<line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${HT - B}" class="grid v"/><text x="${x(i)}" y="${HT - B + 18}" class="ax" text-anchor="middle">${hhmm(t)}</text>`; });
    // 기준 범위
    if (mk === "act") {
      g += `<line x1="${L}" x2="${W - R}" y1="${y(rg.steps.goal)}" y2="${y(rg.steps.goal)}" class="goal"/><text x="${W - R + 6}" y="${y(rg.steps.goal) + 4}" class="lbl ok">목표 ${rg.steps.goal.toLocaleString()}</text>`;
    } else {
      keys.forEach((k, ki) => {
        const r = rg[k];
        g += `<rect x="${L}" width="${W - L - R}" y="${y(r.hi)}" height="${Math.max(0, y(r.lo) - y(r.hi))}" class="band b${ki}"/>`;
        g += `<text x="${W - R + 6}" y="${(y(r.hi) + y(r.lo)) / 2 + 4}" class="lbl ok">${keys.length > 1 ? m.series[k].slice(0, 2) + " " : ""}목표 ${r.lo}–${r.hi}</text>`;
        [["dhi", "위험 상한"], ["dlo", "위험 하한"]].forEach(([dk, label]) => {
          const v = r[dk]; if (v < lo || v > hi || (mk === "spo2" && dk === "dhi") || (k === "sys" && dk === "dlo")) return; // 겹치는 선은 생략
          g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="danger"/><text x="${W - R + 6}" y="${y(v) + 4}" class="lbl bad">${keys.length > 1 ? m.series[k].slice(0, 2) + " " : ""}${label} ${v}</text>`;
        });
      });
    }
    // 데이터 선 + 기준 밖 점
    keys.forEach(k => {
      const d = H.series(k);
      g += `<polyline points="${d.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="${COLOR[k]}" stroke-width="2.5" stroke-linejoin="round"/>`;
      if (mk !== "act") d.forEach((v, i) => { const lv = H.levelOf(k, v).level; if (lv !== "ok" && i % 2 === 0) g += `<circle cx="${x(i)}" cy="${y(v)}" r="3" class="pt ${lv}"/>`; });
      const last = d[n - 1];
      g += `<circle cx="${x(n - 1)}" cy="${y(last)}" r="6" fill="${COLOR[k]}" class="now"/><g class="nowlbl" transform="translate(${x(n - 1) - 4} ${y(last) - 12})"><rect x="-52" y="-15" width="56" height="20" rx="6" fill="${COLOR[k]}"/><text x="-24" y="0" text-anchor="middle">${fmt(k, last)}</text></g>`;
    });
    g += `<line class="hover-line" id="wdHover" x1="0" x2="0" y1="${T}" y2="${HT - B}" style="display:none"/><rect x="${L}" y="${T}" width="${W - L - R}" height="${HT - T - B}" fill="transparent" class="hit"/>`;
    return `<svg viewBox="0 0 ${W} ${HT}" class="wd-svg" role="img" aria-label="${m.name} 시간대별 변화 그래프">${g}</svg>`;
  }

  function stats(mk) {
    const m = H.METRICS[mk], keys = Object.keys(m.series), rg = H.ranges();
    if (mk === "act") {
      const a = H.activity(), d = H.series("steps"), times = H.times;
      // 시간대별 걸음 (1시간 단위)
      const hours = {};
      d.forEach((v, i) => { if (i) { const h = times[i].getHours(); hours[h] = (hours[h] || 0) + Math.max(0, v - d[i - 1]); } });
      const best = Object.entries(hours).sort((p, q) => q[1] - p[1])[0];
      return `<div><small>현재 걸음</small><b>${H.cur.steps.toLocaleString()}</b></div><div><small>목표 달성률</small><b>${a.rate}%</b></div>
        <div><small>지금 시간 기준 기대치</small><b>${a.expected.toLocaleString()}</b></div><div><small>활동 칼로리</small><b>${a.kcal} / ${rg.steps.kcalGoal}kcal</b></div>
        <div><small>가장 활발한 시간</small><b>${best ? `${best[0]}시 (${Math.round(best[1]).toLocaleString()}걸음)` : "-"}</b></div>`;
    }
    return keys.map(k => {
      const d = H.series(k), r = rg[k];
      const inRange = Math.round(d.filter(v => v >= r.lo && v <= r.hi).length / d.length * 100);
      const avg = d.reduce((a, b) => a + b, 0) / d.length;
      const nm = keys.length > 1 ? `${m.series[k]} ` : "";
      return `<div><small>${nm}현재</small><b>${fmt(k, H.cur[k])}</b></div><div><small>${nm}최고</small><b>${fmt(k, Math.max(...d))}</b></div>
        <div><small>${nm}최저</small><b>${fmt(k, Math.min(...d))}</b></div><div><small>${nm}평균</small><b>${fmt(k, avg)}</b></div>
        <div class="tir"><small>${nm}목표 범위 안 비율</small><b>${inRange}%</b><span class="bar"><span class="bar-fill" style="width:${inRange}%"></span></span></div>`;
    }).join("");
  }

  function form(mk) {
    const m = H.METRICS[mk], rg = H.ranges();
    if (mk === "act") {
      return `<h3>⚙️ 개인 목표 설정</h3>
        <div class="wd-row"><span>👟 하루 걸음 목표</span><label>걸음<input type="number" name="steps.goal" value="${rg.steps.goal}" min="1000" max="30000" step="500"></label>
        <label>활동 칼로리<input type="number" name="steps.kcalGoal" value="${rg.steps.kcalGoal}" min="50" max="2000" step="10"></label></div>
        <p class="wd-hint">지금 시간까지 기대되는 걸음 수 대비 90% 이상이면 <b>안정</b>, 60~90%면 <b>주의</b>, 60% 미만이면 <b>확인 필요</b>로 표시해요.</p>
        <div class="wd-btns"><button type="button" class="ghost" data-reset>기본값으로</button><button type="submit" class="primary">저장하고 다시 판정</button></div>`;
    }
    const step = mk === "temp" ? "0.1" : "1";
    return `<h3>⚙️ 개인 기준 범위 설정 ${mk === "ecg" ? "<small>(QTc 간격 기준)</small>" : ""}</h3>
      ${Object.entries(m.series).map(([k, label]) => {
        const r = rg[k];
        return `<div class="wd-row"><span>${label}</span>
          <label class="bad">위험 하한<input type="number" name="${k}.dlo" value="${r.dlo}" step="${step}"></label>
          <label class="ok">목표 하한<input type="number" name="${k}.lo" value="${r.lo}" step="${step}"></label>
          <label class="ok">목표 상한<input type="number" name="${k}.hi" value="${r.hi}" step="${step}"></label>
          <label class="bad">위험 상한<input type="number" name="${k}.dhi" value="${r.dhi}" step="${step}"></label></div>`;
      }).join("")}
      <p class="wd-hint">목표 범위 안이면 <b class="t-ok">안정</b>, 목표 범위 경계에 가깝거나 벗어나면 <b class="t-warn">주의</b>, 위험 기준을 넘으면 <b class="t-bad">확인 필요</b>로 표시해요.</p>
      <div class="wd-btns"><button type="button" class="ghost" data-reset>기본값으로</button><button type="submit" class="primary">저장하고 다시 판정</button></div>`;
  }

  function renderDetail(live) {
    const mk = openKey, m = H.METRICS[mk], st = H.status(mk), c = H.cur;
    const now = mk === "bp" ? `${c.sys}/${c.dia}<em>mmHg</em>` : mk === "act" ? `${c.steps.toLocaleString()}<em>걸음</em>` : mk === "ecg" ? `${c.qtc}<em>ms (QTc)</em>` : `${fmt(Object.keys(m.series)[0], c[Object.keys(m.series)[0]])}<em>${m.unit}</em>`;
    $("wdHead").innerHTML = `<span class="wd-icon">${m.icon}</span><div><h2 id="wdTitle">${m.name} <small>${m.src}</small></h2>
      <p>최근 ${Math.round(H.times.length * H.STEP_MIN / 60)}시간 · ${H.STEP_MIN}분 간격 · ${hhmm(H.times[0])} ~ ${hhmm(H.times[H.times.length - 1])}</p></div>
      <div class="wd-now"><b>${now}</b><span class="lv lv-${st.level}">${LV_ICON[st.level]} ${H.LEVEL[st.level]}</span><small>${esc(st.why)}</small></div>`;
    const tip = $("wdTip");
    $("wdChart").innerHTML = chartSvg(mk); $("wdChart").appendChild(tip);
    if (mk === "ecg") {
      const e = H.ecg(), r = H.ranges().qtc;
      $("wdExtra").innerHTML = `<div class="ecg-box">${ecgSvg("big")}<div class="ecg-meta"><b>판정: ${e.rhythm}</b><span class="lv lv-${e.level}">${LV_ICON[e.level]} ${H.LEVEL[e.level]}</span></div>
        <table class="ecg-tbl"><tr><th>항목</th><th>현재</th><th>시연용 기준</th></tr>
        <tr><td>심박수</td><td>${c.hr}bpm</td><td>60–100bpm</td></tr><tr><td>PR 간격</td><td>${e.pr}ms</td><td>120–200ms</td></tr>
        <tr><td>QRS 폭</td><td>${e.qrs}ms</td><td>120ms 미만</td></tr><tr><td>QTc 간격</td><td>${c.qtc}ms</td><td>${r.lo}–${r.hi}ms (설정값)</td></tr></table>
        <p class="wd-hint">위 그래프는 시간대별 QTc 간격 변화예요. 실제 심전도 해석은 의료진이 해야 해요.</p></div>`;
    } else $("wdExtra").innerHTML = "";
    $("wdStats").innerHTML = stats(mk);
    if (!live) $("wdForm").innerHTML = form(mk);
  }

  function openDetail(mk) {
    openKey = mk; renderDetail(false);
    const dlg = $("wearDetail"); if (!dlg.open) dlg.showModal();
  }

  // ---------- 이벤트 ----------
  $("wGrid").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) openDetail(b.dataset.m); });
  $("wCollect").addEventListener("click", collect);
  $("wearReco").addEventListener("click", e => { if (e.target.closest("[data-collect]")) collect(); });
  $("wScen").addEventListener("click", e => { const b = e.target.closest("[data-scen]"); if (!b) return; stopAuto(); H.setScenario(b.dataset.scen); toast(`${H.SCEN[b.dataset.scen].label} 상황을 시뮬레이션해요`); });
  $("wAuto").addEventListener("click", () => autoTimer ? stopAuto() : startAuto());
  $("wearReco").addEventListener("click", e => { const b = e.target.closest("[data-recipe]"); if (b) App.openRecipe(b.dataset.recipe); });
  function startAuto() {
    if (!collected) { toast("먼저 건강 데이터를 수집해 주세요"); return; }
    $("wAuto").textContent = "■ 멈춤"; $("wAuto").classList.add("running");
    autoIdx = 0; H.setScenario(AUTO[0]);
    autoTimer = setInterval(() => { autoIdx = (autoIdx + 1) % AUTO.length; H.setScenario(AUTO[autoIdx]); }, 8000);
  }
  function stopAuto() { clearInterval(autoTimer); autoTimer = null; $("wAuto").textContent = "▶ 자동 시나리오"; $("wAuto").classList.remove("running"); }

  const dlg = $("wearDetail");
  dlg.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-wd-close]")) dlg.close(); });
  dlg.addEventListener("close", () => { openKey = null; });
  $("wdForm").addEventListener("submit", e => {
    e.preventDefault();
    const fd = new FormData(e.target), patch = {};
    for (const [name, val] of fd) { const [k, f] = name.split("."); (patch[k] = patch[k] || {})[f] = +val; }
    for (const [k, p] of Object.entries(patch)) {
      if (k !== "steps" && !(p.dlo <= p.lo && p.lo < p.hi && p.hi <= p.dhi)) { toast("⚠️ 위험 하한 ≤ 목표 하한 < 목표 상한 ≤ 위험 상한 순서로 입력해 주세요"); return; }
    }
    Object.entries(patch).forEach(([k, p]) => H.setRange(k, p));
    renderDetail(false); toast(`✅ ${H.METRICS[openKey].name} 기준을 저장했어요`);
  });
  $("wdForm").addEventListener("click", e => {
    if (!e.target.closest("[data-reset]")) return;
    Object.keys(H.METRICS[openKey].series).forEach(k => H.resetRange(k));
    renderDetail(false); toast("기본 기준으로 되돌렸어요");
  });
  // 그래프 위에 마우스를 올리면 시간·값 표시
  $("wdChart").addEventListener("pointermove", e => {
    const svg = $("wdChart").querySelector("svg"); if (!svg || !geo) return;
    const rect = svg.getBoundingClientRect(), sx = (e.clientX - rect.left) / rect.width * W;
    const tip = $("wdTip"), line = svg.querySelector("#wdHover");
    if (sx < L || sx > W - R) { tip.hidden = true; line.style.display = "none"; return; }
    const i = Math.round((sx - L) / (W - L - R) * (geo.n - 1));
    const px = geo.x(i);
    line.setAttribute("x1", px); line.setAttribute("x2", px); line.style.display = "";
    const m = H.METRICS[geo.mk];
    tip.innerHTML = `<b>${hhmm(H.times[i])}</b>` + geo.keys.map(k => {
      const v = H.series(k)[i], lv = geo.mk === "act" ? "ok" : H.levelOf(k, v).level;
      return `<span><i style="background:${COLOR[k]}"></i>${m.series[k]} <b>${fmt(k, v)}</b>${geo.mk === "act" ? "" : ` <em class="t-${lv}">${H.LEVEL[lv]}</em>`}</span>`;
    }).join("");
    tip.hidden = false;
    const cw = $("wdChart").clientWidth, left = px / W * rect.width;
    tip.style.left = Math.min(cw - 170, Math.max(0, left + 12)) + "px";
  });
  $("wdChart").addEventListener("pointerleave", () => { $("wdTip").hidden = true; const l = $("wdChart").querySelector("#wdHover"); if (l) l.style.display = "none"; });

  window.addEventListener("jisik:health", render);
  window.addEventListener("jisik:change", render);

  window.JisikWear = {
    open: mk => collected ? openDetail(mk) : collect().then(() => openDetail(mk)),
    reco, collected: () => collected
  };
  render();
})();
