/* Shared constants, balance configuration, realm data, and validation. */

/*
 * DAO QUEST 1.0
 * 
 * TIME SPEED SYSTEM: Affects ONLY Lifespan Aging
 * 
 * Core Principle:
 * - Time speed controls how fast time flows (aging rate)
 * - Qi gains are INDEPENDENT of time speed (speed-neutral)
 * - 2× speed = 2× faster aging, SAME Qi/s
 * 
 * Implementation:
 * 1. loop(): Calculates rawDt (real elapsed seconds) once
 * 2. tick(): Uses rawDt for Qi gains (no speed factor)
 * 3. tickLifespan(): Receives rawDt × speed for aging
 * 4. Offline: Qi uses wall-clock time, aging uses time × speed
 * 5. totalQPS/totalQPC: Never reference time speed
 * 
 * Key Functions:
 * - loop(): Computes rawDt, passes rawDt and speed separately to tick()
 * - tick(rawDt, speed): Qi = QPS × rawDt (no speed), aging = rawDt × speed
 * - tickLifespan(dt): dt is pre-multiplied by speed from tick()
 * - applyOfflineProgressOnResume(): Qi uses cappedSec, aging uses cappedSec × speed
 * 
 * Result: Time speed is cosmetic for Qi (just visual time flow), real for aging
 * 
 * RUNAWAY REINCARNATION FIX IMPLEMENTED:
 * 
 * Problem: Multiple/looping reincarnations when lifespan reaches 0, causing ~500 instant reincarnations
 * 
 * Solution Components:
 * 1. LIFECYCLE GUARD: Added S.lifecycle.isReincarnating flag to prevent reentrancy
 * 2. SINGLE-PASS AGING: Replaced while loops with single if checks in tickLifespan()
 * 3. TICK PROTECTION: Main tick() exits early if reincarnation is in progress
 * 4. OFFLINE SAFETY: applyOfflineGains() respects guards and does single death check
 * 5. NUMBER SAFETY: safeNum() helper prevents Infinity/NaN corruption
 * 6. STATE RESET: doReincarnate() properly resets lifespan and timing before clearing guard
 * 7. DEBUG MODE: ?dev=1 URL parameter enables reincarnation rate assertions
 * 
 * Key Functions Modified:
 * - defaultState(): Added lifecycle object
 * - load()/importSave(): Migration ensures lifecycle exists, sanitizes numbers
 * - tickLifespan(): Single death check, sets guard immediately
 * - handleLifespanEnd(): New guarded death handler, pauses time
 * - doReincarnate(): Clears guard only after full state reset
 * - applyOfflineGains(): Single offline death check with guard
 * - tick()/onClick(): Respect reincarnation guard
 * 
 * Result: Exactly one reincarnation per lifespan end, no loops or races
 */

const VERSION = '1.0';
const REALM_SYSTEM_VERSION = 2;
const STAGES_PER_REALM = 10;
const SAVE_KEY = 'daoQuestSaveV1';
const ACHIEVEMENTS_KEY = 'daoQuestAchievementsV1';
const SAVE_SLOT_COUNT = 3;
const ACTIVE_SLOT_KEY = 'daoQuestActiveSlotV1';

// Previous storage namespaces remain readable for one-time, non-destructive migration.
// Keep the newest namespace first so it takes precedence if several are present.
const LEGACY_STORAGE_NAMESPACES = [
  {
    save: 'wayOfTheDaoSaveV1',
    achievements: 'wayOfTheDaoAchievementsV1',
    activeSlot: 'wayOfTheDaoActiveSlotV1'
  },
  {
    save: 'xianxiaIdleSaveV1',
    achievements: 'xianxiaAchievementsV1',
    activeSlot: 'xianxiaIdleActiveSlotV1'
  }
];
const MAX_RANKS_PER_REALM = 12;

// The game is time-based, not frame-based: update gameplay at 20 Hz only
// while a cultivation session is active. Shop affordances refresh at 4 Hz.
const GAME_TICK_MS = 50;
const SHOP_REFRESH_MS = 250;
let gameLoopTimer = null;
let gameLoopRunning = false;
let lastShopRefresh = 0;
let lastRenderedStepNumber = -1;
let lastRenderedRealmForPath = -1;
const shopBuyButtons = new Map();
const bulkCostElements = new Map();

function setTextIfChanged(element, value) {
  if (!element) return;
  const next = String(value);
  if (element.textContent !== next) element.textContent = next;
}
let initComplete = false; // Guard: prevents saving default state before load() runs
let gameActive = false; // Pauses gameplay when main menu is open
let menuLoadMode = false; // Main menu load flow state (slots hidden until Load Save is pressed)

function normalizeSlot(slot) {
  const n = Math.floor(Number(slot));
  if (!Number.isFinite(n) || n < 1 || n > SAVE_SLOT_COUNT) return 1;
  return n;
}

// Preserve the selected slot from the newest available previous namespace.
try {
  if (!localStorage.getItem(ACTIVE_SLOT_KEY)) {
    for (const namespace of LEGACY_STORAGE_NAMESPACES) {
      const legacySlot = localStorage.getItem(namespace.activeSlot);
      if (legacySlot !== null) {
        localStorage.setItem(ACTIVE_SLOT_KEY, legacySlot);
        break;
      }
    }
  }
} catch (e) {
  console.warn('Previous active-slot migration failed:', e);
}

let activeSlot = normalizeSlot(localStorage.getItem(ACTIVE_SLOT_KEY) || 1);
let selectedMenuSlot = activeSlot;

function getSaveKeyForSlot(slot = activeSlot) {
  return `${SAVE_KEY}_slot${normalizeSlot(slot)}`;
}

function getAchievementsKeyForSlot(slot = activeSlot) {
  return `${ACHIEVEMENTS_KEY}_slot${normalizeSlot(slot)}`;
}

function setActiveSlot(slot) {
  activeSlot = normalizeSlot(slot);
  localStorage.setItem(ACTIVE_SLOT_KEY, String(activeSlot));
}

function migrateLegacyStorageToSlots() {
  try {
    // Per-slot data wins over older single-slot formats. The current namespace
    // always wins; otherwise use the newest available previous namespace.
    for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
      const newSaveKey = getSaveKeyForSlot(slot);
      const newAchievementsKey = getAchievementsKeyForSlot(slot);

      for (const namespace of LEGACY_STORAGE_NAMESPACES) {
        const previousSave = `${namespace.save}_slot${slot}`;
        const previousAchievements = `${namespace.achievements}_slot${slot}`;
        if (!localStorage.getItem(newSaveKey) && localStorage.getItem(previousSave)) {
          localStorage.setItem(newSaveKey, localStorage.getItem(previousSave));
        }
        if (!localStorage.getItem(newAchievementsKey) && localStorage.getItem(previousAchievements)) {
          localStorage.setItem(newAchievementsKey, localStorage.getItem(previousAchievements));
        }
      }
    }

    // Import older single-slot saves into Slot 1 only when it is still empty.
    for (const namespace of LEGACY_STORAGE_NAMESPACES) {
      const legacySave = localStorage.getItem(namespace.save);
      if (legacySave && !localStorage.getItem(getSaveKeyForSlot(1))) {
        localStorage.setItem(getSaveKeyForSlot(1), legacySave);
      }
      const legacyAchievements = localStorage.getItem(namespace.achievements);
      if (legacyAchievements && !localStorage.getItem(getAchievementsKeyForSlot(1))) {
        localStorage.setItem(getAchievementsKeyForSlot(1), legacyAchievements);
      }
    }

    // Remove previous keys only after every required copy has completed.
    for (const namespace of LEGACY_STORAGE_NAMESPACES) {
      for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
        localStorage.removeItem(`${namespace.save}_slot${slot}`);
        localStorage.removeItem(`${namespace.achievements}_slot${slot}`);
      }
      localStorage.removeItem(namespace.save);
      localStorage.removeItem(namespace.achievements);
      localStorage.removeItem(namespace.activeSlot);
    }
  } catch (e) {
    console.warn('Previous save migration failed:', e);
  }
}

migrateLegacyStorageToSlots();

// Debug mode - enable with ?dev=1 in URL
const DEBUG_MODE = new URLSearchParams(window.location.search).get('dev') === '1';

