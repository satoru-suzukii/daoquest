/* Cultivation systems: cycles, techniques, lifespan, time flow, and gameplay actions. */

// ============= CYCLE SYSTEM =============

/**
 * Get cycle boundaries dynamically from balance.json
 * No hardcoded indices - derived from cycle definitions
 */
function getCurrentCycle() {
  if (!BAL.cycleDefinitions) return { name: 'Mortal World', realmBonus: 0.25, realms: [] };
  
  const mortalRealms = BAL.cycleDefinitions.mortal?.realms || [];
  const spiritRealms = BAL.cycleDefinitions.spirit?.realms || [];
  
  if (mortalRealms.includes(S.realmIndex)) {
    return { ...BAL.cycleDefinitions.mortal, realms: mortalRealms };
  } else if (spiritRealms.includes(S.realmIndex)) {
    return { ...BAL.cycleDefinitions.spirit, realms: spiritRealms };
  }
  
  // Fallback to mortal
  return { ...BAL.cycleDefinitions.mortal, realms: mortalRealms };
}

function updateCurrentCycle() {
  const mortalRealms = BAL.cycleDefinitions?.mortal?.realms || [];
  const spiritRealms = BAL.cycleDefinitions?.spirit?.realms || [];
  
  const oldCycle = S.currentCycle;
  
  if (mortalRealms.includes(S.realmIndex)) {
    S.currentCycle = 'mortal';
  } else if (spiritRealms.includes(S.realmIndex)) {
    S.currentCycle = 'spirit';
  }
  
  // Detect transition from Mortal to Spirit
  if (oldCycle === 'mortal' && S.currentCycle === 'spirit') {
    // Show one-time toast about higher-world techniques
    if (DEBUG_MODE) {
      console.log('[Cycle Transition] Mortal → Spirit: New abilities unlocked');
    }
    setTimeout(() => {
      showToast('✨ Higher-world techniques discovered: Celestial Resonance & Void Convergence are now available.');
    }, 1000);
  }
}

/**
 * Check whether the cultivator has entered the higher worlds.
 * @returns {boolean} True for realms from Nirvana Scryer onward
 */
function isInSpiritCycle() {
  const spiritRealms = BAL.cycleDefinitions?.spirit?.realms || [];
  return spiritRealms.includes(S.realmIndex);
}

/**
 * Check if a skill is unlocked based on cycle requirements
 * @param {Object} skill - Skill definition with optional unlockAtCycle property
 * @returns {boolean} True if skill is unlocked by current cycle
 */
function skillUnlockedByCycle(skill) {
  if (!skill.unlockAtCycle) return true; // No cycle requirement
  if (skill.unlockAtCycle === 'spirit') return isInSpiritCycle();
  return true; // Unknown requirement, allow by default
}

function triggerCycleTransition() {
  if (S.currentCycle === 'spirit') {
    // The final choice is offered once per life. Eternal meditation remains playable,
    // while a later reincarnation starts a fresh attempt at the Dao's summit.
    S.flags = S.flags || {};
    if (S.flags.hasCompletedDaoPath) return false;
    S.flags.hasCompletedDaoPath = true;
    S.flags.daoCompletionChoicePending = true;
    achievementState.spiritCycleComplete = true;
    unlockAchievement('celestial_eternity');
    checkAchievements({
      spiritCycleComplete: true,
      forcedReincarnationCount: achievementState.forcedReincarnationCount || 0
    });
    save();
    showCycleCompletionModal('final');
    return true;
  }
  // The First-Step boundary never reincarnates the player. The actual boundary
  // handler advances directly from Ascendant to Nirvana Scryer.
  showSpiritTransformationGate();
}

function showCycleCompletionModal(type) {
  // The old mortal-to-spirit modal used to force reincarnation. That transition
  // is now handled by showSpiritTransformationGate() and never resets a life.
  if (type !== 'final') {
    showSpiritTransformationGate();
    return;
  }

  const karmaGain = computeKarmaGain();
  const title = '👑 Ancestor Ascension';
  const message = `
    <div style="text-align: center; margin-bottom: 16px; font-size: 2.5em;">⚡</div>
    <div style="color: var(--accent); font-weight: 600; margin-bottom: 8px;">The <span class="cycle-spirit">Five-Step Path</span> is Complete</div>
    <div style="margin-bottom: 16px;">You have reached the Ancestor Realm, the absolute ceiling of this cultivation path. Fourth-Step cultivators are no more than small marks in the painting of your existence.</div>
    <div style="text-align: left; margin: 8px 0;">
      <div><strong>Qi Cultivated:</strong> <span class="highlight">${fmt(S.reinc.lifetimeQi)}</span></div>
      <div><strong>Karma Available:</strong> <span class="highlight">+${fmt(karmaGain)}</span></div>
      <div><strong>Final Realm:</strong> <span class="cycle-spirit">Ancestor Realm · Stage 10</span></div>
    </div>
    <br><em>You may reincarnate to begin a new journey, or remain in eternal meditation.</em>
  `;
  const onConfirm = () => doReincarnate({ mode: 'cycle' });
  const onCancel = () => {
    S.flags.daoCompletionChoicePending = false;
    save(); // The cultivator chose to remain; do not reopen this choice on the next load.
  };
  showConfirm(title, message, onConfirm, onCancel, '');
}

function showSpiritTransformationGate() {
  // Compatibility name retained for older event hooks; this is now a direct world transition.
  const title = '🌌 The Boundary Beyond the Mortal World';
  const req = stageRequirement(S.realmIndex, S.stage);
  const message = `
    <div style="text-align:center;margin-bottom:16px;font-size:2.5em;">☯️</div>
    <div style="color:var(--accent);font-weight:700;margin-bottom:8px;">The First Step Has Reached Its Absolute Peak</div>
    <div style="margin-bottom:14px;">You have reached <strong>Ascendant · Void Returning</strong>, the summit of the First Step. The starting world can no longer contain your existence. This breakthrough does not require reincarnation: it carries you directly into the Second Step.</div>
    <div class="realm-gate-summary">
      <div><strong>Current realm</strong><span>Ascendant · Stage 10</span></div>
      <div><strong>Breakthrough cost</strong><span>${fmt(req)} Qi</span></div>
      <div><strong>Next realm</strong><span>Nirvana Scryer · Dao Fusion</span></div>
      <div><strong>Reincarnation</strong><span>Remains optional</span></div>
    </div>
    <p class="small muted" style="margin-top:12px;">Your current life, accumulated skills, and cultivation progress are preserved.</p>
  `;
  const onConfirm = () => {
    if (S.realmIndex !== idx('ascendant') || S.stage !== STAGES_PER_REALM || S.qi < req) return;
    S.qi -= req;
    S.flags.unlockedBeyondSpirit = true;
    S.flags.hasUnlockedSpiritCycle = true;
    S.flags.hasCompletedMandatoryST10 = true; // legacy compatibility for older saves/UI hooks
    S.flags.hasLeftMortalWorld = true;
    S.flags.canManualReincarnate = true;
    S.realmIndex = idx('nirvana_scryer');
    S.stage = 1;
    S.qpcBase += BAL.progression.realmAdvanceReward.qpcBaseAdd;
    S.qpsBase += BAL.progression.realmAdvanceReward.qpsBaseAdd;
    enforceQiRefiningQpsBaseline();
    updateLifespanOnRealmAdvance();
    updateCurrentCycle();
    checkAndUnlockSpeeds();
    achievementState.cycleTransitions = (achievementState.cycleTransitions || 0) + 1;
    unlockAchievement('break_mortal_shackles');
    unlockAchievement('end_mortal_cycle');
    unlockAchievement('spirit_ascendant');
    renderAll();
    save();
    showModal('🌌 Beyond the Mortal World', 'The First Step is behind you. You have entered Nirvana Scryer and begun the Second Step. The path ahead is no longer bound by the mortal world.', '✨');
  };
  showConfirm(title, message, onConfirm, null, '🌌');
}

