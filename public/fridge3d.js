/* A dependency-free CSS 3D view. Inventory remains owned by app.js. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const columns = ['왼쪽', '가운데', '오른쪽'];
  let items = [], selected = null, open = true, angle = -12;
  const valid = p => !!p && Number.isInteger(p.shelf) && p.shelf >= 0 && p.shelf < 4 && Number.isInteger(p.column) && p.column >= 0 && p.column < 3 && Number.isInteger(p.depth) && p.depth >= 0 && p.depth < 2;
  const key = p => `${p.shelf}-${p.column}-${p.depth}`;
  const position = p => `${4 - p.shelf}층 · ${columns[p.column]} · ${p.depth ? '뒤쪽' : '앞쪽'}`;
  function days(exp) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((new Date(exp + 'T00:00:00') - now) / 86400000);
  }
  const status = f => days(f.exp) < 0 ? 'expired' : days(f.exp) <= 3 ? 'soon' : 'fresh';
  const deadline = f => { const n = days(f.exp); return n < 0 ? `${-n}일 지남` : n === 0 ? '오늘까지' : n <= 10 ? `D-${n}` : ''; };
  const emoji = name => FoodPhotos.ingredient(name);

  function nextLocation(fridge) {
    const counts = new Map();
    fridge.forEach(f => { if (valid(f.location)) counts.set(key(f.location), (counts.get(key(f.location)) || 0) + 1); });
    let best = null, min = Infinity;
    for (let depth = 0; depth < 2; depth++) for (let shelf = 0; shelf < 4; shelf++) for (let column = 0; column < 3; column++) {
      const p = { shelf, column, depth }, n = counts.get(key(p)) || 0;
      if (n < min) { min = n; best = p; }
    }
    return best;
  }
  function select(id) { selected = id; render(items); window.dispatchEvent(new CustomEvent('jisik:pick-food', { detail: id })); }
  function render(fridge) {
    items = fridge;
    if (!items.some(f => f.id === selected)) selected = items[0]?.id || null;
    $('fridge3dCount').textContent = `4개 층 · ${items.length}개 재료`;
    const urgent = items.filter(f => status(f) === 'soon').length;
    $('fridgeUrgentCount').textContent = urgent ? `먼저 먹어요 ${urgent}` : '신선함을 채워요';
    const due = items.filter(f => days(f.exp) <= 3).sort((a, b) => days(a.exp) - days(b.exp));
    const alert = $('fridgeExpiryAlert');
    alert.hidden = !due.length;
    alert.innerHTML = due.length ? `<div class="expiry-alert-heading"><span>⏰</span><div><h2>놓치지 마세요, 유통기한 임박!</h2><p>3일 이내 재료 ${urgent}개${due.length > urgent ? ` · 기한 지난 재료 ${due.length - urgent}개` : ''}</p></div></div><div class="expiry-alert-items">${due.map(f => `<button type="button" data-food="${esc(f.id)}" class="expiry-alert-item ${status(f)}"><span>${emoji(f.name)} ${esc(f.name)}<small>${position(f.location)}</small></span><strong>${deadline(f)}</strong></button>`).join('')}</div>` : '';
    const groups = new Map();
    items.forEach(f => { if (!valid(f.location)) return; const k = key(f.location); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); });
    let slots = '', foods = '';
    for (let shelf = 0; shelf < 4; shelf++) {
      slots += `<div class="fridge-shelf" style="--shelf-y:${127 + shelf * 104}px"><span>${4 - shelf}F</span></div>`;
      for (let column = 0; column < 3; column++) for (let depth = 0; depth < 2; depth++) {
        const p = { shelf, column, depth }, group = groups.get(key(p)) || [];
        const x = 29 + column * 87, y = 127 + shelf * 104, z = depth ? 22 : 99;
        group.forEach((f, i) => {
          const offset = (i - (group.length - 1) / 2) * Math.min(18, 54 / group.length);
          foods += `<button type="button" class="fridge-food ${status(f)} ${f.id === selected ? 'selected' : ''}" data-food="${esc(f.id)}" aria-pressed="${f.id === selected}" aria-label="${esc(f.name)}, ${position(p)}${deadline(f) ? ', ' + deadline(f) : ''}" style="--x:${x + offset}px;--y:${y - (i % 2) * 5}px;--z:${z + i * 2}px" title="${esc(f.name)} · ${position(p)}"><span class="food-object"><span>${emoji(f.name)}</span></span><span class="food-name">${esc(f.name)}</span>${deadline(f) ? `<span class="food-deadline">${deadline(f)}</span>` : ''}<i class="food-dot"></i></button>`;
        });
      }
    }
    $('fridgeShelves').innerHTML = slots; $('fridgeFoods').innerHTML = foods;
    const f = items.find(f => f.id === selected);
    $('fridgeSelected').innerHTML = f ? `<div class="selected-icon">${emoji(f.name)}</div><div><h3>${esc(f.name)}</h3><p>${position(f.location)}</p>${deadline(f) ? `<span class="selected-exp ${status(f)}">${deadline(f)}</span>` : ''}<small class="selected-date">유통기한 ${esc(f.exp)}</small></div>` : '<div class="selected-icon">🧊</div><div><h3>아직 비어 있어요</h3><p>아래에서 재료를 추가해보세요.</p></div>';
    $('fridgeShelfList').innerHTML = [0, 1, 2, 3].map(shelf => {
      const row = items.filter(f => f.location.shelf === shelf);
      return `<div class="shelf-list-row"><span class="shelf-number">${4 - shelf}F</span><div>${row.length ? row.map(f => `<button type="button" data-food="${esc(f.id)}" class="inventory-chip ${status(f)} ${f.id === selected ? 'active' : ''}" aria-pressed="${f.id === selected}">${emoji(f.name)} ${esc(f.name)}${deadline(f) ? ` <b>${deadline(f)}</b>` : ''}</button>`).join('') : '<span class="shelf-vacant">비어 있는 선반</span>'}</div><small>${row.length}</small></div>`;
    }).join('');
  }
  function setAngle(value) {
    angle = Math.max(-28, Math.min(28, value));
    $('fridgeWorld').style.setProperty('--angle', `${angle}deg`); $('fridgeAngle').value = angle;
  }
  document.querySelector('.fridge-studio').addEventListener('click', e => {
    const food = e.target.closest('[data-food]');
    if (food) { select(food.dataset.food); return; }
  });
  // 탭: [탭 버튼 id, [패널 id들], 주소 해시] — 한 탭에 여러 패널을 함께 보여줄 수 있음
  // 시연 흐름 순서: 마이페이지 → 냉장고 & 오늘의 식단 → 웨어러블 → (추가) 카메라 시연
  const TABS = [['myTab', ['myPanel'], 'my'], ['kitchenTab', ['fridgePanel', 'mealPanel'], 'kitchen'], ['wearTab', ['wearPanel'], 'wearable'], ['simTab', ['simPanel'], 'camera']]
    .filter(([t, ps]) => $(t) && ps.every(p => $(p)));
  const ALIAS = { meals: 'kitchen', fridge: 'kitchen' }; // 예전 주소도 지원
  function showTab(index, focus = false) {
    TABS.forEach(([t, ps], i) => {
      const active = i === index, tab = $(t);
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
      ps.forEach(p => { $(p).hidden = !active; });
    });
    window.dispatchEvent(new CustomEvent('jisik:tab', { detail: TABS[index][2] }));
  }
  const go = (i, focus) => { location.hash = TABS[i][2]; showTab(i, focus); window.scrollTo({ top: 0 }); };
  TABS.forEach(([t], i) => {
    $(t).addEventListener('click', () => go(i));
    $(t).addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const n = TABS.length;
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : e.key === 'ArrowRight' ? (i + 1) % n : (i - 1 + n) % n;
      go(next, true);
    });
  });
  function syncTab() {
    const h = location.hash.slice(1), want = ALIAS[h] || h;
    const i = TABS.findIndex(([, , hh]) => hh === want);
    showTab(i < 0 ? 0 : i);
  }
  window.addEventListener('hashchange', syncTab); syncTab();
  document.querySelector('.fridge-add-link').addEventListener('click', e => { e.preventDefault(); document.getElementById('fridgeCard')?.scrollIntoView({ behavior: 'smooth' }); });
  $('fridgeDoorToggle').addEventListener('click', () => {
    open = !open; $('fridgeDoor').classList.toggle('closed', !open);
    $('fridgeDoorToggle').textContent = open ? '문 닫기' : '문 열기'; $('fridgeDoorToggle').setAttribute('aria-expanded', String(open));
    $('fridgeFoods').inert = !open; $('fridgeShelves').inert = !open;
  });
  $('fridgeAngle').addEventListener('input', e => setAngle(+e.target.value));
  $('fridgeViewReset').addEventListener('click', () => setAngle(0));
  let drag = null;
  $('fridgeViewport').addEventListener('pointerdown', e => {
    if (e.target.closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { x: e.clientX, angle }; $('fridgeViewport').setPointerCapture(e.pointerId);
  });
  $('fridgeViewport').addEventListener('pointermove', e => { if (drag) setAngle(drag.angle + (e.clientX - drag.x) * .2); });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) $('fridgeViewport').addEventListener(name, () => { drag = null; });
  window.Fridge3D = { render, validLocation: valid, nextLocation, selected: () => selected };
})();
