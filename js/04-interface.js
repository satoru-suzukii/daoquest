/* Game UI, menu flow, rendering, shop interactions, and developer simulator. */

// ============= UI RENDERING & INITIALIZATION =============

// (Opcional pero recomendado) permitir activar con Enter/Espacio
const cultivatorEl = document.getElementById('clickBtn');
cultivatorEl.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter' || e.key === ' '){
    e.preventDefault();
    onClick();
  }
});


function save(){
  if (!initComplete || !gameActive || !activeSlot) return false;
  try {
    saveSessionSnapshot();
    S.version = VERSION;
    S.realmSystemVersion = REALM_SYSTEM_VERSION;
    S.lastSave = now();
    localStorage.setItem(getSaveKeyForSlot(), JSON.stringify(S));
    saveAchievementState();
    updateLastSave();
    refreshMainMenuSlots();
    return true;
  } catch (e) {
    console.error('Failed to save game state:', e);
    return false;
  }
}

/**
 * Shared state migration - ensures all required fields exist with safe defaults.
 * Called from both load() and importSave() to eliminate code duplication.
 * @param {Object} data - Raw save data object (mutated in place)
 */
function migrateRealmSystem(data) {
  if (!data || typeof data !== 'object') return;
  if (Number(data.realmSystemVersion) >= REALM_SYSTEM_VERSION) {
    data.realmIndex = Math.max(0, Math.min(realms.length - 1, Math.floor(Number(data.realmIndex) || 0)));
    data.stage = Math.max(1, Math.min(STAGES_PER_REALM, Math.floor(Number(data.stage) || 1)));
    return;
  }

  const oldIndexRaw = Math.max(0, Math.floor(Number(data.realmIndex) || 0));
  const oldStage = Math.max(1, Math.min(STAGES_PER_REALM, Math.floor(Number(data.stage) || 1)));
  const isPreMortalSave = !data.migratedToMortalRealm;
  // Before v1.2, the old ladder had no separate Mortal Realm. The original
  // migration inserted that realm at index 0; reproduce that normalization
  // before mapping the old 11-slot layout into the new five-step hierarchy.
  const oldIndex = isPreMortalSave && (oldIndexRaw > 0 || oldStage > 1)
    ? Math.min(oldIndexRaw + 1, 10) : oldIndexRaw;
  const legacyMap = [0, 0, 1, 2, 3, 4, 7, 8, 9, 10, 11];
  const mappedIndex = legacyMap[Math.min(oldIndex, legacyMap.length - 1)] ?? 0;
  data.realmIndex = Math.min(realms.length - 1, mappedIndex);
  data.stage = oldStage;

  // Skill ranks and session snapshots use the same index conversion. For
  // pre-v1.2 saves, indices after the original starter realm need the same +1
  // insertion that the legacy save loader applied to the current realm.
  const remapLegacyIndex = (rawIndex) => {
    const sourceIndex = Math.max(0, Math.min(legacyMap.length - 1, Math.floor(Number(rawIndex) || 0)));
    const normalizedIndex = isPreMortalSave && sourceIndex > 0
      ? Math.min(sourceIndex + 1, legacyMap.length - 1)
      : sourceIndex;
    return legacyMap[normalizedIndex] ?? 0;
  };
  if (data.skills && typeof data.skills === 'object') {
    for (const skill of Object.values(data.skills)) {
      if (!skill || !skill.perRealm || typeof skill.perRealm !== 'object') continue;
      const remapped = {};
      for (const [key, value] of Object.entries(skill.perRealm)) {
        const newSkillIndex = remapLegacyIndex(key);
        remapped[newSkillIndex] = (Number(remapped[newSkillIndex]) || 0) + (Number(value) || 0);
      }
      skill.perRealm = remapped;
    }
  }
  if (data.session && Number.isFinite(Number(data.session.lastRealmIndex))) {
    data.session.lastRealmIndex = remapLegacyIndex(data.session.lastRealmIndex);
  }

  data.realmSystemVersion = REALM_SYSTEM_VERSION;
  data.migratedToMortalRealm = true;
  data._needsAchievementRevalidation = true;
  if (!data.flags) data.flags = {};
  const crossedBefore = !!(data.flags.unlockedBeyondSpirit || data.flags.hasUnlockedSpiritCycle || data.flags.hasCompletedMandatoryST10);
  if (crossedBefore) {
    data.flags.hasLeftMortalWorld = true;
    data.flags.unlockedBeyondSpirit = true;
    data.flags.hasUnlockedSpiritCycle = true;
    data.flags.hasCompletedMandatoryST10 = true;
    data.flags.canManualReincarnate = true;
  }
  if (data.realmIndex >= idx('nirvana_scryer')) {
    data.flags.hasLeftMortalWorld = true;
    data.flags.unlockedBeyondSpirit = true;
  }
  if (DEBUG_MODE) console.log(`[Migration] Realm system v2 mapped legacy realm ${oldIndexRaw} → ${data.realmIndex}.`);
}