// ============= KARMA & POWER SCALING (SOFT CAPS) =============

/**
 * Karma soft cap for Qi multiplier
 * Asymptotically approaches +120% at high karma
 * Formula: 1 + 1.2 * (1 - e^(-0.04 * karma))
 */
function karmaQiMult(karma) {
  return 1 + 1.2 * (1 - Math.exp(-0.04 * karma));
}

/**
 * Karma soft cap for stage requirement reduction
 * Mild effect, asymptotically approaches +60% easier at high karma
 * Formula: 1 + 0.6 * (1 - e^(-0.03 * karma))
 * Applied as: requirement / karmaStageMult (so higher value = easier)
 */
function karmaStageMult(karma) {
  return 1 + 0.6 * (1 - Math.exp(-0.03 * karma));
}

/**
 * World-group power multiplier (LINEAR within group, not compounding)
 * First Step: +25% per realm from its start
 * Higher Worlds: +50% per realm from Nirvana Scryer
 * Returns a single multiplicative factor (not stacking per realm)
 */
function cyclePowerMult(realmIndex) {
  if (!BAL.cycleDefinitions) return 1;
  
  const mortalRealms = BAL.cycleDefinitions.mortal?.realms || [];
  const spiritRealms = BAL.cycleDefinitions.spirit?.realms || [];
  
  const inMortal = mortalRealms.includes(realmIndex);
  const inSpirit = spiritRealms.includes(realmIndex);
  
  if (inMortal) {
    const idxInCycle = mortalRealms.indexOf(realmIndex);
    const bonus = BAL.cycleDefinitions.mortal?.realmBonus || 0.25;
    return 1 + (bonus * idxInCycle);
  } else if (inSpirit) {
    const idxInCycle = spiritRealms.indexOf(realmIndex);
    const bonus = BAL.cycleDefinitions.spirit?.realmBonus || 0.50;
    return 1 + (bonus * idxInCycle);
  }
  
  return 1; // No cycle bonus
}

// Dynamic skill catalog based on BAL configuration (hybrid rank + technique system)
let SKILL_CAT = null;
function getSkillCatalog() {
  if (!SKILL_CAT) {
    SKILL_CAT = [];
    
    // Build catalog from balance.json with extended schema
    for (const [id, data] of Object.entries(BAL.skills)) {
      const skillDef = {
        id,
        name: id.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
        cost: data.cost,
        type: data.type,
      };
      
      // One-time techniques (higher-world unlocks)
      if (data.oneTime) {
        skillDef.oneTime = true;
        skillDef.value = data.value;
        skillDef.unlockAtCycle = data.unlockAtCycle;
      } else {
        // Ranked skills (per-realm progression)
        skillDef.base = data.base;
        skillDef.costScale = data.costScale;
        skillDef.ranksPerRealm = data.ranksPerRealm;
        if (data.capPctPerRealm !== undefined) {
          skillDef.capPctPerRealm = data.capPctPerRealm;
        }
      }
      
      SKILL_CAT.push(skillDef);
    }
  }
  return SKILL_CAT;
}

// ============= HYBRID SKILL SYSTEM (FINITE RANKS + ONE-TIME TECHNIQUES) =============

/**
 * Get current realm's rank count for a skill
 * @param {string} id - Skill ID
 * @returns {number} Ranks purchased in current realm
 */
function currentRealmRanks(id) {
  const skill = S.skills[id];
  if (!skill || skill.purchasedOneTime) return 0;
  return skill.perRealm?.[S.realmIndex] || 0;
}

/**
 * Add ranks to current realm for a skill
 * @param {string} id - Skill ID
 * @param {number} n - Number of ranks to add
 */
function addRealmRank(id, n) {
  let skill = S.skills[id];
  if (!skill) {
    skill = S.skills[id] = { total: 0, perRealm: {} };
  }
  const cur = currentRealmRanks(id);
  skill.perRealm[S.realmIndex] = cur + n;
  skill.total += n;
}

/**
 * Check if a technique has been purchased
 * @param {string} id - Skill ID
 * @returns {boolean} True if technique is purchased
 */
function isTechniquePurchased(id) {
  return S.skills[id]?.purchasedOneTime || false;
}

/**
 * Purchase a one-time technique
 * @param {string} id - Skill ID
 */
function purchaseTechnique(id) {
  S.skills[id] = { purchasedOneTime: true, total: 1, perRealm: {} };
}

/**
 * Realm power curve: bounded exponential approaching realmMaxMult
 * Returns a multiplier in [1.0, 1.0 + realmMaxMult]
 * Uses formula: 1 + M * (1 - e^(-k * realmIndex))
 * This creates smooth growth that prevents early explosion and late irrelevance
 */
function skillRealmScale(realmIndex) {
  const { realmMaxMult, realmK } = SKILL_SCALING;
  // 1 + M * (1 - e^(-k * realmIndex))
  const scale = 1 + realmMaxMult * (1 - Math.exp(-realmK * Math.max(0, realmIndex)));
  // Hard safety clamp
  return Math.min(1 + realmMaxMult, Math.max(1, scale));
}

/**
 * Karma boost: soft log so early karma helps and late karma doesn't explode
 * Returns a multiplier in [1.0, 1.0 + karmaMaxMult]
 * Formula: 1 + log10(karma+1) * coeff
 */
function skillKarmaBoost(karma) {
  const { karmaLogCoeff, karmaMaxMult } = SKILL_SCALING;
  const mult = 1 + Math.log10(Math.max(1, karma) + 1) * karmaLogCoeff;
  return Math.min(1 + karmaMaxMult, Math.max(1, mult));
}

/**
 * Cycle boost: modest in Mortal, larger in Spirit to keep late game relevant
 * Returns 1.0 in the First Step and 5.0 in the higher worlds
 */
function skillCycleBoost() {
  return S.currentCycle === 'spirit'
    ? SKILL_SCALING.spiritCycleBoost
    : SKILL_SCALING.mortalCycleBoost;
}

/**
 * NEW single source of truth for per-skill base (pre-tier logic).
 * Multiplies the static BAL base by realm/karma/cycle factors.
 * Keeps Qi independent of time speed/lifespan.
 * 
 * @param {string} id - Skill ID
 * @returns {number} Effective base multiplied by progression factors
 */
function effectiveSkillBase(id) {
  const base = BAL.skills[id]?.base ?? 0;
  if (base <= 0) return 0;

  // Independent progression factors (no time speed or lifespan references)
  const realmMult  = skillRealmScale(S.realmIndex);
  const karmaMult  = skillKarmaBoost(safeNum(S.reinc?.karma, 0));
  const cycleMult  = skillCycleBoost();

  // Combine safely with caps
  let scaled = base * realmMult * karmaMult * cycleMult;

  // Global hard clamp to avoid overflow; math stays finite
  if (!Number.isFinite(scaled) || scaled < 0) scaled = 0;
  return Math.min(1e150, scaled);
}

let S = defaultState();   // Populated properly inside init() after BAL is loaded

/**
 * Calculate total Qi per click with hybrid skill system
 * Flat skills: add ranks × baseline × effectiveSkillBase
 * Percent skills: multiply by capped percentage × effectiveSkillBase
 * Techniques: one-time multiplicative bonus
 */
