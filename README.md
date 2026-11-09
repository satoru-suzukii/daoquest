# Dao Quest

**Version 1.0** · Browser-based cultivation incremental game · MIT License

Dao Quest is a browser-based incremental cultivation game built with **HTML, CSS, and vanilla JavaScript**. Begin at Qi Condensation, gather Qi, strengthen your techniques, and advance through **16 realms across five cultivation steps**. Each realm has ten stages, with lifespan management, reincarnation, achievements, offline progress, and browser-local saves.

The project is intentionally build-step-free: no framework, package installation, or backend is required. It can run locally through a static HTTP server or be published with GitHub Pages.

## Highlights

- **Active and passive cultivation:** click or tap to gather Qi, while passive production continues over time.
- **Sixteen realms:** progress through five cultivation steps, with ten stages in every realm.
- **Techniques and skills:** invest Qi in upgrades, with realm-specific ranks where applicable.
- **Lifespan and time flow:** finite lifespans through the Second Step; infinite lifespan from the Third Step onward. Time flow changes aging, not Qi production.
- **Reincarnation:** begin a new life at Qi Condensation while retaining accumulated legacy benefits.
- **Offline progress:** receive eligible cultivation gains when returning, subject to a 16-hour cap.
- **Achievements:** track cultivation, techniques, reincarnation, time, and other milestones.
- **Three save slots:** browser-local persistence plus manual export/import backups.
- **Responsive interface:** adapts to desktop and mobile screen sizes.

## Cultivation progression

Every realm contains ten stages.

| Step | Realm | Lifespan |
|---|---|---:|
| **First** | Qi Condensation | 100 years |
| **First** | Foundation Establishment | 200 years |
| **First** | Golden Core | 3,000 years |
| **First** | Nascent Soul | 10,000 years |
| **First** | Soul Formation | 30,000 years |
| **First** | Soul Transformation | 100,000 years |
| **First** | Ascendant | 500,000 years |
| **Second** | Nirvana Scryer | 1,000,000 years |
| **Second** | Nirvana Cleanser | 10,000,000 years |
| **Second** | Nirvana Shatterer | 100,000,000 years |
| **Third** | Nirvana Void | Infinite |
| **Third** | Spirit Void | Infinite |
| **Third** | Arcane Void | Infinite |
| **Third** | Void Tribulant | Infinite |
| **Fourth** | Dao Source Realm | Infinite |
| **Fifth** | Ancestor Realm | Infinite |

Breaking through Ascendant Stage 10 carries the cultivator into the Second Step; this transition does not force reincarnation. After the first crossing into the Second Step, voluntary reincarnation is unlocked; it can be chosen while the cultivator is at Ascendant or a higher realm. The Ancestor Realm is the highest realm currently implemented in Version 1.0.

Lifespan limits are exact and are not multiplied by Karma. Reaching the limit in a finite-lifespan realm triggers death and forced reincarnation. Time-flow settings affect lifespan aging only; they do not alter Qi production.

## How to play

1. Choose **Begin a New Journey** or load an existing save.
2. Click or tap the cultivator artwork to gather Qi.
3. Let passive Qi production accumulate over time.
4. Purchase available techniques and skills to improve cultivation.
5. Select **Break Through** when you have enough Qi for the next stage.
6. Monitor your age and lifespan in finite-lifespan realms.
7. Adjust time flow when needed. This changes aging, not Qi production.
8. Continue through the cultivation steps and choose when to reincarnate after crossing the First-Step boundary.

## Run locally

No build tools or dependency installation are required. The game loads `balance.json` with `fetch()`, so serve the project over HTTP instead of opening `index.html` directly with a `file://` URL.

With Python installed, open a terminal in the project directory and run:

```bash
python -m http.server 8000
```

On some systems, use `python3` instead. Then open **http://localhost:8000** in your browser. Stop the server with `Ctrl+C` when finished.

## Publish with GitHub Pages