function migrateState(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('Save data must be an object.');
  }

  if (!data.version) data.version = '0.0.0';
  migrateRealmSystem(data);

  // Preserve the existing migration paths, then repair every nested object from
  // current defaults so partially populated imports cannot leave undefined fields.
  const defaults = defaultState();
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (defaultValue && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
      if (!data[key] || typeof data[key] !== 'object' || Array.isArray(data[key])) {
        data[key] = JSON.parse(JSON.stringify(defaultValue));
      } else {
        data[key] = { ...defaultValue, ...data[key] };
      }
    } else if (data[key] === undefined || data[key] === null) {
      data[key] = defaultValue;
    }
  }

  // Legacy age field migration.
  if (data.age === undefined && data.ageYears !== undefined) data.age = data.ageYears;
  delete data.ageYears;

  // Keep rank-system migration for pre-rank saves.
  if (!data.migratedToRankSystem) {
    if (DEBUG_MODE) console.log('[Migration] Converting skills to rank-based system...');
    const oldSkills = data.skills && typeof data.skills === 'object' && !Array.isArray(data.skills)
      ? data.skills
      : {};
    const newSkills = {};
    const catalog = getSkillCatalog();
    const currentRealm = Math.max(0, Math.min(realms.length - 1, Math.floor(Number(data.realmIndex) || 0)));

    for (const [skillId, oldValue] of Object.entries(oldSkills)) {
      const skillDefinition = catalog.find(skill => skill.id === skillId);
      if (!skillDefinition) continue;
      if (skillDefinition.oneTime) {
        if (oldValue && (typeof oldValue !== 'object' || oldValue.purchasedOneTime !== false)) {
          newSkills[skillId] = { purchasedOneTime: true, total: 1, perRealm: {} };
        }
      } else {
        const level = Number(typeof oldValue === 'object' ? oldValue.total : oldValue);
        if (Number.isFinite(level) && level > 0) {
          newSkills[skillId] = {
            total: Math.floor(level),
            perRealm: { [currentRealm]: Math.floor(level) }
          };
        }
      }
    }
    data.skills = newSkills;
    data.migratedToRankSystem = true;
    if (DEBUG_MODE) console.log('[Migration] Rank system migration complete.');
  }

  // Repair skill records even when the save already claims to use the rank system.
  if (!data.skills || typeof data.skills !== 'object' || Array.isArray(data.skills)) data.skills = {};
  for (const [skillId, record] of Object.entries(data.skills)) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      const level = Number(record);
      data.skills[skillId] = Number.isFinite(level) && level > 0
        ? { total: Math.floor(level), perRealm: { [data.realmIndex]: Math.floor(level) } }
        : { total: 0, perRealm: {} };
      continue;
    }
    const total = Number(record.total);
    record.total = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
    if (!record.perRealm || typeof record.perRealm !== 'object' || Array.isArray(record.perRealm)) {
      record.perRealm = {};
    }
    const normalizedRanks = {};
    for (const [realmKey, rankValue] of Object.entries(record.perRealm)) {
      const realmNumber = Number(realmKey);
      const rank = Number(rankValue);
      if (!Number.isInteger(realmNumber) || realmNumber < 0 || realmNumber >= realms.length || !Number.isFinite(rank)) continue;
      normalizedRanks[realmNumber] = Math.max(0, Math.floor(rank));
    }
    record.perRealm = normalizedRanks;
    record.purchasedOneTime = !!record.purchasedOneTime;
  }

  // Realm and stage must always remain inside the configured hierarchy.
  data.realmIndex = Math.max(0, Math.min(realms.length - 1, Math.floor(Number(data.realmIndex) || 0)));
  data.stage = Math.max(1, Math.min(STAGES_PER_REALM, Math.floor(Number(data.stage) || 1)));

  // Numeric state is explicitly coerced and clamped. Number.isFinite alone does
  // not accept numeric strings found in some hand-edited or older JSON saves.
  const finite = (value, fallback, min = 0, max = 1e300) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  data.qi = finite(data.qi, 0);
  data.qpcBase = finite(data.qpcBase, defaults.qpcBase);
  data.qpsBase = finite(data.qpsBase, defaults.qpsBase);
  data.qpcMult = finite(data.qpcMult, 1, 0.000000001, 1e100);
  data.qpsMult = finite(data.qpsMult, 1, 0.000000001, 1e100);
  data.offlineMult = finite(data.offlineMult, 1, 0.000000001, 1e100);
  data.reinc.times = finite(data.reinc.times, 0, 0, Number.MAX_SAFE_INTEGER);
  data.reinc.times = Math.floor(data.reinc.times);
  data.reinc.karma = finite(data.reinc.karma, 0);
  data.reinc.lifetimeQi = finite(data.reinc.lifetimeQi, 0);
  data.age = finite(data.age, 0);
  data.lastTick = finite(data.lastTick, now(), 0, Number.MAX_SAFE_INTEGER);
  if (data.lastSave !== null) data.lastSave = finite(data.lastSave, null, 0, Number.MAX_SAFE_INTEGER);

  if (data.lifespan.max !== null) {
    data.lifespan.max = finite(data.lifespan.max, defaults.lifespan.max);
    data.lifespan.current = finite(data.lifespan.current, data.lifespan.max, 0, data.lifespan.max);
  } else {
    data.lifespan.current = null;
  }

  // Always preserve the base time-speed choices and discard malformed entries.
  const baseSpeeds = [0, 0.25, 0.5, 1];
  const savedSpeeds = Array.isArray(data.meta.unlockedSpeeds) ? data.meta.unlockedSpeeds : [];
  data.meta.unlockedSpeeds = [...new Set([
    ...baseSpeeds,
    ...savedSpeeds.map(Number).filter(speed => Number.isFinite(speed) && speed >= 0 && speed <= 1e6)
  ])].sort((a, b) => a - b);

  data.timeSpeed.current = finite(data.timeSpeed.current, 1, 0, 1e6);
  if (data.timeSpeed.current !== 0 && !data.meta.unlockedSpeeds.includes(data.timeSpeed.current)) {
    data.timeSpeed.current = 1;
  }
  data.timeSpeed.paused = !!data.timeSpeed.paused || data.timeSpeed.current === 0;
  if (data.timeSpeed.current === 0) data.timeSpeed.paused = true;

  data.flags = data.flags && typeof data.flags === 'object' ? data.flags : {};
  for (const flag of [
    'unlockedBeyondSpirit', 'hasUnlockedSpiritCycle', 'hasCompletedMandatoryST10',
    'hasLeftMortalWorld', 'canManualReincarnate', 'hasCompletedDaoPath',
    'daoCompletionChoicePending', 'lifespanHandled'
  ]) data.flags[flag] = !!data.flags[flag];
  if (data.realmIndex >= idx('nirvana_scryer')) {
    data.flags.hasLeftMortalWorld = true;
    data.flags.unlockedBeyondSpirit = true;
  }

  data.lifecycle = data.lifecycle && typeof data.lifecycle === 'object' ? data.lifecycle : {};
  data.lifecycle.isReincarnating = !!data.lifecycle.isReincarnating;
  data.lifecycle.lastDeathAt = finite(data.lifecycle.lastDeathAt, 0, 0, Number.MAX_SAFE_INTEGER);
  data.lifecycle.lastReincarnateAt = finite(data.lifecycle.lastReincarnateAt, 0, 0, Number.MAX_SAFE_INTEGER);
  data.stats = data.stats && typeof data.stats === 'object' ? data.stats : {};
  data.stats.deaths = Math.floor(finite(data.stats.deaths, 0, 0, Number.MAX_SAFE_INTEGER));
  data.life = data.life && typeof data.life === 'object' ? data.life : { isCleanRun: true };
  data.life.isCleanRun = data.life.isCleanRun !== false;
  data.isDead = !!data.isDead;

  // A malformed or incomplete session is not eligible for offline rewards.
  if (data.session && typeof data.session === 'object' && Number.isFinite(Number(data.session.lastTs)) && Number(data.session.lastTs) > 0) {
    data.session = {
      lastTs: Number(data.session.lastTs),
      lastSpeed: finite(data.session.lastSpeed, 0, 0, 1e6),
      lastRealmIndex: Math.max(0, Math.min(realms.length - 1, Math.floor(Number(data.session.lastRealmIndex) || 0))),
      lastQi: finite(data.session.lastQi, 0)
    };
  } else {
    data.session = null;
  }

  data.currentCycle = data.realmIndex >= idx('nirvana_scryer') ? 'spirit' : 'mortal';
  data.version = VERSION;
  data.realmSystemVersion = REALM_SYSTEM_VERSION;
  enforceQiRefiningQpsBaseline(data);
  return data;
}

function load(slot = activeSlot){
  try{
    const raw = localStorage.getItem(getSaveKeyForSlot(slot));
    if(!raw) return null;
    const data = JSON.parse(raw);
    if(!data.version) data.version = '0.0.0';
    
    // Run shared migration
    migrateState(data);
    
    S = data;
    updateCurrentCycle();
    
    // Refresh lifespan to match current realm (in case of balance changes or migration)
    refreshLifespanForRealm();
    
    // Ensure speeds are unlocked based on current realm (in case of old saves)
    checkAndUnlockSpeeds();
    
    // Revalidate achievements if migration occurred (realm indices shifted)
    if(data._needsAchievementRevalidation) {
      revalidateRealmAchievements();
      delete S._needsAchievementRevalidation; // Clean up temporary flag
    }
    
    return S;
  }catch(e){ console.error('Error loading', e); return null; }
}

function reset(){
  showConfirm(
    "Reset Current Slot",
    "<span style='color: var(--danger); font-weight: bold;'>This will permanently delete Slot " + activeSlot + ":</span><br><br>" +
    "• Cultivation progress<br>" +
    "• Karma and reincarnations<br>" +
    "• Slot achievements and statistics<br><br>" +
    "<strong>This action cannot be undone.</strong>",
    () => {
      localStorage.removeItem(getSaveKeyForSlot());
      localStorage.removeItem(getAchievementsKeyForSlot());

      // Reset global guards
      isHandlingDeath = false;
      SKILL_CAT = null;

      // Reset achievement state
      achievementState = createDefaultAchievementState();

      // Reinitialize game state
      S = defaultState();

      updateLastSave();
      refreshMainMenuSlots();

      // Refresh UI
      renderAll();
      renderAchievementsList();
      updateAchievementsBadge();

      showModal('Slot Reset Complete',
        `Slot ${activeSlot} has been cleared. Your cultivation journey begins anew.`, '⚠️');
    },
    null,
    '⚠️'
  );
}

function exportSave(){
  try {
    const backup = {
      format: 'dao-quest-save',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      gameState: S,
      achievementState: normalizeAchievementState(achievementState)
    };
    const json = JSON.stringify(backup);
    ioArea.value = btoa(unescape(encodeURIComponent(json)));
    return true;
  } catch (e) {
    console.error('Failed to export save:', e);
    showModal('Export Failed', 'The save could not be encoded. Try again after saving your progress.', '⚠️');
    return false;
  }
}

function importSave(){
  let previousState = null;
  let previousAchievements = null;
  let previousSaveText = null;
  let previousAchievementsText = null;
  let previousStorageCaptured = false;
  try {
    const b64 = ioArea.value.trim();
    if (!b64) throw new Error('No save data was provided.');
    const json = decodeURIComponent(escape(atob(b64)));
    const payload = JSON.parse(json);
    const isBundle = payload && ['dao-quest-save', 'way-of-the-dao-save'].includes(payload.format) && payload.gameState;
    const importedState = isBundle ? payload.gameState : payload;
    const importedAchievements = isBundle ? payload.achievementState : null;
    if (!importedState || typeof importedState !== 'object' || Array.isArray(importedState) ||
        !('qi' in importedState || 'realmIndex' in importedState || 'reinc' in importedState)) {
      throw new TypeError('The backup does not contain a valid game state.');
    }

    // Validate a detached copy first; failed imports must not partially mutate the live game.
    const candidate = JSON.parse(JSON.stringify(importedState));
    migrateState(candidate);
    const defaults = defaultState();
    const mergedState = { ...defaults, ...candidate };
    previousState = S;
    previousAchievements = achievementState;
    previousSaveText = localStorage.getItem(getSaveKeyForSlot());
    previousAchievementsText = localStorage.getItem(getAchievementsKeyForSlot());
    previousStorageCaptured = true;
    if (importedAchievements) achievementState = normalizeAchievementState(importedAchievements);
    S = mergedState;

    isHandlingDeath = false;
    SKILL_CAT = null;
    if (S.flags?.hasCompletedDaoPath && S.realmIndex !== realms.length - 1) {
      S.flags.hasCompletedDaoPath = false;
    }
    // Older state-only exports predate the per-life completion flag. Recover it
    // from the historical achievement only when the imported save is at the summit.
    if (S.realmIndex === realms.length - 1 && S.stage === STAGES_PER_REALM && achievementState.spiritCycleComplete) {
      S.flags.hasCompletedDaoPath = true;
    }
    updateCurrentCycle();
    validateTimeSpeedSystem();
    if (!save()) throw new Error('The imported save could not be written to this browser.');
    saveAchievementState();
    renderAll();
    renderAchievementsList();
    showModal('Save Imported', 'Your cultivation progress and achievements have been successfully restored.', '📜');
    return true;
  } catch(e) {
    if (previousState) S = previousState;
    if (previousAchievements) achievementState = previousAchievements;
    if (previousStorageCaptured) {
      try {
        if (previousSaveText === null) localStorage.removeItem(getSaveKeyForSlot());
        else localStorage.setItem(getSaveKeyForSlot(), previousSaveText);
        if (previousAchievementsText === null) localStorage.removeItem(getAchievementsKeyForSlot());
        else localStorage.setItem(getAchievementsKeyForSlot(), previousAchievementsText);
      } catch (restoreError) {
        console.error('Could not roll back partially imported storage:', restoreError);
      }
    }
    console.error('Import failed:', e);
    showModal('Import Failed', 'The save could not be imported. Check that the complete export code was pasted and try again.', '⚠️');
    return false;
  }
}