function totalQPC(){
  let add = S.qpcBase;
  let mult = 1;
  
  // meridian_flow: Flat additive skill
  const ranksM = currentRealmRanks('meridian_flow');
  if (ranksM > 0) {
    const effBase = effectiveSkillBase('meridian_flow');
    const baseline = S.qpcBase * (BAL.realmBaselines?.qpcFlatPerRank || 0.25);
    add += ranksM * baseline * effBase;
  }
  
  // dantian_temps: Percentage skill with cap
  const ranksD = currentRealmRanks('dantian_temps');
  if (ranksD > 0) {
    const sk = getSkill('dantian_temps');
    const basePctPerRank = sk?.base || 0.008;
    const capPct = sk?.capPctPerRealm || 0.12;
    
    // Apply realm-aware floors/caps to per-rank percentage
    const minPct = minTierPctByRealm(S.realmIndex);
    const maxPct = maxTierPctByRealm(S.realmIndex);
    const pctPerRank = Math.max(minPct, Math.min(maxPct, basePctPerRank));
    
    // Total percentage with effective base influencing the cap
    const effBase = effectiveSkillBase('dantian_temps');
    const scaledCap = Math.min(capPct * Math.sqrt(effBase), 2.0); // sqrt dampens extreme scaling
    const totalPct = Math.min(ranksD * pctPerRank, scaledCap);
    mult *= (1 + totalPct);
  }
  
  // void_convergence: One-time technique
  if (isTechniquePurchased('void_convergence')) {
    const sk = getSkill('void_convergence');
    mult *= (1 + (sk?.value || 0.12));
  }
  
  // Apply final multipliers
  const out = add * mult * S.qpcMult * karmaQiMult(S.reinc.karma) * cyclePowerMult(S.realmIndex);
  return Number.isFinite(out) ? out : 1e300;
}

/**
 * Calculate total Qi per second with hybrid skill system
 * Flat skills: add ranks × baseline × effectiveSkillBase
 * Percent skills: multiply by capped percentage × effectiveSkillBase
 * Techniques: one-time multiplicative bonus
 */
function totalQPS(){
  let add = S.qpsBase;
  let mult = 1;
  
  // breath_control: Flat additive skill
  const ranksB = currentRealmRanks('breath_control');
  if (ranksB > 0) {
    const effBase = effectiveSkillBase('breath_control');
    const baseline = S.qpsBase * (BAL.realmBaselines?.qpsFlatPerRank || 0.15);
    add += ranksB * baseline * effBase;
  }
  
  // lotus_meditation: Percentage skill with cap
  const ranksL = currentRealmRanks('lotus_meditation');
  if (ranksL > 0) {
    const sk = getSkill('lotus_meditation');
    const basePctPerRank = sk?.base || 0.008;
    const capPct = sk?.capPctPerRealm || 0.12;
    
    // Apply realm-aware floors/caps to per-rank percentage
    const minPct = minTierPctByRealm(S.realmIndex);
    const maxPct = maxTierPctByRealm(S.realmIndex);
    const pctPerRank = Math.max(minPct, Math.min(maxPct, basePctPerRank));
    
    // Total percentage with effective base influencing the cap
    const effBase = effectiveSkillBase('lotus_meditation');
    const scaledCap = Math.min(capPct * Math.sqrt(effBase), 2.0); // sqrt dampens extreme scaling
    const totalPct = Math.min(ranksL * pctPerRank, scaledCap);
    mult *= (1 + totalPct);
  }
  
  // celestial_resonance: One-time technique
  if (isTechniquePurchased('celestial_resonance')) {
    const sk = getSkill('celestial_resonance');
    mult *= (1 + (sk?.value || 0.12));
  }
  
  // Apply final multipliers
  const out = add * mult * S.qpsMult * karmaQiMult(S.reinc.karma) * cyclePowerMult(S.realmIndex);
  return Number.isFinite(out) ? out : 1e300;
}

/**
 * Calculate total offline multiplier with hybrid skill system
 * closed_door: Percentage skill with cap × effectiveSkillBase
 */
function totalOfflineMult(){
  const ranksClosed = currentRealmRanks('closed_door');
  if (ranksClosed <= 0) return 1.0;
  
  const sk = getSkill('closed_door');
  const basePctPerRank = sk?.base || 0.005;
  const capPct = sk?.capPctPerRealm || 0.08;
  
  // Apply realm-aware floors/caps to per-rank percentage
  const minPct = minTierPctByRealm(S.realmIndex);
  const maxPct = maxTierPctByRealm(S.realmIndex);
  const pctPerRank = Math.max(minPct, Math.min(maxPct, basePctPerRank));
  
  // Total percentage with effective base influencing the cap
  const effBase = effectiveSkillBase('closed_door');
  const scaledCap = Math.min(capPct * Math.sqrt(effBase), 1.0); // sqrt dampens, cap at 100%
  const totalPct = Math.min(ranksClosed * pctPerRank, scaledCap);
  
  return 1.0 + totalPct;
}

function getSkill(id){ return getSkillCatalog().find(s=>s.id===id); }

/**
 * Calculate cost for next rank or technique purchase
 * For ranked skills: cost grows per rank in current realm
 * For techniques: fixed one-time cost
 * @param {string} id - Skill ID
 * @returns {number} Cost in Qi
 */
function skillCost(id){
  const sk = getSkill(id);
  if (!sk) return Infinity;
  
  // One-time techniques: fixed cost
  if (sk.oneTime) {
    return sk.cost;
  }
  
  // Ranked skills: cost scales with current realm ranks
  const currentRanks = currentRealmRanks(id);
  return Math.floor(sk.cost * Math.pow(sk.costScale, currentRanks));
}

// ============= BULK SKILL BUYING SYSTEM (LOG-SPACE SAFE) =============

/**
 * Log-space safe overflow guard
 * ~exp(690) ≈ 1e300, beyond this we hit Number.MAX_VALUE
 */
const LOG_MAX = 690;

// Log helper functions
const ln = Math.log;
const exp = Math.exp;

/**
 * Get cost of a single level at a specific level (not current level)
 * @param {string} skillId - Skill ID
 * @param {number} level - Level to calculate cost for (realm-relative rank)
 * @returns {number} Cost for that specific level
 */
/**
 * Calculate log of skill cost at specific level
 * Returns ln(cost * scale^level)
 * @param {Object} sk - Skill object
 * @param {number} level - Level to calculate for
 * @returns {number} Natural log of cost
 */
/**
 * Calculate log of total cost for qty levels starting from level L
 * Uses geometric series: sum = c0 * (r^qty - 1) / (r - 1)
 * Where c0 = cost * scale^L
 * @param {Object} sk - Skill object
 * @param {number} currentLevel - Starting level
 * @param {number} qty - Number of levels to buy
 * @returns {number} Natural log of total cost (or -Infinity if 0)
 */
function lnTotalCost(sk, currentLevel, qty) {
  if (qty <= 0) return -Infinity; // ln(0) = -Infinity
  
  const lnCost = ln(sk.cost);
  const lnR = ln(sk.costScale);
  
  // ln(c0) = ln(cost) + currentLevel * ln(scale)
  const lnC0 = lnCost + currentLevel * lnR;
  
  // Handle scale ≈ 1 (linear progression)
  if (Math.abs(sk.costScale - 1) < 0.0001) {
    // sum = qty * c0
    // ln(sum) = ln(qty) + ln(c0)
    return ln(qty) + lnC0;
  }
  
  // Geometric series: sum = c0 * (r^qty - 1) / (r - 1)
  // ln(sum) = ln(c0) + ln(r^qty - 1) - ln(r - 1)
  
  // For large qty, r^qty dominates: ln(r^qty - 1) ≈ qty * ln(r)
  // For small qty, use Math.expm1 for numerical stability
  const qtyLnR = qty * lnR;
  const lnNumerator = (qtyLnR > 30) ? qtyLnR : ln(Math.expm1(qtyLnR));
  const lnDenominator = ln(sk.costScale - 1);
  
  return lnC0 + (lnNumerator - lnDenominator);
}

