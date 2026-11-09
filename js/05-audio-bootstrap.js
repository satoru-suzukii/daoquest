/* Optional audio system and final bootstrap. Loaded last by index.html. */

// ============= BACKGROUND MUSIC SYSTEM =============

const PLAYLIST = [
  'assets/music/music1.mp3',
  'assets/music/music2.mp3',
  'assets/music/music3.mp3',
  'assets/music/music4.mp3',
  'assets/music/music5.mp3',
  'assets/music/music6.mp3',
  'assets/music/music7.mp3',
];

let currentIndex = 0;
let audio = document.getElementById('bgm') || createAudio();

function createAudio(){
  const a = document.createElement('audio');
  a.id = 'bgm';
  a.preload = 'auto';
  document.body.appendChild(a);
  return a;
}

// Music settings
const MUSIC_SETTINGS_KEY = 'daoQuestMusicV1';
const LEGACY_MUSIC_SETTINGS_KEYS = ['wayOfTheDaoMusicV1', 'xianxiaMusic'];

function loadMusicSettings(){
  const fallback = { enabled: true, volume: 0.4 };
  try {
    let raw = localStorage.getItem(MUSIC_SETTINGS_KEY);
    if (!raw) {
      for (const previousKey of LEGACY_MUSIC_SETTINGS_KEYS) {
        const previousSettings = localStorage.getItem(previousKey);
        if (previousSettings) {
          localStorage.setItem(MUSIC_SETTINGS_KEY, previousSettings);
          localStorage.removeItem(previousKey);
          raw = previousSettings;
          break;
        }
      }
    }
    const parsed = raw ? JSON.parse(raw) : fallback;
    const volume = Number(parsed?.volume);
    return {
      enabled: parsed?.enabled !== false,
      volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : fallback.volume
    };
  } catch {
    return fallback;
  }
}

function saveMusicSettings(s){
  localStorage.setItem(MUSIC_SETTINGS_KEY, JSON.stringify(s));
}

let musicSettings = loadMusicSettings();

// Initialize audio
audio.volume = musicSettings.volume;
audio.muted = !musicSettings.enabled;

function updateSettingsMuteButton() {
  const muteBtn = document.getElementById('musicMuteToggle');
  if (muteBtn) {
    muteBtn.textContent = musicSettings.enabled ? 'Mute' : 'Unmute';
  }
}

function updateMenuMusicButton() {
  if (menuMusicBtn) {
    menuMusicBtn.textContent = musicSettings.enabled ? 'Music: On' : 'Music: Off';
  }
}

function setMusicEnabled(enabled) {
  musicSettings.enabled = !!enabled;
  audio.muted = !musicSettings.enabled;
  saveMusicSettings(musicSettings);
  updateSettingsMuteButton();
  updateMenuMusicButton();
  if (musicSettings.enabled) {
    playSafe();
  } else {
    musicTransitionId++;
    audio.pause();
  }
}

function toggleMusicEnabled() {
  setMusicEnabled(!musicSettings.enabled);
}

function loadTrack(i){
  currentIndex = (i + PLAYLIST.length) % PLAYLIST.length;
  audio.src = PLAYLIST[currentIndex];
  updateTrackInfo();
}

function playSafe(){
  return audio.play().catch(() => {
    const note = document.getElementById('autoplayNote');
    if (!note) return;
    note.textContent = audio.error
      ? 'Soundtrack files are not included in this source archive. Add MP3 tracks under assets/music to enable music.'
      : 'Autoplay is blocked by the browser. Interact with the game to start music.';
    note.style.display = 'block';
  });
}

function updateTrackInfo(){
  const el = document.getElementById('trackInfo');
  if (el) el.textContent = `Track ${currentIndex+1}/${PLAYLIST.length}`;
}

let musicTransitionId = 0;
async function crossfadeTo(nextIndex, dur=800){
  if (!musicSettings.enabled) return;
  const transitionId = ++musicTransitionId;
  const startVol = audio.volume;
  const targetVol = musicSettings.volume;
  const t0 = performance.now();
  while (performance.now() - t0 < dur){
    if (transitionId !== musicTransitionId || !musicSettings.enabled) return;
    const k = (performance.now() - t0) / dur;
    audio.volume = startVol * (1 - k);
    await new Promise(r=>requestAnimationFrame(r));
  }
  if (transitionId !== musicTransitionId || !musicSettings.enabled) return;
  loadTrack(nextIndex);
  await audio.play().catch(()=>{});
  const t1 = performance.now();
  while (performance.now() - t1 < dur){
    if (transitionId !== musicTransitionId || !musicSettings.enabled) return;
    const k = (performance.now() - t1) / dur;
    audio.volume = targetVol * k;
    await new Promise(r=>requestAnimationFrame(r));
  }
  audio.volume = targetVol;
}

audio.onended = () => { if (musicSettings.enabled) crossfadeTo(currentIndex + 1); };