/**
 * DEPRECATED: Old offline gains system (replaced by applyOfflineProgressOnResume)
 * Kept for backwards compatibility but no longer called.
 */
const qiDisplay = document.getElementById('qiDisplay');
const qpcEl = document.getElementById('qpc');
const qpsEl = document.getElementById('qps');
const offlineMultEl = document.getElementById('offlineMult');
const realmNameEl = document.getElementById('realmName');
const realmStageEl = document.getElementById('realmStage');
const realmProgEl = document.getElementById('realmProg');
const realmReqTextEl = document.getElementById('realmReqText');
const realmStepEl = document.getElementById('realmStep');
const realmAliasEl = document.getElementById('realmAlias');
const realmDescriptionEl = document.getElementById('realmDescription');
const realmPositionEl = document.getElementById('realmPosition');
const stepPathEl = document.getElementById('stepPath');
const stepProgressBarEl = document.getElementById('stepProgressBar');
const stepProgressValueEl = document.getElementById('stepProgressValue');
const breakthroughLabelEl = document.getElementById('breakthroughLabel');
const breakthroughBtn = document.getElementById('breakthroughBtn');
const karmaValEl = document.getElementById('karmaVal');
const reincBonusEl = document.getElementById('reincBonus');
const reincTimesEl = document.getElementById('reincTimes');
const deathsCountEl = document.getElementById('deathsCount');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const resetBtn = document.getElementById('resetBtn');
const clickBtn = document.getElementById('clickBtn');
const shopEl = document.getElementById('shop');
const ioArea = document.getElementById('ioArea');
const verEl = document.getElementById('ver');
const lastSaveEl = document.getElementById('lastSave');
const lifespanValueEl = document.getElementById('lifespanValue');
const lifespanProgressBarEl = document.querySelector('#lifespanProgress > div');
const speedButtonsEl = document.getElementById('speedButtons');
const achievementsBtn = document.getElementById('achievementsBtn');
const achievementsPanel = document.getElementById('achievementsPanel');
const achievementsClose = document.getElementById('achievementsClose');
const achievementsList = document.getElementById('achievementsList');
const currentSaveSlotEl = document.getElementById('currentSaveSlot');
const mainMenuBtn = document.getElementById('mainMenuBtn');
const mainMenuOverlay = document.getElementById('mainMenuOverlay');
const menuSlotsEl = document.getElementById('menuSlots');
const newGameBtn = document.getElementById('newGameBtn');
const loadGameBtn = document.getElementById('loadGameBtn');
const menuMusicBtn = document.getElementById('menuMusicBtn');
// Note: currentCycleEl removed - Current Cycle moved to Cultivation Zone badge
// Note: realmBonusEl removed - Realm Bonus UI replaced with Transcendence panel

function updateCurrentSlotLabel() {
  if (!currentSaveSlotEl) return;
  currentSaveSlotEl.textContent = `Slot ${activeSlot}`;
}

function updateLastSave(){
  if (!lastSaveEl) return;
  if(!S.lastSave){
    lastSaveEl.textContent = `Slot ${activeSlot} - Last Save: -`;
    return;
  }
  const d = new Date(S.lastSave);
  lastSaveEl.textContent = `Slot ${activeSlot} - Last Save: ${d.toLocaleString()}`;
}

function renderStats(){
  setTextIfChanged(qiDisplay, 'Qi: ' + fmt(Math.floor(S.qi)));
  
  // QPC/QPS display: Speed-independent (time speed affects only lifespan, not Qi)
  setTextIfChanged(qpcEl, fmt(totalQPC()));
  setTextIfChanged(qpsEl, fmt(totalQPS()));
  
  // Use fmt for offline multiplier (max 2 decimals)
  const offlineMult = totalOfflineMult();
  setTextIfChanged(offlineMultEl, fmt(offlineMult) + '×');
  
  // LIFESPAN UI: Clean numeric display (no "years", no "Age:")
  // Format: "Lifespan" label on left, "current / max" value on right
  if(lifespanValueEl) {
    // Migrate old ageYears to age
    if(S.age === undefined && S.ageYears !== undefined) {
      S.age = S.ageYears;
      delete S.ageYears;
    }
    
    // Initialize age if missing or invalid
    if(!S.age || !isFinite(S.age)) {
      S.age = 0;
    }
    
    const currentAge = S.age;
    const maxLifespan = S.lifespan.max;
    const finiteMax = Number.isFinite(maxLifespan);
    
    // Build value: "39.48 / 100.00" or "123.45 / ∞"
    setTextIfChanged(lifespanValueEl, finiteMax
      ? `${fmt2(currentAge)} / ${fmt2(maxLifespan)}`
      : `${fmt2(currentAge)} / ∞`);
    
    // Update progress bar
    if(lifespanProgressBarEl) {
      if(finiteMax) {
        const progressPercent = Math.max(0, Math.min(100, (currentAge / maxLifespan) * 100));
        lifespanProgressBarEl.style.width = progressPercent.toFixed(2) + '%';
      } else {
        lifespanProgressBarEl.style.width = '0%'; // No progress for immortal
      }
    }
  }
  
  setTextIfChanged(karmaValEl, fmt(S.reinc.karma));
  setTextIfChanged(reincBonusEl, fmt(reincBonus()) + '×');
  setTextIfChanged(reincTimesEl, S.reinc.times);
  setTextIfChanged(deathsCountEl, S.stats?.deaths || 0);
  
  // OLD: Removed transcendenceStatus div - now using renderTranscendencePanel() for card-style display
  
  // Note: Current Cycle moved to Cultivation Zone (see renderCycleBadge())
  // Note: Realm Bonus UI removed - internal scaling still functional via effectiveSkillBase()
}

/**
 * Render the cycle badge in the cultivation zone (lower-left corner)
 */
function renderCycleBadge() {
  const cycleBadgeEl = document.getElementById('cycleBadge');
  if (!cycleBadgeEl) return;
  
  const cycle = getCurrentCycle();
  const cycleName = cycle.name || 'Mortal World';
  const cycleClass = S.currentCycle === 'spirit' ? 'cycle-spirit' : 'cycle-mortal';
  
  cycleBadgeEl.textContent = cycleName;
  cycleBadgeEl.className = `cycle-badge ${cycleClass}`;
}

function renderRealm(){
  const r = realms[S.realmIndex] || realms[0];
  const step = REALM_STEPS.find(item => item.number === r.step) || REALM_STEPS[0];
  const stepRealms = realms.slice(step.start, step.end + 1);
  const localIndex = Math.max(0, S.realmIndex - step.start);
  const req = stageRequirement(S.realmIndex, S.stage);
  const pct = Math.max(0, Math.min(100, (S.qi / req) * 100));
  const stepProgress = Math.max(0, Math.min(100, ((localIndex * STAGES_PER_REALM + S.stage - 1) / (stepRealms.length * STAGES_PER_REALM)) * 100));

  setTextIfChanged(realmNameEl, r.name);
  setTextIfChanged(realmStageEl, `${S.stage} / ${STAGES_PER_REALM}`);
  const realmWidth = `${pct}%`;
  if (realmProgEl && realmProgEl.style.width !== realmWidth) realmProgEl.style.width = realmWidth;
  setTextIfChanged(realmReqTextEl, `Breakthrough requirement · ${fmt(req)} Qi`);
  const cannotAdvance = !canBreakthrough(req);
  if (breakthroughBtn && breakthroughBtn.disabled !== cannotAdvance) breakthroughBtn.disabled = cannotAdvance;
  setTextIfChanged(realmStepEl, `${step.name} · ${step.subtitle}`);
  setTextIfChanged(realmAliasEl, r.alias || '');
  setTextIfChanged(realmDescriptionEl, r.description || '');
  setTextIfChanged(realmPositionEl, `Realm ${S.realmIndex + 1} of ${realms.length} · ${stepRealms.length} realms in this step`);

  if (stepPathEl && (lastRenderedStepNumber !== step.number || lastRenderedRealmForPath !== S.realmIndex)) {
    stepPathEl.innerHTML = stepRealms.map((realm, index) => `<span class="step-node ${index < localIndex ? 'complete' : index === localIndex ? 'current' : ''}" title="${realm.name}"></span>`).join('');
    lastRenderedStepNumber = step.number;
    lastRenderedRealmForPath = S.realmIndex;
  }
  if (stepProgressBarEl) {
    const width = `${stepProgress}%`;
    if (stepProgressBarEl.style.width !== width) stepProgressBarEl.style.width = width;
  }
  setTextIfChanged(stepProgressValueEl, `${fmt2(stepProgress)}% of ${step.name}`);
  if (breakthroughLabelEl) {
    const isGate = S.realmIndex === idx('ascendant') && S.stage === STAGES_PER_REALM && !S.flags?.hasLeftMortalWorld;
    const label = isGate ? 'Cross the World Boundary' : S.realmIndex === realms.length - 1 && S.stage === STAGES_PER_REALM ? 'Complete the Path' : 'Break Through';
    setTextIfChanged(breakthroughLabelEl, label);
  }
}

