/* 📋 오늘의 브리핑 — 첫 화면에 잠깐 띄웠다가 마이페이지로 넘어가는 시연용 화면
 * + 페이지 아래 '다음 단계' 버튼으로 발표 흐름(마이페이지 → 냉장고·식단 → 웨어러블)을 이어 줌
 */
(() => {
  "use strict";
  const App = window.JisikApp, H = window.JisikHealth;
  const box = document.getElementById("briefing");
  if (!App || !box) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SHOW_MS = 6500;
  let timer = null;

  function greet() {
    const h = new Date().getHours();
    return h < 5 ? "늦은 밤이에요" : h < 11 ? "좋은 아침이에요" : h < 14 ? "점심 시간이에요" : h < 18 ? "좋은 오후예요" : "좋은 저녁이에요";
  }

  function build() {
    const st = App.getState(), p = st.profile || {};
    const eaten = Math.round(st.log.items.reduce((a, b) => a + (+b.kcal || 0), 0));
    const remain = st.kcalTarget - eaten;
    const urgent = st.fridge.filter(f => { const d = App.dday(f.exp); return d >= 0 && d <= 3; }).sort((a, b) => a.exp.localeCompare(b.exp));
    const top = App.topRecipes(1)[0];
    const lvl = k => H ? H.status(k) : { level: "ok" };
    const ICON = { ok: "✅", warn: "⚠️", bad: "🚨" };
    const LBL = { ok: "안정", warn: "주의", bad: "확인 필요" };
    const d = new Date();
    box.innerHTML = `
      <div class="br-card">
        <div class="br-top">
          <span class="br-date">${d.getMonth() + 1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}요일 · 오늘의 브리핑</span>
          <button type="button" class="br-skip" data-close>건너뛰기 ✕</button>
        </div>
        <h1 id="brTitle">${greet()}, <b>${esc(p.name || "사용자")}</b>님 👋</h1>
        <p class="br-sub">${(p.conditions || []).join(" · ")}${p.conditions?.length ? " 관리와 " : ""}${esc(st.goalLabel.split(" + ")[0].replace(/^\S+\s/, ""))} 목표에 맞춰 오늘을 정리했어요.</p>
        <div class="br-grid">
          <div class="br-item" style="--i:0"><span class="bi">🎯</span><small>오늘 섭취</small><b>${eaten.toLocaleString()} / ${st.kcalTarget.toLocaleString()}kcal</b><em>${remain >= 0 ? `${remain}kcal 남았어요` : `${-remain}kcal 초과`}</em></div>
          ${H ? `<div class="br-item lv-${lvl("glu").level}" style="--i:1"><span class="bi">🩸</span><small>혈당</small><b>${H.cur.glu} mg/dL</b><em>${ICON[lvl("glu").level]} ${LBL[lvl("glu").level]}</em></div>
          <div class="br-item lv-${lvl("bp").level}" style="--i:2"><span class="bi">❤️</span><small>혈압</small><b>${H.cur.sys}/${H.cur.dia} mmHg</b><em>${ICON[lvl("bp").level]} ${LBL[lvl("bp").level]}</em></div>` : ""}
          <div class="br-item ${urgent.length ? "lv-warn" : ""}" style="--i:3"><span class="bi">🧊</span><small>소비기한 임박</small><b>${urgent.length}개 재료</b><em>${urgent.slice(0, 3).map(f => esc(f.name)).join(", ") || "없어요"}</em></div>
        </div>
        ${top ? `<div class="br-reco" style="--i:4"><span>${top.emoji}</span><div><small>오늘의 추천 1위</small><b>${esc(top.name)}</b><em>${top.urgent.length ? `⏰ ${top.urgent.map(esc).join("·")} 먼저 사용 · ` : ""}${top.kcal}kcal · 나트륨 ${top.sodium}mg</em></div></div>` : ""}
        <p class="br-tip" style="--i:5">💡 ${H && lvl("bp").level !== "ok" ? "혈압이 목표보다 조금 높아요. 오늘은 국물을 줄이고 저염 메뉴를 드세요." : "식사 순서를 채소 → 단백질 → 탄수화물로 하면 혈당이 완만해져요."}</p>
        <div class="br-bar"><i></i></div>
        <button type="button" class="primary big br-go" data-close>마이페이지에서 자세히 보기 →</button>
      </div>`;
  }

  function show() {
    build();
    box.hidden = false; box.classList.remove("out");
    requestAnimationFrame(() => box.classList.add("in"));
    const bar = box.querySelector(".br-bar i");
    bar.style.transition = "none"; bar.style.width = "0";
    requestAnimationFrame(() => { bar.style.transition = `width ${SHOW_MS}ms linear`; bar.style.width = "100%"; });
    clearTimeout(timer); timer = setTimeout(hide, SHOW_MS);
    box.querySelector(".br-go").focus({ preventScroll: true });
  }
  function hide() {
    clearTimeout(timer);
    if (box.hidden) return;
    box.classList.add("out"); box.classList.remove("in");
    setTimeout(() => { box.hidden = true; box.classList.remove("out"); }, 450);
    if (!location.hash || location.hash === "#my") { location.hash = "my"; }
  }
  box.addEventListener("click", e => { if (e.target.closest("[data-close]") || e.target === box) hide(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !box.hidden) hide(); });

  // 발표 흐름: 각 화면 아래 '다음 단계' 버튼
  const FLOW = [
    ["mealPanel", "kitchen", "wearable", "③ 웨어러블 건강 데이터 확인하기", "② 냉장고 & 오늘의 식단"],
    ["myPanel", "my", "kitchen", "② 냉장고 재료와 오늘의 추천 메뉴 보기", "① 마이페이지"],
    ["wearPanel", "wearable", "my", "① 마이페이지로 돌아가기", "③ 웨어러블 건강 데이터"]
  ];
  FLOW.forEach(([panel, , next, label, here]) => {
    const el = document.getElementById(panel); if (!el) return;
    el.insertAdjacentHTML("beforeend", `<div class="flow-next"><span>시연 흐름 · 지금 <b>${here}</b></span><a href="#${next}" class="primary">${next === "my" ? "↺ " : "다음 단계 "}${label} →</a></div>`);
  });
  document.addEventListener("click", e => { const a = e.target.closest(".flow-next a"); if (a) setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 30); });

  window.JisikBriefing = { show, hide };
  // 첫 접속(주소에 다른 화면이 지정되지 않은 경우)에 브리핑을 잠깐 띄움
  if (!location.hash || location.hash === "#my") setTimeout(show, 250);
})();
