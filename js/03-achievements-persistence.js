/* Achievement rules, modal flow, offline progress, saves, and migrations. */

// ============= ACHIEVEMENTS SYSTEM =============

const ACHIEVEMENTS = [
  // Progression Achievements
  {
    id: "reach_qi_condensation",
    title: "Qi Condensation",
    description: "Awaken the flow of Qi and begin cultivating.",
    icon: "🌱",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('qi_condensation')
  },
  {
    id: "reach_foundation_establishment",
    title: "Foundation Established",
    description: "Establish a stable foundation for the Dao.",
    icon: "🏛️",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('foundation_establishment')
  },
  {
    id: "reach_golden_core",
    title: "Golden Core Perfected",
    description: "Condense a Golden Core within the dantian.",
    icon: "⚡",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('golden_core')
  },
  {
    id: "reach_nascent_soul",
    title: "Nascent Soul Awakened",
    description: "Form a Nascent Soul beyond the mortal body.",
    icon: "👁️",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('nascent_soul')
  },
  {
    id: "reach_soul_formation",
    title: "Soul Formation",
    description: "Transform the soul into a divine existence.",
    icon: "🦋",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('soul_formation')
  },
  {
    id: "reach_soul_transformation",
    title: "Soul Transformed",
    description: "Complete the transformation of body and soul.",
    icon: "🔮",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('soul_transformation')
  },
  {
    id: "reach_ascendant",
    title: "Ascendant",
    description: "Reach the summit of the First Step.",
    icon: "🌌",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('ascendant')
  },
  {
    id: "reach_nirvana_scryer",
    title: "Nirvana Scryer",
    description: "Enter Nirvana Scryer and fuse with the Dao.",
    icon: "☯️",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('nirvana_scryer')
  },
  {
    id: "reach_nirvana_cleanser",
    title: "Nirvana Cleanser",
    description: "Cleanse the self in Nirvana.",
    icon: "✨",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('nirvana_cleanser')
  },
  {
    id: "reach_nirvana_shatterer",
    title: "Nirvana Shatterer",
    description: "Transcend the tribulation of the Second Step.",
    icon: "⛈️",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('nirvana_shatterer')
  },
  {
    id: "reach_nirvana_void",
    title: "Nirvana Void",
    description: "Enter the universal scale of the Third Step.",
    icon: "🕳️",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('nirvana_void')
  },
  {
    id: "reach_spirit_void",
    title: "Spirit Void",
    description: "Reach Spirit Void.",
    icon: "💠",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('spirit_void')
  },
  {
    id: "reach_arcane_void",
    title: "Arcane Void",
    description: "Reach Arcane Void.",
    icon: "🔱",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('arcane_void')
  },
  {
    id: "reach_void_tribulant",
    title: "Void Tribulant",
    description: "Survive the final trial of the Third Step.",
    icon: "🌑",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('void_tribulant')
  },
  {
    id: "reach_dao_source_realm",
    title: "Dao Source",
    description: "Enter the true God realm.",
    icon: "🌠",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('dao_source_realm')
  },
  {
    id: "reach_ancestor_realm",
    title: "Ancestor",
    description: "Reach the absolute ceiling of cultivation.",
    icon: "👑",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ realmIndex }) => realmIndex >= idx('ancestor_realm')
  },

  // Reincarnation Achievements
  {
    id: "first_reincarnation",
    title: "Cycle of Rebirth",
    description: "Choose to begin anew after transcending mortality - perform a voluntary reincarnation.",
    icon: "🔄",
    category: "Reincarnation",
    hiddenUntilUnlocked: false,
    requirement: ({ voluntaryReincarnations }) => voluntaryReincarnations >= 1
  },
  {
    id: "rebirth_5",
    title: "Experienced Soul",
    description: "Reincarnate 5 times and accumulate wisdom across lifetimes.",
    icon: "🎭",
    category: "Reincarnation",
    hiddenUntilUnlocked: false,
    requirement: ({ reincTimes }) => reincTimes >= 5
  },
  {
    id: "rebirth_20",
    title: "Ancient Soul",
    description: "Reincarnate 20 times and become a master of the endless cycle.",
    icon: "👴",
    category: "Reincarnation",
    hiddenUntilUnlocked: false,
    requirement: ({ reincTimes }) => reincTimes >= 20
  },
  {
    id: "first_voluntary_reincarnation",
    title: "Willing Sacrifice",
    description: "Perform your first voluntary reincarnation at Soul Formation Stage 1+ for full Karma rewards.",
    icon: "♻️",
    category: "Reincarnation",
    hiddenUntilUnlocked: false,
    requirement: ({ voluntaryReincarnations }) => voluntaryReincarnations >= 1
  },
  {
    id: "death_and_return",
    title: "Death and Return",
    description: "Experience death by lifespan exhaustion and return through forced reincarnation.",
    icon: "💀",
    category: "Reincarnation",
    hiddenUntilUnlocked: false,
    requirement: ({ forcedReincarnationCount }) => forcedReincarnationCount >= 1
  },

  // Economy / Skills Achievements
  {
    id: "qpc_100",
    title: "Mighty Click",
    description: "Reach 100 Qi per click and feel the power in your fingertips.",
    icon: "👆",
    category: "Skills",
    hiddenUntilUnlocked: false,
    requirement: ({ qpc }) => qpc >= 100
  },
  {
    id: "qps_1k",
    title: "Steady Flow",
    description: "Reach 1,000 Qi per second and achieve constant cultivation.",
    icon: "🌊",
    category: "Skills",
    hiddenUntilUnlocked: false,
    requirement: ({ qps }) => qps >= 1000
  },
  {
    id: "skill_10_any",
    title: "Skill Master",
    description: "Raise any single skill to Level 10 and show your dedication.",
    icon: "📚",
    category: "Skills",
    hiddenUntilUnlocked: false,
    requirement: ({ skills }) => Object.values(skills).some(v => (typeof v === 'object' ? (v.total || 0) : v) >= 10)
  },
  {
    id: "shopper_100_purchases",
    title: "Devoted Student",
    description: "Buy 100 skills total and prove your commitment to growth.",
    icon: "🛒",
    category: "Skills",
    hiddenUntilUnlocked: false,
    requirement: ({ totalPurchases }) => totalPurchases >= 100
  },

  // Time / Offline Achievements
  {
    id: "meditation_master",
    title: "Meditation Master",
    description: "Earn offline Qi from 8+ hours of meditation in one session.",
    icon: "🧘",
    category: "Time",
    hiddenUntilUnlocked: false,
    requirement: ({ offlineHours }) => offlineHours >= 8
  },
  {
    id: "lifespan_saver",
    title: "Longevity Expert",
    description: "Survive 3000 years in a single life without reincarnating.",
    icon: "⏳",
    category: "Time",
    hiddenUntilUnlocked: false,
    requirement: ({ ageYears, isCleanRun }) => ageYears >= 3000 && isCleanRun
  },

  // Secrets / Misc Achievements
  {
    id: "dao_seeker",
    title: "Dao Seeker",
    description: "Open the Achievements panel and begin seeking the path of accomplishment.",
    icon: "🔍",
    category: "Misc",
    hiddenUntilUnlocked: false,
    requirement: ({ achievementsPanelOpened }) => achievementsPanelOpened === true
  },
  {
    id: "harmonious_clicks",
    title: "Harmonious Clicker",
    description: "Perform 1,000 total clicks and achieve clicking harmony.",
    icon: "🎵",
    category: "Misc",
    hiddenUntilUnlocked: false,
    requirement: ({ totalClicks }) => totalClicks >= 1000
  },

  // Cycle and Karma Achievements
  {
    id: "end_mortal_cycle",
    title: "Beyond the Starting World",
    description: "Reach Ascendant Stage 10 and cross beyond the starting world.",
    icon: "🦋",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ cycleTransitions }) => cycleTransitions >= 1
  },
  {
    id: "spirit_ascendant",
    title: "Spirit Ascendant",
    description: "Enter Nirvana Scryer and begin cultivating in the higher worlds.",
    icon: "🌌",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ currentCycle }) => currentCycle === 'spirit'
  },
  {
    id: "karmic_mastery",
    title: "Karmic Mastery",
    description: "Reach 10,000 Karma and master the laws of cause and effect.",
    icon: "⚖️",
    category: "Reincarnation",
    hiddenUntilUnlocked: false,
    requirement: ({ karma }) => karma >= 10000
  },
  {
    id: "celestial_eternity",
    title: "Celestial Eternity",
    description: "Complete the path and reach the Ancestor Realm.",
    icon: "♾️",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ spiritCycleComplete }) => spiritCycleComplete === true
  },
  {
    id: "break_mortal_shackles",
    title: "Break the Mortal Shackles",
    description: "Cross the Ascendant · Void Returning boundary and enter the higher worlds.",
    icon: "⛓️",
    category: "Progression",
    hiddenUntilUnlocked: false,
    requirement: ({ unlockedBeyondSpirit }) => unlockedBeyondSpirit === true
  },

  // Impossible Achievements - Hidden legendary goals
  {
    id: "infinite_qi",
    title: "Qi Without End",
    description: "Reach 1e100 Qi in a single lifetime. The universe trembles before your power.",
    icon: "🌌",
    category: "Impossible",
    hiddenUntilUnlocked: true,
    requirement: ({ qi }) => qi >= 1e100
  },
  {
    id: "eternal_clicker",
    title: "Finger of the Dao",
    description: "Perform 1,000,000,000 clicks in total. Your finger has transcended mortality.",
    icon: "👆",
    category: "Impossible",
    hiddenUntilUnlocked: true,
    requirement: ({ totalClicks }) => totalClicks >= 1_000_000_000
  },
  {
    id: "karma_overflow",
    title: "Karma Overflow",
    description: "Accumulate over 1,000,000 Karma. You have broken the cosmic balance itself.",
    icon: "⚖️",
    category: "Impossible",
    hiddenUntilUnlocked: true,
    requirement: ({ karma }) => karma >= 1_000_000
  },
  {
    id: "beyond_time",
    title: "Beyond Time Itself",
    description: "Survive 1,000,000 in-game years without dying. Time bows to your will.",
    icon: "⏰",
    category: "Impossible",
    hiddenUntilUnlocked: true,
    requirement: ({ yearsAlive }) => yearsAlive >= 1_000_000
  },
  {
    id: "click_master",
    title: "The Endless Tap",
    description: "Reach 1e12 Qi per click. Each tap reshapes reality.",
    icon: "💫",
    category: "Impossible",
    hiddenUntilUnlocked: true,
    requirement: ({ qpc }) => qpc >= 1e12
  },
  {
    id: "speed_demon",
    title: "Beyond the Dao of Time",
    description: "Unlock time speed x100. You have shattered the temporal prison.",
    icon: "⚡",
    category: "Impossible",
    hiddenUntilUnlocked: true,
    requirement: ({ maxTimeSpeed }) => maxTimeSpeed >= 100
  },
  {
    id: "cycle_breaker",
    title: "Cycle Breaker",
    description: "Reach the Ancestor Realm without any forced reincarnations. Death fears you.",
    icon: "🔗",
    category: "Impossible",
    hiddenUntilUnlocked: true,
    requirement: ({ forcedReincarnationCount, currentCycle, spiritCycleComplete }) => 
      forcedReincarnationCount === 0 && currentCycle === 'spirit' && spiritCycleComplete
  },
  {
    id: "realm_infinite",
    title: "Beyond Ancestor Realm",
    description: "Reach a realm beyond Ancestor Realm. The impossible becomes possible.",
    icon: "🌟",
    category: "Impossible",
    hiddenUntilUnlocked: true,
    requirement: ({ realmIndex }) => realmIndex > idx('ancestor_realm')
  },
  {
    id: "dao_god",
    title: "God of Cultivation",
    description: "Max every skill to Level 999. You have mastered all earthly techniques.",
    icon: "👑",
    category: "Impossible",
    hiddenUntilUnlocked: true,
    requirement: ({ skills }) => Object.keys(skills).length >= 5 && Object.values(skills).every(v => (typeof v === 'object' ? (v.total || 0) : v) >= 999)
  },
  {
    id: "ultimate_patience",
    title: "The Eternal Wait",
    description: "Leave the game running for 1000 real hours. Patience is the greatest virtue.",
    icon: "🧘",
    category: "Impossible",
    hiddenUntilUnlocked: true,
    requirement: ({ totalPlayTimeHours }) => totalPlayTimeHours >= 1000
  }
];