// Initialize music system
function initMusicSystem(){
  // Start playlist
  loadTrack(0);
  if (musicSettings.enabled) playSafe();

  // Settings UI elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const volumeSlider = document.getElementById('musicVolume');
  const muteBtn = document.getElementById('musicMuteToggle');

  if (!settingsBtn || !settingsPanel || !volumeSlider || !muteBtn) return;

  // Panel toggle
  settingsBtn.addEventListener('click', () => {
    const open = settingsPanel.classList.toggle('open');
    settingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    settingsPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    
    // Dynamic positioning relative to button
    if (open) {
      const btn = settingsBtn;
      const panel = settingsPanel;
      const r = btn.getBoundingClientRect();
      panel.style.position = 'fixed';
      panel.style.top = `${r.bottom + 8}px`;
      panel.style.left = 'auto';
      panel.style.right = `${Math.max(20, (window.innerWidth - r.right))}px`;
    }
  });

  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
      settingsPanel.classList.remove('open');
      settingsBtn.setAttribute('aria-expanded', 'false');
      settingsPanel.setAttribute('aria-hidden', 'true');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      settingsPanel.classList.remove('open');
      settingsBtn.setAttribute('aria-expanded', 'false');
      settingsPanel.setAttribute('aria-hidden', 'true');
    }
  });

  // Initialize controls from settings
  volumeSlider.value = Math.round(musicSettings.volume * 100);
  updateSettingsMuteButton();
  updateMenuMusicButton();

  // Volume control
  volumeSlider.addEventListener('input', () => {
    const v = Math.max(0, Math.min(100, Number(volumeSlider.value))) / 100;
    audio.volume = v;
    musicSettings.volume = v;
    saveMusicSettings(musicSettings);
  });

  // Mute/unmute control
  muteBtn.addEventListener('click', () => {
    toggleMusicEnabled();
  });

  // Resume on user interaction if autoplay was blocked
  window.addEventListener('pointerdown', () => {
    if (!audio.src) loadTrack(currentIndex);
    if (musicSettings.enabled && audio.paused) playSafe();
    const note = document.getElementById('autoplayNote');
    if (note) note.style.display = 'none';
  }, { once: true });
}

// === DEV MODE CONTROL ===
// Define allowed conditions for developer mode
const urlParams = new URLSearchParams(window.location.search);
const devKey = urlParams.get('key');
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isDevParam = new URLSearchParams(window.location.search).get('dev') === '1';
const isSecretKey = (devKey === 'SANTI_SECRET_777');

// Final condition: allowed only if local, ?dev=1, or correct secret key
const isAllowedDev = isLocal || isDevParam || isSecretKey;

if (isAllowedDev) {
  window.runCompletionEstimate = runCompletionEstimate;
  window.simulateCompletion = simulateCompletion;
  console.log("🧪 Dev mode enabled — simulator active");
  // Optionally: createDevPanel();
} else {
  console.log("🔒 Dev mode disabled in production.");
}

// Cultivator Image Management
function updateCultivatorImage() {
  const img = document.querySelector('#cultivatorImg');
  if (!img) return;
  
  const targetImage = (S.currentCycle === 'spirit')
    ? 'assets/cultivator2.jpg'
    : 'assets/cultivator.jpg';
  
  // Only update if image needs to change
  if (img.src.includes(targetImage.split('/').pop())) return;
  
  // Fade out current image
  img.classList.add('fade-out');
  
  // After fade completes, change image and fade back in
  setTimeout(() => {
    img.src = targetImage;
    img.classList.remove('fade-out');
  }, 250); // Half the transition duration
}

// Update image when cycle changes
// Call on game initialization and after reincarnation
document.addEventListener('DOMContentLoaded', () => {
  updateCultivatorImage();
  
  // Dev-mode guard: Check for lifespan UI elements and formatting issues
  if(DEBUG_MODE) {
    // Check for correct lifespan UI elements
    const lifespanValueCount = document.querySelectorAll('#lifespanValue').length;
    const lifespanProgressCount = document.querySelectorAll('#lifespanProgress').length;
    
    if(lifespanValueCount !== 1) {
      console.error(`❌ Expected 1 #lifespanValue element, found ${lifespanValueCount}`);
    }
    
    if(lifespanProgressCount !== 1) {
      console.error(`❌ Expected 1 #lifespanProgress element, found ${lifespanProgressCount}`);
    }
    
    // Set up periodic checks for UI consistency
    setInterval(() => {
      const lifespanValue = document.getElementById('lifespanValue');
      
      // Check for "years" in lifespan value (should be numeric only)
      if(lifespanValue && lifespanValue.textContent.toLowerCase().includes('year')) {
        console.error('❌ CRITICAL BUG: "years" text found in lifespan value!');
        console.error('Current text:', lifespanValue.textContent);
        console.error('Lifespan should show numeric format: "39.48 / 100.00"');
      }
      
      // Check time speed consistency (0.5× should be exactly half of 1×)
      const speed = getTimeSpeed();
      if(speed === 0.5) {
        console.log('⏱ Time Speed: 0.5× (exactly half of 1×)');
      }
    }, 5000);
  }
});