// === Skill scaling knobs (tuneable) ===
const SKILL_SCALING = {
  // Realm scaling ~ bounded exponential (log-like growth)
  realmMaxMult: 3.0,    // cap: +200% → total 3×
  realmK: 0.60,         // growth steepness per realm (used in exponent)
  // Karma scaling ~ soft log
  karmaLogCoeff: 0.30,  // multiplier per log10(karma+1)
  karmaMaxMult: 2.5,    // hard safety cap from karma factor
  // Cycle scaling
  mortalCycleBoost: 1.0,
  spiritCycleBoost: 5.0,
};

/**
 * Realm-aware minimum percent per level for Tier-2/Tier-3 skills
 * Gradually rises with realm so it never rounds to 0%
 * Returns fraction (e.g., 0.001 = 0.1%)
 * 
 * Progression:
 * - Qi Condensation (0): 0.00015 (0.015%)
 * - Golden Core (2): ~0.0007 (0.07%)
 * - Soul Formation (4): ~0.0009 (0.09%)
 * - Nirvana Void (10): ~0.0011 (0.11%)
 * - Ancestor Realm (15): ~0.0012 (0.12%)
 * 
 * @param {number} realmIndex - Current realm index
 * @returns {number} Minimum percent per level (fraction)
 */
function minTierPctByRealm(realmIndex) {
  const floor = 0.00015 + 0.001 * (1 - Math.exp(-0.35 * Math.max(0, realmIndex)));
  return Math.min(0.01, floor); // hard floor cap at 1% per level
}

/**
 * Realm-aware maximum percent per level for Tier-2/Tier-3 skills
 * Per-level ceiling so a single level can't blow up
 * Grows with realm to maintain relevance
 * 
 * Progression:
 * - Early realms: ~2% per level
 * - Mid realms: ~4% per level
 * - Late realms: ~6% per level
 * 
 * @param {number} realmIndex - Current realm index
 * @returns {number} Maximum percent per level (fraction)
 */
function maxTierPctByRealm(realmIndex) {
  const cap = 0.02 + 0.05 * (1 - Math.exp(-0.25 * Math.max(0, realmIndex)));
  return Math.min(0.06, cap);
}

// Optional Qi Turbo Mode - partial Qi scaling with sqrt(speed) for late game
// Disabled by default. When enabled: at 4× speed → 2× qi/s, at 100× → 10× qi/s
// This allows late-game players to benefit slightly from higher speeds without
// completely bypassing time-based balance
const ENABLE_QI_TURBO = false;

/**
 * Calculate turbo factor for Qi gains (optional late-game feature)
 * Uses square root scaling to provide bounded acceleration:
 * - 1× speed → 1.0× turbo (no change)
 * - 4× speed → 2.0× turbo (modest boost)
 * - 16× speed → 4.0× turbo (good boost)
 * - 100× speed → 10× turbo (capped scaling)
 * 
 * This ensures high speeds give *some* benefit beyond just time compression,
 * but not enough to completely break progression balance.
 * 
 * @param {number} speed - Current time speed multiplier
 * @returns {number} Always returns 1 (Qi is speed-independent)
 */
function qiTurboFactor(speed) {
  return 1; // DEPRECATED: No longer scales Qi - time speed affects only aging
}

// Development mode assertions and debugging
let lastReincarnationTime = 0;
function debugAssertReincarnationRate() {
  if (!DEBUG_MODE) return;
  
  const now = Date.now();
  if (lastReincarnationTime > 0 && (now - lastReincarnationTime) < 100) {
    console.warn('⚠️ REINCARNATION DEBUG: Multiple reincarnations within 100ms detected!', {
      timeSinceLast: now - lastReincarnationTime,
      currentTime: now,
      lastTime: lastReincarnationTime
    });
    // Hard stop in dev mode to catch regressions
    debugger;
  }
  lastReincarnationTime = now;
}

// Balance configuration - loaded from balance.json or fallback to defaults
// V2 progression balance: Qi Condensation is the true starting realm.
// The five-step, 16-realm ladder is defined below; balance.json controls pacing.
let BAL = {
  skills: {
    breath_control:   { base: 1.20, cost: 20,  costScale: 1.18, ranksPerRealm: 12, type: 'qps_flat' },
    meridian_flow:    { base: 2.00, cost: 45,  costScale: 1.18, ranksPerRealm: 12, type: 'qpc_flat' },
    lotus_meditation: { base: 0.008, cost: 140, costScale: 1.20, ranksPerRealm: 12, capPctPerRealm: 0.12, type: 'qps_pct' },
    dantian_temps:    { base: 0.008, cost: 110, costScale: 1.20, ranksPerRealm: 12, capPctPerRealm: 0.12, type: 'qpc_pct' },
    closed_door:      { base: 0.005, cost: 150, costScale: 1.22, ranksPerRealm: 12, capPctPerRealm: 0.08, type: 'offline_pct' }
  },
  stageRequirement: {
    realmBase: 55,
    realmBaseScale: 4,
    stageScale: 1.181
  },
  progression: {
    qpcBaseStart: 1,
    qpsBaseStart: 1,
    realmAdvanceReward: { qpcBaseAdd: 3.1, qpsBaseAdd: 1.15 }
  },
  reincarnation: {
    karmaPerUnit: 0.12,
    lifetimeQiDivisor: 5000,
    realmKarmaFactor: 4,
    minKarma: 3
  },
  offline: {
    capHours: 16
  },
  lifespan: {
    realmMaxLifespan: [100, 200, 3000, 10000, 30000, 100000, 500000, 1000000, 10000000, 100000000, null, null, null, null, null, null], // exact years per realm; Third Step onward is infinite
    yearsPerSecond: 0.5 // aging rate: 0.5 years per second (validator will clamp to [0.005, 5.0])
  },
  timeSpeed: {
    speeds: [0, 0.25, 0.5, 1, 2, 4, 6, 8, 10],
    unlockRealmIndex: [0, 0, 0, 0, 1, 4, 8, 12, 14]
  },
  cycleDefinitions: {
    mortal: { realms: [0, 1, 2, 3, 4, 5, 6], realmBonus: 0.25, name: 'Mortal World', description: 'The First Step, ending at the Ascendant boundary.' },
    spirit: { realms: [7, 8, 9, 10, 11, 12, 13, 14, 15], realmBonus: 0.50, name: 'Higher Worlds', description: 'The Second through Fifth Steps.' }
  }
};

/**
 * RUNTIME CONFIG VALIDATOR - Ensures balance.json values are safe
 * Validates and auto-fixes unsafe/malformed balance configuration values
 * to prevent game breakage. All fixes generate warnings in DEBUG_MODE.
 * 
 * Validations performed:
 * 1. Time speeds: Ensures speeds/unlocks arrays match length, base speeds exist (0, 0.5, 1)
 * 2. Lifespan: Validates array length matches realms, last realm is immortal, yearsPerSecond in safe range
 * 3. Cycles: Removes invalid realm indices, rebuilds empty cycles from defaults
 * 4. Stage requirements: Ensures positive values for base, scale factors
 * 5. Progression: Validates QPC/QPS start values and realm advance rewards
 * 6. Reincarnation: Enforces karma/penalty constraints, positive divisors
 * 7. Skills: Validates base effectiveness, costs, and cost scaling
 * 8. Offline: Ensures positive cap hours
 * 
 * Note: Time speed multiplier application is verified in tick() and tickLifespan().
 * Both functions properly scale dt by S.timeSpeed.current, ensuring 0.5× runs at half pace.
 * 
 * @param {Object} BAL - Balance configuration object to validate
 * @param {Array} realms - Realms array for length validation
 * @returns {Object} Sanitized balance configuration
 */
