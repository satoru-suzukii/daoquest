===============================================================================
                                  DAO QUEST
                    A Browser-Based Cultivation Incremental Game
===============================================================================

Version: 1.0
Status:  Stable maintenance release
Technology: HTML5, CSS3, Vanilla JavaScript
License: MIT (see LICENSE)


1. ABOUT THE PROJECT
-------------------------------------------------------------------------------

Dao Quest is a browser-based incremental cultivation game. Begin at Qi
Condensation, gather spiritual energy, strengthen your techniques, and advance
through a hierarchy of sixteen realms spanning five cultivation steps.

Each realm contains ten stages. Progress is built around two complementary
activities: actively gathering Qi by clicking or tapping the cultivation
artwork, and steadily generating Qi through passive cultivation. Spend Qi to
break through stages, invest in techniques, manage the passage of time, and
pursue the Ancestor Realm at the top of the current progression ladder.

The project is intentionally build-step-free. It uses standard HTML, CSS, and
JavaScript, requires no framework or package installation, and can be hosted as
a static website, including through GitHub Pages.


2. FEATURES
-------------------------------------------------------------------------------

  - Active and passive cultivation: gather Qi manually or generate it over time.
  - Realm progression: sixteen realms, five cultivation steps, and ten stages
    per realm.
  - Techniques and skills: invest Qi in cultivation upgrades, with ranks tracked
    separately by realm where applicable.
  - Lifespan system: finite lifespans in the First and Second Steps, followed by
    immortality from the Third Step onward.
  - Time flow: adjust the rate at which lifespan passes without changing Qi
    production.
  - Reincarnation: return to Qi Condensation with accumulated legacy benefits.
  - Offline progress: receive eligible cultivation gains when returning to a
    saved journey, subject to the configured offline-time cap.
  - Achievements: track progression, techniques, reincarnation, time, and other
    milestones.
  - Save management: three browser-local save slots, automatic persistence,
    manual saving, and export/import backups.
  - Responsive interface: designed to adapt to desktop and mobile screen sizes.


3. CULTIVATION PROGRESSION
-------------------------------------------------------------------------------

Every realm has ten stages. The current progression ladder is:

FIRST STEP — MORTAL WORLD
  01. Qi Condensation
  02. Foundation Establishment
  03. Golden Core
  04. Nascent Soul
  05. Soul Formation
  06. Soul Transformation
  07. Ascendant

SECOND STEP
  08. Nirvana Scryer
  09. Nirvana Cleanser
  10. Nirvana Shatterer

THIRD STEP
  11. Nirvana Void
  12. Spirit Void
  13. Arcane Void
  14. Void Tribulant

FOURTH STEP — GOD REALM
  15. Dao Source Realm

FIFTH STEP — ABSOLUTE APEX
  16. Ancestor Realm

Breaking through Ascendant Stage 10 carries the cultivator into the Second Step.
This boundary crossing does not force reincarnation. The Ancestor Realm is the
highest realm currently implemented in Dao Quest 1.0.


4. LIFESPAN RULES
-------------------------------------------------------------------------------

The lifespan limits below are the exact limits used by Version 1.0. Karma does
not multiply or extend these values.

FIRST STEP
  Qi Condensation             100 years
  Foundation Establishment    200 years
  Golden Core               3,000 years
  Nascent Soul             10,000 years
  Soul Formation           30,000 years
  Soul Transformation     100,000 years
  Ascendant                500,000 years

SECOND STEP
  Nirvana Scryer         1,000,000 years
  Nirvana Cleanser      10,000,000 years
  Nirvana Shatterer    100,000,000 years

THIRD STEP AND BEYOND
  Nirvana Void, Spirit Void, Arcane Void, Void Tribulant,
  Dao Source Realm, and Ancestor Realm have infinite lifespan.

Time-flow settings affect lifespan aging only; they do not increase or decrease
Qi generated per click or per second. In a finite-lifespan realm, reaching the
lifespan limit triggers the death and forced-reincarnation process. Voluntary
reincarnation becomes available after crossing the First-Step boundary.


5. HOW TO PLAY
-------------------------------------------------------------------------------

  1. Start a new journey or load one of your existing save slots.
  2. Click or tap the cultivator artwork to gather Qi.
  3. Allow passive Qi production to accumulate over time.
  4. Purchase available techniques and skills to improve cultivation.
  5. Use BREAK THROUGH when you have enough Qi for the next stage.
  6. Monitor age and lifespan while in a finite-lifespan realm.
  7. Adjust time flow when needed. This changes aging, not Qi production.
  8. Continue through the cultivation steps and decide when to reincarnate
     after the First-Step boundary has been crossed.

The interface displays current Qi, Qi per click, Qi per second, the current
realm and stage, breakthrough requirements, lifespan, time-flow controls,
techniques, achievements, and save settings.


6. SAVES AND BACKUPS
-------------------------------------------------------------------------------

Dao Quest stores game data in the browser's localStorage. It does not use a
cloud account or a remote save service. The three save slots belong to the
browser profile and device where they were created.

IMPORTANT BACKUP ADVICE
  - Use the in-game Export option to create a backup of an important journey.
  - Keep exported backups somewhere outside the browser.
  - Export your save before clearing site data, changing browsers, or moving to
    another device.
  - Use Import to restore a previously exported save.
  - Existing saves from supported earlier Dao Quest builds are migrated when
    loaded. Older legacy storage keys are also recognized for compatibility.