function transcStatus() {
  const atAscendantPeak = S.realmIndex === idx('ascendant') && S.stage === STAGES_PER_REALM;
  const done = !!(S.flags?.hasLeftMortalWorld || S.flags?.unlockedBeyondSpirit || S.flags?.hasCompletedMandatoryST10);
  return { locked: !done, atAscendantPeak, done };
}

function renderTranscendencePanel() {
  const panel = document.getElementById('transcendencePanel');
  if (!panel) return;
  const status = transcStatus();
  const canReincarnateNow = canReincarnate();
  const badgeClass = status.done ? 'unlocked' : status.atAscendantPeak ? 'ready' : 'locked';
  const badgeText = status.done ? 'WORLD CROSSED' : status.atAscendantPeak ? 'BOUNDARY REACHED' : 'FIRST STEP';
  let hintHTML;
  if (status.done) {
    hintHTML = `<div class="transcendence-hint">You have crossed into the higher worlds. Reincarnation is now optional and can be used to turn a new life into a stronger beginning.</div>`;
  } else if (status.atAscendantPeak) {
    hintHTML = `<div class="transcendence-hint">The First Step is complete. Your next breakthrough enters <strong>Nirvana Scryer · Dao Fusion</strong> without resetting this life.</div>`;
  } else {
    hintHTML = `<div class="transcendence-hint">Reach <strong>Ascendant · Void Returning, Stage 10</strong> to leave the starting world and enter the Second Step.</div>`;
  }
  const buttonHTML = canReincarnateNow ? `<button id="btnReincNow" class="btn accent">♻️ Reincarnate</button>` : '';
  panel.innerHTML = `
    <div class="boundary-heading"><h4>World Boundary</h4><span class="badge ${badgeClass}">${badgeText}</span></div>
    ${hintHTML}
    ${buttonHTML}
  `;
  const btn = document.getElementById('btnReincNow');
  if (btn) btn.addEventListener('click', tryManualReincarnate);
}

/**
 * Preview the effect of buying N levels of a skill
 * Calculates delta to QPS/QPC/offline multiplier and total cost
 * Uses rank-based skill system (perRealm ranks, not flat numbers)
 * @param {string} skillId - Skill ID
 * @param {number} qty - Number of levels to preview
 * @returns {Object} {deltaQPS, deltaQPC, deltaOffline, totalCost, affordable, canAfford}
 */
function getBulkOptionsForSkill(skill) {
  if (!skill || skill.oneTime) return [1];
  const cap = Math.max(1, Math.min(MAX_RANKS_PER_REALM, Math.floor(skill.ranksPerRealm || 1)));
  const options = [1, Math.min(5, cap), Math.min(10, cap), cap];
  return [...new Set(options)].sort((a, b) => a - b);
}

function getBulkMultiplierForSkill(skill, desired = getLastBulkMultiplier()) {
  const options = getBulkOptionsForSkill(skill);
  const value = Math.max(1, Math.floor(Number(desired) || 1));
  if (options.includes(value)) return value;
  const lower = options.filter(opt => opt <= value);
  return lower.length ? lower[lower.length - 1] : options[0];
}

const SKILL_SIGILS = Object.freeze({
  breath_control: '氣',
  meridian_flow: '經',
  lotus_meditation: '蓮',
  dantian_temps: '丹',
  closed_door: '閉',
  celestial_resonance: '✧',
  void_convergence: '空'
});

function skillSigilMarkup(skill) {
  const sigil = SKILL_SIGILS[skill.id] || '✧';
  return `<span class="skill-icon" aria-hidden="true">${sigil}</span>`;
}

