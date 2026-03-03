// ============================================================
// config.js — All game constants. Edit here to balance the game.
// ============================================================

var CONFIG = {

  // ── Symbols ────────────────────────────────────────────────
  SYMBOLS: {
    '💎': { name: 'Diamond', chips: 8,  weight: 2,  color: '#7ee8fa' },
    '7️⃣': { name: 'Seven',   chips: 7,  weight: 3,  color: '#f5c518' },
    '⭐':  { name: 'Star',    chips: 5,  weight: 6,  color: '#fff9c4' },
    '🔔':  { name: 'Bell',    chips: 4,  weight: 8,  color: '#ffd740' },
    '🍀':  { name: 'Clover',  chips: 4,  weight: 9,  color: '#69f0ae' },
    '🍒':  { name: 'Cherry',  chips: 3,  weight: 10, color: '#ef5350' },
    '🍋':  { name: 'Lemon',   chips: 3,  weight: 10, color: '#ffee58' },
    '🍎':  { name: 'Apple',   chips: 2,  weight: 11, color: '#ff7043' },
    '🪙':  { name: 'Coin',    chips: 4,  weight: 8,  color: '#ffd740' },
    '💀':  { name: 'Skull',   chips: 0,  weight: 4,  color: '#9e9e9e', penalty: 4 },
  },

  // ── Spin combos (5-reel paylines, matched from left) ──────
  // chips/mult are BONUSES on top of the raw symbol chip sum.
  COMBOS: {
    JACKPOT:    { name: '🎰 JACKPOT!',       chips: 250, mult: 12,  desc: '5× 💎 or 5× 7️⃣ on a line'      },
    FIVE_KIND:  { name: 'FIVE OF A KIND',    chips: 120, mult: 6,   desc: '5× same symbol on a line'       },
    FOUR_KIND:  { name: 'FOUR IN A ROW',     chips: 55,  mult: 3.5, desc: '4× same from left on a line'    },
    THREE_KIND: { name: 'THREE IN A ROW',    chips: 22,  mult: 2,   desc: '3× same from left on a line'    },
    SCATTER:    { name: 'SCATTER',           chips: 8,   mult: 1.5, desc: '2+ matching anywhere on a line' },
    MATCH:      { name: 'MATCH ×2',          chips: 5,   mult: 1.3, desc: '2× same from left on a line'    },
    NO_WIN:     { name: 'NO WIN',            chips: 0,   mult: 1,   desc: 'No match on this line'          },
  },

  // ── Paylines: row index per reel (grid[reel][row]) ────────
  // 5 reels, 3 visible rows (0=top, 1=mid, 2=bot)
  PAYLINES: [
    [1, 1, 1, 1, 1],  // ── Middle row (always active)
    [0, 0, 0, 0, 0],  // ── Top row
    [2, 2, 2, 2, 2],  // ── Bottom row
    [0, 1, 2, 1, 0],  // ╲╱ V-shape
    [2, 1, 0, 1, 2],  // ╱╲ Λ-shape
  ],

  PAYLINE_NAMES: ['Middle', 'Top', 'Bottom', 'V-Shape', 'Λ-Shape'],

  // ── Modifiers ─────────────────────────────────────────────
  MODIFIERS: [
    {
      id: 'gambler',        emoji: '🎲', name: 'The Gambler',
      desc: '+2 Mult on any scoring line (Match or better)',
      rarity: 'common',   cost: 5,
      effect: { type: 'win_mult', value: 2 },
    },
    {
      id: 'diamond_dealer', emoji: '💠', name: 'Diamond Dealer',
      desc: 'Each 💎 in spin: +3 Mult',
      rarity: 'uncommon', cost: 7,
      effect: { type: 'per_symbol_mult', symbol: '💎', value: 3 },
    },
    {
      id: 'skull_pact',     emoji: '☠️', name: 'Skull Pact',
      desc: 'Each 💀 in spin: +4 Mult (penalty still applies)',
      rarity: 'uncommon', cost: 6,
      effect: { type: 'per_skull_mult', value: 4 },
    },
    {
      id: 'cherry_picker',  emoji: '🍒', name: 'Cherry Picker',
      desc: 'Each 🍒 in spin: +4 Chips',
      rarity: 'common',   cost: 4,
      effect: { type: 'per_symbol_chips', symbol: '🍒', value: 4 },
    },
    {
      id: 'gold_fever',     emoji: '🌕', name: 'Gold Fever',
      desc: 'Each 🪙 in spin: +5 Chips, +1 Mult',
      rarity: 'uncommon', cost: 6,
      effect: { type: 'per_symbol_both', symbol: '🪙', chips: 5, mult: 1 },
    },
    {
      id: 'seven_stars',    emoji: '✨', name: 'Seven Stars',
      desc: 'Each 7️⃣ in spin: +5 Chips, +2 Mult',
      rarity: 'rare',     cost: 8,
      effect: { type: 'per_symbol_both', symbol: '7️⃣', chips: 5, mult: 2 },
    },
    {
      id: 'fortune_teller', emoji: '🔮', name: 'Fortune Teller',
      desc: 'NO WIN spins: +5 Mult (turn your misses into money)',
      rarity: 'common',   cost: 5,
      effect: { type: 'combo_mult', combo: 'NO_WIN', value: 5 },
    },
    {
      id: 'glass_cannon',   emoji: '💥', name: 'Glass Cannon',
      desc: 'All Mult ×1.5, but 💀 penalty ×2',
      rarity: 'rare',     cost: 7,
      effect: { type: 'global_mult_scale', scale: 1.5, skull_scale: 2 },
    },
    {
      id: 'pair_pressure',  emoji: '👊', name: 'Pair Pressure',
      desc: 'MATCH ×2 lines: +15 Chips each',
      rarity: 'common',   cost: 4,
      effect: { type: 'combo_chips', combo: 'MATCH', value: 15 },
    },
    {
      id: 'the_reaper',     emoji: '🌑', name: 'The Reaper',
      desc: '+2 Mult for every 💀 in your deck',
      rarity: 'uncommon', cost: 6,
      effect: { type: 'deck_count_mult', symbol: '💀', value: 2 },
    },
    {
      id: 'wild_seven',     emoji: '🌀', name: 'Wild Seven',
      desc: '7️⃣ counts as any symbol for matching purposes',
      rarity: 'rare',     cost: 9,
      effect: { type: 'wild', symbol: '7️⃣' },
    },
    {
      id: 'ironclad',       emoji: '🛡️', name: 'Ironclad',
      desc: 'First spin of each round: Mult ×2',
      rarity: 'uncommon', cost: 6,
      effect: { type: 'first_spin_scale', scale: 2 },
    },
    {
      id: 'jackpot_insurance', emoji: '📋', name: 'Near Miss',
      desc: 'FOUR IN A ROW lines: +40 bonus Chips each',
      rarity: 'common',   cost: 5,
      effect: { type: 'combo_chips', combo: 'FOUR_KIND', value: 40 },
    },
    {
      id: 'gilded_edge',    emoji: '🏅', name: 'Gilded Edge',
      desc: '+1.5 base Mult for every scoring line',
      rarity: 'rare',     cost: 8,
      effect: { type: 'base_mult_bonus', value: 1.5 },
    },
    {
      id: 'clover_luck',    emoji: '🍀', name: 'Clover Luck',
      desc: 'Each 🍀 in spin: +2 Mult',
      rarity: 'common',   cost: 5,
      effect: { type: 'per_symbol_mult', symbol: '🍀', value: 2 },
    },
    {
      id: 'bell_choir',     emoji: '🔔', name: 'Bell Choir',
      desc: 'FIVE OF A KIND 🔔: +80 bonus Chips',
      rarity: 'uncommon', cost: 6,
      effect: { type: 'specific_five_chips', symbol: '🔔', value: 80 },
    },
    {
      id: 'void_walker',    emoji: '👻', name: 'Void Walker',
      desc: '💀 give +5 Chips each instead of penalizing',
      rarity: 'rare',     cost: 8,
      effect: { type: 'skull_to_chips', value: 5 },
    },
    {
      id: 'triple_threat',  emoji: '🎯', name: 'Triple Threat',
      desc: 'THREE IN A ROW lines: Mult ×1.5 each',
      rarity: 'uncommon', cost: 7,
      effect: { type: 'combo_mult_scale', combo: 'THREE_KIND', scale: 1.5 },
    },
    {
      id: 'lucky_streak',   emoji: '🔥', name: 'Lucky Streak',
      desc: 'Each consecutive scoring spin: +1.5 Mult (resets on no win)',
      rarity: 'rare',     cost: 7,
      effect: { type: 'streak_mult', value: 1.5 },
    },
    {
      id: 'star_power',     emoji: '⭐', name: 'Star Power',
      desc: 'Each ⭐ in spin: +3 Chips, +1 Mult',
      rarity: 'common',   cost: 5,
      effect: { type: 'per_symbol_both', symbol: '⭐', chips: 3, mult: 1 },
    },
    {
      id: 'payline_king',   emoji: '👑', name: 'Payline King',
      desc: '+10 Chips for each active payline hit (per spin)',
      rarity: 'uncommon', cost: 6,
      effect: { type: 'per_hit_line', value: 10 },
    },
    {
      id: 'lucky_lemon',    emoji: '🍋', name: 'Lucky Lemon',
      desc: 'Each 🍋 in spin: +3 Chips, +0.5 Mult',
      rarity: 'common',   cost: 4,
      effect: { type: 'per_symbol_both', symbol: '🍋', chips: 3, mult: 0.5 },
    },
  ],

  // ── Stages & Rounds (replaces Antes & Blinds) ─────────────
  // balance: 5 paylines × avg ~30 chips per spin at stage 1 = ~150/spin possible
  STAGES: [
    { stage: 1, rounds: [
      { name: 'Warm Up',        target: 300,     spins: 9,  reward: 4,  boss: false },
      { name: 'High Stakes',    target: 650,     spins: 8,  reward: 5,  boss: false },
      { name: 'Pit Boss',       target: 1400,    spins: 8,  reward: 8,  boss: true  },
    ]},
    { stage: 2, rounds: [
      { name: 'Warm Up',        target: 3000,    spins: 8,  reward: 5,  boss: false },
      { name: 'High Stakes',    target: 7000,    spins: 8,  reward: 7,  boss: false },
      { name: 'Vault Guard',    target: 15000,   spins: 8,  reward: 10, boss: true  },
    ]},
    { stage: 3, rounds: [
      { name: 'Warm Up',        target: 30000,   spins: 8,  reward: 6,  boss: false },
      { name: 'High Stakes',    target: 65000,   spins: 8,  reward: 9,  boss: false },
      { name: 'House Rules',    target: 140000,  spins: 8,  reward: 12, boss: true  },
    ]},
    { stage: 4, rounds: [
      { name: 'Warm Up',        target: 280000,  spins: 9,  reward: 8,  boss: false },
      { name: 'High Stakes',    target: 600000,  spins: 9,  reward: 11, boss: false },
      { name: 'The Vault',      target: 1200000, spins: 9,  reward: 15, boss: true  },
    ]},
    { stage: 5, rounds: [
      { name: 'Warm Up',        target: 2500000, spins: 9,  reward: 10, boss: false },
      { name: 'High Stakes',    target: 5000000, spins: 9,  reward: 12, boss: false },
      { name: "Fortune's End",  target: 9999999, spins: 10, reward: 20, boss: true  },
    ]},
  ],

  STARTER_DECK: ['🍀', '🍎', '🍒', '🪙', '🍋', '🍋', '💀'],

  SYMBOL_COSTS: {
    '💎': 8, '7️⃣': 7, '⭐': 5, '🔔': 4, '🍀': 3,
    '🍒': 2, '🍋': 2, '🍎': 2, '🪙': 4, '💀': 1,
  },

  REMOVE_SYMBOL_COST: 3,
  REROLL_COST: 1,
  MAX_MODIFIERS: 5,
  SHARD_RATE: 1000,    // score per shard earned
  NUM_REELS: 5,        // number of reels
  VISIBLE_ROWS: 3,     // visible rows per reel

  META_UPGRADES: {
    starterGold: { baseCost: 5,  perLevel: 5,  label: 'Starter Fund',  desc: '+5 Gold at run start'              },
    taxLvl:      { baseCost: 10, perLevel: 5,  label: 'Lucky Breaks',   desc: 'Slower scaling between stages'     },
    deckSlot:    { baseCost: 8,  perLevel: 8,  label: 'Modifier Slot',  desc: '+1 Modifier slot (max 5→6→7→...)'  },
  },
};