/**
 * Calculate total cost to buy multiple ranks using log-space safe math
 * For techniques: returns fixed cost (qty ignored)
 * For ranked skills: enforces rank cap per realm
 * @param {string} skillId - Skill ID
 * @param {number} qty - Number of ranks to buy
 * @returns {number} Total cost for qty ranks (capped to prevent Infinity)
 */
function totalSkillCost(skillId, qty) {
  if (qty <= 0) return 0;
  
  const sk = getSkill(skillId);
  
  // One-time techniques: fixed cost, qty ignored
  if (sk.oneTime) {
    return sk.cost;
  }
  
  // Ranked skills: enforce rank cap
  const currentRanks = currentRealmRanks(skillId);
  const cap = sk.ranksPerRealm;
  const actualQty = Math.min(qty, cap - currentRanks);
  
  if (actualQty <= 0) return Infinity; // At cap
  
  const lnCost = lnTotalCost(sk, currentRanks, actualQty);
  
  // Guard against overflow
  if (!Number.isFinite(lnCost) || lnCost > LOG_MAX) {
    return 1e300;
  }
  
  const cost = exp(lnCost);
  if (!Number.isFinite(cost)) {
    return 1e300;
  }
  
  return Math.max(0, Math.floor(cost));
}

/**
 * Calculate maximum affordable quantity given a budget using log-space binary search
 * For techniques: returns 1 if can afford, 0 otherwise
 * For ranked skills: respects rank cap per realm
 * @param {string} skillId - Skill ID
 * @param {number} maxQty - Maximum quantity to consider
 * @param {number} budgetQi - Available Qi budget
 * @returns {number} Maximum affordable ranks (0 if none)
 */
function maxAffordableQty(skillId, maxQty, budgetQi) {
  if (budgetQi <= 0 || maxQty <= 0) return 0;
  
  const sk = getSkill(skillId);
  
  // One-time techniques: either 0 or 1
  if (sk.oneTime) {
    return budgetQi >= sk.cost ? 1 : 0;
  }
  
  // Ranked skills: enforce cap
  const currentRanks = currentRealmRanks(skillId);
  const cap = sk.ranksPerRealm;
  const maxPossible = Math.min(maxQty, cap - currentRanks);
  
  if (maxPossible <= 0) return 0;
  
  const lnBudget = ln(Math.max(1, budgetQi));
  
  // Binary search for maximum affordable quantity
  let lo = 0;
  let hi = maxPossible;
  
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const lnCost = lnTotalCost(sk, currentRanks, mid);
    
    // Overflow guard: if cost would exceed LOG_MAX, it's too expensive
    if (!Number.isFinite(lnCost) || lnCost > LOG_MAX) {
      hi = mid - 1;
    } else if (lnCost <= lnBudget) {
      lo = mid; // Can afford this many, try more
    } else {
      hi = mid - 1; // Too expensive, try fewer
    }
  }
  
  return lo;
}

/**
 * Buy skill ranks or technique with bulk support and overflow safety
 * @param {string} skillId - Skill ID
 * @param {number} requestedQty - Requested quantity (ignored for techniques)
 * @returns {boolean} True if purchase succeeded
 */
function buySkill(skillId, requestedQty = 1) {
  const sk = getSkill(skillId);
  if (!sk) return false;
  
  // One-time techniques
  if (sk.oneTime) {
    if (isTechniquePurchased(skillId)) return false; // Already purchased
    if (S.qi < sk.cost) return false; // Can't afford
    
    S.qi -= sk.cost;
    purchaseTechnique(skillId);
    unlockAchievement('first_technique');
    renderAll();
    return true;
  }
  
  // Ranked skills with cap enforcement
  requestedQty = Math.max(1, Math.floor(requestedQty));
  const budget = S.qi;
  const affordable = maxAffordableQty(skillId, requestedQty, budget);
  
  if (affordable <= 0) return false;
  
  const cost = totalSkillCost(skillId, affordable);
  
  // Safety: Never proceed if cost is NaN or Infinity
  if (!Number.isFinite(cost)) {
    if (DEBUG_MODE) {
      console.error(`[Bulk Buy] Cost overflow detected for ${skillId} × ${affordable}`);
    }
    return false;
  }
  
  // Double-check affordability
  if (cost > budget) return false;
  
  // Execute purchase atomically
  S.qi -= cost;
  addRealmRank(skillId, affordable);
  
  // Safety: Ensure Qi remains finite
  S.qi = safeNum(S.qi, 0);
  
  // Track for achievements
  achievementState.totalPurchases += affordable;
  
  // Update UI
  renderAll();
  
  // Show feedback if bought less than requested
  if (affordable < requestedQty && DEBUG_MODE) {
    console.log(`[Bulk Buy] Bought ${affordable}/${requestedQty} levels of ${skillId} (cost: ${fmt(cost)})`);
  }
  
  return true;
}

/**
 * Calculate and format bulk purchase preview with overflow safety
 * @param {string} skillId - Skill ID
 * @param {number} qty - Quantity to preview
 * @returns {object} Preview data {cost, affordable, canAfford, formattedCost}
 */
function previewBulkCost(skillId, qty) {
  const totalCost = totalSkillCost(skillId, qty);
  const affordable = maxAffordableQty(skillId, qty, S.qi);
  const canAfford = affordable >= qty;
  
  // Safety: Handle infinite/NaN costs gracefully
  const safeFormattedCost = Number.isFinite(totalCost) ? fmt(totalCost) : '∞';
  
  return {
    cost: totalCost,
    affordable: affordable,
    canAfford: canAfford,
    formattedCost: safeFormattedCost
  };
}

// In-memory storage for last selected bulk multiplier (per session only)
let lastBulkMultiplier = 1;

/**
 * Get the last used bulk multiplier
 */
function getLastBulkMultiplier() {
  return lastBulkMultiplier;
}

/**
 * Set the bulk multiplier for session
 */
function setLastBulkMultiplier(mult) {
  const safeMult = Math.max(1, Math.min(MAX_RANKS_PER_REALM, Math.floor(Number(mult) || 1)));
  lastBulkMultiplier = safeMult;
}

// ============= REALM-SCALED SKILL SYSTEM =============
// NOTE: Primary skillRealmScale() and effectiveSkillBase() are defined above (lines ~1641/~1686)
// using SKILL_SCALING constants with karma/cycle multipliers. Do NOT redefine them here.

/**
 * Get the skill type/kind from balance.json
 * @param {string} id - Skill ID
 * @returns {string} Skill type (e.g., 'qps_flat', 'qpc_flat', 'qps_pct', 'qpc_pct', 'offline_pct')
 */
function getKind(id) {
  return BAL.skills[id]?.type || 'qps_flat';
}

/**
 * Calculate per-level effect for a skill (type-preserving)
 * Additive skills return flat numbers (e.g., +5.2 Qi/s per level)
 * Percent skills return small fractions (e.g., 0.015 = +1.5% per level)
 * @param {string} id - Skill ID
 * @returns {number} Effect per level (flat or percent fraction)
 */
function perLevelEffect(id) {
  const base = BAL.skills[id]?.base || 0;
  const scale = skillRealmScale(S.realmIndex);
  const kind = getKind(id);
  
  if (kind === 'qps_add' || kind === 'qpc_add') {
    // Additive skills: stays flat across all realms
    return base * scale;
  }
  
  // Percent skills: clamp to 0-2% per level to prevent explosion
  // If balance.json bases are like 0.25, divide by 100; else just clamp
  const pct = Math.min(0.02, (base * scale) / 100);
  return Math.max(0, pct);
}