// Unlocked feature requirements (using ID-based realm lookups)
// Achievement state management
let achievementState = loadAchievementState(activeSlot);

function createDefaultAchievementState() {
  return {
    unlocked: {},
    totalClicks: 0,
    totalPurchases: 0,
    achievementsPanelOpened: false,
    cycleTransitions: 0,
    spiritCycleComplete: false,
    voluntaryReincarnations: 0,
    forcedReincarnationCount: 0,
    totalPlayTimeSeconds: 0
  };
}

function normalizeAchievementState(data) {
  const normalized = { ...createDefaultAchievementState(), ...(data && typeof data === 'object' ? data : {}) };
  normalized.unlocked = normalized.unlocked && typeof normalized.unlocked === 'object' && !Array.isArray(normalized.unlocked)
    ? normalized.unlocked
    : {};
  for (const key of ['totalClicks', 'totalPurchases', 'cycleTransitions', 'voluntaryReincarnations', 'forcedReincarnationCount']) {
    const value = Number(normalized[key]);
    normalized[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  const playTime = Number(normalized.totalPlayTimeSeconds);
  normalized.totalPlayTimeSeconds = Number.isFinite(playTime) ? Math.max(0, Math.min(playTime, 1e12)) : 0;
  normalized.achievementsPanelOpened = !!normalized.achievementsPanelOpened;
  normalized.spiritCycleComplete = !!normalized.spiritCycleComplete;
  return normalized;
}

function loadAchievementState(slot = activeSlot) {
  try {
    const saved = localStorage.getItem(getAchievementsKeyForSlot(slot));
    if (saved) return normalizeAchievementState(JSON.parse(saved));
  } catch (e) {
    console.warn('Failed to load achievement state:', e);
  }
  return createDefaultAchievementState();
}

function saveAchievementState(slot = activeSlot) {
  try {
    localStorage.setItem(getAchievementsKeyForSlot(slot), JSON.stringify(achievementState));
  } catch (e) {
    console.warn('Failed to save achievement state:', e);
  }
}

function hasAchievement(id) {
  return !!achievementState.unlocked[id];
}

function unlockAchievement(id) {
  if (hasAchievement(id)) return false; // Already unlocked
  
  const achievement = ACHIEVEMENTS.find(a => a.id === id);
  if (!achievement) return false;
  
  achievementState.unlocked[id] = {
    unlockedAt: Date.now(),
    title: achievement.title,
    description: achievement.description,
    icon: achievement.icon
  };
  
  showAchievementToast(achievement);
  showAchievementModal(achievement);
  updateAchievementsBadge();
  saveAchievementState();
  
  return true;
}

function checkAchievements(context = {}) {
  // The menu starts with the default Qi Condensation state (realm index 0).
  // Do not award progression achievements until the player has begun or loaded
  // an actual cultivation session.
  if (!gameActive) return false;

  // Build context object with current game state
  const ctx = {
    realmIndex: S.realmIndex,
    stage: S.stage,
    qpc: totalQPC(),
    qps: totalQPS(),
    qi: S.qi,
    skills: S.skills,
    reincTimes: S.reinc.times,
    karma: S.reinc.karma,
    currentCycle: S.currentCycle,
    lifespanPercent: S.lifespan.max > 0 ? (S.lifespan.current / S.lifespan.max) * 100 : 100,
    ageYears: S.age || 0,
    yearsAlive: S.age || 0,
    isCleanRun: S.life?.isCleanRun || false,
    totalClicks: achievementState.totalClicks,
    totalPurchases: achievementState.totalPurchases,
    achievementsPanelOpened: achievementState.achievementsPanelOpened,
    cycleTransitions: achievementState.cycleTransitions || 0,
    spiritCycleComplete: achievementState.spiritCycleComplete || false,
    unlockedBeyondSpirit: S.flags?.unlockedBeyondSpirit || false,
    voluntaryReincarnations: achievementState.voluntaryReincarnations || 0,
    forcedReincarnationCount: achievementState.forcedReincarnationCount || 0,
    totalPlayTimeHours: (achievementState.totalPlayTimeSeconds || 0) / 3600,
    maxTimeSpeed: Math.max(0, ...(S.meta?.unlockedSpeeds || [0]), Number(S.timeSpeed?.current) || 0),
    ...context // Override with any specific context passed in
  };
  
  // Check each achievement
  ACHIEVEMENTS.forEach(achievement => {
    if (!hasAchievement(achievement.id) && achievement.requirement(ctx)) {
      unlockAchievement(achievement.id);
    }
  });
}

let lastThrottledAchievementCheck = 0;
function checkAchievementsThrottled(context = {}, force = false) {
  const timestamp = Date.now();
  if (!force && timestamp - lastThrottledAchievementCheck < 1000) return false;
  lastThrottledAchievementCheck = timestamp;
  checkAchievements(context);
  return true;
}

/**
 * Revalidate realm-based progression achievements after save migration.
 * This ensures achievements unlock correctly after realm indices shift.
 * Called once after realm-system migration completes.
 */
function revalidateRealmAchievements() {
  if (DEBUG_MODE) console.log('[Achievements] Revalidating realm-based achievements after migration...');
  
  // Only revalidate progression achievements (realm/stage based)
  const realmAchievements = ACHIEVEMENTS.filter(a => 
    a.category === 'Progression' && 
    a.id.includes('reach_') &&
    !a.id.includes('immortal') // Skip Ancestor Realm check as it's >= based
  );
  
  let revalidatedCount = 0;
  realmAchievements.forEach(achievement => {
    if (!hasAchievement(achievement.id)) {
      // Build context
      const ctx = {
        realmIndex: S.realmIndex,
        stage: S.stage,
        currentCycle: S.currentCycle,
        cycleTransitions: achievementState.cycleTransitions || 0,
        spiritCycleComplete: achievementState.spiritCycleComplete || false,
        unlockedBeyondSpirit: S.flags?.unlockedBeyondSpirit || false
      };
      
      // Check if achievement should be unlocked based on current state
      if (achievement.requirement(ctx)) {
        unlockAchievement(achievement.id);
        revalidatedCount++;
        if (DEBUG_MODE) console.log(`[Achievements] Revalidated: ${achievement.id}`);
      }
    }
  });
  
  if (DEBUG_MODE) console.log(`[Achievements] Revalidation complete. ${revalidatedCount} achievement(s) unlocked.`);
}

/**
 * Generic toast notification (reuses achievement toast styling)
 * @param {string} message - Message to display
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="achievement-toast-icon">✨</div>
    <div class="achievement-toast-content">
      <div class="achievement-toast-desc">${message}</div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function showAchievementToast(achievement) {
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="achievement-toast-icon">${achievement.icon}</div>
    <div class="achievement-toast-content">
      <div class="achievement-toast-title">Achievement Unlocked!</div>
      <div class="achievement-toast-desc">${achievement.title}</div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showAchievementModal(achievement) {
  showModal(
    '🏆 Achievement Unlocked!',
    `<div style="text-align: center; margin-bottom: 16px; font-size: 2.5em;">${achievement.icon}</div>
     <div style="color: var(--accent); font-weight: 600; margin-bottom: 8px;">${achievement.title}</div>
     <div>${achievement.description}</div>`,
    ''
  );
}

function updateAchievementsBadge() {
  const badgeEl = document.getElementById('achievementsBadge');
  if (badgeEl) {
    const unlockedCount = Object.keys(achievementState.unlocked).length;
    const totalCount = ACHIEVEMENTS.length;
    badgeEl.textContent = `${unlockedCount}/${totalCount}`;
  }
}

// ============= MODAL MANAGER (Centralized & Debounced) =============
// Singleton modal controller to prevent overlapping/duplicate popups
const ModalManager = {
  _queue: [],
  _isActive: false,
  _currentOverlay: null,
  _previousTimeSpeed: null,
  _wasPausedBeforeModal: false,
  
  /**
   * Show an alert modal (single button: Continue)
   * @returns {Promise<void>} Resolves when modal is dismissed
   */
  async alert({ title, body, confirmText = 'Continue', icon = '' }) {
    return new Promise((resolve) => {
      this._enqueue({ 
        type: 'alert', 
        title, 
        body, 
        confirmText, 
        icon, 
        onConfirm: resolve 
      });
    });
  },
  
  /**
   * Show a confirm modal (two buttons: Cancel, Confirm)
   * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
   */
  async confirm({ title, body, confirmText = 'Confirm', cancelText = 'Cancel', icon = '' }) {
    return new Promise((resolve) => {
      this._enqueue({ 
        type: 'confirm', 
        title, 
        body, 
        confirmText, 
        cancelText, 
        icon, 
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  },
  
  _enqueue(modalData) {
    this._queue.push(modalData);
    if (!this._isActive) {
      this._displayNext();
    }
  },
  
  _displayNext() {
    if (this._queue.length === 0) {
      this._isActive = false;
      document.body.dataset.modalOpen = '0';
      return;
    }
    
    this._isActive = true;
    document.body.dataset.modalOpen = '1';
    
    const data = this._queue.shift();
    
    // Pause game time when modal opens (only capture if not already paused by another modal)
    if (!S.timeSpeed?.paused && this._previousTimeSpeed === null) {
      this._previousTimeSpeed = S.timeSpeed?.current || 1;
      this._wasPausedBeforeModal = false;
      S.timeSpeed = S.timeSpeed || {};
      S.timeSpeed.paused = true;
    } else if (S.timeSpeed?.paused && this._previousTimeSpeed === null) {
      // Player was manually paused before modal — don't restore speed on close
      this._wasPausedBeforeModal = true;
    }
    
    // Create modal DOM
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    let buttons;
    if (data.type === 'confirm') {
      buttons = `
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="btn danger modal-button" data-action="cancel">${data.cancelText}</button>
          <button class="btn primary modal-button" data-action="confirm">${data.confirmText}</button>
        </div>
      `;
    } else {
      buttons = `<button class="btn primary modal-button" data-action="confirm">${data.confirmText}</button>`;
    }
    
    overlay.innerHTML = `
      <div class="modal">
        ${data.icon ? `<div class="modal-icon">${data.icon}</div>` : ''}
        <h3 class="modal-title">${data.title}</h3>
        <div class="modal-message">${data.body}</div>
        ${buttons}
      </div>
    `;
    
    document.body.appendChild(overlay);
    this._currentOverlay = overlay;
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });
    
    // Set up event handlers. Ignore duplicate clicks/keys while the overlay fades out.
    let closed = false;
    const handleClose = (confirmed) => {
      if (closed) return;
      closed = true;
      overlay.querySelectorAll('.modal-button').forEach(button => { button.disabled = true; });
      this._cleanup();
      if (confirmed && data.onConfirm) {
        data.onConfirm();
      } else if (!confirmed && data.onCancel) {
        data.onCancel();
      }
      // The old listener is already removed; the next modal can safely appear during the fade.
      window.setTimeout(() => this._displayNext(), 100);
    };
    
    // Button clicks
    overlay.querySelectorAll('.modal-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        handleClose(action === 'confirm');
      });
    });
    
    // Keyboard events
    const handleKeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleClose(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(data.type === 'confirm' ? false : true);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    
    // Background click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        handleClose(data.type === 'confirm' ? false : true);
      }
    });
    
    // Store cleanup function
    overlay._cleanup = () => {
      document.removeEventListener('keydown', handleKeydown);
    };
    
    // Trap focus inside modal
    const focusableElements = overlay.querySelectorAll('button');
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  },
  
  _cleanup() {
    if (!this._currentOverlay) return;
    
    const overlay = this._currentOverlay;
    // Remove global listeners synchronously before another modal is allowed to open.
    if (overlay._cleanup) overlay._cleanup();
    overlay.classList.remove('active');
    
    window.setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);
    
    // Restore previous time speed if no more modals and player wasn't already paused
    if (this._queue.length === 0 && this._previousTimeSpeed !== null && !this._wasPausedBeforeModal) {
      if (S.timeSpeed) {
        S.timeSpeed.paused = false;
        S.timeSpeed.current = this._previousTimeSpeed;
      }
      this._previousTimeSpeed = null;
      this._wasPausedBeforeModal = false;
    } else if (this._queue.length === 0) {
      // Was paused before modal — keep it paused, just clear tracking
      this._previousTimeSpeed = null;
      this._wasPausedBeforeModal = false;
    }
    
    this._currentOverlay = null;
  },
  
  /**
   * Emergency close all modals (for reset/import functions)
   */
};

