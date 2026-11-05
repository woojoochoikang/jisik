/* 💬 AI 식단 상담
 * 서버에 Claude API 키가 있으면 실제 AI가 앱 데이터(목표·냉장고·오늘 식사)를 보고 답하고,
 * 없으면 같은 데이터를 바탕으로 한 '데모 상담사'(규칙 기반)가 답합니다.
 */
(() => {
  "use strict";
  const App = window.JisikApp;
  if (!App || !document.getElementById("chatPanel")) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CHIPS = ["오늘 뭐 먹지?", "유통기한 임박 재료 알려줘", "남은 칼로리는?", "단백질 많은 메뉴", "두부로 만들 수 있는 요리", "장보기 목록 만들어줘"];

  let features = { aiScan: false }, msgs = [], busy = false, greeted = false;

  // ---------- 화면 ----------
  function open() {
    $("chatPanel").hidden = false; $("chatBackdrop").hidden = false;
    requestAnimationFrame(() => $("chatPanel").classList.add("show"));
    $("chatOpen").setAttribute("aria-expanded", "true");
    if (!greeted) { greeted = true; push("ai", greeting()); }
    setTimeout(() => $("chatInput").focus(), 200);
  }
  function close() {
    $("chatPanel").classList.remove("show");
    $("chatOpen").setAttribute("aria-expanded", "false");
    setTimeout(() => { $("chatPanel").hidden = true; $("chatBackdrop").hidden = true; }, 250);
  }
  function fmt(text) {
    return esc(text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  }
  function push(role, reply) {
    const m = typeof reply === "string" ? { text: reply } : reply;
    msgs.push({ role, ...m });
    const box = $("chatMsgs");
    const actions = (m.actions || []).map(a => `<button type="button" class="ghost small" data-act='${esc(JSON.stringify(a))}'>${esc(a.label)}</button>`).join("");
    box.insertAdjacentHTML("beforeend", `<div class="msg ${role}"><div class="bubble">${fmt(m.text)}${actions ? `<div class="acts">${actions}</div>` : ""}</div></div>`);
    box.scrollTop = box.scrollHeight;
  }
  function typing(on) {
    const box = $("chatMsgs");
    box.querySelector(".typing")?.remove();
    if (on) { box.insertAdjacentHTML("beforeend", '<div class="msg ai typing"><div class="bubble"><i></i><i></i><i></i></div></div>'); box.scrollTop = box.scrollHeight; }
  }

  // ---------- 앱 데이터 요약 ----------
  function ctx() {
    const st = App.getState();
    const eaten = st.log.items.reduce((a, b) => a + (+b.kcal || 0), 0);
    const protein = st.log.items.reduce((a, b) => a + (+b.protein || 0), 0);
    const fridge = st.fridge.map(f => ({ name: f.name, d: App.dday(f.exp) })).sort((a, b) => a.d - b.d);
    return { st, goal: App.goals[st.goal], eaten: Math.round(eaten), protein: Math.round(protein), remain: Math.round(st.kcalTarget - eaten), fridge, urgent: fridge.filter(f => f.d >= 0 && f.d <= 3), top: App.topRecipes(24) };
  }
  const dtext = d => d < 0 ? `${-d}일 지남` : d === 0 ? "오늘까지" : `D-${d}`;
  const openAct = r => ({ label: `${r.emoji} ${r.name} 레시피 보기`, type: "recipe", id: r.id });
  const why = r => r.urgent.length ? `⏰ ${r.urgent.join("·")} 먼저 사용` : r.missing.length ? `🛒 ${r.missing.join(", ")} 필요` : "✅ 지금 바로 가능";

  function greeting() {
    const c = ctx();
    return {
      text: `안녕하세요! 지식 AI 상담사예요 🥗\n지금 **${c.goal.label}** 목표로, 오늘 ${c.eaten}kcal 드셨고 **${Math.max(0, c.remain)}kcal** 남았어요.` +
        (c.urgent.length ? `\n냉장고에 곧 기한이 끝나는 재료가 ${c.urgent.length}개 있어요: ${c.urgent.slice(0, 4).map(f => `${f.name}(${dtext(f.d)})`).join(", ")}` : "") +
        "\n무엇이든 물어보세요!"
    };
  }

  // ---------- 데모 상담사 (규칙 기반) ----------
  function localReply(q) {
    const c = ctx(), s = q.replace(/\s+/g, "");
    const recipes = App.recipes();
    const rank = id => c.top.find(t => t.id === id);

    // 레시피 이름이 들어 있으면 그 레시피 설명
    const named = recipes.find(r => s.includes(r.name.replace(/\s+/g, "")));
    if (named && !/(만들수있|뭐|추천)/.test(s)) {
      const t = rank(named.id);
      return { text: `**${named.emoji} ${named.name}** — ${named.time}분, ${named.kcal}kcal, 단백질 ${named.protein}g, 나트륨 ${named.sodium}mg\n${t.missing.length ? `부족한 재료: ${t.missing.join(", ")}` : "지금 냉장고 재료로 바로 만들 수 있어요!"}\n남은 칼로리 ${Math.max(0, c.remain)}kcal 기준으로 ${named.kcal <= c.remain ? "딱 괜찮아요 👍" : "조금 많은 편이에요. 양을 줄여 드세요."}`, actions: [openAct(named)] };
    }

    // 재료로 만들 수 있는 요리
    const ingNames = Object.keys(EMOJI).filter(n => n.length >= 2 && !PANTRY.includes(n)).sort((a, b) => b.length - a.length);
    const ing = ingNames.find(n => s.includes(n));
    if (ing && /(로|으로|요리|레시피|뭐|만들|활용|남았|처리)/.test(s)) {
      const list = c.top.filter(t => recipes.find(r => r.id === t.id).ingredients.some(x => x.n === ing)).slice(0, 3);
      if (!list.length) return { text: `${ing}이(가) 들어가는 레시피는 아직 없어요 😢 다른 재료로 물어봐 주세요!` };
      return { text: `**${ing}**로 만들 수 있는 요리예요:\n` + list.map((r, i) => `${i + 1}. ${r.emoji} ${r.name} · ${r.kcal}kcal — ${why(r)}`).join("\n"), actions: list.map(openAct) };
    }

    if (/(유통|임박|기한|상하|버려|오래된)/.test(s)) {
      if (!c.urgent.length) return { text: "3일 안에 기한이 끝나는 재료는 없어요 👏 냉장고 관리 잘하고 계세요!" };
      const use = c.top.filter(t => t.urgent.length).slice(0, 2);
      return { text: `⏰ 3일 안에 드셔야 하는 재료:\n` + c.urgent.map(f => `- ${f.name} (${dtext(f.d)})`).join("\n") + (use.length ? `\n\n이 재료를 쓰는 추천 메뉴: ${use.map(r => `${r.emoji} ${r.name}`).join(", ")}` : ""), actions: use.map(openAct) };
    }

    if (/(칼로리|kcal|남은|얼마나먹|섭취|먹었)/.test(s)) {
      const meals = c.st.log.items.map(i => i.name).join(", ");
      return { text: `오늘 **${c.eaten}kcal** / 목표 ${c.st.kcalTarget}kcal 드셨어요.\n단백질 ${c.protein}g / ${c.st.proteinTarget}g\n${meals ? `기록된 식사: ${meals}\n` : "아직 기록된 식사가 없어요.\n"}${c.remain >= 0 ? `👉 ${c.remain}kcal 남았어요.` : `⚠️ ${-c.remain}kcal 초과했어요. 다음 끼는 가볍게!`}`, actions: [{ label: "📸 마이페이지에서 식사 기록", type: "tab", hash: "my" }] };
    }

    if (/(단백질|프로틴|근육)/.test(s)) {
      const list = c.top.filter(t => t.missing.length <= 1).sort((a, b) => b.protein - a.protein).slice(0, 3);
      return { text: `오늘 단백질 ${c.protein}g / 목표 ${c.st.proteinTarget}g (${Math.max(0, c.st.proteinTarget - c.protein)}g 더 필요)\n단백질이 많은 추천 메뉴:\n` + list.map(r => `- ${r.emoji} ${r.name} · 단백질 ${r.protein}g`).join("\n"), actions: list.map(openAct) };
    }

    if (/(장보기|사야|살것|부족|마트)/.test(s)) {
      const list = c.top.slice(0, 3).filter(r => r.missing.length);
      if (!list.length) return { text: "추천 메뉴 TOP 3는 지금 재료로 다 만들 수 있어요! 장보기 없이 바로 요리할 수 있어요 👍" };
      const need = [...new Set(list.flatMap(r => r.missing))];
      return { text: `추천 메뉴를 위한 장보기 목록이에요 🛒\n` + need.map(n => `- ${n}`).join("\n") + "\n\n레시피 화면의 '💸 최저가로 사기'에서 가격 낮은 순으로 볼 수 있어요.", actions: list.slice(0, 2).map(openAct) };
    }

    if (/(다이어트|살빼|체중|감량)/.test(s)) return { text: "다이어트 팁 🥗\n- 한 끼 400~500kcal, 단백질은 매 끼 20g 이상\n- 국물·소스는 반만, 정제 탄수화물 대신 현미·귀리\n- 저녁은 잠들기 3시간 전까지\n목표를 다이어트로 바꾸면 추천도 저칼로리 위주로 바뀌어요." };
    if (/(당뇨|혈당)/.test(s)) return { text: "혈당 관리 팁 🩸\n- 채소 → 단백질 → 탄수화물 순서로 먹기\n- 흰쌀 대신 잡곡·현미, 당류 적은 메뉴\n- 과일은 한 번에 조금씩\n※ 일반 정보예요. 약 복용 중이라면 의료진과 상담하세요." };
    if (/(고혈압|혈압|나트륨|짠|싱겁)/.test(s)) return { text: "저염 식단 팁 ❤️\n- 하루 나트륨 1,500~2,000mg 이하\n- 국·찌개 국물은 남기고, 간장은 저염간장으로\n- 칼륨이 많은 시금치·바나나·토마토가 도움돼요\n※ 일반 정보예요. 정확한 관리는 의료진과 상담하세요." };
    if (/(벌크|증량|살찌)/.test(s)) return { text: "벌크업 팁 💪\n- 체중 1kg당 단백질 1.6~2g\n- 하루 4~5끼로 나눠 먹기\n- 운동 후 1시간 안에 단백질+탄수화물 (예: 바나나 두유 쉐이크)" };
    if (/(사진|기록|마이페이지|찍)/.test(s)) return { text: "먹은 음식은 **마이페이지 → 📸 오늘 먹은 음식 기록**에서 사진을 올리면 칼로리와 영양성분을 분석해 오늘 목표에 자동으로 더해요!", actions: [{ label: "👤 마이페이지 열기", type: "tab", hash: "my" }] };
    if (/(냉장고|카메라)/.test(s)) return { text: `지금 냉장고에 재료 ${c.fridge.length}개가 있어요. '🧊 내 냉장고를 한눈에'에서 위치를, '📹 냉장고 카메라 시연'에서 자동 인식을 볼 수 있어요.`, actions: [{ label: "🧊 냉장고 보기", type: "tab", hash: "fridge" }, { label: "📹 카메라 시연", type: "tab", hash: "camera" }] };
    if (/(고마|감사|땡큐|thx)/.test(s)) return { text: "천만에요! 맛있고 건강한 한 끼 되세요 😊" };
    if (/(안녕|하이|hello|hi|반가)/i.test(s)) return greeting();

    if (/(뭐먹|추천|메뉴|저녁|점심|아침|배고|식사|먹을|야식)/.test(s) || s.length < 4) {
      const list = c.top.slice(0, 3);
      return { text: `${c.goal.label} 목표와 냉장고 재료를 보고 골랐어요 (남은 ${Math.max(0, c.remain)}kcal):\n` + list.map((r, i) => `${i + 1}. ${r.emoji} **${r.name}** · ${r.kcal}kcal · ${r.time}분 — ${why(r)}`).join("\n"), actions: list.map(openAct) };
    }

    return { text: "음… 그 질문은 아직 잘 모르겠어요 🤔 이런 걸 물어보실 수 있어요:\n- 오늘 뭐 먹지?\n- 유통기한 임박 재료\n- 남은 칼로리 / 단백질\n- ○○로 만들 수 있는 요리\n- 장보기 목록" };
  }

  // ---------- 보내기 ----------
  async function send(text) {
    text = text.trim(); if (!text || busy) return;
    push("user", text);
    $("chatInput").value = "";
    busy = true; typing(true);
    let reply = null;
    if (features.aiScan) {
      try {
        const c = ctx();
        const context = {
          목표: c.goal.label, 하루칼로리목표: c.st.kcalTarget, 단백질목표: c.st.proteinTarget,
          오늘섭취: { kcal: c.eaten, 단백질: c.protein, 식사: c.st.log.items.map(i => `${i.name} ${Math.round(i.kcal)}kcal`) },
          냉장고: c.fridge.map(f => `${f.name}(${dtext(f.d)})`),
          추천순위: c.top.slice(0, 8).map(r => ({ 이름: r.name, kcal: r.kcal, 단백질: r.protein, 부족재료: r.missing, 임박재료: r.urgent })),
          전체레시피: App.recipes().map(r => r.name)
        };
        const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: msgs.filter(m => m.role === "user" || m.role === "ai").map(m => ({ role: m.role === "user" ? "user" : "assistant", text: m.text })), context }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const named = App.recipes().filter(r => data.text.includes(r.name)).slice(0, 3);
        reply = { text: data.text, actions: named.map(r => openAct({ ...r })) };
      } catch (e) { console.warn(e); }
    }
    if (!reply) { await new Promise(r => setTimeout(r, 500 + Math.random() * 500)); reply = localReply(text); }
    typing(false); busy = false;
    push("ai", reply);
  }

  function bind() {
    $("chatOpen").addEventListener("click", () => $("chatPanel").hidden ? open() : close());
    $("chatClose").addEventListener("click", close);
    $("chatBackdrop").addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("chatPanel").hidden && !document.querySelector("dialog[open]")) close(); });
    $("chatForm").addEventListener("submit", e => { e.preventDefault(); send($("chatInput").value); });
    $("chatChips").innerHTML = CHIPS.map(c => `<button type="button">${c}</button>`).join("");
    $("chatChips").addEventListener("click", e => { const b = e.target.closest("button"); if (b) send(b.textContent); });
    $("chatMsgs").addEventListener("click", e => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const a = JSON.parse(b.dataset.act);
      if (a.type === "recipe") App.openRecipe(a.id);
      if (a.type === "tab") { location.hash = a.hash; close(); }
    });
    fetch("/api/status").then(r => r.ok ? r.json() : {}).then(f => { features = { ...features, ...f }; mode(); }).catch(mode);
    mode();
  }
  function mode() {
    $("chatMode").textContent = features.aiScan ? "Claude AI 연결됨 · 내 냉장고·식단 데이터를 보고 답해요" : "데모 모드 · 내 냉장고·식단 데이터로 자동 응답";
  }

  bind();
})();