function initShopEvents() {
  if (!shopEl || shopEl.dataset.eventsBound === 'true') return;
  shopEl.dataset.eventsBound = 'true';

  // One delegated listener survives shop rebuilds; avoid binding N listeners per render.
  shopEl.addEventListener('click', (event) => {
    const bulkButton = event.target.closest('.bulk-btn');
    if (bulkButton && shopEl.contains(bulkButton)) {
      const multiplier = Number(bulkButton.dataset.mult);
      if (!Number.isFinite(multiplier)) return;
      setLastBulkMultiplier(multiplier);

      const item = bulkButton.closest('.shop-item');
      if (!item) return;
      item.querySelectorAll('.bulk-btn').forEach(button => {
        const active = button === bulkButton;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      const skillId = item.dataset.skill;
      if (skillId) updateBulkCostPreview(skillId, multiplier);
      return;
    }

    const buyButton = event.target.closest('button.buy-btn[data-skill]');
    if (!buyButton || !shopEl.contains(buyButton) || buyButton.disabled) return;
    const skillId = buyButton.dataset.skill;
    const skill = getSkill(skillId);
    if (!skill) return;
    const multiplier = getBulkMultiplierForSkill(skill, getLastBulkMultiplier());
    buySkill(skillId, multiplier);
  });
}

function renderShop(){
  if (!shopEl) return;
  initShopEvents();
  shopBuyButtons.clear();
  bulkCostElements.clear();
  shopEl.replaceChildren();
  
  // Filter skills by cycle unlock requirements
  const availableSkills = getSkillCatalog().filter(sk => skillUnlockedByCycle(sk));
  
  for(const sk of availableSkills){
    // One-time techniques
    if (sk.oneTime) {
      const purchased = isTechniquePurchased(sk.id);
      const cost = sk.cost;
      const can = !purchased && S.qi >= cost;
      
      const wrap = document.createElement('div');
      wrap.className = 'shop-item';
      wrap.dataset.skill = sk.id;
      
      const badge = purchased ? '<span style="color:var(--accent);font-size:10px;font-weight:700;padding:2px 6px;background:rgba(126,231,135,0.15);border-radius:4px;margin-left:6px;">PURCHASED</span>' : '<span style="color:var(--accent-2);font-size:10px;font-weight:700;padding:2px 6px;background:rgba(161,138,255,0.15);border-radius:4px;margin-left:6px;">ONE-TIME</span>';
      
      const effectPct = (sk.value * 100).toFixed(1);
      const typeLabel = sk.type === 'qps_pct' ? 'Qi/s' : sk.type === 'qpc_pct' ? 'Qi/click' : 'offline Qi';
      
      wrap.innerHTML = `
        <div>
          ${skillSigilMarkup(sk)}
          <div>
            <h4>${sk.name}${badge}</h4>
            <div class="desc">+${effectPct}% ${typeLabel}</div>
            <div class="small muted">Cost: ${fmt(cost)} Qi</div>
          </div>
        </div>
        <button class="btn ${can?'primary':''} buy-btn" ${can?'':'disabled'} data-skill="${sk.id}" title="${purchased ? 'Already purchased' : can ? 'Purchase technique' : 'Cannot afford'}">${purchased ? 'Owned' : 'Buy'}</button>
      `;
      
      shopEl.appendChild(wrap);
      shopBuyButtons.set(sk.id, wrap.querySelector('button.buy-btn'));
      continue;
    }
    
    // Ranked skills
    const currentRanks = currentRealmRanks(sk.id);
    const maxRanks = sk.ranksPerRealm;
    const cost = skillCost(sk.id);
    const atCap = currentRanks >= maxRanks;
    const can = !atCap && S.qi >= cost;
    
    // Generate description based on skill type
    let descDyn;
    if (sk.type === 'qps_flat' || sk.type === 'qpc_flat') {
      const effBase = effectiveSkillBase(sk.id);
      const baseline = sk.type === 'qps_flat' 
        ? S.qpsBase * (BAL.realmBaselines?.qpsFlatPerRank || 0.15) * effBase
        : S.qpcBase * (BAL.realmBaselines?.qpcFlatPerRank || 0.25) * effBase;
      const typeLabel = sk.type === 'qps_flat' ? 'Qi/s' : 'Qi/click';
      descDyn = `${fmtNumberDelta(baseline)} ${typeLabel} per rank`;
    } else {
      // Percent skills with realm-aware floors/caps
      const basePctPerRank = sk.base || 0.008;
      const capPct = sk.capPctPerRealm || 0.12;
      
      // Apply realm-aware floors/caps to per-rank percentage
      const minPct = minTierPctByRealm(S.realmIndex);
      const maxPct = maxTierPctByRealm(S.realmIndex);
      const pctPerRank = Math.max(minPct, Math.min(maxPct, basePctPerRank));
      
      // Total cap with effective base dampening
      const effBase = effectiveSkillBase(sk.id);
      const scaledCap = Math.min(capPct * Math.sqrt(effBase), 2.0);
      
      const typeLabel = sk.type === 'qps_pct' ? 'Qi/s' : sk.type === 'qpc_pct' ? 'Qi/click' : 'offline Qi';
      descDyn = `${fmtPercentDeltaNonZero(pctPerRank)} ${typeLabel} per rank • Cap ${fmtPerc(scaledCap)}`;
    }
    
    const wrap = document.createElement('div');
    wrap.className = 'shop-item';
    wrap.dataset.skill = sk.id;
    const bulkOptions = getBulkOptionsForSkill(sk);
    const activeBulk = getBulkMultiplierForSkill(sk);
    
    // Build bulk selector buttons HTML
    const bulkButtonsHTML = bulkOptions.map(mult => {
      const isActive = mult === activeBulk;
      return `<button class="bulk-btn ${isActive ? 'active' : ''}" data-mult="${mult}" aria-pressed="${isActive}">x${mult}</button>`;
    }).join('');
    
    wrap.innerHTML = `
      <div>
        ${skillSigilMarkup(sk)}
        <div>
          <h4>${sk.name} <span class="muted">(Ranks ${currentRanks}/${maxRanks})</span></h4>
          <div class="desc">${descDyn}</div>
          <div class="small muted">Cost (x1): ${fmt(cost)} Qi</div>
          <div class="bulk-cost small muted" data-skill="${sk.id}"></div>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
        <div class="bulk-selector" role="group" aria-label="Bulk purchase quantity">
          ${bulkButtonsHTML}
        </div>
        <button class="btn ${can?'primary':''} buy-btn" ${can?'':'disabled'} data-skill="${sk.id}" title="${atCap ? 'Rank cap reached this realm' : can ? 'Purchase rank' : 'Cannot afford'}">Buy</button>
      </div>`;
    
    shopEl.appendChild(wrap);
    shopBuyButtons.set(sk.id, wrap.querySelector('button.buy-btn'));
    const previewElement = wrap.querySelector('.bulk-cost');
    if (previewElement) bulkCostElements.set(sk.id, previewElement);
  }
  
  // Initialize cost previews for current bulk multiplier
  const currentMult = getLastBulkMultiplier();
  for(const sk of availableSkills){
    const validMult = getBulkMultiplierForSkill(sk, currentMult);
    updateBulkCostPreview(sk.id, validMult);
  }
}

/**
 * Update the bulk cost preview for a skill
 * @param {string} skillId - Skill ID
 * @param {number} mult - Bulk multiplier
 */
function updateBulkCostPreview(skillId, mult) {
  const previewEl = bulkCostElements.get(skillId);
  if (!previewEl) return;
  
  if (mult === 1) {
    previewEl.textContent = '';
    return;
  }
  
  const preview = previewBulkCost(skillId, mult);
  const affordableText = preview.affordable < mult ? ` (max: ×${preview.affordable})` : '';
  previewEl.textContent = `Total (×${mult}): ${preview.formattedCost} Qi${affordableText}`;
  previewEl.style.color = preview.canAfford ? 'var(--accent)' : 'var(--danger)';
}

function renderTimeSpeed(){
  if(!speedButtonsEl) return;
  
  speedButtonsEl.innerHTML = '';
  const availableSpeeds = getAvailableSpeeds();
  
  // Render buttons for all configured speeds
  SPEEDS_CONFIG.forEach(config => {
    const speed = config.speed;
    const btn = document.createElement('button');
    btn.className = 'speed-btn';
    btn.textContent = speed === 0 ? 'Pause' : `${speed}×`;
    
    const isAvailable = availableSpeeds.includes(speed);
    const isActive = (speed === 0 && S.timeSpeed.paused) || (!S.timeSpeed.paused && S.timeSpeed.current === speed);
    
    if(!isAvailable) {
      btn.disabled = true;
      const requiredRealmIndex = idx(config.unlockAt);
      const requiredRealmName = realms[requiredRealmIndex]?.name || 'Unknown Realm';
      btn.title = `Unlocked at ${requiredRealmName}`;
    } else {
      // Add tooltip explaining how time speed works
      if (speed === 0) {
        btn.title = 'Pause: Time stops (no Qi gain, no aging)';
      } else {
        btn.title = `${speed}× Time Flow: Accelerates lifespan aging only\nQi gains are NOT affected by time speed\nAging happens ${speed}× faster`;
      }
      btn.addEventListener('click', () => setTimeSpeed(speed));
    }
    
    if(isActive) {
      btn.classList.add('active');
      if(speed === 0) btn.classList.add('paused');
    }
    
    speedButtonsEl.appendChild(btn);
  });
}

function renderAll(){
  if (verEl) verEl.textContent = VERSION;
  renderStats();
  renderRealm();
  renderTranscendencePanel();
  renderShop();
  renderTimeSpeed();
  renderCycleBadge();
  updateCurrentSlotLabel();
  updateLastSave();
  updateAchievementsBadge();
  checkAchievements();
  updateCultivatorImage();
}

function readSlotState(slot) {
  try {
    const raw = localStorage.getItem(getSaveKeyForSlot(slot));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getSlotLabel(slot) {
  const data = readSlotState(slot);
  if (!data) return `Slot ${slot}\nEmpty`;
  const realmIndex = Math.max(0, Math.min(realms.length - 1, Number(data.realmIndex || 0)));
  const stage = Math.max(1, Math.min(10, Number(data.stage || 1)));
  const realmName = realms[realmIndex]?.name || 'Unknown Realm';
  const savedAt = data.lastSave ? new Date(data.lastSave).toLocaleString() : 'Unknown';
  return `Slot ${slot}\n${realmName} ${stage}/10\nSaved: ${savedAt}`;
}

function setMainMenuSlotsVisible(visible) {
  menuLoadMode = !!visible;
  if (menuSlotsEl) {
    menuSlotsEl.classList.toggle('hidden', !menuLoadMode);
    menuSlotsEl.setAttribute('aria-hidden', menuLoadMode ? 'false' : 'true');
  }
}

function updateMainMenuLoadButton() {
  if (!loadGameBtn) return;
  const hasCurrentSave = !!readSlotState(selectedMenuSlot);
  loadGameBtn.textContent = menuLoadMode ? 'Load Selected Save' : 'Load Save';
  loadGameBtn.disabled = menuLoadMode ? !hasCurrentSave : false;
}

function refreshMainMenuSlots() {
  if (!menuSlotsEl) return;

  menuSlotsEl.querySelectorAll('.menu-slot-btn').forEach(btn => {
    const slot = normalizeSlot(btn.getAttribute('data-slot'));
    const hasSave = !!readSlotState(slot);
    btn.classList.toggle('selected', slot === selectedMenuSlot);
    btn.classList.toggle('empty', !hasSave);
    btn.textContent = getSlotLabel(slot);
  });

  updateMainMenuLoadButton();
}

function hideMainMenu() {
  if (!mainMenuOverlay) return;
  mainMenuOverlay.classList.add('hidden');
  mainMenuOverlay.setAttribute('aria-hidden', 'true');
}

function showMainMenu() {
  gameActive = false;
  document.documentElement.classList.remove('game-active');
  stopGameLoop();
  selectedMenuSlot = activeSlot;
  setMainMenuSlotsVisible(false);
  refreshMainMenuSlots();
  updateMenuMusicButton();
  closeAchievementsPanel();
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsPanel) settingsPanel.classList.remove('open');
  if (settingsBtn) settingsBtn.setAttribute('aria-expanded', 'false');
  if (mainMenuOverlay) {
    mainMenuOverlay.classList.remove('hidden');
    mainMenuOverlay.setAttribute('aria-hidden', 'false');
  }
}

function startActiveSession() {
  gameActive = true;
  document.documentElement.classList.add('game-active');
  setMainMenuSlotsVisible(false);
  hideMainMenu();
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsPanel) settingsPanel.classList.remove('open');
  if (settingsBtn) settingsBtn.setAttribute('aria-expanded', 'false');
  updateCurrentSlotLabel();
  last = now();
  S.lastTick = last;
  lastRenderedStepNumber = -1;
  lastRenderedRealmForPath = -1;
  renderAll();
  startGameLoop();
}

function startNewGameAtSlot(slot) {
  const targetSlot = normalizeSlot(slot);
  if (readSlotState(targetSlot)) {
    const confirmed = window.confirm(`Slot ${targetSlot} already has a save. Overwrite it with a new game?`);
    if (!confirmed) return;
  }

  setActiveSlot(targetSlot);
  localStorage.removeItem(getSaveKeyForSlot());
  localStorage.removeItem(getAchievementsKeyForSlot());

  achievementState = createDefaultAchievementState();
  S = defaultState();
  refreshMainMenuSlots();
  startActiveSession();
}

async function loadGameFromSlot(slot) {
  const targetSlot = normalizeSlot(slot);
  setActiveSlot(targetSlot);
  achievementState = loadAchievementState(targetSlot);

  const loaded = load(targetSlot);
  if (!loaded) {
    refreshMainMenuSlots();
    return;
  }

  S = { ...defaultState(), ...loaded, skills: { ...defaultState().skills, ...(loaded.skills || {}) } };
  enforceQiRefiningQpsBaseline();
  validateTimeSpeedSystem();
  if(!S.currentCycle) updateCurrentCycle();
  if (S.realmIndex === realms.length - 1 && S.stage === STAGES_PER_REALM && achievementState.spiritCycleComplete) {
    S.flags.hasCompletedDaoPath = true;
  }

  const pendingDeath = !!(S.isDead || S.lifecycle?.isReincarnating ||
    (!isImmortal() && S.flags?.lifespanHandled && Number(S.age) >= getMaxLifespan()));

  renderAll();
  startActiveSession();
  if (pendingDeath) {
    // A save can be made while the death modal is open. Rebuild that one pending
    // death flow after reload instead of leaving the cultivator permanently locked.
    isHandlingDeath = false;
    S.isDead = false;
    S.lifecycle.isReincarnating = false;
    S.flags.lifespanHandled = false;
    await handleLifespanEnd();
    renderAll();
    refreshMainMenuSlots();
    return;
  }

  await applyOfflineProgressOnResume({ showPopup: true });
  renderAll();
  refreshMainMenuSlots();
  if (S.realmIndex === realms.length - 1 && S.stage === STAGES_PER_REALM &&
      S.flags?.hasCompletedDaoPath && S.flags?.daoCompletionChoicePending) {
    showCycleCompletionModal('final');
  }
}

function initMainMenuUI() {
  if (menuSlotsEl) {
    menuSlotsEl.querySelectorAll('.menu-slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedMenuSlot = normalizeSlot(btn.getAttribute('data-slot'));
        refreshMainMenuSlots();
      });
    });
  }

  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => startNewGameAtSlot(selectedMenuSlot));
  }

  if (loadGameBtn) {
    loadGameBtn.addEventListener('click', async () => {
      if (!menuLoadMode) {
        setMainMenuSlotsVisible(true);
        refreshMainMenuSlots();
        return;
      }
      await loadGameFromSlot(selectedMenuSlot);
    });
  }

  if (menuMusicBtn) {
    menuMusicBtn.addEventListener('click', () => {
      toggleMusicEnabled();
      updateMenuMusicButton();
    });
  }

  setMainMenuSlotsVisible(false);
  updateMenuMusicButton();
  refreshMainMenuSlots();
  showMainMenu();
}