/**
 * Apply diminishing returns to percentage-based skills (late-game)
 * @param {number} perLevelPct - Percentage per level (e.g., 0.015 = 1.5%)
 * @param {number} L - Skill level
 * @returns {number} Total percentage with DR (capped at +150% from single skill)
 */
function percentWithDR(perLevelPct, L) {
  if (L <= 0) return 0;
  const raw = perLevelPct * L;
  const dr = Math.pow(raw, 0.9);  // Soft cap exponent
  return Math.min(dr, 1.5);        // Hard cap at +150%
}

// effectiveSkillBase() is defined above (~line 1686) with full karma/cycle factors.
// Do NOT redefine it here.

/**
 * DEPRECATED: Determine skill tier (kept for compatibility, not used in calculations)
 * Use getKind(id) instead for behavior determination
 * @param {string} id - Skill ID
 * @returns {number} Cosmetic tier (1, 2, or 3)
 */
function skillTier(id) {
  const r = S.realmIndex;
  if (r < idx('golden_core')) return 1;
  if (r < idx('nirvana_scryer')) return 2;
  if (r < idx('dao_source_realm')) return 3;
  return 4;
}

/**
 * Calculate skill's effective contribution value (kind-based, type-preserving)
 * Additive skills: returns flat value (e.g., +52.3 Qi/s total)
 * Percent skills: returns fraction with DR (e.g., 0.27 = +27% total)
 * @param {string} id - Skill ID
 * @param {number} level - Skill level
 * @returns {number} Total effect (flat or percent fraction)
 */
function skillEffectValue(id, level) {
  if (level <= 0) return 0;
  
  const kind = getKind(id);
  const per = perLevelEffect(id);
  
  if (kind === 'qps_add' || kind === 'qpc_add') {
    // Additive: flat multiplication (stays flat forever)
    return per * level;
  }
  
  // Percent kinds: apply DR to prevent runaway growth
  return percentWithDR(per, level);
}

// Get skill base effectiveness (DEPRECATED - use effectiveSkillBase instead)
// Kept for compatibility with old code references
// DEPRECATED: Old reincarnation bonus (replaced by karmaQiMult soft cap)
// Kept for compatibility with old code references
function reincBonus(){
  return karmaQiMult(S.reinc.karma);
}

// DEPRECATED: Old karma-based stage requirement reduction
// Replaced by karmaStageMult soft cap
// Manual reincarnation becomes available after the cultivator has crossed the First-Step world boundary.
function canReincarnate(){
  const hasCrossedBoundary = !!(S.flags?.hasLeftMortalWorld || S.flags?.unlockedBeyondSpirit || S.flags?.hasCompletedMandatoryST10);
  return hasCrossedBoundary && S.realmIndex >= idx('ascendant');
}

// Calculate karma gain from reincarnation with cycle multipliers
function computeKarmaGain(){
  const safeLifetimeQi = safeNum(S.reinc.lifetimeQi, 0);
  const safeDivisor = safeNum(BAL.reincarnation.lifetimeQiDivisor, 1000);
  const base = Math.floor(Math.sqrt(safeLifetimeQi / safeDivisor));
  const realmBonus = S.realmIndex * BAL.reincarnation.realmKarmaFactor;
  
  // Higher-world cultivators receive a larger karma multiplier
  const cycleMultiplier = S.currentCycle === 'spirit' ? 2 : 1;
  
  const totalGain = (base + realmBonus) * cycleMultiplier;
  return Math.max(BAL.reincarnation.minKarma, totalGain);
}

// Voluntary reincarnation: full karma
function computeVoluntaryKarma(){
  return Math.max(BAL.reincarnation.minKarma, computeKarmaGain());
}

// Death reincarnation: reduced karma (configurable penalty)
function computeDeathKarma(){
  const deathPenalty = BAL.reincarnation.deathPenalty || 0.5;
  return Math.max(BAL.reincarnation.minKarma, Math.floor(computeKarmaGain() * deathPenalty));
}

// Perform reincarnation with mode ('voluntary', 'death', or 'mandatory')
function doReincarnate(options = {}){
  const mode = options.mode || 'voluntary'; // 'voluntary', 'death', 'mandatory'
  
  // Debug assertion for development mode
  debugAssertReincarnationRate();
  
  // Set reincarnation guard
  if(S.lifecycle) {
    S.lifecycle.isReincarnating = true;
    S.lifecycle.lastReincarnateAt = Date.now();
  }
  
  // Compute karma gain based on mode
  let gain;
  if (mode === 'death') {
    gain = computeDeathKarma();
  } else {
    gain = computeVoluntaryKarma();
  }
  
  // Preserve old state for logic checks (use ID-based lookup for Soul Formation)
  const ASCENDANT_INDEX = idx('ascendant');
  const wasAtAscendant10 = S.realmIndex === ASCENDANT_INDEX && S.stage === STAGES_PER_REALM;
  const oldReinc = { ...S.reinc };
  const oldFlags = { ...S.flags };
  const oldMeta = { ...S.meta }; // Preserve meta (persistent unlocks)
  const oldStats = { ...(S.stats || {}) }; // Death statistics are lifetime totals
  
  // Add karma and increment reincarnation count
  const newKarma = oldReinc.karma + gain;
  const newTimes = oldReinc.times + 1;
  
  // Reset to default state
  S = defaultState();
  
  // Restore persistent data
  S.reinc = { times: newTimes, karma: newKarma, lifetimeQi: 0 };
  S.flags = { ...oldFlags }; // Preserve all flags
  S.flags.hasCompletedDaoPath = false; // A new life may complete the path again
  S.flags.daoCompletionChoicePending = false;
  S.meta = { ...oldMeta };   // Preserve meta (time-speed unlocks, etc.)
  S.stats = oldStats; // Voluntary reincarnation must not erase lifetime deaths
  
  // Compatibility path for legacy mandatory-mode saves
  if (mode === 'mandatory' && wasAtAscendant10) {
    S.flags.hasCompletedMandatoryST10 = true;
    S.flags.hasUnlockedSpiritCycle = true;
    S.flags.hasLeftMortalWorld = true;
    S.flags.canManualReincarnate = true;
    S.flags.unlockedBeyondSpirit = true;
    
    // Track achievement
    unlockAchievement('break_mortal_shackles');
    achievementState.cycleTransitions = (achievementState.cycleTransitions || 0) + 1;
  }
  
  // Track achievements based on mode
  if (mode === 'voluntary') {
    if(!achievementState.voluntaryReincarnations) {
      achievementState.voluntaryReincarnations = 0;
    }
    achievementState.voluntaryReincarnations++;
    
    if(achievementState.voluntaryReincarnations === 1) {
      unlockAchievement('first_voluntary_reincarnation');
    }
  } else if (mode === 'death') {
    // Death reincarnation now handled by handleDeathReincarnate()
    // This branch shouldn't be reached anymore but kept for safety
    S.stats.deaths = (S.stats.deaths || 0) + 1;
    
    unlockAchievement('death_and_return');
    if(!achievementState.forcedReincarnationCount) {
      achievementState.forcedReincarnationCount = 0;
    }
    achievementState.forcedReincarnationCount++;
  }
  
  // Reset age and lifespan properly
  S.age = 0; // Reset age to 0 for new life
  if(S.ageYears !== undefined) delete S.ageYears; // Clean up old field
  S.isDead = false;
  S.life = { isCleanRun: true }; // New life starts clean
  S.flags.lifespanHandled = false; // Reset latch for new life
  S.lastTick = now(); // Reset timing
  
  // Always start at Qi Condensation (realm 0) Stage 1 after reincarnation
  S.realmIndex = 0;
  S.stage = 1;
  S.currentCycle = 'mortal';
  
  // Refresh lifespan for starting realm
  refreshLifespanForRealm();
  
  // Update cycle
  updateCurrentCycle();
  
  // Clear reincarnation guard and unpause
  if(S.lifecycle) {
    S.lifecycle.isReincarnating = false;
  }
  S.timeSpeed.paused = false;
  
  renderAll();
  save();
  
  // Show the appropriate result modal for the reincarnation mode.
  const karmaGained = gain.toFixed(2);
  const totalKarma = S.reinc.karma.toFixed(2);

  const showResultModal = () => {
    if (mode === 'mandatory') {
      showModal('🌟 Transcendence Achieved', 
        `<span class="highlight">You have broken the shackles of mortality!</span><br><br>
        Your next life begins at Qi Condensation, while your passage beyond the Mortal World remains permanently unlocked.<br><br>
        <strong>Voluntary reincarnation is now available</strong> once you return to Ascendant or a higher realm.<br><br>
        <div class="highlight">+${karmaGained} Karma gained (Total: ${totalKarma})</div>`, '🦋');
    } else if (mode === 'death') {
      showModal('☠️ Death and Rebirth', 
        `<span style="color: var(--danger);">Your mortal body has withered. You failed to transcend before death.</span><br><br>
        <strong>Reduced Karma:</strong> ${karmaGained} Karma gained (50% penalty)<br>
        <strong>Total Karma:</strong> ${totalKarma}<br><br>
        <em>Cross the First-Step boundary again to unlock voluntary reincarnation in this life.</em>`, '💀');
    } else {
      showModal('♻️ Reincarnation Complete', 
        `The wheel of reincarnation turns, and you begin anew with greater wisdom.<br><br>
        <div class="highlight">+${karmaGained} Karma gained (Total: ${totalKarma})</div><br>
        Your accumulated karma will enhance your cultivation speed.`, '🔄');
    }
  };

  showResultModal();
}

