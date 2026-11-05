/* 🛒 장바구니 — 부족한 재료를 모아두고, 최저가 링크로 사거나 산 재료를 냉장고에 넣음 */
(() => {
  "use strict";
  const App = window.JisikApp;
  const panel = document.getElementById("cartPanel");
  if (!App || !panel) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = msg => { const t = $("toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); };

  function count() {
    const n = App.getCart().filter(c => !c.done).length;
    $("cartCount").textContent = n;
    $("cartCount").hidden = !n;
  }
  function render() {
    const cart = App.getCart();
    count();
    const done = cart.filter(c => c.done).length;
    $("cartList").innerHTML = cart.length ? cart.map(c => `
      <li class="${c.done ? "done" : ""}">
        <label class="ck"><input type="checkbox" data-done="${c.id}" ${c.done ? "checked" : ""} aria-label="${esc(c.name)} 구매함"></label>
        <span class="em">${FoodPhotos.ingredient(c.name)}</span>
        <div class="ci">
          <b>${esc(c.name)} <small>${esc(c.amount)}</small>${c.auto ? '<span class="auto">자동 추가</span>' : ""}</b>
          ${c.recipes.length ? `<small>🍳 ${c.recipes.map(esc).join(", ")}</small>` : ""}
          <div class="links">${App.mallLinks(c.name).slice(0, 3).map(l => `<a href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`).join("")}</div>
        </div>
        <button type="button" class="del" data-del="${c.id}" aria-label="${esc(c.name)} 빼기">✕</button>
      </li>`).join("") : '<li class="cart-empty">장바구니가 비어 있어요.<br><small>레시피 화면의 \'🛒 장바구니에 담기\'나 오늘의 브리핑에서 자동으로 담겨요.</small></li>';
    $("cartFoot").innerHTML = cart.length ? `
      <button type="button" class="ghost" data-clear>비우기</button>
      <button type="button" class="primary" data-stock ${done ? "" : "disabled"}>✅ 구매한 ${done}개 냉장고에 넣기</button>` : "";
  }
  function open() {
    render();
    panel.hidden = false; $("cartBackdrop").hidden = false;
    requestAnimationFrame(() => panel.classList.add("show"));
  }
  function close() {
    panel.classList.remove("show");
    setTimeout(() => { panel.hidden = true; $("cartBackdrop").hidden = true; }, 250);
  }

  $("cartOpen").addEventListener("click", () => panel.hidden ? open() : close());
  $("cartClose").addEventListener("click", close);
  $("cartBackdrop").addEventListener("click", close);
  panel.addEventListener("change", e => { const id = e.target.dataset.done; if (id) { App.toggleCart(id); render(); } });
  panel.addEventListener("click", e => {
    const del = e.target.closest("[data-del]"); if (del) { App.removeFromCart(del.dataset.del); render(); return; }
    if (e.target.closest("[data-clear]")) { App.clearCart(); render(); return; }
    if (e.target.closest("[data-stock]")) {
      const bought = App.getCart().filter(c => c.done);
      bought.forEach(c => { App.addItem(c.name, null, { silent: true }); App.removeFromCart(c.id); });
      render(); toast(`🧊 ${bought.map(c => c.name).join(", ")} 냉장고에 넣었어요`);
    }
  });
  window.addEventListener("jisik:change", () => { if (!panel.hidden) render(); else count(); });
  window.addEventListener("jisik:cart", count);
  window.JisikCart = { open, close };
  count();
})();