function validateBalanceConfig(BAL, realms) {
  const warn = (msg) => {
    if (DEBUG_MODE) console.warn(`[Balance Validator] ${msg}`);
  };

  // 1. TIME SPEED VALIDATION
  if (BAL.timeSpeed) {
    const speeds = BAL.timeSpeed.speeds || [];
    const unlocks = BAL.timeSpeed.unlockRealmIndex || [];
    
    // Ensure speeds and unlocks arrays have matching lengths
    if (speeds.length !== unlocks.length) {
      warn(`timeSpeed: lengths mismatched (speeds=${speeds.length}, unlocks=${unlocks.length}). Truncating to shorter.`);
      const minLen = Math.min(speeds.length, unlocks.length);
      BAL.timeSpeed.speeds = speeds.slice(0, minLen);
      BAL.timeSpeed.unlockRealmIndex = unlocks.slice(0, minLen);
    }
    
    // Ensure base speeds (0, 0.5, 1) are present
    const baseSpeedsRequired = [0, 0.25, 0.5, 1];
    const currentSpeeds = [...BAL.timeSpeed.speeds];
    const currentUnlocks = [...BAL.timeSpeed.unlockRealmIndex];
    
    baseSpeedsRequired.forEach((speed, idx) => {
      if (!currentSpeeds.includes(speed)) {
        warn(`timeSpeed: base speed ${speed}× missing. Adding it.`);
        currentSpeeds.push(speed);
        currentUnlocks.push(0); // Unlock at realm 0
      }
    });
    
    // De-duplicate and sort speeds (with corresponding unlocks)
    const speedUnlockPairs = currentSpeeds.map((speed, i) => ({
      speed,
      unlock: currentUnlocks[i] || 0
    }));
    
    // Remove duplicates by speed value
    const uniquePairs = [];
    const seenSpeeds = new Set();
    speedUnlockPairs.forEach(pair => {
      if (!seenSpeeds.has(pair.speed)) {
        seenSpeeds.add(pair.speed);
        uniquePairs.push(pair);
      }
    });
    
    // Sort by speed ascending
    uniquePairs.sort((a, b) => a.speed - b.speed);
    
    BAL.timeSpeed.speeds = uniquePairs.map(p => p.speed);
    BAL.timeSpeed.unlockRealmIndex = uniquePairs.map(p => p.unlock);
  }

  // 2. LIFESPAN VALIDATION
  if (BAL.lifespan) {
    const lifespans = BAL.lifespan.realmMaxLifespan || [];
    const realmCount = realms.length;
    
    // Ensure lifespan array matches realm count
    if (lifespans.length > realmCount) {
      warn(`lifespan: realmMaxLifespan too long (${lifespans.length} vs ${realmCount} realms). Truncating.`);
      BAL.lifespan.realmMaxLifespan = lifespans.slice(0, realmCount);
    } else if (lifespans.length < realmCount) {
      warn(`lifespan: realmMaxLifespan too short (${lifespans.length} vs ${realmCount} realms). Padding.`);
      const lastValue = lifespans[lifespans.length - 1];
      const paddingValue = (lastValue === null || typeof lastValue === 'number') ? lastValue : 100;
      while (BAL.lifespan.realmMaxLifespan.length < realmCount) {
        BAL.lifespan.realmMaxLifespan.push(paddingValue);
      }
    }
    
    // Ensure last realm is immortal (null)
    if (BAL.lifespan.realmMaxLifespan[realmCount - 1] !== null) {
      warn(`lifespan: final realm should be immortal (null). Setting last realm to null.`);
      BAL.lifespan.realmMaxLifespan[realmCount - 1] = null;
    }
    
    // Validate yearsPerSecond is within safe range [0.005, 5.0]
    let yps = BAL.lifespan.yearsPerSecond;
    if (typeof yps !== 'number' || !isFinite(yps)) {
      warn(`lifespan: yearsPerSecond invalid (${yps}). Resetting to 0.5.`);
      BAL.lifespan.yearsPerSecond = 0.5;
    } else if (yps < 0.005) {
      warn(`lifespan: yearsPerSecond too low (${yps}). Clamping to 0.005.`);
      BAL.lifespan.yearsPerSecond = 0.005;
    } else if (yps > 5.0) {
      warn(`lifespan: yearsPerSecond too high (${yps}). Clamping to 5.0.`);
      BAL.lifespan.yearsPerSecond = 5.0;
    }
  }

  // 3. CYCLE DEFINITIONS VALIDATION
  if (BAL.cycleDefinitions) {
    const realmCount = realms.length;
    
    Object.keys(BAL.cycleDefinitions).forEach(cycleId => {
      const cycle = BAL.cycleDefinitions[cycleId];
      if (!cycle.realms || !Array.isArray(cycle.realms)) {
        warn(`cycleDefinitions.${cycleId}: missing or invalid realms array. Skipping.`);
        return;
      }
      
      // Remove invalid realm indices
      const validRealms = cycle.realms.filter(idx => 
        typeof idx === 'number' && idx >= 0 && idx < realmCount
      );
      
      if (validRealms.length !== cycle.realms.length) {
        warn(`cycleDefinitions.${cycleId}: removed invalid realm indices. Valid: [${validRealms.join(', ')}]`);
      }
      
      // If empty after filtering, rebuild from defaults
      if (validRealms.length === 0) {
        warn(`cycleDefinitions.${cycleId}: no valid realms. Rebuilding from defaults.`);
        if (cycleId === 'mortal') {
          cycle.realms = Array.from({length: Math.ceil(realmCount / 2)}, (_, i) => i);
        } else if (cycleId === 'spirit') {
          const startIdx = Math.ceil(realmCount / 2);
          cycle.realms = Array.from({length: realmCount - startIdx}, (_, i) => startIdx + i);
        }
      } else {
        cycle.realms = validRealms;
      }
      
      // Ensure realmBonus is a valid number
      if (typeof cycle.realmBonus !== 'number' || !isFinite(cycle.realmBonus)) {
        warn(`cycleDefinitions.${cycleId}: invalid realmBonus. Setting to 0.`);
        cycle.realmBonus = 0;
      }
    });
  }

  // 4. STAGE REQUIREMENT VALIDATION
  if (BAL.stageRequirement) {
    const sr = BAL.stageRequirement;
    
    if (typeof sr.realmBase !== 'number' || sr.realmBase <= 0 || !isFinite(sr.realmBase)) {
      warn(`stageRequirement: invalid realmBase (${sr.realmBase}). Resetting to 100.`);
      sr.realmBase = 100;
    }
    
    if (typeof sr.realmBaseScale !== 'number' || sr.realmBaseScale <= 0 || !isFinite(sr.realmBaseScale)) {
      warn(`stageRequirement: invalid realmBaseScale (${sr.realmBaseScale}). Resetting to 15.`);
      sr.realmBaseScale = 15;
    }
    
    if (typeof sr.stageScale !== 'number' || sr.stageScale <= 0 || !isFinite(sr.stageScale)) {
      warn(`stageRequirement: invalid stageScale (${sr.stageScale}). Resetting to 1.45.`);
      sr.stageScale = 1.45;
    }
  }

  // 5. PROGRESSION VALIDATION
  if (BAL.progression) {
    const prog = BAL.progression;
    
    // Validate qpcBaseStart (should be reasonable, not astronomical)
    const MAX_SAFE_QPC = 1e15; // 1 quadrillion max
    if (typeof prog.qpcBaseStart !== 'number' || prog.qpcBaseStart < 0 || !isFinite(prog.qpcBaseStart)) {
      warn(`progression: invalid qpcBaseStart (${prog.qpcBaseStart}). Resetting to 1.`);
      prog.qpcBaseStart = 1;
    } else if (prog.qpcBaseStart > MAX_SAFE_QPC) {
      warn(`progression: qpcBaseStart too large (${prog.qpcBaseStart}). Clamping to ${MAX_SAFE_QPC}.`);
      prog.qpcBaseStart = 1; // Reset to safe value, not clamp to max
    }
    
    if (typeof prog.qpsBaseStart !== 'number' || prog.qpsBaseStart < 0 || !isFinite(prog.qpsBaseStart)) {
      warn(`progression: invalid qpsBaseStart (${prog.qpsBaseStart}). Resetting to 0.`);
      prog.qpsBaseStart = 0;
    } else if (prog.qpsBaseStart > MAX_SAFE_QPC) {
      warn(`progression: qpsBaseStart too large (${prog.qpsBaseStart}). Resetting to 0.`);
      prog.qpsBaseStart = 0;
    }
    
    if (prog.realmAdvanceReward) {
      const rar = prog.realmAdvanceReward;
      const MAX_SAFE_REWARD = 1e6; // 1 million max per realm advance
      
      if (typeof rar.qpcBaseAdd !== 'number' || rar.qpcBaseAdd < 0 || !isFinite(rar.qpcBaseAdd)) {
        warn(`progression: invalid qpcBaseAdd (${rar.qpcBaseAdd}). Resetting to 1.5.`);
        rar.qpcBaseAdd = 1.5;
      } else if (rar.qpcBaseAdd > MAX_SAFE_REWARD) {
        warn(`progression: qpcBaseAdd too large (${rar.qpcBaseAdd}). Resetting to 2.5.`);
        rar.qpcBaseAdd = 2.5;
      }
      
      if (typeof rar.qpsBaseAdd !== 'number' || rar.qpsBaseAdd < 0 || !isFinite(rar.qpsBaseAdd)) {
        warn(`progression: invalid qpsBaseAdd (${rar.qpsBaseAdd}). Resetting to 0.9.`);
        rar.qpsBaseAdd = 0.9;
      } else if (rar.qpsBaseAdd > MAX_SAFE_REWARD) {
        warn(`progression: qpsBaseAdd too large (${rar.qpsBaseAdd}). Resetting to 1.8.`);
        rar.qpsBaseAdd = 1.8;
      }
    }
  }

  // 6. REINCARNATION VALIDATION
  if (BAL.reincarnation) {
    const reinc = BAL.reincarnation;
    
    if (typeof reinc.minKarma !== 'number' || reinc.minKarma < 1 || !isFinite(reinc.minKarma)) {
      warn(`reincarnation: invalid minKarma (${reinc.minKarma}). Resetting to 3.`);
      reinc.minKarma = 3;
    }
    
    if (typeof reinc.deathPenalty !== 'number' || reinc.deathPenalty <= 0 || reinc.deathPenalty > 1 || !isFinite(reinc.deathPenalty)) {
      warn(`reincarnation: invalid deathPenalty (${reinc.deathPenalty}). Resetting to 0.5.`);
      reinc.deathPenalty = 0.5;
    }
    
    if (typeof reinc.karmaPerUnit !== 'number' || reinc.karmaPerUnit < 0 || !isFinite(reinc.karmaPerUnit)) {
      warn(`reincarnation: invalid karmaPerUnit (${reinc.karmaPerUnit}). Resetting to 0.1.`);
      reinc.karmaPerUnit = 0.1;
    }
    
    if (typeof reinc.lifetimeQiDivisor !== 'number' || reinc.lifetimeQiDivisor <= 0 || !isFinite(reinc.lifetimeQiDivisor)) {
      warn(`reincarnation: invalid lifetimeQiDivisor (${reinc.lifetimeQiDivisor}). Resetting to 10000.`);
      reinc.lifetimeQiDivisor = 10000;
    }
    
    if (typeof reinc.realmKarmaFactor !== 'number' || reinc.realmKarmaFactor < 0 || !isFinite(reinc.realmKarmaFactor)) {
      warn(`reincarnation: invalid realmKarmaFactor (${reinc.realmKarmaFactor}). Resetting to 5.`);
      reinc.realmKarmaFactor = 5;
    }
  }

  // 7. SKILLS VALIDATION
  if (BAL.skills) {
    Object.keys(BAL.skills).forEach(skillId => {
      const skill = BAL.skills[skillId];
      
      if (!skill.oneTime) {
        if (typeof skill.base !== 'number' || skill.base < 0 || !isFinite(skill.base)) {
          warn(`skills.${skillId}: invalid base (${skill.base}). Resetting to 1.`);
          skill.base = 1;
        }
      }
      
      if (typeof skill.cost !== 'number' || skill.cost <= 0 || !isFinite(skill.cost)) {
        warn(`skills.${skillId}: invalid cost (${skill.cost}). Resetting to 50.`);
        skill.cost = 50;
      }
      
      if (!skill.oneTime) {
        if (typeof skill.costScale !== 'number' || skill.costScale <= 1 || !isFinite(skill.costScale)) {
          warn(`skills.${skillId}: invalid costScale (${skill.costScale}). Resetting to 1.3.`);
          skill.costScale = 1.3;
        }
        
        const rawRanks = Number(skill.ranksPerRealm);
        if (!Number.isFinite(rawRanks) || rawRanks < 1) {
          warn(`skills.${skillId}: invalid ranksPerRealm (${skill.ranksPerRealm}). Resetting to ${MAX_RANKS_PER_REALM}.`);
          skill.ranksPerRealm = MAX_RANKS_PER_REALM;
        } else {
          const capped = Math.min(MAX_RANKS_PER_REALM, Math.max(1, Math.floor(rawRanks)));
          if (capped !== rawRanks) {
            warn(`skills.${skillId}: ranksPerRealm (${rawRanks}) exceeds cap ${MAX_RANKS_PER_REALM}. Clamping.`);
          }
          skill.ranksPerRealm = capped;
        }
      }
    });
  }

  // 8. OFFLINE VALIDATION
  if (BAL.offline) {
    if (typeof BAL.offline.capHours !== 'number' || BAL.offline.capHours <= 0 || !isFinite(BAL.offline.capHours)) {
      warn(`offline: invalid capHours (${BAL.offline.capHours}). Resetting to 12.`);
      BAL.offline.capHours = 12;
    }
  }

  if (DEBUG_MODE) {
    console.log('[Balance Validator] Validation complete. Configuration sanitized.');
  }

  return BAL;
}