// Wrapper functions for specific reincarnation types
function tryManualReincarnate(){
  if(!canReincarnate()) {
    if(!S.flags?.hasCompletedMandatoryST10) {
      showModal('🔒 Reincarnation Locked', 
        `<strong>Unlock Condition:</strong> Cross the Mortal World boundary at Ascendant · Void Returning, Stage 10.<br><br>
        After that first crossing, voluntary reincarnation becomes available at Ascendant and all higher realms, without being forced on you.`, '⚠️');
    } else {
      showModal('🔒 Wrong Realm or Stage', 
        `Voluntary reincarnation is available at <strong>Ascendant or any higher realm</strong> after crossing the world boundary.<br><br>
        Current: ${realms[S.realmIndex]?.name || 'Unknown'} Stage ${S.stage}`, '⚠️');
    }
    return;
  }
  
  showConfirm(
    '♻️ Voluntary Reincarnation',
    `Reincarnate now and retain <strong>full Karma</strong>. Your next life will begin stronger.<br><br>
    You will return to Qi Condensation Stage 1, but all achievements and unlocks will be preserved.<br><br>
    <em style="color: var(--muted);">Note: Voluntary reincarnation will end your current life run.</em>`,
    () => {
      // Mark this life as no longer clean (reincarnated before natural death)
      if(S.life) S.life.isCleanRun = false;
      doReincarnate({ mode: 'voluntary' });
    },
    null,
    '🔄'
  );
}

function handleDeathReincarnate(){
  // DEPRECATED - replaced by performDeathReincarnation in async flow
  // This function is kept for backwards compatibility
  // It should not be called anymore - handleLifespanEnd handles everything
  console.warn('handleDeathReincarnate called - this is deprecated, use handleLifespanEnd instead');
}

// Lifespan management functions
function getMaxLifespan(realmIndex = null){
  const requestedIndex = Number(realmIndex !== null ? realmIndex : S.realmIndex);
  const index = Number.isFinite(requestedIndex)
    ? Math.max(0, Math.min(realms.length - 1, Math.floor(requestedIndex)))
    : 0;
  const maxFromConfig = BAL.lifespan?.realmMaxLifespan?.[index];
  if (maxFromConfig === null || maxFromConfig === undefined) return null;
  if (typeof maxFromConfig !== 'number' || !Number.isFinite(maxFromConfig) || maxFromConfig <= 0) {
    return null;
  }

  // Configured lifespan values are the exact limits for each realm.
  // Karma affects other systems, but does not alter the specified age caps.
  return maxFromConfig;
}

function isImmortal(){
  return getMaxLifespan() === null;
}

/**
 * Refresh lifespan when realm changes
 * Called after breakthrough and reincarnation to ensure lifespan matches current realm
 */
function refreshLifespanForRealm() {
  const max = getMaxLifespan();
  if (max === null) {
    // Third Step and beyond are immortal: normalize the complete display state,
    // even when a save/import carries a stale finite lifespan from an older realm.
    S.lifespan = { current: null, max: null };
    S.age = 0;
    if (S.flags) S.flags.lifespanHandled = false;
    return;
  }

  // The realm table is authoritative. Never trust a saved `lifespan.max` or
  // `lifespan.current`: both can be stale after imports or balance adjustments.
  const rawAge = Number(S.age);
  const age = Number.isFinite(rawAge) ? Math.min(max, Math.max(0, rawAge)) : 0;
  S.age = age;
  S.lifespan = { current: Math.max(0, max - age), max };
  if (S.flags) S.flags.lifespanHandled = age >= max;
}

function updateLifespanOnRealmAdvance(){
  const newMax = getMaxLifespan();
  if(newMax === null) {
    // Ancestor Realm - set infinite lifespan
    S.lifespan.max = null;
    S.lifespan.current = null;
    S.age = 0; // Reset age for immortals
  } else {
    S.lifespan.max = newMax;
    S.lifespan.current = newMax; // fully restore lifespan on realm advancement
    S.age = 0; // Reset age to 0 when advancing realm
  }
  
  // Reset lifespan latch when advancing realms
  if(S.flags) {
    S.flags.lifespanHandled = false;
  }
}

/**
 * Age progression system - ticks age forward based on speed-adjusted dt
 * @param {number} dt - Already includes time speed multiplier (rawDt × speed)
 * 
 * IMPORTANT: dt is pre-multiplied by speed in loop()
 * This function does NOT read S.timeSpeed.current
 */
function tickLifespan(dt){
  // Guard: don't age if paused, dead, or no lifespan data
  if(S.timeSpeed?.paused || !S.lifespan || S.isDead) return;
  
  // Guard: Ancestor Realm realm has infinite lifespan - no aging
  if(isImmortal()) return;
  
  // Guard: don't tick during reincarnation process
  if(S.lifecycle?.isReincarnating) return;
  
  // Guard: protect against negative dt (clock changes, sleep, etc.)
  const safeDt = Math.max(0, dt);
  if(safeDt === 0) return;
  
  // Calculate aging rate: dt (already speed-adjusted) × yearsPerSecond
  // dt already includes time speed multiplier from loop()
  const baseYearsPerSecond = BAL.lifespan?.yearsPerSecond || 1.0;
  const agingRate = safeDt * baseYearsPerSecond;
  
  // Migrate old ageYears to age if needed
  if(S.ageYears !== undefined && S.age === undefined) {
    S.age = S.ageYears;
    delete S.ageYears;
  }
  
  // Initialize age if missing
  if(!S.age || !isFinite(S.age)) {
    S.age = 0;
  }
  
  // Apply aging
  const newAge = S.age + agingRate;
  
  // Guard: prevent NaN/Infinity
  if(!isFinite(newAge)) {
    console.warn('Age calculation resulted in non-finite value, keeping previous age');
    return;
  }
  
  // Get the exact configured lifespan for this realm
  const maxLifespan = getMaxLifespan();
  
  // Clamp age to [0, maxLifespan]
  if(maxLifespan !== null) {
    S.age = Math.max(0, Math.min(newAge, maxLifespan));
  } else {
    S.age = Math.max(0, newAge); // Infinite lifespan, just prevent negative
  }
  
  // Update lifespan.current for backwards compatibility (max - age)
  if(S.lifespan.max !== null) {
    S.lifespan.current = Math.max(0, S.lifespan.max - S.age);
  }
  
  // Check for death ONCE per life using latch flag
  if(maxLifespan !== null && S.age >= maxLifespan && !S.flags.lifespanHandled){
    S.flags.lifespanHandled = true; // Set latch to prevent duplicate popups
    handleLifespanEnd();
    return; // Exit early after triggering death
  }
}