// ============= ACHIEVEMENTS PANEL MANAGEMENT =============

let currentAchievementFilter = 'all';

function openAchievementsPanel() {
  if (!gameActive) return;
  if (!achievementsPanel || !achievementsBtn) return;
  
  // Mark as opened for the dao_seeker achievement
  if (!achievementState.achievementsPanelOpened) {
    achievementState.achievementsPanelOpened = true;
    checkAchievements();
  }
  
  achievementsPanel.classList.add('open');
  achievementsPanel.setAttribute('aria-hidden', 'false');
  achievementsBtn.setAttribute('aria-expanded', 'true');
  renderAchievementsList();
}

function closeAchievementsPanel() {
  if (!achievementsPanel || !achievementsBtn) return;
  
  achievementsPanel.classList.remove('open');
  achievementsPanel.setAttribute('aria-hidden', 'true');
  achievementsBtn.setAttribute('aria-expanded', 'false');
}

function renderAchievementsList() {
  if (!achievementsList) return;
  
  const filteredAchievements = ACHIEVEMENTS.filter(achievement => {
    const isUnlocked = hasAchievement(achievement.id);
    
    if (currentAchievementFilter === 'unlocked' && !isUnlocked) return false;
    if (currentAchievementFilter === 'locked' && isUnlocked) return false;
    if (currentAchievementFilter !== 'all' && 
        currentAchievementFilter !== 'unlocked' && 
        currentAchievementFilter !== 'locked' && 
        achievement.category !== currentAchievementFilter) return false;
    
    return true;
  });
  
  achievementsList.innerHTML = filteredAchievements.map(achievement => {
    const isUnlocked = hasAchievement(achievement.id);
    const unlockedData = achievementState.unlocked[achievement.id];
    
    let dateText = '';
    if (isUnlocked && unlockedData?.unlockedAt) {
      const date = new Date(unlockedData.unlockedAt);
      dateText = `<div class="achievement-date">Unlocked: ${date.toLocaleDateString()}</div>`;
    }
    
    const displayTitle = isUnlocked ? achievement.title : (achievement.hiddenUntilUnlocked ? '???' : achievement.title);
    const displayDesc = isUnlocked ? achievement.description : (achievement.hiddenUntilUnlocked ? 'Hidden achievement' : achievement.description);
    const displayIcon = isUnlocked ? achievement.icon : '🔒';
    const categoryClass = achievement.category === 'Impossible' ? 'impossible' : '';
    
    return `
      <div class="achievement-item ${isUnlocked ? 'unlocked' : 'locked'} ${categoryClass}">
        <div class="achievement-icon ${isUnlocked ? '' : 'locked'}">${displayIcon}</div>
        <div class="achievement-content">
          <div class="achievement-name ${isUnlocked ? '' : 'locked'}">${displayTitle}</div>
          <div class="achievement-desc">${displayDesc}</div>
          ${dateText}
        </div>
      </div>
    `;
  }).join('');
}

function setAchievementFilter(filter) {
  currentAchievementFilter = filter;
  
  // Update filter button states
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  
  renderAchievementsList();
}

let last = now();
let lastAchievementUiCheck = 0;
let lastAchievementStateSave = 0;
function loop(){
  if (!gameLoopRunning || !gameActive) {
    stopGameLoop();
    return;
  }

  const nowMs = now();
  const rawDt = Math.max(0, Number.isFinite((nowMs - last) / 1000) ? (nowMs - last) / 1000 : 0);
  last = nowMs;
  S.lastTick = nowMs;

  // Track real time while the game session is open, including paused cultivation.
  // Persist at a low frequency to avoid per-tick localStorage writes.
  if (rawDt > 0) {
    achievementState.totalPlayTimeSeconds = Math.min(1e12,
      Math.max(0, Number(achievementState.totalPlayTimeSeconds) || 0) + rawDt);
  }
  if (nowMs - lastAchievementStateSave >= 60000) {
    saveAchievementState();
    lastAchievementStateSave = nowMs;
  }

  const speed = getTimeSpeed();
  tick(rawDt, speed);
  if (speed > 0) {
    renderStats();
    renderRealm();
    if (nowMs - lastShopRefresh >= SHOP_REFRESH_MS) {
      updateShopButtons();
      lastShopRefresh = nowMs;
    }
  }
  // Passive values and click-count milestones are evaluated once per second,
  // not on every 50 ms game tick.
  if (nowMs - lastAchievementUiCheck >= 1000) {
    checkAchievements();
    lastAchievementUiCheck = nowMs;
  }
  gameLoopTimer = window.setTimeout(loop, GAME_TICK_MS);
}

function startGameLoop(){
  if (gameLoopRunning) return;
  gameLoopRunning = true;
  last = now();
  S.lastTick = last;
  lastShopRefresh = 0;
  lastAchievementStateSave = last;
  gameLoopTimer = window.setTimeout(loop, GAME_TICK_MS);
}

function stopGameLoop(){
  gameLoopRunning = false;
  if (gameLoopTimer !== null) {
    window.clearTimeout(gameLoopTimer);
    gameLoopTimer = null;
  }
}

let lastPointerAt = 0;
clickBtn.addEventListener('pointerdown', (e) => {
  const now = performance.now();
  if (now - lastPointerAt < 120) return; // prevent double fire
  lastPointerAt = now;
  e.preventDefault();
  onClick();
}, { passive:false });

/**
 * Attach blue halo click animation to cultivator frame
 */
// Touch responsiveness for mobile (no ~300ms delay) - REPLACED by pointerdown
breakthroughBtn.addEventListener('click', ()=>{ doBreakthrough(); renderAll(); });
saveBtn.addEventListener('click', save);
exportBtn.addEventListener('click', exportSave);
importBtn.addEventListener('click', importSave);
resetBtn.addEventListener('click', reset);
if (mainMenuBtn) {
  mainMenuBtn.addEventListener('click', () => {
    const confirmed = window.confirm('Return to main menu? Unsaved progress will be lost unless you save manually.');
    if (!confirmed) return;
    showMainMenu();
  });
}