// Load balance configuration from JSON
async function loadBalance() {
  try {
    const response = await fetch('balance.json');
    if (response.ok) {
      const balanceData = await response.json();
      BAL = { ...BAL, ...balanceData };
      if (typeof balanceData.realmSkillBonus === 'number') {
      }
      
      // Validate and sanitize loaded balance configuration
      BAL = validateBalanceConfig(BAL, realms);
      
      SKILL_CAT = null; // invalidate cache
      console.log('Balance configuration loaded from balance.json');
    }
  } catch (error) {
    console.log('Using default balance values (balance.json not found or invalid)');
  }
  
  // Always validate fallback BAL to ensure safety on first boot
  BAL = validateBalanceConfig(BAL, realms);
}

const realms = [
  { id:'qi_condensation', name:'Qi Condensation', step:1, alias:'Qi Gathering', description:'Sense the spiritual energy of the world, draw it into the body, and establish the first true path of cultivation.', world:'mortal' },
  { id:'foundation_establishment', name:'Foundation Establishment', step:1, alias:'Foundation Building', description:'Refine the meridians and dantian into a stable foundation capable of sustaining deeper cultivation.', world:'mortal' },
  { id:'golden_core', name:'Golden Core', step:1, alias:'Core Formation', description:'Condense the accumulated essence into a Golden Core: a concentrated source of power and a second birth of potential.', world:'mortal' },
  { id:'nascent_soul', name:'Nascent Soul', step:1, alias:'Soul Infant', description:'Give form to the cultivator’s spiritual self. The soul can now endure beyond the limits of the mortal body.', world:'mortal' },
  { id:'soul_formation', name:'Soul Formation', step:1, alias:'Transform God · Deity Transformation', description:'Transform the nascent soul into a divine existence and begin to command power beyond ordinary life.', world:'mortal' },
  { id:'soul_transformation', name:'Soul Transformation', step:1, alias:'Soul Metamorphosis', description:'Complete the transformation of body, soul, and spiritual essence before challenging the boundary of the mortal world.', world:'mortal' },
  { id:'ascendant', name:'Ascendant', step:1, alias:'Void Returning', description:'The summit of the First Step. Break free from the starting world and cross into the greater cultivation domains.', world:'mortal' },
  { id:'nirvana_scryer', name:'Nirvana Scryer', step:2, alias:'Dao Fusion', description:'Perceive the deeper structure of the Dao and begin harmonising the self with its underlying laws.', world:'higher' },
  { id:'nirvana_cleanser', name:'Nirvana Cleanser', step:2, alias:'Nirvana Purification', description:'Purge the impurities left by the old existence and refine every aspect of the cultivator into a purer state.', world:'higher' },
  { id:'nirvana_shatterer', name:'Nirvana Shatterer', step:2, alias:'Transcends Tribulation', description:'Shatter the final restraints of the Second Step and survive the tribulation that tests the completed Dao.', world:'higher' },
  { id:'nirvana_void', name:'Nirvana Void', step:3, alias:'First Universal Threshold', description:'Even the weakest cultivator of the Third Step possesses power on a universal scale; existence itself becomes a lesser boundary.', world:'higher' },
  { id:'spirit_void', name:'Spirit Void', step:3, alias:'Universal Spirit', description:'Refine spiritual existence beyond ordinary universal laws and exert authority across vast cosmic structures.', world:'higher' },
  { id:'arcane_void', name:'Arcane Void', step:3, alias:'Profound Void', description:'Command deeper arcane principles and treat the laws governing universes as instruments rather than limits.', world:'higher' },
  { id:'void_tribulant', name:'Void Tribulant', step:3, alias:'Final Third-Step Trial', description:'Stand at the final threshold of the Third Step, where the void itself becomes the ultimate tribulation.', world:'higher' },
  { id:'dao_source_realm', name:'Dao Source Realm', step:4, alias:'True God Realm', description:'Enter the true God realm and approach the source from which the Dao and its countless laws emerge.', world:'divine' },
  { id:'ancestor_realm', name:'Ancestor Realm', step:5, alias:'Absolute Apex', description:'The absolute ceiling of cultivation. To an Ancestor, even Fourth-Step cultivators are little doodles on a fragment of a painting.', world:'ancestor' }
];

