/* 📋 오늘의 브리핑 — 첫 화면에 잠깐 띄웠다가 마이페이지로 넘어가는 시연용 화면
 * + 페이지 아래 '다음 단계' 버튼으로 발표 흐름(마이페이지 → 냉장고·식단 → 웨어러블)을 이어 줌
 */
(() => {
  "use strict";
  const App = window.JisikApp, H = window.JisikHealth;
  const box = document.getElementById("briefing");
  if (!App || !box) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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
    // 추천 메뉴에 부족한 재료 → 장바구니 자동 추가 (하루 한 번)
    const miss = App.missingForTop(3);
    const flat = miss.flatMap(r => r.missing.map(m => ({ ...m, recipe: r.name })));
    const added = App.addToCart(flat, true); // 이미 담긴 재료는 다시 담지 않음
    const inCart = App.getCart().filter(c => !c.done).length;
    const missNames = [...new Set(flat.map(m => m.name))];
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
        ${top ? `<div class="br-reco" style="--i:4"><span>${FoodPhotos.recipe(top.id)}</span><div><small>오늘의 추천 1위</small><b>${esc(top.name)}</b><em>${top.urgent.length ? `⏰ ${top.urgent.map(esc).join("·")} 먼저 사용 · ` : ""}${top.kcal}kcal · 나트륨 ${top.sodium}mg</em></div></div>` : ""}
        ${missNames.length ? `
        <div class="br-alert warn" style="--i:5">
          <b>🛒 부족한 재료 알림 · ${missNames.length}개</b>
          <p>추천 메뉴를 만들려면 이 재료가 더 필요해요.</p>
          <ul>${miss.map(r => `<li><span>${FoodPhotos.recipe(r.id)} ${esc(r.name)}</span><em>${r.missing.map(m => esc(m.name)).join(", ")}</em></li>`).join("")}</ul>
        </div>
        <div class="br-alert ok" style="--i:6">
          <span>✅ ${added ? `부족한 재료 <b>${added}개</b>를 장바구니에 자동으로 추가했어요` : `부족한 재료가 장바구니에 담겨 있어요 (<b>${inCart}개</b>)`}</span>
          <button type="button" class="ghost small" data-cart>장바구니 보기</button>
        </div>` : `<div class="br-alert ok" style="--i:5"><span>✅ 추천 메뉴 재료가 냉장고에 모두 있어요. 장보기가 필요 없어요!</span></div>`}
        <p class="br-tip" style="--i:7">💡 ${H && lvl("bp").level !== "ok" ? "혈압이 목표보다 조금 높아요. 오늘은 국물을 줄이고 저염 메뉴를 드세요." : "식사 순서를 채소 → 단백질 → 탄수화물로 하면 혈당이 완만해져요."}</p>
        <button type="button" class="primary big br-go" data-close>마이페이지에서 자세히 보기 →</button>
      </div>`;
  }

  function show() {
    build();
    box.hidden = false; box.classList.remove("out");
    requestAnimationFrame(() => box.classList.add("in"));
    box.querySelector(".br-go").focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent("jisik:cart"));
  }
  function hide() {
    if (box.hidden) return;
    box.classList.add("out"); box.classList.remove("in");
    setTimeout(() => { box.hidden = true; box.classList.remove("out"); }, 450);
    if (!location.hash || location.hash === "#my") { location.hash = "my"; }
  }
  // 자동으로 닫히지 않고, 사용자가 버튼(또는 Esc)으로 닫을 때만 닫힘
  box.addEventListener("click", e => {
    if (e.target.closest("[data-cart]")) { hide(); setTimeout(() => window.JisikCart?.open(), 300); return; }
    if (e.target.closest("[data-close]")) hide();
  });
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
