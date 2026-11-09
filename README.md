# Dao Quest (V1.0)

A browser-based cultivation incremental game built with vanilla HTML, CSS, and JavaScript. Cultivate Qi through sixteen realms and five cultivation steps, improve your techniques, manage your lifespan, and eventually reach the Ancestor Realm.

## The cultivation hierarchy

Every realm contains **10 stages**. The player begins in Qi Condensation; there is no separate Mortal Realm tutorial tier.

### First Step — Mortal World
1. Qi Condensation
2. Foundation Establishment
3. Golden Core
4. Nascent Soul
5. Soul Formation *(also known as Transform God / Deity Transformation)*
6. Soul Transformation
7. Ascendant *(also known as Void Returning; the peak of the First Step)*

Breaking through Ascendant Stage 10 crosses the boundary of the starting world and enters the Second Step directly. This transition preserves the current life and does **not** force reincarnation.

### Second Step
8. Nirvana Scryer *(Dao Fusion)*
9. Nirvana Cleanser
10. Nirvana Shatterer *(Transcends Tribulation)*

### Third Step
11. Nirvana Void
12. Spirit Void
13. Arcane Void
14. Void Tribulant

Even the weakest cultivator in the Third Step is described as possessing universe-destroying power.

### Fourth Step — God Realm
15. Dao Source Realm *(entry into the true God realm)*

### Fifth Step — Absolute Apex
16. Ancestor Realm *(the current maximum realm)*

At this level, Fourth-Step cultivators are insignificant by comparison—little doodles in a fragment of an Ancestor's painting.

## Core systems

- **Incremental cultivation:** click to gather Qi and generate passive Qi over time.
- **Breakthroughs:** spend the required Qi to advance through 10 stages per realm.
- **Techniques and skills:** purchase flat and percentage bonuses, including one-time higher-world techniques.
- **Realm progression:** realm requirements rise exponentially, with a minimum cross-realm jump to prevent requirement drops.
- **Lifespan:** First Step realms have caps of 100, 200, 3,000, 10,000, 30,000, 100,000, and 500,000 years; Second Step realms have caps of 1,000,000, 10,000,000, and 100,000,000 years. Lifespan is infinite from the Third Step onward. Karma does not modify these exact caps; time-flow controls aging and does not multiply Qi generation.
- **Reincarnation:** after leaving the starting world, reincarnation is optional. It grants Karma and a permanent efficiency bonus while beginning a new life at Qi Condensation.
- **Offline progress:** the game calculates capped offline gains when a save is resumed.
- **Achievements:** progression, technique, reincarnation, time, and miscellaneous milestones.
- **Save slots:** three browser-local save slots, plus export/import for manual backups.

## Controls

- Click/tap the cultivation artwork to gather Qi.
- Use **Break Through** when you have enough Qi for the next stage.
- Purchase techniques in the right-hand panel.
- Change time flow in the status panel. This changes lifespan aging only.
- Use Settings to save, export, import, reset the active slot, and configure audio.
- The active save is stored in browser `localStorage`; export saves before clearing browser data or moving devices.

## Project structure

```text
.
├── index.html          # Main application shell and accessible UI structure
├── balance.json        # Realm, skill, lifespan, speed, and cycle balance data
├── css/
│   └── style.css       # Responsive styling and lightweight visual effects
├── js/
│   ├── 01-config-realms.js            # Shared constants, balance config, realm data, validation
│   ├── 02-cultivation-systems.js      # Qi, skills, lifespan, reincarnation, and gameplay logic
│   ├── 03-achievements-persistence.js # Achievements, saves, offline progress, and migration
│   ├── 04-interface.js               # UI rendering, shop, menus, panels, and developer simulator
│   └── 05-audio-bootstrap.js         # Optional audio and final startup sequence
├── assets/             # Only the two in-game cultivation artworks
├── playtest.js         # Node-based balance/progression simulator
├── QA-REPORT.md        # Maintenance-release test coverage and results
└── README.md
```

