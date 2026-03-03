// ============================================================
// main.js — Game state & flow orchestration.
// ============================================================

// ── Meta (persists between runs) ──────────────────────────
window.META = JSON.parse(localStorage.getItem('neonVault_meta')) || {
  shards: 0, starterGold: 0, taxLvl: 0, deckSlot: 0, highScore: 0,
};
['shards','starterGold','taxLvl','deckSlot','highScore'].forEach(k => {
  if (!Number.isFinite(META[k])) META[k] = 0;
});

// ── Run state ─────────────────────────────────────────────
let game = {};
let currentShop = null;
let spinning    = false;

function newRunState() {
  return {
    gold: 6 + ((META.starterGold ?? 0) * 5),
    stageIndex: 0,
    roundIndex: 0,
    roundScore: 0,
    spinsLeft: CONFIG.STAGES[0].rounds[0].spins,
    spinsUsedThisRound: 0,
    winStreak: 0,
    playerDeck: [...CONFIG.STARTER_DECK],
    modifiers: [],
    lastGrid: null,
    bestSpin: 0,
    totalScore: 0,
    phase: 'pre_round',
  };
}

// ── Save / Load ───────────────────────────────────────────
function save() {
  try {
    localStorage.setItem('neonVault_meta', JSON.stringify(META));
    localStorage.setItem('neonVault_run',  JSON.stringify(game));
  } catch(e) {}
}

function loadRun() {
  try {
    const s = localStorage.getItem('neonVault_run');
    if (s) {
      const p = JSON.parse(s);
      if (p && Array.isArray(p.playerDeck)) return p;
    }
  } catch(e) {}
  return newRunState();
}

// ── Current round ─────────────────────────────────────────
function getCurrentRound() {
  return CONFIG.STAGES[game.stageIndex]?.rounds[game.roundIndex] ?? null;
}

// ── Phase transitions ─────────────────────────────────────

function showPreRound() {
  game.phase = 'pre_round';
  UI.showPhase('pre_round', game);
  UI.updateHUD(game);
  UI.updateSidebar(game);
  save();
}

function startRound() {
  const round = getCurrentRound();
  if (!round) { endRun('Victory!'); return; }
  game.roundScore = 0;
  game.spinsLeft  = round.spins;
  game.spinsUsedThisRound = 0;
  game.winStreak  = 0;
  game.phase      = 'playing';

  document.getElementById('phase-pre-round')?.classList.remove('active');
  document.getElementById('result-card')?.classList.add('hidden');

  UI.fillReels(game.playerDeck, game.lastGrid);
  UI.updateHUD(game);
  UI.updateSidebar(game);
  updateSpinBtn(false);
  save();
}

function advanceToShop() {
  game.phase  = 'shop';
  currentShop = Shop.generateShop(game.modifiers);
  UI.showPhase('shop', game);
  UI.renderShop(currentShop, game);
  UI.updateHUD(game);
  save();
}

function proceedFromShop() {
  // Advance to next round/stage
  const stage = CONFIG.STAGES[game.stageIndex];
  game.roundIndex++;
  if (game.roundIndex >= stage.rounds.length) {
    game.roundIndex = 0;
    game.stageIndex++;
  }
  if (game.stageIndex >= CONFIG.STAGES.length) {
    endRun('Victory! 🎰');
    return;
  }
  document.getElementById('phase-shop')?.classList.remove('active');
  showPreRound();
}

// ── Spin ──────────────────────────────────────────────────

async function spin() {
  if (spinning || game.phase !== 'playing' || game.spinsLeft <= 0) return;

  spinning = true;
  updateSpinBtn(true);
  document.getElementById('result-card')?.classList.add('hidden');

  // Remove highlights and payline SVG from previous spin
  UI.clearPaylineLines();
  document.querySelectorAll('.symbol').forEach(el => {
    el.classList.remove('sym-win');
    el.removeAttribute('data-glow');
    el.style.removeProperty('box-shadow');
  });

  game.spinsLeft--;
  game.spinsUsedThisRound++;
  UI.updateHUD(game);

  // Pre-draw grid, inject into reels before animation
  const grid = Engine.drawGrid(game.playerDeck);
  UI.injectGrid(grid);

  // Animate all 5 reels with staggered timing
  await Promise.all(
    Array.from({ length: CONFIG.NUM_REELS }, (_, i) => UI.animateReel(i, i))
  );

  // Score
  const isFirstSpin = game.spinsUsedThisRound === 1;
  const result = Engine.calculateScore(
    grid,
    game.modifiers,
    game.playerDeck,
    isFirstSpin,
    game.winStreak
  );

  // Update streak
  const isWin = result.hitLines.length > 0;
  game.winStreak = isWin ? game.winStreak + 1 : 0;

  game.roundScore += result.score;
  game.totalScore += result.score;
  if (result.score > game.bestSpin) game.bestSpin = result.score;
  game.lastGrid = grid;

  // Highlight winning payline positions
  UI.highlightPaylines(result.lineResults);
  UI.showResultCard(result);
  if (result.bestComboKey === 'JACKPOT') setTimeout(() => UI.triggerJackpot(result.score), 350);
  UI.updateHUD(game);
  UI.updateSidebar(game);

  save();
  spinning = false;

  const round = getCurrentRound();
  if (round && game.roundScore >= round.target) {
    updateSpinBtn(true);
    setTimeout(roundWin, 600);
  } else if (game.spinsLeft <= 0) {
    updateSpinBtn(true);
    setTimeout(roundFail, 600);
  } else {
    updateSpinBtn(false);
    UI.fillReels(game.playerDeck, grid);
  }
}

function roundWin() {
  const round = getCurrentRound();
  if (!round) return;
  game.gold += round.reward;
  showToast(`Round Complete! +${round.reward}G`, '#00e676');
  setTimeout(advanceToShop, 900);
}