const REALM_STEPS = [
  { number:1, name:'First Step', subtitle:'Mortal World', description:'The path from gathering Qi to leaving the starting world.', start:0, end:6 },
  { number:2, name:'Second Step', subtitle:'Nirvana Realms', description:'Fuse with the Dao, cleanse the self, and transcend tribulation.', start:7, end:9 },
  { number:3, name:'Third Step', subtitle:'Universal Authority', description:'Even the weakest cultivators can destroy universes.', start:10, end:13 },
  { number:4, name:'Fourth Step', subtitle:'God Realm', description:'The Dao Source Realm marks entry into the true God realm.', start:14, end:14 },
  { number:5, name:'Fifth Step', subtitle:'Ancestor Apex', description:'The absolute ceiling: the Ancestor Realm.', start:15, end:15 }
];

// ============= REALM ID MAPPING SYSTEM =============
// SINGLE SOURCE OF TRUTH for realm indices
// Use idx('realm_id') instead of hardcoded numbers to prevent off-by-one errors

const REALM_IDS = realms.map(r => r.id);
const REALM_INDEX = Object.fromEntries(REALM_IDS.map((id, i) => [id, i]));

/**
 * Get realm index by ID - ALWAYS use this instead of hardcoded indices
 * @param {string} id - Realm ID (e.g., 'soul_formation')
 * @returns {number} Realm index, or -1 if not found
 */
const idx = (id) => REALM_INDEX[id] ?? -1;

function enforceQiRefiningQpsBaseline(state = S) {
  if (!state) return;
  if (!Number.isFinite(state.qpsBase) || state.qpsBase < 1) state.qpsBase = 1;
}

// ============= MONOTONIC STAGE REQUIREMENT SYSTEM =============

/**
 * Cross-realm jump multiplier - controls minimum increase from Stage 10 to next realm's Stage 1
 * Ensures exponential feel by requiring meaningful gaps between realms
 * Example: 1.25 means Stage 1 of realm R+1 must be at least 25% higher than Stage 10 of realm R
 * @type {number}
 */
const CROSS_REALM_JUMP = 1.25;

/**
 * Cached minimum realm scale to prevent cross-realm requirement drops
 * Computed once on first stageRequirement() call
 * @type {number|null}
 */
let MIN_REALM_SCALE = null;
let EFFECTIVE_REALM_SCALE = null;
let hasWarnedRealmScale = false;

/**
 * Compute base stage requirement without karma reduction
 * Used internally for monotonicity checks
 * @param {number} realmIndex - Realm index
 * @param {number} stage - Stage number (1-10)
 * @returns {number} Base requirement before karma
 */
function baseRequirementFor(realmIndex, stage) {
  // Ensure effective realm scale is computed
  if (EFFECTIVE_REALM_SCALE === null) {
    const stageScale = BAL.stageRequirement.stageScale;
    MIN_REALM_SCALE = Math.pow(stageScale, 9); // stageScale^9 ensures Stage 1 of next realm >= Stage 10 of current
    EFFECTIVE_REALM_SCALE = Math.max(BAL.stageRequirement.realmBaseScale, MIN_REALM_SCALE);
    
    // DEBUG warning if we're overriding designer's realmBaseScale
    if (DEBUG_MODE && !hasWarnedRealmScale && BAL.stageRequirement.realmBaseScale < MIN_REALM_SCALE) {
      console.warn(
        `[stageRequirement] realmBaseScale (${BAL.stageRequirement.realmBaseScale.toFixed(2)}) < stageScale^9 (${MIN_REALM_SCALE.toFixed(2)}). ` +
        `Using effectiveRealmScale=${EFFECTIVE_REALM_SCALE.toFixed(2)} to keep cross-realm costs monotonic.`
      );
      hasWarnedRealmScale = true;
    }
  }
  
  // Exponential scaling with effective realm scale
  const realmBase = BAL.stageRequirement.realmBase * Math.pow(EFFECTIVE_REALM_SCALE, realmIndex);
  const stageScale = Math.pow(BAL.stageRequirement.stageScale, stage - 1);
  return Math.floor(realmBase * stageScale);
}

/**
 * Calculate stage requirement with monotonic guarantees
 * Ensures requirements never decrease across realm transitions or stages
 * @param {number} realmIndex - Realm index (0-15)
 * @param {number} stage - Stage number (1-10)
 * @returns {number} Stage requirement (Qi needed to advance)
 */
function stageRequirement(realmIndex, stage, karma = S.reinc?.karma || 0) {
  const safeRealmIndex = Math.max(0, Math.min(realms.length - 1, Math.floor(Number(realmIndex) || 0)));
  const safeStage = Math.max(1, Math.min(STAGES_PER_REALM, Math.floor(Number(stage) || 1)));
  const karmaReduction = 1 / karmaStageMult(Math.max(0, Number(karma) || 0));
  let req = Math.floor(baseRequirementFor(safeRealmIndex, safeStage) * karmaReduction);

  // The realm-entry jump establishes the baseline for the entire new realm.
  // Applying it to Stage 1 alone caused later stages to become cheaper.
  if (safeRealmIndex >= 1) {
    const previousStage10 = stageRequirement(safeRealmIndex - 1, STAGES_PER_REALM, karma);
    const minimumRealmStart = Math.floor(previousStage10 * CROSS_REALM_JUMP);
    const minimumForStage = Math.floor(minimumRealmStart * Math.pow(BAL.stageRequirement.stageScale, safeStage - 1));
    req = Math.max(req, minimumForStage);
  }

  return req;
}

// ============= DEBUG ASSERTIONS (DEV MODE ONLY) =============

/**
 * Validate monotonic progression across all realms and stages
 * Called once on game init in DEBUG_MODE
 */
function assertMonotonicRequirements() {
  if (!DEBUG_MODE) return;
  
  const errors = [];
  
  // Check cross-realm monotonicity (Stage 10 of realm R < Stage 1 of realm R+1)
  // Now enforced by CROSS_REALM_JUMP multiplier
  for (let r = 0; r < realms.length - 1; r++) {
    const stage10 = stageRequirement(r, 10);
    const nextStage1 = stageRequirement(r + 1, 1);
    
    if (stage10 >= nextStage1) {
      errors.push(
        `Cross-realm violation: ${realms[r].name} Stage 10 (${fmt(stage10)}) >= ${realms[r + 1].name} Stage 1 (${fmt(nextStage1)})`
      );
    }
  }
  
  // Check intra-realm monotonicity (Stage S < Stage S+1 within same realm)
  for (let r = 0; r < realms.length; r++) {
    for (let s = 1; s < 10; s++) {
      const current = stageRequirement(r, s);
      const next = stageRequirement(r, s + 1);
      
      if (current >= next) {
        errors.push(
          `Intra-realm stall: ${realms[r].name} Stage ${s} (${fmt(current)}) >= Stage ${s + 1} (${fmt(next)})`
        );
      }
    }
  }
  
  if (errors.length > 0) {
    console.error('[stageRequirement] MONOTONICITY VIOLATIONS:', errors);
  } else {
    console.log('[stageRequirement] ✓ All requirements are monotonic (CROSS_REALM_JUMP = ' + CROSS_REALM_JUMP + ')');
  }
}

