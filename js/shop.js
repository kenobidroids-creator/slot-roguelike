// ============================================================
// shop.js — Shop generation and purchase logic.
// ============================================================

var Shop = (() => {

  const SYMBOL_POOL = Object.keys(CONFIG.SYMBOLS).filter(s => s !== '💀');

  function generateShop(currentModIds) {
    const symbols = shuffle([...SYMBOL_POOL]).slice(0, 2).map(sym => ({
      type: 'symbol',
      symbol: sym,
      name: CONFIG.SYMBOLS[sym].name,
      cost: CONFIG.SYMBOL_COSTS[sym],
      desc: `Add ${sym} to your reel pool  (+${CONFIG.SYMBOLS[sym].chips} chips base)`,
    }));

    const available = CONFIG.MODIFIERS.filter(m => !currentModIds.includes(m.id));
    const mods = shuffle(available).slice(0, 2).map(m => ({
      type: 'modifier',
      id: m.id,
      name: m.name,
      emoji: m.emoji,
      cost: m.cost,
      desc: m.desc,
      rarity: m.rarity,
    }));

    const removeCard = {
      type: 'remove',
      cost: CONFIG.REMOVE_SYMBOL_COST,
      name: 'REMOVE CARD',
      desc: 'Remove one copy of any symbol from your reel pool',
      emoji: '🗑️',
    };

    return { items: [...symbols, ...mods, removeCard], rerolled: 0 };
  }

  function rerollShop(shop, currentModIds) {
    const fresh = generateShop(currentModIds);
    fresh.rerolled = shop.rerolled + 1;
    return fresh;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { generateShop, rerollShop };
})();