## Running locally

No build tools or package installation are required. Serve this directory using any static HTTP server, then open `index.html` through that server. The game fetches `balance.json` at startup, so running through a local server is recommended instead of opening the file directly.

For example, with Python installed:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Balance testing

The lightweight simulator runs with Node.js:

```bash
node playtest.js
```

It simulates casual, normal, and dedicated click rates and reports how far each run progresses. Optional environment variables in `playtest.js` can be used to test different stage requirements and reward values.

## Save compatibility

The current 16-realm hierarchy stores a `realmSystemVersion` marker in saves. Existing saves are migrated automatically when loaded or imported. Their realm indices and per-realm skill ranks are mapped into the new progression, and older players who had already crossed the old Spirit Transformation gate retain access to the higher worlds. On first launch, saves, achievements, the selected slot, and music settings stored by the previous build are copied into the current Dao Quest storage namespace. Previous storage-key aliases remain solely for one-time compatibility migration; they are removed after a successful copy. Export an important save before updating as an extra precaution.

## Optimization and reliability (V1.0)

- Replaced the permanent 60 FPS game loop with a 20 Hz active-session scheduler. The loop stops entirely while the main menu is open.
- Shop affordability checks run at 4 Hz instead of every animation frame.
- Realm path markers are rebuilt only when the current realm or step changes.
- Shop buttons use a single delegated event listener and cached element references rather than rebinding listeners and querying the full shop repeatedly.
- Click feedback is positioned inside the cultivation frame without a synchronous layout read.
- Removed unused cultivation artwork and large skill-icon PNGs. Skill symbols are rendered directly as text glyphs.
- Removed missing CSS background-image references and external Google Fonts requests; the game uses local system fonts and CSS gradients.
- Developer cheat controls are hidden unless the game is opened with `?dev=1`.

The scripts are split into ordered classic-script files (no bundler or module loader), preserving the build-step-free GitHub Pages workflow. The 20 Hz update cadence is intentionally chosen for an incremental game: elapsed-time math still uses actual wall-clock delta, so reducing UI refresh frequency does not reduce Qi earned over time.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript (no framework or bundler)
- Browser `localStorage`
- JSON balance configuration

## Maintenance release notes (V1.0)

- Fixed reset rendering, final-path repeat prompts, and modal double-dismissal.
- Offline snapshots are consumed before rewards are applied, preventing repeated claims after reload.
- Export/import now includes achievement state while remaining compatible with older state-only exports.
- Partial and imported saves are normalized against safe defaults; legacy storage keys are migrated.
- Lifetime death statistics survive voluntary reincarnation, and achievement checks cover forced reincarnations, clicks, passive progression, and tracked real playtime. The 1,000-hour playtime milestone now has a working counter persisted once per minute.
- The paused game loop skips unnecessary stats/realm rendering; background-tab elapsed time is reconciled instead of discarded.
- Muted audio is paused, and in-flight crossfades cannot restart playback after muting.

## Notes

The progression simulator is a balance estimate. See [QA-REPORT.md](QA-REPORT.md) for the browser regression scenarios and validation results completed for this maintenance release. The source archive does not include optional soundtrack files (`assets/music/*.mp3`); the game remains fully playable without them. Browser audio autoplay is subject to browser policy. The former cutscene/video playback subsystem, its markup, styling, triggers, and asset references have been removed. Reincarnation, death, and completion still show their existing gameplay result dialogs. The codebase is intentionally kept build-step-free so it can be hosted as a static site, including GitHub Pages.


## Startup UI and cutscene removal (V1.0)

- Progression achievements are no longer evaluated while the title menu is active, preventing the Qi Condensation achievement from unlocking before a journey starts.
- Settings and Achievements controls are hidden until a new journey is started or an existing save is loaded.
- The main-menu overlay now reliably sits above the sticky top bar during initial page load.
- No cultivation balance, progression, or gameplay rules were changed.
