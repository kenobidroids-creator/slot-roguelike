// ============================================================
// ui.js — All DOM rendering. State → DOM. No game logic here.
// ============================================================

var UI = (() => {

  // ── Reel fill & animation ─────────────────────────────────

  const REEL_COUNT = 5;
  const REEL_ROWS  = 3;
  const REEL_DEPTH = 50; // symbols in the reel strip
  const TARGET_IDX = 40; // index we animate to (middle row lands here)

  function getWeightedSymbol(deck) {
    const w = CONFIG.SYMBOLS;
    let total = 0;
    deck.forEach(s => total += (w[s]?.weight ?? 5));
    let r = Math.random() * total;
    for (const sym of deck) {
      const wt = w[sym]?.weight ?? 5;
      if (r < wt) return sym;
      r -= wt;
    }
    return deck[0];
  }

  function fillReels(deck, lastGrid) {
    for (let i = 0; i < REEL_COUNT; i++) {
      const container = document.querySelector(`#reel-${i} .symbols-container`);
      if (!container) continue;
      container.style.transition = 'none';
      container.innerHTML = '';

      // Seed top 3 slots from last grid or random
      for (let row = 0; row < REEL_ROWS; row++) {
        const seed = lastGrid ? lastGrid[i][row] : getWeightedSymbol(deck);
        addSymEl(container, seed);
      }
      // Fill rest randomly
      for (let j = REEL_ROWS; j < REEL_DEPTH + REEL_ROWS; j++) {
        addSymEl(container, getWeightedSymbol(deck));
      }
      container.style.transform = 'translateY(0)';
    }
  }

  function addSymEl(container, sym) {
    const d = document.createElement('div');
    d.className = 'symbol';
    d.textContent = sym;
    container.appendChild(d);
  }

  /**
   * Inject a drawn grid into the reel strips so animation lands on correct symbols.
   * grid[reel][row]: top, mid, bot at TARGET_IDX-1, TARGET_IDX, TARGET_IDX+1
   */
  function injectGrid(grid) {
    for (let i = 0; i < REEL_COUNT; i++) {
      const container = document.querySelector(`#reel-${i} .symbols-container`);
      if (!container) continue;
      const top = container.children[TARGET_IDX - 1];
      const mid = container.children[TARGET_IDX];
      const bot = container.children[TARGET_IDX + 1];
      if (top) top.textContent = grid[i][0];
      if (mid) mid.textContent = grid[i][1];
      if (bot) bot.textContent = grid[i][2];
    }
  }

  function getSymSize() {
    const reel = document.querySelector('.reel');
    return reel ? reel.offsetHeight / REEL_ROWS : 90;
  }

  /**
   * Animate reel i with a stagger delay multiplier.
   * Resolves immediately (callers await Promise.all externally).
   */
  function animateReel(i, delayFactor) {
    return new Promise(resolve => {
      const el = document.querySelector(`#reel-${i} .symbols-container`);
      if (!el) return resolve();
      const symSize = getSymSize();
      // We want the middle row (TARGET_IDX) visible at the center.
      // Reel shows 3 rows, so offset = (TARGET_IDX - 1) * symSize makes top row = TARGET_IDX-1.
      const offset = (TARGET_IDX - 1) * symSize;
      const dur    = 0.85 + delayFactor * 0.2;

      el.style.transition = 'none';
      el.style.transform  = 'translateY(0)';
      el.offsetHeight; // force reflow
      el.style.transition = `transform ${dur}s cubic-bezier(0.15,0,0.08,1)`;
      el.style.transform  = `translateY(-${offset}px)`;
      setTimeout(resolve, dur * 1000);
    });
  }

  // Payline colors (match CSS .pl-1 ... .pl-5)
  const PAYLINE_COLORS = ['#f5c518','#00d4ff','#00e676','#ff6b6b','#c77dff'];

  // ── Payline highlights + SVG lines ─────────────────────────────────────

  function highlightPaylines(lineResults) {
    // Clear old symbol styles
    document.querySelectorAll('.symbol').forEach(el => {
      el.classList.remove('sym-win', 'sym-dim');
      el.removeAttribute('data-glow');
      el.style.removeProperty('box-shadow');
    });
    clearPaylineLines();

    const winningLines = lineResults.filter(r => r.comboKey !== 'NO_WIN');
    if (!winningLines.length) return;

    winningLines.forEach(({ comboKey, plIdx, runLen, winSymbol }, i) => {
      const color   = PAYLINE_COLORS[plIdx] || '#f5c518';
      const pl      = CONFIG.PAYLINES[plIdx];
      const isScatter = comboKey === 'SCATTER';

      pl.forEach((rowIdx, reel) => {
        const container = document.querySelector(`#reel-${reel} .symbols-container`);
        if (!container) return;
        const el = container.children[TARGET_IDX - 1 + rowIdx];
        if (!el) return;

        // Decide if this cell is a "winning" cell:
        // For left-runs: reels 0..runLen-1
        // For SCATTER: any cell that matches winSymbol
        let isWinCell = false;
        if (isScatter) {
          isWinCell = (el.textContent.trim() === winSymbol);
        } else {
          isWinCell = (reel < runLen);
        }

        if (isWinCell) {
          el.classList.add('sym-win');
          const prev = el.getAttribute('data-glow') || '';
          el.setAttribute('data-glow', prev + color + ',');
          el.style.boxShadow = buildGlow(el.getAttribute('data-glow'));
        } else {
          // Cells on the line but NOT part of the win get a subtle dim
          el.classList.add('sym-dim');
        }
      });

      // SVG polyline: full line for runs, dotted between scatter cells
      setTimeout(() => drawPaylineSVG(plIdx, color, isScatter ? null : runLen), i * 110);
    });
  }

  function buildGlow(colors) {
    return (colors || '').split(',').filter(Boolean)
      .map(c => `0 0 0 2px ${c}, 0 0 18px 5px ${c}66`).join(', ');
  }

  function clearPaylineLines() {
    document.querySelectorAll('.symbol').forEach(el => el.removeAttribute('data-glow'));
    const svg = document.getElementById('payline-svg');
    if (svg) svg.innerHTML = '';
    document.querySelectorAll('.pl-dot').forEach(d => d.classList.remove('pl-lit'));
  }

  /**
   * Draw an animated SVG polyline for a winning payline.
   * Measures actual reel DOM positions — works at any viewport size.
   */
  /**
   * Draw the payline SVG.
   * clipAt: how many reels from the left are the "winning" portion (null = full line / scatter).
   *   Reels 0..clipAt-1  → solid bright animated stroke
   *   Reels clipAt..4    → dim dashed tail (non-contributing cells)
   */
  function drawPaylineSVG(plIdx, color, clipAt) {
    const svg = document.getElementById('payline-svg');
    if (!svg) return;
    const reelsWrap = document.querySelector('.reels-wrap');
    if (!reelsWrap) return;

    const wrapRect = reelsWrap.getBoundingClientRect();
    const symH     = (document.querySelector('.reel')?.offsetHeight || 246) / REEL_ROWS;
    const payline  = CONFIG.PAYLINES[plIdx];

    // Collect {x,y} per reel
    const pts = payline.map((rowIdx, ri) => {
      const reel = document.getElementById('reel-' + ri);
      if (!reel) return null;
      const r = reel.getBoundingClientRect();
      return { x: r.left - wrapRect.left + r.width / 2,
               y: r.top  - wrapRect.top  + rowIdx * symH + symH / 2 };
    }).filter(Boolean);

    if (pts.length < 2) return;

    function makePoly(points, stroke, width, opacity, dashed, animated) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      el.setAttribute('points', points.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' '));
      el.setAttribute('fill', 'none');
      el.setAttribute('stroke', stroke);
      el.setAttribute('stroke-width', String(width));
      el.setAttribute('stroke-linecap', 'round');
      el.setAttribute('stroke-linejoin', 'round');
      if (opacity < 1) el.setAttribute('opacity', String(opacity));
      if (dashed) el.setAttribute('stroke-dasharray', '7 5');
      el.style.filter = animated ? ('drop-shadow(0 0 5px ' + stroke + ')') : 'none';
      svg.appendChild(el);
      if (animated) {
        const len = el.getTotalLength ? el.getTotalLength() : 400;
        el.style.strokeDasharray  = len;
        el.style.strokeDashoffset = len;
        el.classList.add('payline-line');
        void el.getBoundingClientRect();
        el.classList.add('payline-line-draw');
      }
      return el;
    }

    if (clipAt == null || clipAt >= pts.length) {
      // Scatter or full-line win: draw entire line solid + animated
      makePoly(pts, color, 3.5, 1, false, true);
    } else {
      // Winning run portion: solid, bright, animated
      makePoly(pts.slice(0, clipAt), color, 3.5, 1, false, true);
      // Non-contributing tail: dashed, dim, no animation
      makePoly(pts.slice(clipAt - 1), color, 1.5, 0.28, true, false);
    }

    // Light up matching sidebar indicator dots
    document.querySelectorAll('.pl-' + (plIdx + 1)).forEach(d => d.classList.add('pl-lit'));
  }

  // ── Jackpot celebration ───────────────────────────────────────────────────

  function triggerJackpot(score) {
    const overlay = document.getElementById('jackpot-overlay');
    if (!overlay) return;

    document.getElementById('jackpot-score').textContent = `+${score.toLocaleString()}`;
    overlay.classList.add('active');
    startJackpotParticles();

    // Screen flash
    const flash = document.getElementById('screen-flash');
    if (flash) {
      flash.classList.add('flashing');
      setTimeout(() => flash.classList.remove('flashing'), 700);
    }

    const dismiss = () => {
      overlay.classList.remove('active');
      stopJackpotParticles();
      overlay.removeEventListener('click', dismiss);
    };
    overlay.addEventListener('click', dismiss);
    setTimeout(dismiss, 4800);
  }

  let jpAnimId = null;
  let jpParticles = [];

  function startJackpotParticles() {
    const canvas = document.getElementById('jackpot-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;

    const EMOJIS = ['🪙','⭐','💎','✨','7️⃣','🔔','🍀'];
    const COLORS = ['#f5c518','#00d4ff','#00e676','#ff6b6b','#c77dff','#ffffff','#ffaa00'];

    jpParticles = [];

    // Rain from top
    for (let i = 0; i < 90; i++) {
      jpParticles.push({
        x: Math.random() * W,
        y: -30 - Math.random() * H * 0.7,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 2.5 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.18,
        size: 20 + Math.random() * 20,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
        type: Math.random() > 0.45 ? 'emoji' : 'circle',
      });
    }

    // Burst from center
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2;
      const speed = 5 + Math.random() * 10;
      jpParticles.push({
        x: W / 2, y: H * 0.35,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        rot: 0, rotV: (Math.random() - 0.5) * 0.25,
        size: 8 + Math.random() * 16,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        emoji: '', alpha: 1, type: 'circle',
      });
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      jpParticles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15;
        p.rot += p.rotV;
        if (p.y > H * 0.8) p.alpha -= 0.018;
        else if (p.y > H + 30) p.alpha = 0;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.type === 'emoji') {
          ctx.font = `${p.size}px serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(p.emoji, 0, 0);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.beginPath();
          ctx.arc(-p.size * 0.12, -p.size * 0.12, p.size * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      jpParticles = jpParticles.filter(p => p.alpha > 0);
      if (jpParticles.length > 0) jpAnimId = requestAnimationFrame(frame);
    }

    stopJackpotParticles();
    jpAnimId = requestAnimationFrame(frame);
  }

  function stopJackpotParticles() {
    if (jpAnimId) { cancelAnimationFrame(jpAnimId); jpAnimId = null; }
    jpParticles = [];
    const c = document.getElementById('jackpot-canvas');
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
  }

  // ── Result card ───────────────────────────────────────────

  function showResultCard(result) {
    const { chips, mult, score, bestComboKey, hitLines, effects } = result;
    const combo = CONFIG.COMBOS[bestComboKey];

    const linesSummary = hitLines.length > 0
      ? `<div class="lines-hit">${hitLines.length} line${hitLines.length > 1 ? 's' : ''} hit</div>`
      : '';

    let effectLines = '';
    for (const e of effects) {
      const mod = CONFIG.MODIFIERS.find(m => m.id === e.modId);
      if (!mod) continue;
      const parts = [];
      if (e.chipsDelta) parts.push(`<span class="chips-tag sm">+${e.chipsDelta}⚡</span>`);
      if (e.multDelta)  parts.push(`<span class="mult-tag sm">+${e.multDelta.toFixed(1)}×</span>`);
      effectLines += `<div class="effect-line">${mod.emoji} ${mod.name}: ${parts.join(' ')}</div>`;
    }

    const el = document.getElementById('result-card');
    el.innerHTML = `
      <div class="result-hand">${combo.name}</div>
      ${linesSummary}
      <div class="result-breakdown">
        <span class="chips-tag">${chips}⚡</span>
        <span class="result-x">×</span>
        <span class="mult-tag">${mult.toFixed(1)}×</span>
        <span class="result-eq">=</span>
        <span class="score-tag">+${score.toLocaleString()}</span>
      </div>
      ${effectLines}
    `;
    el.classList.remove('hidden', 'fade-in');
    void el.offsetWidth;
    el.classList.add('fade-in');
  }

  // ── Progress bar ──────────────────────────────────────────

  function updateProgress(roundScore, target) {
    const pct = Math.min(100, (roundScore / target) * 100);
    const bar = document.getElementById('progress-fill');
    const lbl = document.getElementById('progress-label');
    if (bar) { bar.style.width = pct + '%'; }
    if (bar && pct >= 100) bar.classList.add('complete');
    else if (bar) bar.classList.remove('complete');
    if (lbl) lbl.textContent = `${roundScore.toLocaleString()} / ${target.toLocaleString()}`;
  }

  // ── HUD ───────────────────────────────────────────────────

  function updateHUD(game) {
    const stage = CONFIG.STAGES[game.stageIndex];
    const round = stage?.rounds[game.roundIndex];
    setText('hud-gold',       game.gold);
    setText('hud-spins',      game.spinsLeft);
    setText('hud-stage',      `STAGE ${game.stageIndex + 1}`);
    setText('hud-round-name', round ? round.name : '—');
    const rn = document.getElementById('hud-round-name');
    if (rn) {
      round?.boss ? rn.classList.add('boss') : rn.classList.remove('boss');
    }
    updateProgress(game.roundScore, round?.target ?? 1);
  }

  // ── Sidebar ───────────────────────────────────────────────

  function updateSidebar(game) {
    const deckEl = document.getElementById('deck-list');
    if (deckEl) {
      const counts = {};
      game.playerDeck.forEach(s => counts[s] = (counts[s] || 0) + 1);
      deckEl.innerHTML = Object.keys(counts).sort().map(sym => {
        const info = CONFIG.SYMBOLS[sym];
        const chipText = info.penalty
          ? `<span class="chip-neg">-${info.penalty}⚡</span>`
          : `<span class="chip-pos">+${info.chips}⚡</span>`;
        return `<div class="deck-row">
          <span class="deck-sym">${sym}</span>
          <span class="deck-name">${info.name}</span>
          ${chipText}
          <span class="deck-count">×${counts[sym]}</span>
        </div>`;
      }).join('');
    }

    const modEl = document.getElementById('modifier-list');
    if (modEl) {
      modEl.innerHTML = game.modifiers.length === 0
        ? '<div class="empty-mods">No modifiers yet</div>'
        : game.modifiers.map(id => {
            const m = CONFIG.MODIFIERS.find(mod => mod.id === id);
            if (!m) return '';
            return `<div class="mod-card rarity-${m.rarity}">
              <div class="mod-header">
                <span class="mod-emoji">${m.emoji}</span>
                <span class="mod-name">${m.name}</span>
              </div>
              <div class="mod-desc">${m.desc}</div>
            </div>`;
          }).join('');
    }

    const m = window.META || {};
    setText('shard-count', `✧ ${m.shards ?? 0}`);
    const maxSlots = (m.deckSlot ?? 0) + CONFIG.MAX_MODIFIERS;
    setText('mod-slot-count', `${game.modifiers.length}/${maxSlots} MODS`);
  }

  // ── Paytable ──────────────────────────────────────────────

  function renderPaytable() {
    const symEl = document.getElementById('paytable-symbols');
    if (symEl) {
      symEl.innerHTML = Object.entries(CONFIG.SYMBOLS).map(([sym, info]) => {
        const val = info.penalty
          ? `<span class="pay-neg">-${info.penalty}⚡</span>`
          : `<span class="pay-pos">+${info.chips}⚡</span>`;
        return `<div class="pay-row"><span>${sym} ${info.name}</span>${val}</div>`;
      }).join('');
    }

    const comboEl = document.getElementById('paytable-combos');
    if (comboEl) {
      comboEl.innerHTML = Object.values(CONFIG.COMBOS).map(c => `
        <div class="pay-row">
          <span>${c.name}</span>
          <span class="pay-pos">+${c.chips}⚡ ×${c.mult}</span>
        </div>`).join('');
    }

    const plEl = document.getElementById('paytable-paylines');
    if (plEl) {
      const PL_COLORS = ['#f5c518','#00d4ff','#00e676','#ff6b6b','#c77dff',
        '#ff9a3c','#a8ff3e','#ff5fcf','#3ef5ff','#ffe566',
        '#ff7a7a','#7aff7a','#7a7aff','#ffb77a','#b77aff',
        '#7affb7','#ff7ab7','#ffd07a','#7ab7ff','#d07aff'];
      plEl.innerHTML = CONFIG.PAYLINES.map(function(pl, i) {
        var name  = CONFIG.PAYLINE_NAMES[i] || ('Line ' + (i+1));
        var color = PL_COLORS[i] || '#f5c518';
        var cx=5, cy=5, r=3, gapX=10, gapY=10;
        var dots = '';
        for (var row=0; row<3; row++) {
          for (var col=0; col<5; col++) {
            var x=cx+col*gapX, y=cy+row*gapY;
            dots += '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+(pl[col]===row ? color : 'rgba(255,255,255,0.12)')+'"/>';
          }
        }
        var pts = pl.map(function(row,col){ return (cx+col*gapX)+','+(cy+row*gapY); }).join(' ');
        return '<div class="pay-row payline-diagram-row">'
          +'<span class="pl-label">'+(i+1)+'. '+name+'</span>'
          +'<svg width="50" height="30" style="overflow:visible;flex-shrink:0">'
          +'<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>'
          +dots+'</svg></div>';
      }).join('');
    }
  }

  // ── Phase overlays ────────────────────────────────────────

  function showPhase(phase, game) {
    ['phase-pre-round','phase-shop','phase-game-over'].forEach(id => {
      document.getElementById(id)?.classList.remove('active');
    });

    if (phase === 'pre_round') {
      const stage = CONFIG.STAGES[game.stageIndex];
      const round = stage?.rounds[game.roundIndex];
      setText('pre-round-name',  round?.name ?? '');
      setText('pre-target',      round ? round.target.toLocaleString() : '');
      setText('pre-spins',       round?.spins ?? 8);
      setText('pre-reward',      `+${round?.reward ?? 0}G`);
      setText('pre-stage-label', `Stage ${game.stageIndex + 1} · Round ${game.roundIndex + 1}/3`);
      const b = document.getElementById('pre-boss-badge');
      if (b) b.style.display = round?.boss ? 'inline-block' : 'none';
      document.getElementById('phase-pre-round')?.classList.add('active');

    } else if (phase === 'shop') {
      document.getElementById('phase-shop')?.classList.add('active');

    } else if (phase === 'game_over') {
      renderGameOver(game);
      document.getElementById('phase-game-over')?.classList.add('active');
    }
  }

  function renderGameOver(game) {
    const m = window.META || {};
    setText('go-shards',        `✧ ${m.shards ?? 0}`);
    setText('go-best',          (game.bestSpin ?? 0).toLocaleString());
    setText('go-total',         (game.totalScore ?? 0).toLocaleString());
    setText('go-stage',         `Stage ${(game.stageIndex ?? 0) + 1}`);
    renderMetaUpgrades();
  }

  function renderMetaUpgrades() {
    const el = document.getElementById('meta-upgrades');
    if (!el) return;
    const m = window.META || {};
    el.innerHTML = Object.entries(CONFIG.META_UPGRADES).map(([key, upg]) => {
      const lvl  = m[key] ?? 0;
      const cost = upg.baseCost + lvl * upg.perLevel;
      return `<div class="meta-row">
        <div>
          <div class="meta-label">${upg.label} <small>(Lvl ${lvl})</small></div>
          <div class="meta-desc">${upg.desc}</div>
        </div>
        <button class="meta-buy-btn" onclick="buyMeta('${key}')" ${(m.shards ?? 0) < cost ? 'disabled' : ''}>
          ✧ ${cost}
        </button>
      </div>`;
    }).join('');
  }

  // ── Shop rendering ────────────────────────────────────────

  function renderShop(shop, game) {
    const el = document.getElementById('shop-items');
    if (!el) return;
    const m = window.META || {};
    const maxMods = (m.deckSlot ?? 0) + CONFIG.MAX_MODIFIERS;

    setText('shop-gold-display', `${game.gold}G`);

    el.innerHTML = shop.items.map((item, idx) => {
      if (!item) return '';
      const canAfford   = game.gold >= item.cost;
      const isMaxMods   = item.type === 'modifier' && game.modifiers.length >= maxMods;
      const alreadyOwned= item.type === 'modifier' && game.modifiers.includes(item.id);
      const disabled    = !canAfford || isMaxMods || alreadyOwned;
      const rarityClass = item.rarity === 'rare' ? 'badge-rare'
                        : item.rarity === 'uncommon' ? 'badge-uncommon'
                        : item.type === 'symbol' ? 'badge-symbol' : '';
      const icon = item.emoji ?? item.symbol ?? '';
      const soldTag = alreadyOwned ? '<div class="sold-badge">OWNED</div>' : '';

      return `<div class="shop-card ${disabled ? 'shop-disabled' : ''} ${rarityClass}">
        ${soldTag}
        <div class="shop-icon">${icon}</div>
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <button class="shop-buy-btn" onclick="handleShopBuy(${idx})" ${disabled ? 'disabled' : ''}>
          ${item.cost}G
        </button>
      </div>`;
    }).join('');

    const rerollBtn = document.getElementById('shop-reroll-btn');
    if (rerollBtn) rerollBtn.disabled = game.gold < CONFIG.REROLL_COST;
  }

  // ── Remove symbol modal ───────────────────────────────────

  function showRemovePrompt(deck) {
    const modal = document.getElementById('remove-modal');
    const list  = document.getElementById('remove-list');
    if (!modal || !list) return;
    const counts = {};
    deck.forEach(s => counts[s] = (counts[s] || 0) + 1);
    list.innerHTML = Object.keys(counts).map(sym =>
      `<button class="remove-sym-btn" onclick="handleRemoveSymbol('${sym}')">
        ${sym}
        <span class="deck-name">${CONFIG.SYMBOLS[sym]?.name}</span>
        <span class="deck-count">×${counts[sym]}</span>
      </button>`
    ).join('');
    modal.classList.add('active');
  }

  function hideRemovePrompt() {
    document.getElementById('remove-modal')?.classList.remove('active');
  }

  // ── Tab switching (mobile) ────────────────────────────────

  function switchTab(tabName) {
    document.querySelectorAll('.sidebar-tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`)?.classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`)?.classList.add('active');
  }

  // ── Helpers ───────────────────────────────────────────────

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return {
    fillReels, injectGrid, animateReel, highlightPaylines, clearPaylineLines,
    triggerJackpot, stopJackpotParticles,
    showResultCard, updateProgress, updateHUD, updateSidebar,
    renderPaytable, showPhase, renderShop, renderMetaUpgrades,
    showRemovePrompt, hideRemovePrompt, switchTab,
  };
})();