// Achievement system event listeners
if (achievementsBtn) {
  achievementsBtn.addEventListener('click', openAchievementsPanel);
}
if (achievementsClose) {
  achievementsClose.addEventListener('click', closeAchievementsPanel);
}

// Achievement filter event listeners
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setAchievementFilter(btn.dataset.filter);
  });
});

// Close achievements panel when clicking outside
document.addEventListener('click', (e) => {
  if (achievementsPanel && achievementsBtn && 
      achievementsPanel.classList.contains('open') && 
      !achievementsPanel.contains(e.target) && 
      !achievementsBtn.contains(e.target)) {
    closeAchievementsPanel();
  }
});

// Close achievements panel with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && achievementsPanel && achievementsPanel.classList.contains('open')) {
    closeAchievementsPanel();
  }
});

document.addEventListener('keydown', (e)=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); save(); }
});

(async function init(){
  await loadBalance(); // Load balance configuration first
  
  // Start in a neutral state; menu controls which slot to load/start.
  S = defaultState();
  achievementState = loadAchievementState(activeSlot);
  
  assertMonotonicRequirements(); // Validate stage requirements (DEBUG_MODE only)
  S = { ...defaultState(), ...S, skills: { ...defaultState().skills, ...S.skills } };
  
  // Validate and initialize time speed system
  validateTimeSpeedSystem();
  
  // DEBUG: Run system validation assertions
  if (DEBUG_MODE) {
    assertBaseSpeedsPresent();
    assertBulkPurchaseOverflowSafety();
    assertSkillScalingFinite();
    assertSkillScalingReasonable();
    assertNoZeroPerc();
    assertTimeSpeedBehavior();
    __assertNoSpeedInQi(); // Verify Qi formulas don't reference time speed
  }
  
  // Ensure current cycle is set for existing saves
  if(!S.currentCycle) {
    updateCurrentCycle();
  }
  
  // Ensure lifespan is properly set for current realm
  if(!S.lifespan || S.lifespan.max !== getMaxLifespan()) {
    const maxLifespan = getMaxLifespan();
    if(!S.lifespan) {
      if(maxLifespan === null) {
        // Ancestor Realm - infinite lifespan
        S.lifespan = { current: null, max: null };
      } else {
        S.lifespan = { current: maxLifespan, max: maxLifespan };
      }
    } else {
      S.lifespan.max = maxLifespan;
      if(maxLifespan === null) {
        // Became immortal - set infinite lifespan
        S.lifespan.current = null;
      } else if(S.lifespan.current > maxLifespan) {
        S.lifespan.current = maxLifespan;
      }
    }
  }
  
  renderAll();
  
  initDebugPanel(); // Initialize debug panel if in dev mode
  initMusicSystem(); // Initialize background music system
  initMainMenuUI(); // Show menu and wait for slot action
  
  initComplete = true; // All data loaded — saving is now safe
})();

// Manual-save mode: no background autosave/session snapshot hooks.

function updateShopButtons(){
  for (const [id, button] of shopBuyButtons) {
    if (!button?.isConnected) continue;
    const skill = getSkill(id);
    if (!skill) continue;

    let canBuy;
    let label = 'Buy';
    if (skill.oneTime) {
      const purchased = isTechniquePurchased(id);
      canBuy = !purchased && S.qi >= skill.cost;
      label = purchased ? 'Owned' : 'Buy';
    } else {
      const atCap = currentRealmRanks(id) >= (skill.ranksPerRealm || 0);
      canBuy = !atCap && S.qi >= skillCost(id);
    }

    const shouldDisable = !canBuy;
    if (button.disabled !== shouldDisable) button.disabled = shouldDisable;
    button.classList.toggle('primary', canBuy);
    setTextIfChanged(button, label);
  }
}

// ============= DEVELOPER TEST CONTROLS =============
// Deliberately kept separate from DEBUG_MODE: these are manual test tools,
// not diagnostic assertions or the simulation overlay.
function devAddQi(amount = 1e50) {
  const gain = Number(amount);
  if (!Number.isFinite(gain) || gain <= 0) return;
  safeAddQi(gain);
  if (!S.reinc) S.reinc = { times: 0, karma: 0, lifetimeQi: 0 };
  S.reinc.lifetimeQi = Math.min(1e300, (Number(S.reinc.lifetimeQi) || 0) + gain);
  renderAll();
}

function devClearQi() {
  S.qi = 0;
  renderAll();
}

// ============= DEVELOPMENT SIMULATION PANEL =============

