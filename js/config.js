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

  // ── Spin combos (left-to-right run on any payline) ────────
  // chips/mult are BONUSES added on top of raw symbol chip sum.
  COMBOS: {
    JACKPOT:    { name: '🎰 JACKPOT!',       chips: 250, mult: 12,  desc: '5× 💎 or 5× 7️⃣ on any line'       },
    FIVE_KIND:  { name: 'FIVE OF A KIND',    chips: 120, mult: 6,   desc: '5× same symbol left→right'         },
    FOUR_KIND:  { name: 'FOUR IN A ROW',     chips: 55,  mult: 3.5, desc: '4× same symbol left→right'         },
    THREE_KIND: { name: 'THREE IN A ROW',    chips: 22,  mult: 2,   desc: '3× same symbol left→right'         },
    SCATTER:    { name: 'SCATTER',           chips: 8,   mult: 1.5, desc: '3+ matching symbols anywhere'      },
    MATCH:      { name: 'MATCH ×2',          chips: 5,   mult: 1.3, desc: '2× same symbol left→right'         },
    NO_WIN:     { name: 'NO WIN',            chips: 0,   mult: 1,   desc: 'No match on any line'              },
  },

  // ── Paylines ──────────────────────────────────────────────
  // Row per reel: 0=top, 1=middle, 2=bottom. 5 reels × 3 rows.
  // 20 lines — standard for 5-reel / 3-row video slots.
  // All 20 lines fire simultaneously on every spin.
  //
  //              Reel:  0  1  2  3  4
  PAYLINES: [
    [1, 1, 1, 1, 1],   //  1  ─  Middle straight
    [0, 0, 0, 0, 0],   //  2  ─  Top straight
    [2, 2, 2, 2, 2],   //  3  ─  Bottom straight
    [0, 1, 2, 1, 0],   //  4  V  V-shape
    [2, 1, 0, 1, 2],   //  5  Λ  Inverted V
    [0, 0, 1, 2, 2],   //  6  ╲  Step-down diagonal
    [2, 2, 1, 0, 0],   //  7  ╱  Step-up diagonal
    [1, 0, 0, 0, 1],   //  8     Top arch (mid-top-top-top-mid)
    [1, 2, 2, 2, 1],   //  9     Bottom arch (mid-bot-bot-bot-mid)
    [0, 1, 1, 1, 2],   // 10  ╲  Gentle descent
    [2, 1, 1, 1, 0],   // 11  ╱  Gentle ascent
    [0, 0, 1, 1, 2],   // 12     Staircase down
    [2, 2, 1, 1, 0],   // 13     Staircase up
    [1, 0, 1, 0, 1],   // 14     Top weave
    [1, 2, 1, 2, 1],   // 15     Bottom weave
    [0, 1, 0, 1, 0],   // 16     Top-mid zigzag
    [2, 1, 2, 1, 2],   // 17     Bot-mid zigzag
    [0, 0, 0, 1, 2],   // 18     Top plateau drop
    [2, 2, 2, 1, 0],   // 19     Bottom plateau rise
    [1, 0, 2, 0, 1],   // 20  W  W-shape
  ],

  PAYLINE_NAMES: [
    'Middle', 'Top', 'Bottom',
    'V-Shape', 'Λ-Shape',
    'Step Down', 'Step Up',
    'Top Arch', 'Bottom Arch',
    'Slide Down', 'Slide Up',
    'Stair Down', 'Stair Up',
    'Top Weave', 'Bottom Weave',
    'Top Zigzag', 'Bottom Zigzag',
    'Top Drop', 'Bottom Rise',
    'W-Shape',
  ],

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
      desc: 'Each 💎 visible on the reels: +3 Mult',
      rarity: 'uncommon', cost: 7,
      effect: { type: 'per_symbol_mult', symbol: '💎', value: 3 },
    },
    {
      id: 'skull_pact',     emoji: '☠️', name: 'Skull Pact',
      desc: 'Each 💀 on the reels: +4 Mult (penalty still applies)',
      rarity: 'uncommon', cost: 6,
      effect: { type: 'per_skull_mult', value: 4 },
    },
    {
      id: 'cherry_picker',  emoji: '🍒', name: 'Cherry Picker',
      desc: 'Each 🍒 on the reels: +4 Chips',
      rarity: 'common',   cost: 4,
      effect: { type: 'per_symbol_chips', symbol: '🍒', value: 4 },
    },
    {
      id: 'gold_fever',     emoji: '🌕', name: 'Gold Fever',
      desc: 'Each 🪙 on the reels: +5 Chips, +1 Mult',
      rarity: 'uncommon', cost: 6,
      effect: { type: 'per_symbol_both', symbol: '🪙', chips: 5, mult: 1 },
    },
    {
      id: 'seven_stars',    emoji: '✨', name: 'Seven Stars',
      desc: 'Each 7️⃣ on the reels: +5 Chips, +2 Mult',
      rarity: 'rare',     cost: 8,
      effect: { type: 'per_symbol_both', symbol: '7️⃣', chips: 5, mult: 2 },
    },
    {
      id: 'fortune_teller', emoji: '🔮', name: 'Fortune Teller',
      desc: 'NO WIN spins still score: +5 Mult',
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
      desc: 'Each MATCH ×2 line: +15 Chips',
      rarity: 'common',   cost: 4,
      effect: { type: 'combo_chips', combo: 'MATCH', value: 15 },
    },
    {
      id: 'the_reaper',     emoji: '🌑', name: 'The Reaper',
      desc: '+2 Mult for every 💀 loaded in your reel pool',
      rarity: 'uncommon', cost: 6,
      effect: { type: 'deck_count_mult', symbol: '💀', value: 2 },
    },
    {
      id: 'wild_seven',     emoji: '🌀', name: 'Wild Seven',
      desc: '7️⃣ acts as any symbol for line matching',
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
      desc: 'Each FOUR IN A ROW line: +40 bonus Chips',
      rarity: 'common',   cost: 5,
      effect: { type: 'combo_chips', combo: 'FOUR_KIND', value: 40 },
    },
    {
      id: 'gilded_edge',    emoji: '🏅', name: 'Gilded Edge',
      desc: '+1.5 base Mult for every scoring line this spin',
      rarity: 'rare',     cost: 8,
      effect: { type: 'base_mult_bonus', value: 1.5 },
    },
    {
      id: 'clover_luck',    emoji: '🍀', name: 'Clover Luck',
      desc: 'Each 🍀 on the reels: +2 Mult',
      rarity: 'common',   cost: 5,
      effect: { type: 'per_symbol_mult', symbol: '🍀', value: 2 },
    },
    {
      id: 'bell_choir',     emoji: '🔔', name: 'Bell Choir',
      desc: 'FIVE OF A KIND 🔔 line: +80 bonus Chips',
      rarity: 'uncommon', cost: 6,
      effect: { type: 'specific_five_chips', symbol: '🔔', value: 80 },
    },
    {
      id: 'void_walker',    emoji: '👻', name: 'Void Walker',
      desc: '💀 on the reels give +5 Chips each instead of penalizing',
      rarity: 'rare',     cost: 8,
      effect: { type: 'skull_to_chips', value: 5 },
    },
    {
      id: 'triple_threat',  emoji: '🎯', name: 'Triple Threat',
      desc: 'Each THREE IN A ROW line: Mult ×1.5',
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
      desc: 'Each ⭐ on the reels: +3 Chips, +1 Mult',
      rarity: 'common',   cost: 5,
      effect: { type: 'per_symbol_both', symbol: '⭐', chips: 3, mult: 1 },
    },
    {
      id: 'payline_king',   emoji: '👑', name: 'Payline King',
      desc: '+10 Chips for each winning line this spin',
      rarity: 'uncommon', cost: 6,
      effect: { type: 'per_hit_line', value: 10 },
    },
    {
      id: 'lucky_lemon',    emoji: '🍋', name: 'Lucky Lemon',
      desc: 'Each 🍋 on the reels: +3 Chips, +0.5 Mult',
      rarity: 'common',   cost: 4,
      effect: { type: 'per_symbol_both', symbol: '🍋', chips: 3, mult: 0.5 },
    },
  ],

  // ── Stages & Rounds ───────────────────────────────────────
  // 20 paylines fire per spin — targets scaled up ~4× vs 5 paylines.
  STAGES: [
    { stage: 1, rounds: [
      { name: 'Warm Up',        target: 1200,     spins: 9,  reward: 4,  boss: false },
      { name: 'High Stakes',    target: 2800,     spins: 8,  reward: 5,  boss: false },
      { name: 'Pit Boss',       target: 6000,     spins: 8,  reward: 8,  boss: true  },
    ]},
    { stage: 2, rounds: [
      { name: 'Warm Up',        target: 14000,    spins: 8,  reward: 5,  boss: false },
      { name: 'High Stakes',    target: 32000,    spins: 8,  reward: 7,  boss: false },
      { name: 'Vault Guard',    target: 70000,    spins: 8,  reward: 10, boss: true  },
    ]},
    { stage: 3, rounds: [
      { name: 'Warm Up',        target: 150000,   spins: 8,  reward: 6,  boss: false },
      { name: 'High Stakes',    target: 320000,   spins: 8,  reward: 9,  boss: false },
      { name: 'House Rules',    target: 700000,   spins: 8,  reward: 12, boss: true  },
    ]},
    { stage: 4, rounds: [
      { name: 'Warm Up',        target: 1500000,  spins: 9,  reward: 8,  boss: false },
      { name: 'High Stakes',    target: 3000000,  spins: 9,  reward: 11, boss: false },
      { name: 'The Vault',      target: 6500000,  spins: 9,  reward: 15, boss: true  },
    ]},
    { stage: 5, rounds: [
      { name: 'Warm Up',        target: 12000000, spins: 9,  reward: 10, boss: false },
      { name: 'High Stakes',    target: 25000000, spins: 9,  reward: 12, boss: false },
      { name: "Fortune's End",  target: 50000000, spins: 10, reward: 20, boss: true  },
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
  SHARD_RATE: 5000,
  NUM_REELS: 5,
  VISIBLE_ROWS: 3,

  META_UPGRADES: {
    starterGold: { baseCost: 5,  perLevel: 5,  label: 'Starter Fund',  desc: '+5 Gold at run start'            },
    taxLvl:      { baseCost: 10, perLevel: 5,  label: 'Lucky Breaks',   desc: 'Slower scaling between stages'  },
    deckSlot:    { baseCost: 8,  perLevel: 8,  label: 'Modifier Slot',  desc: '+1 Modifier slot (5→6→7→...)'   },
  },
};