function roundFail() {
  endRun('Out of Spins');
}

// ── Shop handlers ─────────────────────────────────────────

function handleShopBuy(idx) {
  if (!currentShop) return;
  const item = currentShop.items[idx];
  if (!item || game.gold < item.cost) return;
  const maxMods = ((META.deckSlot ?? 0) + CONFIG.MAX_MODIFIERS);

  if (item.type === 'symbol') {
    game.gold -= item.cost;
    game.playerDeck.push(item.symbol);
    currentShop.items[idx] = null;
    showToast(`Added ${item.symbol} to deck!`, '#69f0ae');
  } else if (item.type === 'modifier') {
    if (game.modifiers.length >= maxMods) { showToast('Modifier slots full!', '#f5c518'); return; }
    game.gold -= item.cost;
    game.modifiers.push(item.id);
    currentShop.items[idx] = null;
    showToast(`Equipped ${item.emoji} ${item.name}!`, '#7ee8fa');
  } else if (item.type === 'remove') {
    game.gold -= item.cost;
    currentShop.items[idx] = null;
    UI.showRemovePrompt(game.playerDeck);
  }

  currentShop.items = currentShop.items.filter(Boolean);
  UI.renderShop(currentShop, game);
  UI.updateHUD(game);
  UI.updateSidebar(game);
  save();
}

function handleShopReroll() {
  if (game.gold < CONFIG.REROLL_COST) return;
  game.gold -= CONFIG.REROLL_COST;
  currentShop = Shop.rerollShop(currentShop, game.modifiers);
  UI.renderShop(currentShop, game);
  UI.updateHUD(game);
  save();
}

function handleShopSkip() {
  game.gold += 2;
  showToast('+2G for skipping shop!', '#f5c518');
  proceedFromShop();
}

function handleShopContinue() {
  proceedFromShop();
}

function handleRemoveSymbol(sym) {
  const idx = game.playerDeck.indexOf(sym);
  if (idx === -1) return;
  game.playerDeck.splice(idx, 1);
  UI.hideRemovePrompt();
  UI.updateSidebar(game);
  showToast(`Removed ${sym} from deck`, '#ef5350');
  save();
}

// ── End run ───────────────────────────────────────────────

function endRun(reason) {
  const earned = Math.floor(game.totalScore / CONFIG.SHARD_RATE);
  META.shards += earned;
  if (game.totalScore > (META.highScore ?? 0)) META.highScore = game.totalScore;
  game.phase = 'game_over';
  document.getElementById('go-reason').textContent = reason;
  document.getElementById('go-shards-earned').textContent = `+${earned} ✧`;
  UI.showPhase('game_over', game);
  save();
}

function resetRun() {
  localStorage.removeItem('neonVault_run');
  game = newRunState();
  ['phase-game-over','phase-shop','phase-pre-round'].forEach(id =>
    document.getElementById(id)?.classList.remove('active')
  );
  document.getElementById('result-card')?.classList.add('hidden');
  document.querySelectorAll('.symbol').forEach(el => el.classList.remove('sym-win','sym-lose'));
  UI.fillReels(game.playerDeck, null);
  showPreRound();
}

// ── Meta upgrades ─────────────────────────────────────────

function buyMeta(key) {
  const upg = CONFIG.META_UPGRADES[key];
  if (!upg) return;
  const lvl  = META[key] ?? 0;
  const cost = upg.baseCost + lvl * upg.perLevel;
  if (META.shards < cost) return;
  META.shards -= cost;
  META[key] = lvl + 1;
  save();
  UI.renderMetaUpgrades();
  document.getElementById('go-shards').textContent = `✧ ${META.shards}`;
}

// ── Misc helpers ──────────────────────────────────────────

function updateSpinBtn(disabled) {
  const btn = document.getElementById('spin-btn');
  if (btn) btn.disabled = disabled ?? (game.spinsLeft <= 0);
}

function showToast(msg, color) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderColor = color ?? '#f5c518';
  t.style.color = color ?? '#f5c518';
  t.classList.remove('toast-hide');
  t.classList.add('toast-show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.classList.replace('toast-show', 'toast-hide');
  }, 2100);
}

function confirmForfeit() {
  if (confirm('Forfeit run? Shards will be saved.')) endRun('Forfeited');
}

function switchTab(tab) { UI.switchTab(tab); }
function closeRemoveModal() { UI.hideRemovePrompt(); }

// ── Init ──────────────────────────────────────────────────

function init() {
  game = loadRun();
  UI.renderPaytable();
  UI.updateHUD(game);
  UI.updateSidebar(game);
  UI.fillReels(game.playerDeck, game.lastGrid);

  if (game.phase === 'playing') {
    // Resume mid-round
  } else if (game.phase === 'shop') {
    currentShop = Shop.generateShop(game.modifiers);
    UI.showPhase('shop', game);
    UI.renderShop(currentShop, game);
  } else if (game.phase === 'game_over') {
    UI.showPhase('game_over', game);
  } else {
    showPreRound();
  }
}

window.addEventListener('DOMContentLoaded', init);

// Expose for inline HTML handlers
window.spin               = spin;
window.startRound         = startRound;
window.handleShopBuy      = handleShopBuy;
window.handleShopReroll   = handleShopReroll;
window.handleShopSkip     = handleShopSkip;
window.handleShopContinue = handleShopContinue;
window.handleRemoveSymbol = handleRemoveSymbol;
window.closeRemoveModal   = closeRemoveModal;
window.resetRun           = resetRun;
window.buyMeta            = buyMeta;
window.confirmForfeit     = confirmForfeit;
window.switchTab          = switchTab;