// Death handling guard to prevent duplicate popups
let isHandlingDeath = false;

async function handleLifespanEnd(){
  // Prevent multiple simultaneous death triggers (debounce)
  if(isHandlingDeath || S.lifecycle?.isReincarnating || S.isDead) return;
  
  isHandlingDeath = true;
  
  try {
    // Set death flag and reincarnation guard immediately
    S.isDead = true;
    S.lifecycle.isReincarnating = true;
    S.lifecycle.lastDeathAt = Date.now();
    
    // PAUSE THE GAME - set speed to 0
    S.timeSpeed.current = 0;
    S.timeSpeed.paused = true;
    
    // Get current age (migrate from ageYears if needed)
    const currentAge = S.age !== undefined ? S.age : (S.ageYears || 0);
    
    // Compute death karma before showing modal
    const gain = computeDeathKarma();
    const gainFormatted = fmt(gain);
    const ageFormatted = fmtYears(currentAge);

    // Show single death modal and wait for user to dismiss it
    await ModalManager.alert({
      title: '☠️ Your Candle Has Burned Out',
      body: `<span style="color: var(--danger);">Your mortal body has withered after ${ageFormatted}.</span><br><br>
        <strong>Karma Gained:</strong> <span class="highlight">${gainFormatted} Karma</span> (50% death penalty)<br><br>
        <em>You will be reborn into a new life...</em>`,
      confirmText: 'Begin Again',
      icon: '💀'
    });
    
    // Perform reincarnation ONCE after modal is dismissed
    await performDeathReincarnation(gain);
    
  } finally {
    isHandlingDeath = false;
    // Latch flag is reset in reincarnation function
  }
}

async function performDeathReincarnation(karmaGain) {
  // Increment deaths counter (deaths do NOT count as reincarnations)
  S.stats = S.stats || {};
  S.stats.deaths = (S.stats.deaths || 0) + 1;
  
  // Apply karma gain
  const newKarma = (S.reinc?.karma || 0) + karmaGain;
  // Death does not count as a voluntary/manual reincarnation
  const newTimes = (S.reinc?.times || 0); // Keep same count
  
  // Preserve meta-progression (flags, achievements already earned)
  const keepFlags = S.flags ? { ...S.flags } : {};
  const keepStats = { deaths: S.stats.deaths };
  const keepReinc = { times: newTimes, karma: newKarma, lifetimeQi: 0 };
  const keepMeta = S.meta ? { ...S.meta } : { unlockedSpeeds: [0, 0.5, 1] }; // Preserve meta (time-speed unlocks, etc.)
  
  // Full hard reset to default state
  S = defaultState();
  
  // Restore persistent meta-progression
  S.flags = keepFlags;
  S.flags.lifespanHandled = false; // Reset latch for new life
  S.stats = keepStats;
  S.reinc = keepReinc;
  S.meta = keepMeta; // Restore meta
  
  // Reset age and timing for new life
  S.age = 0;
  S.lastTick = now();
  
  // Initialize lifespan cleanly for new life
  const newMaxLifespan = getMaxLifespan(0); // Qi Condensation base lifespan
  if(newMaxLifespan === null) {
    S.lifespan = { current: null, max: null };
  } else {
    const validLifespan = safeNum(newMaxLifespan, 100);
    S.lifespan = { current: validLifespan, max: validLifespan };
  }
  S.isDead = false;
  S.life = { isCleanRun: true }; // New life, no reincarnations yet
  
  // Reset timing and ensure time is NOT paused
  S.lastTick = now();
  S.timeSpeed = S.timeSpeed || {};
  S.timeSpeed.paused = false; // Explicitly unpause
  S.timeSpeed.current = 1; // Reset to normal speed
  
  // Track achievement for death reincarnation
  unlockAchievement('death_and_return');
  if(!achievementState.forcedReincarnationCount) {
    achievementState.forcedReincarnationCount = 0;
  }
  achievementState.forcedReincarnationCount++;
  
  // Clear reincarnation guard
  S.lifecycle.isReincarnating = false;
  
  // Full UI refresh and save
  renderAll();
  save();
  
  // NO second modal - user has already been informed
}

// ============= TIME SPEED SYSTEM =============

/**
 * Progressive time speed configuration with realm-gated unlocks
 * Uses realm IDs (not indices) for robust unlock conditions
 * Unlock progression: one new speed every 2 realms
 */
const SPEEDS_CONFIG = [
  { speed: 0,    unlockAt: 'qi_condensation' },
  { speed: 0.25, unlockAt: 'qi_condensation' },
  { speed: 0.5,  unlockAt: 'qi_condensation' },
  { speed: 1,    unlockAt: 'qi_condensation' },
  { speed: 2,    unlockAt: 'foundation_establishment' },
  { speed: 4,    unlockAt: 'soul_formation' },
  { speed: 6,    unlockAt: 'nirvana_cleanser' },
  { speed: 8,    unlockAt: 'arcane_void' },
  { speed: 10,   unlockAt: 'dao_source_realm' }
];

/**
 * Base speeds that are always available, regardless of realm
 * These are injected unconditionally and never rely on unlock arrays
 */
const BASE_SPEEDS_ALWAYS_AVAILABLE = [0, 0.25, 0.5, 1];

/**
 * Validate and initialize time speed system
 * Ensures base speeds exist and S.meta.unlockedSpeeds is properly initialized
 * Called at boot and after loadBalance()
 */
function validateTimeSpeedSystem() {
  // Initialize meta.unlockedSpeeds if missing
  if (!S.meta?.unlockedSpeeds || !Array.isArray(S.meta.unlockedSpeeds)) {
    if (!S.meta) S.meta = {};
    S.meta.unlockedSpeeds = [...BASE_SPEEDS_ALWAYS_AVAILABLE];
  }
  
  // Inject base speeds unconditionally (never rely on unlock arrays for these)
  BASE_SPEEDS_ALWAYS_AVAILABLE.forEach(speed => {
    if (!S.meta.unlockedSpeeds.includes(speed)) {
      S.meta.unlockedSpeeds.push(speed);
    }
  });
  
  // De-duplicate and sort
  S.meta.unlockedSpeeds = [...new Set(S.meta.unlockedSpeeds)].sort((a, b) => a - b);
  
  if (DEBUG_MODE) {
    console.log('[Time Speed] Initialized with speeds:', S.meta.unlockedSpeeds);
  }
}