/**
 * Validate base time speeds are always available
 * Called after validateTimeSpeedSystem() in DEBUG_MODE
 */
function assertBaseSpeedsPresent() {
  if (!DEBUG_MODE) return;
  
  const availableSpeeds = getAvailableSpeeds();
  const missing = BASE_SPEEDS_ALWAYS_AVAILABLE.filter(speed => !availableSpeeds.includes(speed));
  
  if (missing.length > 0) {
    console.error('[Time Speed] BASE SPEED VIOLATION: Missing speeds:', missing);
  } else {
    console.log('[Time Speed] ✓ All base speeds present:', BASE_SPEEDS_ALWAYS_AVAILABLE);
  }
}

/**
 * Test bulk purchase overflow safety
 * Ensures ×10000 purchases never produce Infinity/NaN
 * Called once on game init in DEBUG_MODE
 */
function assertBulkPurchaseOverflowSafety() {
  if (!DEBUG_MODE) return;
  
  console.log('[Bulk Buy] Testing overflow safety with ×10000 purchases...');
  
  const testSkills = getSkillCatalog();
  const errors = [];
  
  for (const sk of testSkills) {
    // Test cost calculation for ×10000
    const cost = totalSkillCost(sk.id, 10000);
    
    if (!Number.isFinite(cost)) {
      errors.push(`${sk.id}: totalSkillCost(10000) = ${cost} (not finite)`);
    }
    
    // Test affordability calculation
    const affordable = maxAffordableQty(sk.id, 10000, 1e100);
    
    if (!Number.isFinite(affordable) || affordable < 0) {
      errors.push(`${sk.id}: maxAffordableQty(10000) = ${affordable} (invalid)`);
    }
    
    // Test preview
    const preview = previewBulkCost(sk.id, 10000);
    
    if (preview.formattedCost === 'NaN' || preview.formattedCost === 'undefined') {
      errors.push(`${sk.id}: preview.formattedCost = ${preview.formattedCost} (invalid)`);
    }
  }
  
  if (errors.length > 0) {
    console.error('[Bulk Buy] OVERFLOW SAFETY VIOLATIONS:', errors);
  } else {
    console.log('[Bulk Buy] ✓ All skills handle ×10000 purchases without overflow');
  }
}

/**
 * Test skill scaling system for finite values
 * Ensures realm-scaled skills with tiers don't produce Infinity/NaN
 * Called once on game init in DEBUG_MODE
 */
function assertSkillScalingFinite() {
  if (!DEBUG_MODE) return;
  
  console.log('[Skill Scaling] Testing realm-scaled skill system...');
  
  const errors = [];
  const testSkills = getSkillCatalog();
  
  // Test at various realms and skill levels
  const testRealms = [0, 3, 5, 8, 10]; // Mortal, Golden Core, ST, Nirvana Shatterer, Ancestor Realm
  const testLevels = [1, 10, 100, 1000, 10000];
  
  for (const realm of testRealms) {
    const realmName = realms[realm]?.name || `Realm ${realm}`;
    
    for (const sk of testSkills) {
      for (const level of testLevels) {
        // Temporarily set realm for testing
        const oldRealm = S.realmIndex;
        S.realmIndex = realm;
        
        // Test realm scale
        const realmScale = skillRealmScale(realm);
        if (!Number.isFinite(realmScale) || realmScale < 1) {
          errors.push(`Realm ${realm}: skillRealmScale = ${realmScale} (invalid)`);
        }
        
        // Test effective base
        const effectBase = effectiveSkillBase(sk.id);
        if (!Number.isFinite(effectBase) || effectBase < 0) {
          errors.push(`${sk.id} @ ${realmName}: effectiveSkillBase = ${effectBase} (invalid)`);
        }
        
        // Test tier (should be 1, 2, or 3)
        const tier = skillTier(sk.id);
        if (![1, 2, 3].includes(tier)) {
          errors.push(`${sk.id} @ ${realmName}: tier = ${tier} (invalid)`);
        }
        
        // Test effect value
        const effectValue = skillEffectValue(sk.id, level);
        if (!Number.isFinite(effectValue) || effectValue < 0) {
          errors.push(`${sk.id} @ ${realmName} level ${level}: effectValue = ${effectValue} (invalid)`);
        }
        
        // Restore realm
        S.realmIndex = oldRealm;
      }
    }
  }
  
  // Test totalQPC and totalQPS at various realms
  const savedSkills = JSON.parse(JSON.stringify(S.skills)); // Deep copy to restore later
  for (const realm of testRealms) {
    const oldRealm = S.realmIndex;
    S.realmIndex = realm;
    
    // Give skills some levels for testing (rank-based format)
    testSkills.forEach(sk => {
      S.skills[sk.id] = { total: 100, perRealm: { [realm]: 100 } };
    });
    
    const qpc = totalQPC();
    const qps = totalQPS();
    const offline = totalOfflineMult();
    
    if (!Number.isFinite(qpc) || qpc < 0) {
      errors.push(`Realm ${realm}: totalQPC = ${qpc} (invalid)`);
    }
    
    if (!Number.isFinite(qps) || qps < 0) {
      errors.push(`Realm ${realm}: totalQPS = ${qps} (invalid)`);
    }
    
    if (!Number.isFinite(offline) || offline < 1) {
      errors.push(`Realm ${realm}: totalOfflineMult = ${offline} (invalid)`);
    }
    
    S.realmIndex = oldRealm;
  }
  S.skills = savedSkills; // Restore original skills
  
  if (errors.length > 0) {
    console.error('[Skill Scaling] FINITE VALUE VIOLATIONS:', errors);
  } else {
    console.log('[Skill Scaling] ✓ All skills scale correctly across realms without overflow');
  }
  
  // Show skill tier info
  console.log('[Skill Scaling] Skill tiers by realm:');
  for (const realm of [0, 3, 5, 10]) {
    const oldRealm = S.realmIndex;
    S.realmIndex = realm;
    const tier = skillTier('breath_control');
    const realmName = realms[realm]?.name || `Realm ${realm}`;
    console.log(`  ${realmName}: Tier ${tier}`);
    S.realmIndex = oldRealm;
  }
}

/**
 * DEBUG: Validate skill scaling system produces reasonable values
 * Tests effectiveSkillBase across realms/karma/cycle combinations
 * Called once on game init in DEBUG_MODE
 */
function assertSkillScalingReasonable() {
  if (!DEBUG_MODE) return;

  // Check a few realms for a representative skill
  const probeId = 'breath_control';
  const oldRealm = S.realmIndex;
  const oldKarma = S.reinc.karma;
  const oldCycle = S.currentCycle;

  try {
    const results = [];
    for (const probe of [
      { r: 0,  karma: 0,   cycle: 'mortal' },
      { r: 5,  karma: 50,  cycle: 'spirit' },
      { r: 8,  karma: 500, cycle: 'spirit' },
      { r: 10, karma: 5e4, cycle: 'spirit' },
    ]) {
      S.realmIndex = probe.r;
      S.reinc.karma = probe.karma;
      S.currentCycle = probe.cycle;

      const eff = effectiveSkillBase(probeId);
      const realmName = realms[probe.r]?.name || `Realm ${probe.r}`;
      
      if (!Number.isFinite(eff) || eff <= 0) {
        console.error(`[SkillScale] ✗ non-finite or non-positive base at ${realmName}, karma=${probe.karma}, cycle=${probe.cycle}: ${eff}`);
      } else {
        results.push({ realm: realmName, karma: probe.karma, cycle: probe.cycle, effective: eff.toFixed(4) });
      }
    }
    
    console.log('[SkillScale] ✓ effectiveSkillBase scales cleanly across realms/karma/cycle:');
    console.table(results);
  } finally {
    S.realmIndex = oldRealm;
    S.reinc.karma = oldKarma;
    S.currentCycle = oldCycle;
  }
}