function initDebugPanel() {
  // Keep the in-settings Qi tools available in every build. The heavier
  // simulation overlay remains opt-in via ?dev=1.
  const devControls = document.getElementById('devControls');
  if (devControls) devControls.hidden = false;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('dev') !== '1') return;
  
  const debugPanel = document.createElement('div');
  debugPanel.id = 'devDebugPanel';
  debugPanel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(18, 25, 35, 0.85);
    border: 1px solid #2a3748;
    border-radius: 8px;
    padding: 10px;
    font-size: 12px;
    color: #e6edf3;
    z-index: 1000;
    max-width: 280px;
    opacity: 0.8;
  `;
  
  debugPanel.innerHTML = `
    <h4 style="margin: 0 0 8px 0; color: #7ee787;">Dev Tools</h4>
    <button id="runSim6hBtn" style="margin: 2px; padding: 4px 8px; background: #0f1a13; border: 1px solid #35533d; color: #7ee787; cursor: pointer; border-radius: 4px; font-size: 11px;">
      Run Sim (6h)
    </button>
    <button id="runEstimateBtn" style="margin: 2px; padding: 4px 8px; background: #120f1a; border: 1px solid #3a3553; color: #a18aff; cursor: pointer; border-radius: 4px; font-size: 11px;">
      Run Estimate Set
    </button>
    <div id="devResult" style="margin-top: 6px; font-size: 10px; color: #9fb0c3; min-height: 14px;"></div>
  `;
  
  document.body.appendChild(debugPanel);
  
  // Run 6h simulation button
  document.getElementById('runSim6hBtn').addEventListener('click', () => {
    try {
      const result = simulateCompletion({seconds: 6*3600, clickRate: 3});
      const summary = `${result.finished ? 'Finished' : 'Not finished'} at ${result.finalRealm} ${result.finalStage}/10 (${(result.timeSec/3600).toFixed(1)}h)`;
      document.getElementById('devResult').textContent = summary;
      console.log('6h Simulation Result:', result);
    } catch (error) {
      console.error('Simulation error:', error);
      document.getElementById('devResult').textContent = 'Error - check console';
    }
  });
  
  // Run estimate set button
  document.getElementById('runEstimateBtn').addEventListener('click', () => {
    try {
      runCompletionEstimate();
      document.getElementById('devResult').textContent = 'See console for full estimate results';
    } catch (error) {
      console.error('Estimate error:', error);
      document.getElementById('devResult').textContent = 'Error - check console';
    }
  });
}
// =====================
// Save-aware progression simulator (development tools only)
// =====================

function simCurrentRealmRanks(st, skillId) {
  const skill = st.skills?.[skillId];
  return skill && !skill.purchasedOneTime ? (Number(skill.perRealm?.[st.realmIndex]) || 0) : 0;
}

function simEffectiveSkillBase(st, skillId) {
  const base = BAL.skills[skillId]?.base ?? 0;
  if (base <= 0) return 0;
  const realmMult = skillRealmScale(st.realmIndex);
  const karmaMult = skillKarmaBoost(st.reinc?.karma || 0);
  const cycleMult = st.currentCycle === 'spirit' ? SKILL_SCALING.spiritCycleBoost : SKILL_SCALING.mortalCycleBoost;
  const scaled = base * realmMult * karmaMult * cycleMult;
  return Number.isFinite(scaled) ? Math.min(1e150, Math.max(0, scaled)) : 0;
}

function simTotalQPC(st) {
  let add = st.qpcBase;
  let mult = 1;
  const meridianRanks = simCurrentRealmRanks(st, 'meridian_flow');
  if (meridianRanks > 0) {
    const baseline = st.qpcBase * (BAL.realmBaselines?.qpcFlatPerRank ?? 0.25);
    add += meridianRanks * baseline * simEffectiveSkillBase(st, 'meridian_flow');
  }
  const dantianRanks = simCurrentRealmRanks(st, 'dantian_temps');
  if (dantianRanks > 0) {
    const sk = BAL.skills.dantian_temps;
    const pctPerRank = Math.max(minTierPctByRealm(st.realmIndex), Math.min(maxTierPctByRealm(st.realmIndex), sk.base ?? 0.008));
    const scaledCap = Math.min((sk.capPctPerRealm ?? 0.12) * Math.sqrt(simEffectiveSkillBase(st, 'dantian_temps')), 2.0);
    mult *= 1 + Math.min(dantianRanks * pctPerRank, scaledCap);
  }
  if (st.skills?.void_convergence?.purchasedOneTime) {
    mult *= 1 + (BAL.skills.void_convergence?.value ?? 0.12);
  }
  const result = add * mult * st.qpcMult * karmaQiMult(st.reinc?.karma || 0) * cyclePowerMult(st.realmIndex);
  return Number.isFinite(result) ? Math.min(result, 1e300) : 1e300;
}

function simTotalQPS(st) {
  let add = st.qpsBase;
  let mult = 1;
  const breathRanks = simCurrentRealmRanks(st, 'breath_control');
  if (breathRanks > 0) {
    const baseline = st.qpsBase * (BAL.realmBaselines?.qpsFlatPerRank ?? 0.15);
    add += breathRanks * baseline * simEffectiveSkillBase(st, 'breath_control');
  }
  const lotusRanks = simCurrentRealmRanks(st, 'lotus_meditation');
  if (lotusRanks > 0) {
    const sk = BAL.skills.lotus_meditation;
    const pctPerRank = Math.max(minTierPctByRealm(st.realmIndex), Math.min(maxTierPctByRealm(st.realmIndex), sk.base ?? 0.008));
    const scaledCap = Math.min((sk.capPctPerRealm ?? 0.12) * Math.sqrt(simEffectiveSkillBase(st, 'lotus_meditation')), 2.0);
    mult *= 1 + Math.min(lotusRanks * pctPerRank, scaledCap);
  }
  if (st.skills?.celestial_resonance?.purchasedOneTime) {
    mult *= 1 + (BAL.skills.celestial_resonance?.value ?? 0.12);
  }
  const result = add * mult * st.qpsMult * karmaQiMult(st.reinc?.karma || 0) * cyclePowerMult(st.realmIndex);
  return Number.isFinite(result) ? Math.min(result, 1e300) : 1e300;
}

function simSkillCost(st, skillId) {
  const skill = BAL.skills[skillId];
  if (!skill) return Infinity;
  if (skill.oneTime) return skill.cost;
  const ranks = simCurrentRealmRanks(st, skillId);
  if (ranks >= (skill.ranksPerRealm ?? MAX_RANKS_PER_REALM)) return Infinity;
  return Math.floor(skill.cost * Math.pow(skill.costScale, ranks));
}

function simApplyPurchase(st, skillId) {
  const skill = BAL.skills[skillId];
  if (!skill) return false;
  if (skill.unlockAtCycle && skill.unlockAtCycle !== st.currentCycle) return false;
  if (skill.oneTime) {
    if (st.skills?.[skillId]?.purchasedOneTime || st.qi < skill.cost) return false;
    st.qi -= skill.cost;
    st.skills[skillId] = { purchasedOneTime: true, total: 1, perRealm: {} };
    return true;
  }
  const cost = simSkillCost(st, skillId);
  if (!Number.isFinite(cost) || st.qi < cost) return false;
  const current = simCurrentRealmRanks(st, skillId);
  if (!st.skills[skillId]) st.skills[skillId] = { total: 0, perRealm: {} };
  st.skills[skillId].perRealm[st.realmIndex] = current + 1;
  st.skills[skillId].total = (st.skills[skillId].total || 0) + 1;
  st.qi -= cost;
  return true;
}

function simBestPurchase(st, clickRate) {
  const production = simTotalQPS(st) + simTotalQPC(st) * clickRate;
  let best = null;
  for (const skillId of Object.keys(BAL.skills)) {
    const skill = BAL.skills[skillId];
    if (skill.unlockAtCycle && skill.unlockAtCycle !== st.currentCycle) continue;
    if (skill.oneTime && st.skills?.[skillId]?.purchasedOneTime) continue;
    if (!skill.oneTime && simCurrentRealmRanks(st, skillId) >= (skill.ranksPerRealm ?? MAX_RANKS_PER_REALM)) continue;
    const cost = simSkillCost(st, skillId);
    if (!Number.isFinite(cost) || cost <= 0 || st.qi < cost) continue;
    const probe = JSON.parse(JSON.stringify(st));
    if (!simApplyPurchase(probe, skillId)) continue;
    const nextProduction = simTotalQPS(probe) + simTotalQPC(probe) * clickRate;
    const valuePerCost = (nextProduction - production) / cost;
    if (!best || valuePerCost > best.valuePerCost) best = { skillId, valuePerCost };
  }
  return best;
}

function cloneStateForSim() {
  // Project forward from the current save without mutating live game state.
  const clone = JSON.parse(JSON.stringify(S));
  clone.currentCycle = BAL.cycleDefinitions?.spirit?.realms?.includes(clone.realmIndex) ? 'spirit' : 'mortal';
  return clone;
}

function simulateCompletion(options = {}) {
  const seconds = Math.max(1, Number(options.seconds ?? 8 * 3600));
  const clickRate = Math.max(0, Number(options.clickRate ?? 3));
  const dt = Math.max(0.05, Number(options.dt ?? 0.25));
  const buyEvery = Math.max(dt, Number(options.buyEvery ?? 0.5));
  const st = cloneStateForSim();
  const purchases = {};
  let elapsed = 0;
  let buyAccumulator = 0;
  let finished = false;

  function simulateBreakthrough() {
    const req = stageRequirement(st.realmIndex, st.stage, st.reinc?.karma || 0);
    if (st.qi < req) return false;
    st.qi -= req;

    if (st.realmIndex === idx('ascendant') && st.stage === STAGES_PER_REALM && !st.flags?.hasLeftMortalWorld) {
      st.flags.hasLeftMortalWorld = true;
      st.flags.unlockedBeyondSpirit = true;
      st.flags.hasUnlockedSpiritCycle = true;
      st.flags.hasCompletedMandatoryST10 = true;
      st.flags.canManualReincarnate = true;
      st.realmIndex = idx('nirvana_scryer');
      st.stage = 1;
      st.currentCycle = 'spirit';
      st.qpcBase += BAL.progression.realmAdvanceReward.qpcBaseAdd;
      st.qpsBase += BAL.progression.realmAdvanceReward.qpsBaseAdd;
      return false;
    }

    if (st.stage < STAGES_PER_REALM) {
      st.stage++;
      return false;
    }
    if (st.realmIndex >= realms.length - 1) return true;

    st.realmIndex++;
    st.stage = 1;
    st.currentCycle = BAL.cycleDefinitions?.spirit?.realms?.includes(st.realmIndex) ? 'spirit' : 'mortal';
    st.qpcBase += BAL.progression.realmAdvanceReward.qpcBaseAdd;
    st.qpsBase += BAL.progression.realmAdvanceReward.qpsBaseAdd;
    return false;
  }

  while (elapsed < seconds) {
    const gain = (simTotalQPS(st) + simTotalQPC(st) * clickRate) * dt;
    st.qi = Math.min(1e300, st.qi + gain);
    st.reinc.lifetimeQi = Math.min(1e300, st.reinc.lifetimeQi + gain);

    for (let guard = 0; guard < realms.length * STAGES_PER_REALM + 1; guard++) {
      const breakthrough = simulateBreakthrough();
      if (breakthrough) { finished = true; break; }
      if (st.qi < stageRequirement(st.realmIndex, st.stage, st.reinc?.karma || 0)) break;
    }
    if (finished) break;

    buyAccumulator += dt;
    if (buyAccumulator >= buyEvery) {
      buyAccumulator = 0;
      const pick = simBestPurchase(st, clickRate);
      if (pick && simApplyPurchase(st, pick.skillId)) {
        purchases[pick.skillId] = (purchases[pick.skillId] || 0) + 1;
      }
    }
    elapsed += dt;
  }

  return {
    finished,
    timeSec: elapsed,
    finalRealm: realms[st.realmIndex]?.name || 'Unknown Realm',
    finalStage: st.stage,
    purchases,
    summary: finished ? `Reached Ancestor Realm Stage 10 in ${(elapsed / 3600).toFixed(2)} hours` : `Reached ${realms[st.realmIndex]?.name || 'Unknown'} ${st.stage}/${STAGES_PER_REALM}`
  };
}

function runCompletionEstimate() {
  const cases = [
    { label: 'Casual · 2 clicks/sec · 6h', seconds: 6 * 3600, clickRate: 2 },
    { label: 'Normal · 3 clicks/sec · 6h', seconds: 6 * 3600, clickRate: 3 },
    { label: 'Dedicated · 5 clicks/sec · 6h', seconds: 6 * 3600, clickRate: 5 },
    { label: 'Grinder · 3 clicks/sec · 10h', seconds: 10 * 3600, clickRate: 3 }
  ];
  console.log('=== Five-Step Cultivation Simulation ===');
  for (const item of cases) {
    const result = simulateCompletion(item);
    console.log(`${item.label} → ${result.finished ? 'Complete' : 'In progress'}: ${result.finalRealm} ${result.finalStage}/${STAGES_PER_REALM}`);
  }
}