// Time speed management functions
function getAvailableSpeeds(){
  // Return permanently unlocked speeds from meta
  // Ensure system is initialized
  if(!S.meta?.unlockedSpeeds || !Array.isArray(S.meta.unlockedSpeeds)) {
    return [...BASE_SPEEDS_ALWAYS_AVAILABLE]; // Fallback base speeds
  }
  
  // Always inject base speeds (defensive - should be done by validateTimeSpeedSystem)
  const speeds = [...S.meta.unlockedSpeeds];
  BASE_SPEEDS_ALWAYS_AVAILABLE.forEach(speed => {
    if (!speeds.includes(speed)) speeds.push(speed);
  });
  
  // Sort and de-duplicate
  return [...new Set(speeds)].sort((a, b) => a - b);
}

// Check if new speeds should be unlocked based on realm progression
function checkAndUnlockSpeeds(){
  // Use SPEEDS_CONFIG for ID-driven unlocks
  SPEEDS_CONFIG.forEach(config => {
    const requiredRealmIndex = idx(config.unlockAt);
    
    // Skip if realm ID not found
    if (requiredRealmIndex === -1) {
      if (DEBUG_MODE) {
        console.warn(`[Time Speed] Unknown realm ID: ${config.unlockAt}`);
      }
      return;
    }
    
    // Check if player has reached required realm
    if (S.realmIndex >= requiredRealmIndex && !S.meta.unlockedSpeeds.includes(config.speed)) {
      S.meta.unlockedSpeeds.push(config.speed);
      
      // Show unlock notification (skip base speeds)
      if (!BASE_SPEEDS_ALWAYS_AVAILABLE.includes(config.speed)) {
        showSpeedUnlockToast(config.speed);
      }
      
      if (DEBUG_MODE) {
        console.log(`[Time Speed] Unlocked ${config.speed}× at ${realms[S.realmIndex].name}`);
      }
    }
  });
  
  // Always ensure base speeds are present (defensive)
  BASE_SPEEDS_ALWAYS_AVAILABLE.forEach(speed => {
    if (!S.meta.unlockedSpeeds.includes(speed)) {
      S.meta.unlockedSpeeds.push(speed);
    }
  });
  
  // De-duplicate and sort
  S.meta.unlockedSpeeds = [...new Set(S.meta.unlockedSpeeds)].sort((a, b) => a - b);
}

/**
 * Show a toast notification when a new time speed is unlocked
 */
function showSpeedUnlockToast(speed) {
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="achievement-toast-icon">⏱️</div>
    <div class="achievement-toast-content">
      <div class="achievement-toast-title">Time Speed Unlocked!</div>
      <div class="achievement-toast-desc">You can now accelerate time to ${speed}×</div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Trigger show animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function setTimeSpeed(speed){
  const availableSpeeds = getAvailableSpeeds();
  
  // If requested speed is not available, fallback to 1×
  if(!availableSpeeds.includes(speed)) {
    speed = 1; // Default fallback
  }
  
  if(speed === 0){
    S.timeSpeed.paused = true;
    S.timeSpeed.current = 0;
  } else {
    S.timeSpeed.paused = false;
    S.timeSpeed.current = speed;
  }
  
  renderTimeSpeed();
  checkAchievementsThrottled({}, true);
}

/**
 * CENTRALIZED TIME SPEED GETTER - Single source of truth
 * Returns the current time speed multiplier (0, 0.5, 1, 2, 4, 6, 8, 10...)
 * Use this everywhere for consistent time scaling
 */
function getTimeSpeed() {
  return S.timeSpeed.paused ? 0 : S.timeSpeed.current;
}

/**
 * DEPRECATED: Returns 1 to prevent time speed from affecting Qi gains
 * Time speed affects ONLY lifespan aging, never Qi/QPS/QPC
 */
function getCurrentTimeMultiplier(){
  return 1;
}

function canBreakthrough(requirement = stageRequirement(S.realmIndex, S.stage)) {
  const isCompletedFinalStage = S.realmIndex === realms.length - 1 &&
    S.stage === STAGES_PER_REALM && !!S.flags?.hasCompletedDaoPath;
  return !isCompletedFinalStage && S.qi >= requirement;
}

function doBreakthrough(){
  // Remaining in eternal meditation must not repeatedly spend Qi or reopen the ending.
  if (S.realmIndex === realms.length - 1 && S.stage === STAGES_PER_REALM && S.flags?.hasCompletedDaoPath) return;
  const req = stageRequirement(S.realmIndex, S.stage);
  if (S.qi < req) return;

  // The First-Step summit is a world boundary, not a reincarnation gate.
  if (S.realmIndex === idx('ascendant') && S.stage === STAGES_PER_REALM && !S.flags?.hasLeftMortalWorld) {
    showSpiritTransformationGate();
    return;
  }

  S.qi -= req;
  if (S.stage < STAGES_PER_REALM) {
    S.stage++;
  } else if (S.realmIndex === realms.length - 1) {
    triggerCycleTransition();
  } else {
    const previousRealm = S.realmIndex;
    S.realmIndex++;
    S.stage = 1;
    S.qpcBase += BAL.progression.realmAdvanceReward.qpcBaseAdd;
    S.qpsBase += BAL.progression.realmAdvanceReward.qpsBaseAdd;
    enforceQiRefiningQpsBaseline();
    updateLifespanOnRealmAdvance();
    updateCurrentCycle();
    checkAndUnlockSpeeds();

    const enteredStep = realms[S.realmIndex]?.step;
    if (realms[previousRealm]?.step !== enteredStep) {
      const stepMeta = REALM_STEPS.find(step => step.number === enteredStep);
      setTimeout(() => showModal(`${stepMeta?.name || 'New Step'} — ${stepMeta?.subtitle || ''}`, stepMeta?.description || 'A new stage of cultivation begins.', '☯️'), 350);
    }
  }
  renderAll();
}

function tick(rawDt, speed){
  // Guard: no progress when paused (0× speed)
  if(speed === 0) return;
  
  // Guard against ticking during reincarnation process
  if(S.lifecycle?.isReincarnating) return;
  
  // Guard against ticking while death modal is being handled
  if(isHandlingDeath) return;
  
  // QI GAINS: Use raw dt (real elapsed time), NO speed multiplication
  // Time speed does NOT affect Qi accumulation rate
  const qps = totalQPS();
  const gain = qps * rawDt; // No speed factor, no turbo - pure wall-clock time
  
  safeAddQi(gain);
  S.reinc.lifetimeQi = Math.min(1e300, Math.max(0, safeNum(S.reinc.lifetimeQi, 0) + Math.max(0, gain)));
  
  // LIFESPAN AGING: Apply time speed multiplier
  // Time speed affects ONLY aging, making you age faster/slower
  const dtForLifespan = rawDt * speed;
  tickLifespan(dtForLifespan);
  
  // Check for lifespan gate after aging
  checkLifespanGate();
  
  // Exit early if death was triggered during lifespan tick
  if(S.lifecycle?.isReincarnating) return;
}

function onClick(){
  if (!gameActive) return;
  if (getTimeSpeed() === 0 || S.lifecycle?.isReincarnating) return;

  const gain = totalQPC();
  safeAddQi(gain);
  S.reinc.lifetimeQi = Math.min(1e300, Math.max(0, safeNum(S.reinc.lifetimeQi, 0) + Math.max(0, gain)));
  achievementState.totalClicks++;
  checkAchievementsThrottled();
  flashNumber('+' + fmt(gain));

  const host = clickBtn;
  if (host) {
    host.classList.remove('pulse');
    requestAnimationFrame(() => host.classList.add('pulse'));
  }
}

function flashNumber(text){
  const host = clickBtn;
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'qi-float';
  el.textContent = text;
  el.style.left = `calc(50% + ${Math.random() * 30 - 15}px)`;
  el.style.top = '35%';
  host.appendChild(el);
  requestAnimationFrame(() => {
    el.classList.add('qi-float-visible');
  });
  window.setTimeout(() => el.remove(), 850);
}