// Legacy wrapper functions for compatibility
function showModal(title, message, icon = '') {
  ModalManager.alert({ title, body: message, icon });
}

function showConfirm(title, message, onConfirm, onCancel = null, icon = '') {
  ModalManager.confirm({ title, body: message, icon }).then(confirmed => {
    if (confirmed && onConfirm) {
      onConfirm();
    } else if (!confirmed && onCancel) {
      onCancel();
    }
  });
}


// Legacy functions removed - ModalManager handles everything internally

// New helper to close all modals (for reset/import)
// ============= UI INITIALIZATION =============

// ============= OFFLINE PROGRESS & SESSION MANAGEMENT =============

/**
 * Updates in-memory session snapshot metadata.
 * This is persisted only on manual save.
 */
function saveSessionSnapshot() {
  if (!S || !initComplete || !gameActive) return;
  
  S.session = S.session || {};
  S.session.lastTs = Date.now();
  S.session.lastSpeed = getTimeSpeed();
  S.session.lastRealmIndex = S.realmIndex;
  S.session.lastQi = S.qi;
}

// formatYears() is defined above (~line 1225) with full withUnit support.
// Do NOT redefine it here.

/**
 * Centralized lifespan gate check. Call this after any time advancement.
 * Prevents "stuck at max lifespan" by immediately triggering death if threshold exceeded.
 */