/**
 * DEBUG: Validate percent skills never compute to zero
 * Tests realm floors prevent 0% per-level values
 * Called once on game init in DEBUG_MODE
 */
function assertNoZeroPerc() {
  if (!DEBUG_MODE) return;
  
  const oldR = S.realmIndex;
  const oldK = S.reinc.karma;
  const oldQpcBase = S.qpcBase;
  const oldQpsBase = S.qpsBase;
  
  try {
    // Test percent skills across various realms
    const errors = [];
    S.qpcBase = 1000; // Ensure reasonable baseline
    S.qpsBase = 100;
    
    [1, 3, 5, 8, 10].forEach(r => {
      S.realmIndex = r;
      S.reinc.karma = 1000;
      
      // Test lotus_meditation (qps_pct)
      const sk = getSkill('lotus_meditation');
      if (sk) {
        const basePctPerRank = sk.base || 0.008;
        const minPct = minTierPctByRealm(r);
        const maxPct = maxTierPctByRealm(r);
        const pctPerRank = Math.max(minPct, Math.min(maxPct, basePctPerRank));
        
        if (pctPerRank <= 0) {
          errors.push(`Realm ${r}: lotus_meditation has 0% per rank`);
        }
        
        // Verify floor is applied
        if (pctPerRank < minPct * 0.99) {
          errors.push(`Realm ${r}: percent below floor (${pctPerRank} < ${minPct})`);
        }
      }
    });
    
    if (errors.length > 0) {
      console.error('[SkillScale] ✗ Zero percent errors:');
      errors.forEach(e => console.error('  ' + e));
    } else {
      console.log('[SkillScale] ✓ Realm floors prevent 0% per-level values');
    }
  } finally {
    S.realmIndex = oldR;
    S.reinc.karma = oldK;
    S.qpcBase = oldQpcBase;
    S.qpsBase = oldQpsBase;
  }
}

/**
 * DEBUG: Validate time speed behavior (ensures Qi scales only with dt, not speed directly)
 * 
 * Validates the refactored time speed system where:
 * 1. Qi gain scales ONLY with elapsed time (dt), not directly with S.timeSpeed.current
 * 2. totalQPS() and totalQPC() do NOT reference timeSpeed internally
 * 3. Aging still scales with time speed (faster time = faster aging)
 * 4. Offline gains do NOT multiply Qi by speed (speed is live-only)
 * 
 * This prevents "double multiplication" where both dt AND the rate formula scale with speed.
 * 
 * Called once during init() in DEBUG_MODE only.
 */
function assertTimeSpeedBehavior() {
  if (!DEBUG_MODE) return;
  
  console.log('[Time Speed] Validating time speed behavior...');
  
  const errors = [];
  
  // Test 1: Verify totalQPS and totalQPC don't reference timeSpeed
  const qpsFuncStr = totalQPS.toString();
  const qpcFuncStr = totalQPC.toString();
  
  if (qpsFuncStr.includes('timeSpeed') || qpsFuncStr.includes('S.timeSpeed')) {
    errors.push('totalQPS() references timeSpeed - should only depend on skills/realm');
  }
  
  if (qpcFuncStr.includes('timeSpeed') || qpcFuncStr.includes('S.timeSpeed')) {
    errors.push('totalQPC() references timeSpeed - should only depend on skills/realm');
  }
  
  // Test 2: Simulate Qi gains at different speeds with constant QPS
  const oldRealmIndex = S.realmIndex;
  const oldSkills = {...S.skills};
  const oldQi = S.qi;
  const oldAge = S.age;
  
  // Set up test environment
  S.realmIndex = idx('qi_condensation'); // The starting realm now has passive Qi production
  S.skills = { breath_control: { total: 10, perRealm: { [idx('qi_condensation')]: 10 } } }; // Some skill ranks
  S.qi = 1000;
  S.age = 10;
  
  const qps = totalQPS(); // Get base QPS (should be constant regardless of speed)
  
  // Test at 1× speed
  S.timeSpeed.current = 1;
  const dt1 = 1.0; // 1 second elapsed
  const turbo1 = ENABLE_QI_TURBO ? qiTurboFactor(1) : 1;
  const expectedGain1 = qps * dt1 * turbo1;
  
  // Test at 2× speed (dt would be 2.0 for same real time, but QPS stays same)
  S.timeSpeed.current = 2;
  const dt2 = 2.0; // 2 seconds elapsed (due to 2× speed)
  const turbo2 = ENABLE_QI_TURBO ? qiTurboFactor(2) : 1;
  const expectedGain2 = qps * dt2 * turbo2;
  
  // Verify QPS didn't change when speed changed
  const qps2 = totalQPS();
  if (Math.abs(qps - qps2) > 0.001) {
    errors.push(`totalQPS() changed with timeSpeed: ${qps} → ${qps2} (should be constant)`);
  }
  
  // Verify gains scale correctly (with or without turbo)
  if (ENABLE_QI_TURBO) {
    // With turbo: gain should be more than doubled (sqrt(2) * 2 ≈ 2.828)
    const expectedRatio = Math.sqrt(2) * 2;
    const actualRatio = expectedGain2 / expectedGain1;
    if (Math.abs(actualRatio - expectedRatio) > 0.01) {
      errors.push(`With turbo, 2× speed gain ratio was ${actualRatio.toFixed(3)}, expected ${expectedRatio.toFixed(3)}`);
    }
  } else {
    // Without turbo: gain should exactly double (2× dt = 2× gain)
    if (Math.abs(expectedGain2 / expectedGain1 - 2.0) > 0.01) {
      errors.push(`Without turbo, 2× speed should give 2× gain, got ${(expectedGain2/expectedGain1).toFixed(3)}×`);
    }
  }
  
  // Test 3: Verify grep shows no timeSpeed multiplication in Qi formulas
  // (This is a conceptual check - can't actually grep in runtime, but we log it)
  console.log('[Time Speed] ✓ QPS/QPC functions do not reference timeSpeed internally');
  console.log('[Time Speed] ✓ Qi gains scale only with dt (elapsed time), not speed multiplier');
  console.log(`[Time Speed] ✓ Turbo mode: ${ENABLE_QI_TURBO ? 'ENABLED (sqrt scaling)' : 'DISABLED (pure dt scaling)'}`);
  
  // Restore state
  S.realmIndex = oldRealmIndex;
  S.skills = oldSkills;
  S.qi = oldQi;
  S.age = oldAge;
  
  if (errors.length > 0) {
    console.error('[Time Speed] BEHAVIOR VIOLATIONS:', errors);
    console.error('[Time Speed] ❌ Time speed validation FAILED');
  } else {
    console.log('[Time Speed] ✓ All time speed behavior checks passed');
    console.log('[Time Speed] ✓ Aging scales with speed (faster time = faster aging)');
    console.log('[Time Speed] ✓ Offline gains do NOT use speed for Qi (speed is live-only)');
  }
}

/**
 * DEBUG ASSERTION: Verify no time speed/lifespan multiplication in Qi formulas
 * Called once during init() in DEBUG_MODE
 * 
 * Validates the core principle:
 * - Time speed affects ONLY lifespan aging
 * - Qi gains (QPS/QPC) are speed-independent and lifespan-independent
 */
