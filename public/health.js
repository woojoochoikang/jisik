/* 🩺 건강 데이터 엔진 (시연용 가상 데이터)
 * 25세 황성욱(고혈압·당뇨, 다이어트 목표)의 웨어러블 데이터를 만들고,
 * 항목별 개인 기준 범위로 상태(안정/주의/확인 필요)를 판정합니다.
 * 마이페이지 · 웨어러블 페이지 · 브리핑 · AI 상담이 함께 사용합니다.
 */
(() => {
  "use strict";
  const STEP_MIN = 10;                 // 그래프 점 간격(분)
  const SPAN_H = 12;                   // 그래프에 보여줄 시간(최근 12시간)
  const KEY = "jisik.health.v1";

  // 항목 정의 — ranges: lo/hi = 목표(안정) 범위, dlo/dhi = 위험 기준(넘으면 '확인 필요')
  const METRICS = {
    glu:  { name: "혈당", icon: "🩸", unit: "mg/dL", dec: 0, series: { glu: "혈당" }, axis: [40, 260], src: "CGM" },
    bp:   { name: "혈압", icon: "❤️", unit: "mmHg", dec: 0, series: { sys: "수축기", dia: "이완기" }, axis: [40, 180], src: "스마트워치" },
    hr:   { name: "심박수", icon: "💓", unit: "bpm", dec: 0, series: { hr: "심박수" }, axis: [40, 170], src: "스마트워치" },
    spo2: { name: "산소포화도", icon: "🫁", unit: "%", dec: 0, series: { spo2: "SpO₂" }, axis: [86, 100], src: "스마트워치" },
    ecg:  { name: "심전도", icon: "📈", unit: "ms", dec: 0, series: { qtc: "QTc 간격" }, axis: [320, 500], src: "스마트워치 ECG" },
    temp: { name: "체온", icon: "🌡️", unit: "℃", dec: 1, series: { temp: "체온" }, axis: [35, 39], src: "스마트워치" },
    act:  { name: "활동량", icon: "👟", unit: "걸음", dec: 0, series: { steps: "누적 걸음" }, axis: [0, 10000], src: "스마트워치" }
  };
  const DEFAULT_RANGES = {
    glu:  { lo: 80, hi: 140, dlo: 70, dhi: 200 },
    sys:  { lo: 100, hi: 130, dlo: 90, dhi: 150 },
    dia:  { lo: 60, hi: 80, dlo: 55, dhi: 95 },
    hr:   { lo: 60, hi: 100, dlo: 50, dhi: 120 },
    spo2: { lo: 95, hi: 100, dlo: 92, dhi: 100, nearHi: false },
    qtc:  { lo: 350, hi: 440, dlo: 330, dhi: 470 },
    temp: { lo: 36.1, hi: 37.2, dlo: 35.5, dhi: 37.8 },
    steps: { goal: 8000, kcalGoal: 350 }
  };
  const LEVEL = { ok: "안정", warn: "주의", bad: "확인 필요" };

  // ---------- 저장된 개인 기준 ----------
  let ranges = JSON.parse(JSON.stringify(DEFAULT_RANGES));
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved) Object.keys(saved).forEach(k => { if (ranges[k]) ranges[k] = { ...ranges[k], ...saved[k] }; }); } catch { /* 저장소 없음 */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(ranges)); } catch { /* 무시 */ } };

  // ---------- 시연용 데이터 만들기 (같은 날에는 항상 같은 모양) ----------
  const today = new Date(); today.setSeconds(0, 0);
  let seed = today.getFullYear() * 400 + today.getMonth() * 31 + today.getDate();
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const noise = a => (rand() - 0.5) * a;
  const bump = (h, at, w = 0.8) => { const x = h - at; return x <= 0 ? 0 : (x / w) * Math.exp(1 - x / w); }; // 식후 혈당 곡선
  const near = (h, a, b) => h >= a && h < b;

  const end = new Date(today); end.setMinutes(Math.floor(end.getMinutes() / STEP_MIN) * STEP_MIN);
  const N = SPAN_H * 60 / STEP_MIN + 1;
  const times = [];
  for (let i = N - 1; i >= 0; i--) times.push(new Date(end.getTime() - i * STEP_MIN * 60000));

  const stepRate = h => near(h, 0, 6.5) ? 0 : near(h, 6.5, 7.5) ? 400 : near(h, 7.5, 9) ? 1300 : near(h, 9, 12) ? 350
    : near(h, 12, 13) ? 900 : near(h, 13, 18) ? 380 : near(h, 18, 19) ? 2600 : near(h, 19, 22) ? 350 : 80; // 시간당 걸음
  const S = { glu: [], sys: [], dia: [], hr: [], spo2: [], qtc: [], temp: [], steps: [] };
  // 자정부터 첫 점까지 걸음 수 누적
  let steps = 0;
  { const d0 = new Date(times[0]); d0.setHours(0, 0, 0, 0); for (let t = d0.getTime(); t < times[0].getTime(); t += STEP_MIN * 60000) { const h = new Date(t).getHours() + new Date(t).getMinutes() / 60; steps += stepRate(h) * STEP_MIN / 60; } }
  let prevDay = times[0].getDate();
  times.forEach(t => {
    if (t.getDate() !== prevDay) { steps = 0; prevDay = t.getDate(); }
    const h = t.getHours() + t.getMinutes() / 60;
    const sleeping = h < 6.5 || h >= 23.5;
    const exercise = near(h, 18, 19);
    S.glu.push(104 + 62 * bump(h, 8.2) + 84 * bump(h, 12.6) + 70 * bump(h, 18.9) - (exercise ? 10 : 0) + noise(6));
    S.sys.push(124 + (near(h, 6.5, 9.5) ? 9 : 0) + 11 * bump(h, 13, 1.4) + (exercise ? 14 : 0) - (sleeping ? 10 : 0) + noise(5));
    S.dia.push(80 + (near(h, 6.5, 9.5) ? 5 : 0) + 6 * bump(h, 13, 1.4) + (exercise ? 4 : 0) - (sleeping ? 7 : 0) + noise(3));
    S.hr.push((sleeping ? 58 : 71) + (near(h, 7.5, 8.5) ? 18 : 0) + (exercise ? 52 : 0) + noise(6));
    S.spo2.push((sleeping ? 95.6 : 97.4) + noise(1.6));
    S.qtc.push(408 + (exercise ? -10 : 0) + noise(12));
    S.temp.push(36.45 + 0.28 * Math.sin((h - 9) / 24 * Math.PI * 2) + (exercise ? 0.35 : 0) + noise(0.08));
    steps += stepRate(h) * STEP_MIN / 60 * (0.7 + rand() * 0.6);
    S.steps.push(Math.round(steps));
  });
  const fix = (k, d) => { S[k] = S[k].map(v => +v.toFixed(d)); };
  ["glu", "sys", "dia", "hr", "qtc"].forEach(k => fix(k, 0)); fix("spo2", 0); fix("temp", 1);
  S.spo2 = S.spo2.map(v => Math.min(100, v));

  // 지금 값(마지막 점)은 시연용 기본값으로 맞춤 — 고혈압 '주의', 혈당 '안정'에서 시작
  const NOW_BASE = { glu: 128, sys: 134, dia: 86, hr: 76, spo2: 97, qtc: 412, temp: 36.6 };
  // 마지막 몇 점을 기본값 쪽으로 자연스럽게 이어 붙임
  Object.entries(NOW_BASE).forEach(([k, v]) => {
    const from = S[k][N - 6];
    for (let i = 1; i <= 5; i++) { const t = i / 5; S[k][N - 6 + i] = +(from + (v - from) * t + (i < 5 ? noise(k === "temp" ? 0.05 : 3) : 0)).toFixed(k === "temp" ? 1 : 0); }
    if (k === "spo2") S[k] = S[k].map(x => Math.min(100, x));
  });
  // 시연용: 오늘 걸음 수는 120걸음으로 고정 (그래프도 120걸음에서 끝나도록 비율 조정)
  const STEPS_FIXED = 120;
  { const last = S.steps[N - 1] || 1; S.steps = S.steps.map(v => Math.round(v / last * STEPS_FIXED)); }
  const cur = {}; Object.keys(S).forEach(k => { cur[k] = S[k][N - 1]; });

  // ---------- 상황 시뮬레이션 ----------
  const SCEN = {
    normal:   { label: "😊 평소 상태", t: { ...NOW_BASE } },
    postmeal: { label: "🍚 식후 혈당 급상승", t: { ...NOW_BASE, glu: 218, sys: 136, hr: 84 } },
    highbp:   { label: "🧂 짠 음식 후 혈압 상승", t: { ...NOW_BASE, sys: 158, dia: 99, hr: 88 } },
    exercise: { label: "🏃 운동 직후", t: { ...NOW_BASE, glu: 96, sys: 142, dia: 84, hr: 134, spo2: 96, temp: 37.1, qtc: 398 } },
    hypo:     { label: "😵 저혈당 주의", t: { ...NOW_BASE, glu: 62, hr: 96, sys: 124, dia: 80 } },
    fever:    { label: "🤒 미열", t: { ...NOW_BASE, temp: 37.6, hr: 94, spo2: 95 } }
  };
  let scen = "normal";

  function tick() {
    const t = SCEN[scen].t;
    Object.keys(t).forEach(k => {
      const d = k === "temp" ? 1 : 0;
      let v = cur[k] + (t[k] - cur[k]) * 0.4 + (rand() - 0.5) * (k === "temp" ? 0.06 : k === "spo2" ? 0.8 : k === "glu" ? 3 : 2);
      if (k === "spo2") v = Math.min(100, v);
      cur[k] = +v.toFixed(d);
      S[k][N - 1] = cur[k];
    });
    // 걸음 수는 고정 — 더 이상 올라가지 않음
    window.dispatchEvent(new CustomEvent("jisik:health"));
  }
  setInterval(tick, 2500);

  // ---------- 판정 ----------
  function levelOf(key, v) {
    const r = ranges[key];
    if (v < r.dlo || v > r.dhi) return { level: "bad", why: v > r.dhi ? "위험 상한 초과" : "위험 하한 미만" };
    if (v < r.lo || v > r.hi) return { level: "warn", why: v > r.hi ? "목표 범위보다 높음" : "목표 범위보다 낮음" };
    const m = (r.hi - r.lo) * 0.08;
    if (r.nearHi !== false && v > r.hi - m) return { level: "warn", why: "목표 상한에 근접" };
    if (r.nearLo !== false && v < r.lo + m) return { level: "warn", why: "목표 하한에 근접" };
    return { level: "ok", why: "목표 범위 안" };
  }
  const worst = arr => arr.sort((a, b) => ["ok", "warn", "bad"].indexOf(b.level) - ["ok", "warn", "bad"].indexOf(a.level))[0];

  function activity() {
    const g = ranges.steps, h = new Date().getHours() + new Date().getMinutes() / 60;
    const expected = g.goal * Math.min(1, Math.max(0.08, (h - 7) / 14));
    const rate = cur.steps / g.goal, pace = cur.steps / expected;
    const kcal = Math.round(cur.steps * 0.042);
    let level = "ok", why = rate >= 1 ? "오늘 목표 달성!" : "시간 대비 순조로워요";
    if (rate < 1 && pace < 0.6) { level = "bad"; why = "시간 대비 활동이 많이 부족해요"; }
    else if (rate < 1 && pace < 0.9) { level = "warn"; why = "시간 대비 조금 부족해요"; }
    return { level, why, rate: Math.round(rate * 100), expected: Math.round(expected), kcal };
  }
  function ecg() {
    const q = levelOf("qtc", cur.qtc), hr = cur.hr;
    let rhythm = "정상 동리듬", level = q.level, why = q.level === "ok" ? "파형·간격 모두 기준 안" : `QTc ${q.why}`;
    if (hr > 100) { rhythm = "동성 빈맥 (운동·긴장 시 흔함)"; level = level === "bad" ? "bad" : "warn"; why = "심박이 빨라요"; }
    if (hr > 130 || hr < 45) { level = "bad"; why = "심박이 기준을 크게 벗어났어요"; }
    return { level, why, rhythm, pr: 158, qrs: 92 };
  }
  function status(mkey) {
    if (mkey === "act") return activity();
    if (mkey === "ecg") return ecg();
    return worst(Object.keys(METRICS[mkey].series).map(k => ({ key: k, ...levelOf(k, cur[k]) })));
  }

  // ---------- 요약 (브리핑·AI 상담용) ----------
  function summary() {
    const st = k => LEVEL[status(k).level];
    return {
      혈당: `${cur.glu}mg/dL(${st("glu")})`, 혈압: `${cur.sys}/${cur.dia}mmHg(${st("bp")})`, 심박: `${cur.hr}bpm(${st("hr")})`,
      산소포화도: `${cur.spo2}%(${st("spo2")})`, 심전도: `${ecg().rhythm}(${st("ecg")})`, 체온: `${cur.temp}℃(${st("temp")})`,
      활동량: `${cur.steps.toLocaleString()}걸음, 목표의 ${activity().rate}%(${st("act")})`
    };
  }

  window.JisikHealth = {
    connected: true, METRICS, LEVEL, SCEN, times, STEP_MIN,
    series: k => S[k], cur, ranges: () => ranges,
    levelOf, status, activity, ecg, summary,
    scenario: () => scen,
    setScenario: k => { if (SCEN[k]) { scen = k; tick(); } },
    setRange: (k, patch) => { ranges[k] = { ...ranges[k], ...patch }; persist(); window.dispatchEvent(new CustomEvent("jisik:health")); },
    resetRange: k => { ranges[k] = JSON.parse(JSON.stringify(DEFAULT_RANGES[k])); persist(); window.dispatchEvent(new CustomEvent("jisik:health")); },
    resetAll: () => { ranges = JSON.parse(JSON.stringify(DEFAULT_RANGES)); persist(); window.dispatchEvent(new CustomEvent("jisik:health")); }
  };
})();