function checkLifespanGate() {
  // Skip if immortal
  if (isImmortal()) return;
  
  // Skip if already processing death or latch is set
  if (S.flags?.lifespanHandled || S.lifecycle?.isReincarnating) return;
  
  // Migrate old ageYears to age
  const currentAge = S.age !== undefined ? S.age : (S.ageYears || 0);
  if(S.age === undefined) S.age = currentAge;
  
  // Get the exact configured lifespan for this realm
  const maxLife = getMaxLifespan();
  if (maxLife === null) return; // Immortal realm
  
  // Check if age exceeded lifespan
  if (currentAge >= maxLife) {
    // Set latch flag to prevent double-trigger
    S.flags = S.flags || {};
    S.flags.lifespanHandled = true;
    
    // Handle death immediately
    handleLifespanEnd();
  }
}

/**
 * Apply offline progress on resume (after tab returns or on initial page load).
 * Computes Qi gains, ages the cultivator, and checks for death.
 * Shows a single modal with results (or death modal if lifespan exceeded).
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.showPopup - Whether to show the offline gains modal (default: true)
 */
function persistConsumedSessionSnapshot() {
  // Store the consumed marker before granting anything. This makes offline rewards
  // at-most-once even if the browser closes or reloads during reward processing.
  try {
    if (!activeSlot) return false;
    S.session = null;
    S.version = VERSION;
    S.realmSystemVersion = REALM_SYSTEM_VERSION;
    S.lastSave = now();
    localStorage.setItem(getSaveKeyForSlot(), JSON.stringify(S));
    updateLastSave();
    return true;
  } catch (e) {
    console.error('Could not consume offline session safely:', e);
    return false;
  }
}