Clearing browser storage can permanently remove local saves. Exporting a backup
is the safest way to preserve progress before doing so.


7. RUNNING THE GAME LOCALLY
-------------------------------------------------------------------------------

No build tools, package manager, or dependency installation are required.
Because the game loads balance.json with fetch(), run it through a local HTTP
server instead of opening index.html directly with a file:// URL.

Using Python:

  1. Open a terminal in the Dao-Quest project directory.
  2. Run:

       python -m http.server 8000

     On some systems, use:

       python3 -m http.server 8000

  3. Open this address in your browser:

       http://localhost:8000

Stop the server with Ctrl+C when finished.


8. PUBLISHING WITH GITHUB PAGES
-------------------------------------------------------------------------------

The project is a static website and can be hosted with GitHub Pages.

  1. Create or open the GitHub repository where the game will live.
  2. Upload the CONTENTS of the Dao-Quest project folder to the repository
     root. The repository root should contain index.html, balance.json, css/,
     js/, and assets/ directly. Do not leave them buried inside an extra
     Dao-Quest/ directory unless that directory is intentionally your site root.
  3. Commit and push the files to your chosen branch, commonly main.
  4. Open the repository's Settings, then Pages.
  5. Under the build and deployment options, choose deployment from a branch.
  6. Select the branch and the /(root) folder, then save.
  7. Open the Pages URL shown by GitHub after deployment completes.

Keep the paths and folder names unchanged. The page depends on the relative
locations of balance.json, the CSS, JavaScript, and image assets.


9. PROJECT STRUCTURE
-------------------------------------------------------------------------------

  Dao-Quest/
  |
  |-- index.html
  |-- balance.json
  |-- README.md
  |-- README.txt
  |-- QA-REPORT.md
  |-- LICENSE
  |-- playtest.js
  |
  |-- css/
  |   `-- style.css
  |
  |-- js/
  |   |-- 01-config-realms.js
  |   |-- 02-cultivation-systems.js
  |   |-- 03-achievements-persistence.js
  |   |-- 04-interface.js
  |   `-- 05-audio-bootstrap.js
  |
  `-- assets/
      |-- cultivator.jpg
      `-- cultivator2.jpg

MAIN FILES
  index.html
    The application shell, interface structure, and ordered script loading.

  balance.json
    Data-driven values for skills, realm requirements, progression rewards,
    reincarnation, offline progress, lifespan, and time-flow settings.

  css/style.css
    Layout, responsive styling, and visual effects.

  js/01-config-realms.js
    Shared state defaults, realm definitions, balance loading, and validation.

  js/02-cultivation-systems.js
    Qi generation, breakthrough logic, techniques, lifespan, time flow, and
    reincarnation systems.

  js/03-achievements-persistence.js
    Achievement definitions, save slots, offline progress, save migration,
    and persistence logic.

  js/04-interface.js
    Interface rendering, menus, panels, settings, save controls, and UI events.

  js/05-audio-bootstrap.js
    Optional background-music initialization and final startup sequence.

  playtest.js
    Node.js-based progression and balance simulator.

  QA-REPORT.md
    Detailed release audit, regression coverage, stress-test results, and known
    test-environment limitations.


10. DEVELOPMENT AND TESTING
-------------------------------------------------------------------------------

The game itself does not require Node.js. Node.js is only needed for the
included balance simulator and JavaScript syntax checks.

Run the progression simulator from the project directory:

  node playtest.js

Check JavaScript syntax:

  node --check js/01-config-realms.js
  node --check js/02-cultivation-systems.js
  node --check js/03-achievements-persistence.js
  node --check js/04-interface.js
  node --check js/05-audio-bootstrap.js
  node --check playtest.js

The simulator evaluates a set of example play styles and estimates how far
they progress under the current balance configuration. Its results are
estimates, not a substitute for playing the game in a browser.

The release QA report documents the separate browser regression and stress
tests performed for Dao Quest 1.0. The browser-test harness itself is not
included in this source archive; playtest.js is the included balance simulator,
not the full browser regression suite.


11. AUDIO AND OPTIONAL ASSETS
-------------------------------------------------------------------------------

The audio controls and music bootstrap are included, but the optional MP3
soundtrack files are not bundled with this source archive. The audio system
looks for these files:

  assets/music/music1.mp3
  assets/music/music2.mp3
  assets/music/music3.mp3
  assets/music/music4.mp3
  assets/music/music5.mp3
  assets/music/music6.mp3
  assets/music/music7.mp3

Create the assets/music/ directory and add the corresponding files if you have
music that you are authorized to use. The game remains playable without them.
Browsers may also restrict audio autoplay until the player interacts with the
page.

The former cutscene and video playback system has been removed. Death,
reincarnation, and completion continue to use their in-game result dialogs.


12. VERSION, SCOPE, AND LICENSE
-------------------------------------------------------------------------------

Dao Quest 1.0 is a maintenance-focused release. Its current scope is the
existing cultivation game: sixteen realms, five steps, lifespan management,
techniques, achievements, reincarnation, and local save management. The current
release does not include additional realms beyond Ancestor Realm or the removed
cutscene/video system.

The project is distributed under the MIT License. See LICENSE for the full
license text and terms.

For the detailed reliability audit, test coverage, and known limitations, see
QA-REPORT.md.


===============================================================================
                         END OF DAO QUEST README
===============================================================================
