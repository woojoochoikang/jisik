/* Photographic assets only. No navigation, theme, or state changes. */
(() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.FoodPhotos = {
    ingredient(name) {
      const id = JisikPhotos.ingredients[name] || 'seasoning';
      return `<img class="food-ingredient" src="assets/photos/ingredient-${id}.jpg" alt="${esc(name)}" width="64" height="64" loading="lazy">`;
    },
    recipe(id) {
      const name = JisikPhotos.recipes[id];
      if (!name) return '🍽️';
      return `<img class="food-recipe" src="assets/photos/${id}.jpg" alt="${esc(name)} · AI 생성 조리 예시" title="AI 생성 · 조리 예시" width="960" height="640" loading="lazy">`;
    }
  };
})();