async function applyOfflineProgressOnResume({ showPopup = true } = {}) {
  // Check if we have a valid session snapshot.
  if (!S.session?.lastTs) {
    S.session = null;
    return;
  }

  const sessionSnapshot = { ...S.session };
  const lastSpeed = Number(sessionSnapshot.lastSpeed) || 0;
  const sessionTimestamp = Number(sessionSnapshot.lastTs);

  // Claim the snapshot durably before applying rewards. Never grant when that write fails.
  if (!persistConsumedSessionSnapshot()) {
    S.session = sessionSnapshot;
    return;
  }

  // If the previous session was paused, consume the snapshot without granting progress.
  if (lastSpeed <= 0) {
    save();
    return;
  }

  // Calculate elapsed time from the claimed snapshot.
  const elapsedMs = Date.now() - sessionTimestamp;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));

  // No meaningful time passed; persist a fresh active-session snapshot.
  if (elapsedSec < 1) {
    save();
    return;
  }
  
  // Cap offline time
  const cappedSec = Math.min(elapsedSec, BAL.offline.capHours * 3600);
  
  // IMPORTANT: Qi gains do NOT scale with speed (speed is a live-only concept)
  // Offline Qi = base production × time × offline multiplier (no speed)
  const qpsProduction = totalQPS();
  const offlineMultiplier = totalOfflineMult();
  const rawQiGains = qpsProduction * cappedSec * offlineMultiplier;
  const qiGains = Number.isFinite(rawQiGains) ? Math.max(0, Math.min(rawQiGains, 1e300)) : 1e300;
  
  // Aging DOES scale with speed (time passes faster at higher speeds)
  const effectiveTimeForAging = cappedSec * lastSpeed;
  const baseYearsPerSecond = BAL.lifespan?.yearsPerSecond || 1.0;
  const yearsPassed = effectiveTimeForAging * baseYearsPerSecond;
  
  // Apply gains with offline karma bonus
  if (qiGains > 0) {
    safeAddQi(qiGains);
    
    // Offline Karma Bonus: Boost lifetime Qi contribution for offline gains
    // This encourages longer offline sessions and rewards patience
    const offlineKarmaBonus = BAL.reincarnation?.offlineKarmaBonus || 1.0;
    const bonusMultiplier = Math.max(1.0, offlineKarmaBonus);
    const lifetimeContribution = qiGains * bonusMultiplier;
    
    S.reinc.lifetimeQi = Math.min(1e300, Math.max(0, safeNum(S.reinc.lifetimeQi, 0) + lifetimeContribution));
    
    if (DEBUG_MODE) {
      console.log(`[Offline] Karma bonus applied: ${bonusMultiplier.toFixed(2)}× → ${fmt(lifetimeContribution)} lifetime Qi`);
    }
  }
  
  // Age the cultivator (migrate old ageYears if needed)
  if(S.age === undefined && S.ageYears !== undefined) {
    S.age = S.ageYears;
    delete S.ageYears;
  }
  if(!S.age || !isFinite(S.age)) {
    S.age = 0;
  }
  
  let lifespanExceeded = false;
  if (!isImmortal() && S.lifespan?.max !== null) {
    const oldAge = S.age;
    const newAge = oldAge + yearsPassed;
    
    // Guard against NaN/Infinity
    if(!isFinite(newAge)) {
      console.warn('Offline age calculation resulted in non-finite value');
      S.age = oldAge; // Keep old value
    } else {
      // Clamp age to max lifespan
      S.age = Math.max(0, Math.min(newAge, S.lifespan.max));
      
      // Update current lifespan for backwards compatibility
      S.lifespan.current = Math.max(0, S.lifespan.max - S.age);
      
      // Check if lifespan exceeded
      if (S.age >= S.lifespan.max) {
        lifespanExceeded = true;
      }
    }
  } else if (!isImmortal()) {
    // Just increase age for non-immortals without max
    S.age += yearsPassed;
  }
  
  // Track offline hours for achievements
  const offlineHours = cappedSec / 3600;
  checkAchievements({ offlineHours });
  
  // Clear session snapshot (prevent double-counting)
  S.session = null;
  
  // If lifespan exceeded, persist the capped age with no pending session before
  // starting the death flow. A reload will re-run the single death gate, not replay Qi.
  if (lifespanExceeded) {
    persistConsumedSessionSnapshot();
    checkLifespanGate();
    return;
  }

  // Persist the reward before presenting UI, so closing the popup cannot replay it.
  save();

  // Show offline gains modal (only if not dead and showPopup = true)
  if (showPopup && qiGains > 0) {
    const hoursFormatted = fmt(cappedSec / 3600);
    const qiFormatted = fmt(Math.floor(qiGains));
    const yearsFormatted = formatYears(yearsPassed, true); // Includes "years" unit
    const offlineMultFormatted = fmt(offlineMultiplier);
    const currentRealm = realms[S.realmIndex]?.name || 'Unknown Realm';
    const speedFormatted = fmt(lastSpeed);
    
    let lifespanStatus;
    if (isImmortal()) {
      lifespanStatus = '<strong>Age:</strong> ∞ Immortal';
    } else {
      const currentAge = S.age !== undefined ? S.age : 0;
      const ageStr = formatYears(currentAge, true); // Includes "years"
      const maxStr = formatYears(S.lifespan.max, true); // Includes "years"
      lifespanStatus = `<strong>Age:</strong> ${ageStr} / ${maxStr}`;
    }
    
    const message = `
      <div style="text-align: left; margin: 8px 0;">
        <div><strong>Qi Gained:</strong> <span class="highlight">+${qiFormatted}</span></div>
        <div><strong>Offline Multiplier:</strong> ×${offlineMultFormatted}</div>
        <div><strong>Time Passed:</strong> ${yearsFormatted} (${hoursFormatted}h real-time)</div>
        <div><strong>Time Speed Used:</strong> ${speedFormatted}×</div>
        <div><strong>Current Realm:</strong> ${currentRealm}</div>
        <div>${lifespanStatus}</div>
      </div>
      <br><em style="color: var(--muted);">Your cultivation continued in silence, and the Dao answered.</em>
    `;
    
    await showModal('⏰ While You Were Away...', message, '🌙');
  }
}

