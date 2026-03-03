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

  /**
   * Draw a full grid: grid[reel][row], 5 reels × 3 rows.
   */
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

  /**
   * Given 5 symbols on a line, return { comboKey, baseChips, baseMult }.
   * baseChips = symbol chip sum + combo bonus chips - skull penalties
   * baseMult  = combo mult
   */
  function evaluatePayline(rawSyms, modIds) {
    const syms = applyWilds(rawSyms, modIds);
    const w    = CONFIG.SYMBOLS;

    // Count skulls & raw chip sum
    let skullCount = 0;
    let rawChips   = 0;
    rawSyms.forEach(s => {
      if (w[s]?.penalty) skullCount++;
      else rawChips += (w[s]?.chips ?? 0);
    });

    // Run-length from left (ignoring skulls in the run detection)
    const noSkulls = syms.filter(s => !w[s]?.penalty);
    const leftSym  = syms.find(s => !w[s]?.penalty);
    let runLen = 0;
    if (leftSym) {
      for (const s of syms) {
        if (s === leftSym) runLen++;
        else break;
      }
    }

    // Scatter: any 2+ matching non-skull not necessarily from left
    const counts = {};
    syms.forEach(s => { if (!w[s]?.penalty) counts[s] = (counts[s] || 0) + 1; });
    const maxCount = noSkulls.length ? Math.max(...Object.values(counts)) : 0;

    // Pick combo key
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
    } else if (maxCount >= 2) {
      comboKey = 'SCATTER';
    } else {
      comboKey = 'NO_WIN';
    }

    const combo    = CONFIG.COMBOS[comboKey];
    const baseChips = Math.max(0, rawChips + combo.chips - skullCount * 4);
    const baseMult  = combo.mult;

    return { comboKey, baseChips, baseMult, skullCount, rawSyms };
  }

  // ── Full spin scoring ─────────────────────────────────────

  const COMBO_RANK = ['JACKPOT','FIVE_KIND','FOUR_KIND','THREE_KIND','SCATTER','MATCH','NO_WIN'];

  /**
   * Score a full grid across all paylines, then apply modifiers.
   * Returns:
   *   { chips, mult, score, bestComboKey, lineResults, effects, hitLines, allSymbols }
   */
  function calculateScore(grid, modIds, deck, isFirstSpin, winStreak) {
    const voidWalker  = modIds.includes('void_walker');
    const glassCannon = modIds.includes('glass_cannon');

    // ── 1. Evaluate each payline ──────────────────────────
    const lineResults = CONFIG.PAYLINES.map((pl, plIdx) => {
      const syms = pl.map((rowIdx, reel) => grid[reel][rowIdx]);
      return { ...evaluatePayline(syms, modIds), plIdx };
    });

    // ── 2. Aggregate ──────────────────────────────────────
    const hitLines    = lineResults.filter(r => r.comboKey !== 'NO_WIN');
    const bestComboKey = lineResults.reduce((best, r) =>
      COMBO_RANK.indexOf(r.comboKey) < COMBO_RANK.indexOf(best) ? r.comboKey : best
    , 'NO_WIN');

    // Flat chip sum and best mult
    let totalBaseChips = lineResults.reduce((s, r) => s + r.baseChips, 0);
    let bestMult       = Math.max(...lineResults.map(r => r.baseMult));

    // Skull handling — void_walker or glass_cannon modifies penalty at chip level
    const allSymbols = grid.flat();
    const totalSkulls = allSymbols.filter(s => CONFIG.SYMBOLS[s]?.penalty).length;
    if (voidWalker) {
      const voidMod = CONFIG.MODIFIERS.find(m => m.id === 'void_walker');
      // Skulls already contributed 0 chips in line eval; now add their bonus
      totalBaseChips += totalSkulls * voidMod.effect.value;
    }
    if (glassCannon) {
      const gcMod = CONFIG.MODIFIERS.find(m => m.id === 'glass_cannon');
      bestMult = parseFloat((bestMult * gcMod.effect.scale).toFixed(2));
      totalBaseChips -= totalSkulls * 4 * (gcMod.effect.skull_scale - 1); // extra penalty
    }

    // Gilded Edge: +1.5 mult per scoring line
    if (modIds.includes('gilded_edge')) {
      const ge = CONFIG.MODIFIERS.find(m => m.id === 'gilded_edge');
      bestMult = parseFloat((bestMult + hitLines.length * ge.effect.value).toFixed(2));
    }

    // ── 3. Modifier pipeline ──────────────────────────────
    let modChips = 0;
    let modMult  = 0;
    const effects = [];

    for (const modId of modIds) {
      const mod = CONFIG.MODIFIERS.find(m => m.id === modId);
      if (!mod) continue;
      const e  = mod.effect;
      let cd   = 0, md = 0;

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

        // handled before loop:
        case 'global_mult_scale':
        case 'skull_to_chips':
        case 'gilded_edge':
        case 'base_mult_bonus':
        case 'wild':
          break;
      }

      if (cd !== 0 || md !== 0) {
        modChips += cd;
        modMult  = parseFloat((modMult + md).toFixed(2));
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
