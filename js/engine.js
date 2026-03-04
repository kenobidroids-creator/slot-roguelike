// ============================================================
// engine.js — Core spin logic. Pure functions: no DOM.
// ============================================================

var Engine = (() => {

  // ── Symbol drawing ──────────────────────────────────────

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

  function drawGrid(deck) {
    return Array.from({ length: CONFIG.NUM_REELS }, () =>
      Array.from({ length: CONFIG.VISIBLE_ROWS }, () => getWeightedSymbol(deck))
    );
  }

  // ── Wild substitution ─────────────────────────────────────

  function applyWilds(syms, modIds) {
    if (!modIds.includes('wild_seven')) return [...syms];
    const nonWild = syms.filter(s => s !== '7️⃣');
    if (!nonWild.length) return [...syms];
    const counts = {};
    nonWild.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const best = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    return syms.map(s => s === '7️⃣' ? best : s);
  }

  // ── Single payline evaluation ─────────────────────────────
  //
  // Combo hierarchy (left-to-right run required for all except SCATTER):
  //   JACKPOT    — 5× 💎 or 5× 7️⃣ from leftmost reel
  //   FIVE_KIND  — 5× same symbol from leftmost reel
  //   FOUR_KIND  — 4× same symbol starting from leftmost reel
  //   THREE_KIND — 3× same symbol starting from leftmost reel
  //   MATCH      — 2× same symbol starting from leftmost reel
  //   SCATTER    — 3+ same symbol anywhere on line (no left-run of 2+)
  //   NO_WIN     — nothing
  //
  // Returns: { comboKey, baseChips, baseMult, runLen, winSymbol, rawSyms }
  //   runLen   = how many reels from the left are part of the win (for highlight)
  //   winSymbol = which symbol matched (for highlight)

  function evaluatePayline(rawSyms, modIds) {
    const syms = applyWilds(rawSyms, modIds);
    const w    = CONFIG.SYMBOLS;

    // Chip sum & skull count from RAW symbols (pre-wild)
    let skullCount = 0;
    let rawChips   = 0;
    rawSyms.forEach(s => {
      if (w[s]?.penalty) skullCount++;
      else rawChips += (w[s]?.chips ?? 0);
    });

    // ── Left-run detection ────────────────────────────────
    // The leftmost non-skull symbol determines what a "run" matches.
    // A skull at any position BREAKS the run.
    // syms[0] must be non-skull to start a run.
    let runLen   = 0;
    let winSymbol = null;

    const leftSym = w[syms[0]]?.penalty ? null : syms[0];
    if (leftSym) {
      for (const s of syms) {
        if (s === leftSym) { runLen++; }
        else { break; }
      }
      winSymbol = leftSym;
    }

    // ── Scatter: 3+ matching anywhere, only if no left-run ──
    // (Prevents scatter from firing constantly on low-run spins)
    let scatterSym   = null;
    let scatterCount = 0;
    if (runLen < 2) {
      const counts = {};
      syms.forEach(s => { if (!w[s]?.penalty) counts[s] = (counts[s] || 0) + 1; });
      const entries = Object.entries(counts).filter(([,c]) => c >= 3);
      if (entries.length) {
        entries.sort((a, b) => b[1] - a[1]);
        [scatterSym, scatterCount] = entries[0];
      }
    }

    // ── Pick combo ────────────────────────────────────────
    let comboKey;
    if (runLen === 5 && (leftSym === '💎' || leftSym === '7️⃣')) {
      comboKey = 'JACKPOT';
    } else if (runLen === 5) {
      comboKey = 'FIVE_KIND';
    } else if (runLen === 4) {
      comboKey = 'FOUR_KIND';
    } else if (runLen === 3) {
      comboKey = 'THREE_KIND';
    } else if (runLen === 2) {
      comboKey = 'MATCH';
    } else if (scatterCount >= 3) {
      comboKey  = 'SCATTER';
      winSymbol = scatterSym;
      runLen    = scatterCount; // used in highlight to know how many cells lit
    } else {
      comboKey = 'NO_WIN';
    }

    const combo     = CONFIG.COMBOS[comboKey];
    const baseChips = Math.max(0, rawChips + combo.chips - skullCount * 4);
    const baseMult  = combo.mult;

    return { comboKey, baseChips, baseMult, skullCount, rawSyms, runLen, winSymbol };
  }

  // ── Full spin scoring ─────────────────────────────────────

  const COMBO_RANK = ['JACKPOT','FIVE_KIND','FOUR_KIND','THREE_KIND','SCATTER','MATCH','NO_WIN'];

  function calculateScore(grid, modIds, deck, isFirstSpin, winStreak) {
    const voidWalker  = modIds.includes('void_walker');
    const glassCannon = modIds.includes('glass_cannon');

    // 1. Evaluate each payline
    const lineResults = CONFIG.PAYLINES.map((pl, plIdx) => {
      const syms = pl.map((rowIdx, reel) => grid[reel][rowIdx]);
      return { ...evaluatePayline(syms, modIds), plIdx };
    });

    // 2. Aggregate
    const hitLines     = lineResults.filter(r => r.comboKey !== 'NO_WIN');
    const bestComboKey = lineResults.reduce((best, r) =>
      COMBO_RANK.indexOf(r.comboKey) < COMBO_RANK.indexOf(best) ? r.comboKey : best
    , 'NO_WIN');

    let totalBaseChips = lineResults.reduce((s, r) => s + r.baseChips, 0);
    let bestMult       = Math.max(...lineResults.map(r => r.baseMult));

    const allSymbols  = grid.flat();
    const totalSkulls = allSymbols.filter(s => CONFIG.SYMBOLS[s]?.penalty).length;

    if (voidWalker) {
      const voidMod = CONFIG.MODIFIERS.find(m => m.id === 'void_walker');
      totalBaseChips += totalSkulls * voidMod.effect.value;
    }
    if (glassCannon) {
      const gcMod = CONFIG.MODIFIERS.find(m => m.id === 'glass_cannon');
      bestMult       = parseFloat((bestMult * gcMod.effect.scale).toFixed(2));
      totalBaseChips -= totalSkulls * 4 * (gcMod.effect.skull_scale - 1);
    }
    if (modIds.includes('gilded_edge')) {
      const ge = CONFIG.MODIFIERS.find(m => m.id === 'gilded_edge');
      bestMult = parseFloat((bestMult + hitLines.length * ge.effect.value).toFixed(2));
    }

    // 3. Modifier pipeline
    let modChips = 0;
    let modMult  = 0;
    const effects = [];

    for (const modId of modIds) {
      const mod = CONFIG.MODIFIERS.find(m => m.id === modId);
      if (!mod) continue;
      const e = mod.effect;
      let cd = 0, md = 0;

      switch (e.type) {
        case 'win_mult':
          if (hitLines.length > 0) md = e.value;
          break;
        case 'per_symbol_mult': {
          const cnt = allSymbols.filter(s => s === e.symbol).length;
          if (cnt > 0) md = e.value * cnt;
          break;
        }
        case 'per_symbol_chips': {
          const cnt = allSymbols.filter(s => s === e.symbol).length;
          if (cnt > 0) cd = e.value * cnt;
          break;
        }
        case 'per_symbol_both': {
          const cnt = allSymbols.filter(s => s === e.symbol).length;
          if (cnt > 0) { cd = e.chips * cnt; md = e.mult * cnt; }
          break;
        }
        case 'per_skull_mult':
          if (totalSkulls > 0) md = e.value * totalSkulls;
          break;
        case 'combo_mult':
          if (hitLines.some(r => r.comboKey === e.combo)) md = e.value;
          break;
        case 'combo_chips': {
          const matching = hitLines.filter(r => r.comboKey === e.combo).length;
          if (matching > 0) cd = e.value * matching;
          break;
        }
        case 'combo_mult_scale': {
          const matching = hitLines.filter(r => r.comboKey === e.combo).length;
          if (matching > 0) bestMult = parseFloat((bestMult * Math.pow(e.scale, matching)).toFixed(2));
          break;
        }
        case 'deck_count_mult': {
          const cnt = deck.filter(s => s === e.symbol).length;
          if (cnt > 0) md = e.value * cnt;
          break;
        }
        case 'first_spin_scale':
          if (isFirstSpin) bestMult = parseFloat((bestMult * e.scale).toFixed(2));
          break;
        case 'specific_five_chips':
          if (bestComboKey === 'FIVE_KIND' && allSymbols.filter(s => s === e.symbol).length >= 5) cd = e.value;
          break;
        case 'per_hit_line':
          if (hitLines.length > 0) cd = e.value * hitLines.length;
          break;
        case 'streak_mult':
          if (winStreak > 0) md = e.value * winStreak;
          break;
        case 'global_mult_scale':
        case 'skull_to_chips':
        case 'gilded_edge':
        case 'base_mult_bonus':
        case 'wild':
          break;
      }

      if (cd !== 0 || md !== 0) {
        modChips += cd;
        modMult   = parseFloat((modMult + md).toFixed(2));
        effects.push({ modId, chipsDelta: cd, multDelta: md });
      }
    }

    const chips = Math.max(0, Math.round(totalBaseChips + modChips));
    const mult  = Math.max(1, parseFloat((bestMult + modMult).toFixed(2)));
    const score = Math.round(chips * mult);

    return { chips, mult, score, bestComboKey, lineResults, hitLines, effects, allSymbols };
  }

  return { drawGrid, calculateScore };
})();