1. Upload the **contents** of the `Dao-Quest` project folder to the repository root. The root should directly contain `index.html`, `balance.json`, `css/`, `js/`, and `assets/`.
2. Commit and push the files to your chosen branch, commonly `main`.
3. In the repository, open **Settings → Pages**.
4. Under the build and deployment options, select deployment from a branch.
5. Select the branch and the `/(root)` folder, then save.
6. Open the Pages URL provided by GitHub after deployment completes.

Keep the file and folder paths unchanged because the page loads its local scripts, stylesheet, balance data, and images by relative path.

## Saves and backups

Game data is stored in the browser's `localStorage`. There is no cloud account or remote save service. The three save slots are local to the browser profile and device where they were created.

- Use **Export** in Settings to create a backup of an important journey.
- Keep exported backups outside the browser.
- Export before clearing site data, switching browsers, or moving to another device.
- Use **Import** to restore an exported save.
- Supported older saves are migrated when loaded or imported.

Clearing browser storage can permanently remove local saves. Exporting a backup is the safest way to preserve progress.

## Project structure

```text
Dao-Quest/
├── index.html
├── balance.json
├── README.md
├── README.txt
├── QA-REPORT.md
├── LICENSE
├── playtest.js
├── css/
│   └── style.css
├── js/
│   ├── 01-config-realms.js
│   ├── 02-cultivation-systems.js
│   ├── 03-achievements-persistence.js
│   ├── 04-interface.js
│   └── 05-audio-bootstrap.js
└── assets/
    ├── cultivator.jpg
    └── cultivator2.jpg
```

| File | Responsibility |
|---|---|
| `index.html` | Application shell, interface structure, and script loading |
| `balance.json` | Skills, realm requirements, rewards, reincarnation, offline progress, lifespan, and time-flow data |
| `css/style.css` | Layout, responsive styling, and visual effects |
| `js/01-config-realms.js` | Shared configuration, default state, realm definitions, and validation |
| `js/02-cultivation-systems.js` | Qi generation, breakthroughs, techniques, lifespan, time flow, and reincarnation |
| `js/03-achievements-persistence.js` | Achievements, save slots, offline progress, migration, and persistence |
| `js/04-interface.js` | Rendering, menus, panels, settings, save controls, and UI events |
| `js/05-audio-bootstrap.js` | Optional background-music initialization and startup sequence |
| `playtest.js` | Node.js-based progression and balance simulator |
| `QA-REPORT.md` | Detailed release audit, regression coverage, stress-test results, and limitations |

## Development and testing

The game itself does not require Node.js. Node.js is only needed for the included simulator and syntax checks.

Run the progression simulator:

```bash
node playtest.js
```

Check JavaScript syntax:

```bash
node --check js/01-config-realms.js
node --check js/02-cultivation-systems.js
node --check js/03-achievements-persistence.js
node --check js/04-interface.js
node --check js/05-audio-bootstrap.js
node --check playtest.js
```

`playtest.js` runs example play-style profiles and estimates how far they progress under the current balance configuration. It is a balance simulator, not a replacement for browser-based gameplay testing. The separate release audit and its limitations are documented in [`QA-REPORT.md`](QA-REPORT.md); the browser-test harness itself is not included in this source archive.

## Audio and optional assets

The audio controls and music bootstrap are included, but the optional MP3 soundtrack files are not bundled. To enable music, add authorized tracks using these expected paths:

```text
assets/music/music1.mp3
assets/music/music2.mp3
assets/music/music3.mp3
assets/music/music4.mp3
assets/music/music5.mp3
assets/music/music6.mp3
assets/music/music7.mp3
```

The game remains playable without soundtrack files. Browsers may restrict audio autoplay until the player interacts with the page.

The former cutscene and video playback system has been removed. Death, reincarnation, and completion continue to use their in-game result dialogs.

## Version and license

Dao Quest **1.0** is a maintenance-focused release. The current progression ends at Ancestor Realm; this build does not include additional realms beyond it or the removed cutscene/video system.

This project is distributed under the **MIT License**. See [`LICENSE`](LICENSE) for the complete terms.

For the detailed reliability audit, test coverage, and known limitations, see [`QA-REPORT.md`](QA-REPORT.md).