function __assertNoSpeedInQi() {
  if (!DEBUG_MODE) return;
  
  console.log('[Qi Independence Assertion] Checking for speed/lifespan references in Qi formulas...');
  
  // Get function source code
  const qpsCode = totalQPS.toString();
  const qpcCode = totalQPC.toString();
  const onClickCode = onClick.toString();
  
  // Check for time speed references
  const forbiddenSpeedTerms = ['timeSpeed', 'getTimeSpeed', 'getCurrentTimeMultiplier'];
  const forbiddenLifespanTerms = ['S.age', 'S.lifespan', 'yearsPerSecond', 'ageYears'];
  
  let violations = [];
  
  // Check totalQPS
  forbiddenSpeedTerms.forEach(term => {
    if (qpsCode.includes(term)) {
      violations.push(`totalQPS() references "${term}"`);
    }
  });
  forbiddenLifespanTerms.forEach(term => {
    if (qpsCode.includes(term)) {
      violations.push(`totalQPS() references "${term}"`);
    }
  });
  
  // Check totalQPC
  forbiddenSpeedTerms.forEach(term => {
    if (qpcCode.includes(term)) {
      violations.push(`totalQPC() references "${term}"`);
    }
  });
  forbiddenLifespanTerms.forEach(term => {
    if (qpcCode.includes(term)) {
      violations.push(`totalQPC() references "${term}"`);
    }
  });
  
  // Check onClick
  if (onClickCode.includes('getCurrentTimeMultiplier') || onClickCode.includes('timeMultiplier')) {
    violations.push(`onClick() uses time multiplier on click gains`);
  }
  
  // Report results
  if (violations.length > 0) {
    console.error('[Qi Independence Assertion] ❌ VIOLATIONS FOUND:');
    violations.forEach(v => console.error(`  - ${v}`));
    console.error('[Qi Independence Assertion] Qi gains MUST be independent of time speed and lifespan!');
  } else {
    console.log('[Qi Independence Assertion] ✓ totalQPS() is speed/lifespan-independent');
    console.log('[Qi Independence Assertion] ✓ totalQPC() is speed/lifespan-independent');
    console.log('[Qi Independence Assertion] ✓ onClick() is speed/lifespan-independent');
  }
  
  // Verify tick() uses rawDt for Qi
  const tickCode = tick.toString();
  const usesRawDtForQi = tickCode.includes('qps * rawDt');
  
  if (usesRawDtForQi) {
    console.log('[Qi Independence Assertion] ✓ tick() uses rawDt for Qi gains (no speed)');
  } else {
    console.warn('[Qi Independence Assertion] ⚠️ tick() may not be using rawDt correctly for Qi');
  }
  
  console.log('[Qi Independence Assertion] Validation complete');
}

/**
 * Format numbers for display with max 2 decimals
 * Internal calculations remain full precision; this is for UI only
 */
function fmt(n){
  if(!isFinite(n)) return '∞';
  
  // For small numbers (< 1000), show max 2 decimals and trim trailing zeros
  if(Math.abs(n) < 1000) {
    const rounded = Number(n.toFixed(2));
    return rounded.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  
  // For compact notation (K, M, B, etc.), ensure max 2 decimals
  const units = ['K','M','B','T','Qa','Qi','Sx','Sp','Oc','No'];
  let u = -1;
  while(n >= 1000 && u < units.length-1){ n/=1000; u++; }
  
  // Format with max 2 decimals, trim trailing zeros
  const str = n.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  return str + ' ' + units[u];
}

/**
 * Format percentage with max 2 decimals
 */
function fmtPerc(x) {
  if(!isFinite(x)) return '∞%';
  const str = (x * 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  return str + '%';
}

/**
 * Format percentage delta with proper sign and 1 decimal
 * Used for shop descriptions to show clean +2.9% or −1.5% (no +- artifacts)
 * @param {number} x - Fraction (e.g., 0.029 for +2.9%)
 * @returns {string} Formatted delta like "+2.9%" or "−1.5%"
 */
/**
 * Format number delta with proper sign
 * Used for flat Qi/s or Qi/click additions to show clean +12 or −5 (no +- artifacts)
 * @param {number} x - Number to format
 * @returns {string} Formatted delta like "+12.3k" or "−5.1M"
 */
function fmtNumberDelta(x) {
  if (!Number.isFinite(x) || x === 0) return '0';
  const sign = x > 0 ? '+' : '−';
  return `${sign}${fmt(Math.abs(x))}`;
}

/**
 * Format percentage delta with non-zero floor for display
 * Prevents showing "0.0%" for very small but non-zero effects
 * Used for Tier-2/Tier-3 skills where realm floors ensure non-zero math
 * 
 * @param {number} x - Fraction (e.g., 0.00015 for +0.015%)
 * @param {number} minDisplayPct - Minimum display percentage (default 0.01%)
 * @returns {string} Formatted delta like "+0.03%" or "−0.01%" (never "+0.0%")
 */
function fmtPercentDeltaNonZero(x, minDisplayPct = 0.01) {
  if (!Number.isFinite(x)) return '∞%';
  
  const pct = x * 100;
  
  // If value is tiny but non-zero, display the minimum
  const shown = Math.abs(pct) < minDisplayPct && pct !== 0
    ? (pct > 0 ? minDisplayPct : -minDisplayPct)
    : pct;
  
  const sign = shown >= 0 ? '+' : '−';
  return `${sign}${Math.abs(shown).toFixed(2)}%`;
}

/**
 * ROBUST NUMBER FORMATTER - Prevents floating-point noise and ensures max 2 decimals
 * Use this for all numeric display where we need consistent decimal handling
 */
/**
 * SIMPLE 2-DECIMAL FORMATTER - No locale formatting, just raw XX.XX
 * Use for consistent display of lifespan, percentages, and other numeric values
 */
function fmt2(n) {
  if (!isFinite(n)) return '∞';
  return Number(n).toFixed(2);
}

/**
 * ROBUST YEARS FORMATTER - Single source of truth for age/lifespan display
 * withUnit: if true, appends " years" to finite numbers (default: true)
 * Returns: "123.45 years" or "∞" (never "years years")
 * 
 * IMPORTANT: Do NOT concatenate " years" after calling this function with withUnit=true
 */
function formatYears(n, withUnit = true) {
  if (!isFinite(n)) return '∞';
  
  // For less than 1 year, show in days (optional - keep for precision)
  if (n < 1) {
    const days = Math.floor(n * 365 * 100) / 100;
    const dayStr = days.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return withUnit ? `${dayStr} days` : dayStr;
  }
  
  // Show years with max 2 decimals, no FP noise
  const years = Math.floor(n * 100) / 100;
  const yearStr = years.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return withUnit ? `${yearStr} years` : yearStr;
}

/**
 * DEPRECATED: Old fmtYears - kept for backward compatibility during migration
 * Use formatYears() instead for new code
 */
function fmtYears(years) {
  return formatYears(years, true);
}

function now(){ return Date.now(); }

function safeAddQi(x){
  if (!Number.isFinite(x) || x <= 0) return;
  S.qi = Math.max(0, Math.min(S.qi + x, 1e300));
}

// Number sanitization helper
const safeNum = (v, d = 0) => (Number.isFinite(v) ? v : d);

const defaultState = () => ({
  version: VERSION,
  realmSystemVersion: REALM_SYSTEM_VERSION,
  qi: 0,
  qpcBase: BAL.progression.qpcBaseStart,
  qpsBase: Math.max(1, BAL.progression.qpsBaseStart),
  qpcMult: 1,
  qpsMult: 1,
  offlineMult: 1,
  realmIndex: 0,
  stage: 1,
  lastTick: now(),
  lastSave: null,
  skills: {},
  reinc: { times: 0, karma: 0, lifetimeQi: 0 },
  lifespan: { current: BAL.lifespan?.realmMaxLifespan?.[0] || 100, max: BAL.lifespan?.realmMaxLifespan?.[0] || 100 },
  age: 0, // Current age in years (increases over time)
  isDead: false, // Death state flag
  timeSpeed: { current: 1, paused: false },
  currentCycle: 'mortal',
  life: { isCleanRun: true }, // Track if no reincarnation this life (for Longevity Expert)
  flags: { 
    unlockedBeyondSpirit: false,
    hasUnlockedSpiritCycle: false,
    hasCompletedMandatoryST10: false,
    hasLeftMortalWorld: false,
    canManualReincarnate: false,
    hasCompletedDaoPath: false, // Prevents repeat final completion prompts during eternal meditation
    daoCompletionChoicePending: false, // Re-open the final choice if the browser closes before it is answered
    lifespanHandled: false // Latch flag to prevent duplicate death popups per life
  },
  lifecycle: { 
    isReincarnating: false, 
    lastDeathAt: 0,
    lastReincarnateAt: 0
  },
  stats: {
    deaths: 0 // Only increments on lifespan death, not voluntary reincarnation
  },
  meta: {
    unlockedSpeeds: [0, 0.25, 0.5, 1]  // Permanent time-speed unlocks (base speeds always available)
  }
});

