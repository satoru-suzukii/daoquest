# Dao Quest — V1.0 QA Report

## Release scope

This release keeps the application at **Dao Quest 1.0** and applies the requested lifespan table only. The cultivation hierarchy, realm requirements, skill costs, reward formulas, progression rules, and all non-lifespan balance values are preserved.

## Automated checks

- `node --check` passed for all game JavaScript files and `playtest.js`.
- `balance.json` parsed successfully.
- `node playtest.js` completed with the same four progression outcomes as the previous stable baseline.
- A structured comparison confirmed that every non-lifespan balance value is unchanged; `yearsPerSecond` remains `0.5`.
- All game files load using the renamed audio-bootstrap script; no deleted video script is referenced.

## Video/cutscene removal checks

- Removed the `<video>` element, playback overlay, and skip control from `index.html`.
- Removed video overlay and skip-control CSS, including later override rules.
- Removed the full playback queue, file map, event handlers, and video error/retry code.
- Removed all cutscene trigger calls from new-game, final completion, death, and reincarnation paths.
- Preserved the original cultivation state transitions, save behavior, reincarnation/death handling, and result dialogs.
- Renamed the retained music/bootstrap file to `js/05-audio-bootstrap.js`; background music controls and playback logic remain.

## Rename and save compatibility checks

- Updated document title, metadata, header, main menu, footer, code comments, simulator output, README, and QA report to Dao Quest.
- Set the `VERSION` constant and visible build labels to `1.0`.
- Changed the active save, achievements, active-slot, music-settings, and export format namespaces to Dao Quest identifiers.
- Kept compatibility readers for previous save/settings keys and the previous export format, so existing local saves and backups remain importable. These are retained only as non-visible migration aliases.
- The new ZIP root folder is `Dao-Quest/`.

## Browser and migration smoke tests

The app was exercised in headless Chromium using an embedded document containing the actual HTML, CSS, JavaScript, and project `balance.json`. Direct local HTTP navigation was blocked by the browser sandbox, so the test harness supplied an in-memory `localStorage` implementation and the real balance data.

- Fresh boot displayed the Dao Quest document title and build `1.0`.
- The main menu was visible, Settings/Achievements controls were hidden, and zero video/player/skip DOM nodes existed before starting.
- Starting a new journey activated the gameplay UI and made Settings visible.
- The game state recorded version `1.0`; new backups exported with the `dao-quest-save` format.
- The previous full backup format was accepted by the import path.
- Previous save, achievement, active-slot, and music-setting keys migrated into the new namespace. The old keys were removed after successful copies.
- A migrated save loaded with its Qi (`12345`) and lifetime death count (`2`) intact, and its in-memory version was normalized to `1.0`.
- Fresh-start, export/import, and legacy-migration browser smoke checks reported no uncaught page errors or console errors.

## Static cleanup checks

- Searched the shipped HTML, CSS, JavaScript, and simulator for video elements, video asset paths, cutscene identifiers, playback functions, and references to the removed bootstrap filename: none remain.
- Checked all local script, stylesheet, and image references in the HTML: all referenced files exist.
- Confirmed every script passes `node --check` and the archive's included simulator runs to completion.
- Confirmed only the requested lifespan configuration and its related code/documentation changed; all other balance values remain unchanged.


## Lifespan adjustment — Dao Quest 1.0 (final balance adjustment)

The `realmMaxLifespan` table in both `balance.json` and the in-code fallback now matches the 16-realm hierarchy exactly:

| Step | Realm | Maximum lifespan |
|---|---|---:|
| First | Qi Condensation | 100 years |
| First | Foundation Establishment | 200 years |
| First | Golden Core | 3,000 years |
| First | Nascent Soul | 10,000 years |
| First | Soul Formation | 30,000 years |
| First | Soul Transformation | 100,000 years |
| First | Ascendant | 500,000 years |
| Second | Nirvana Scryer | 1,000,000 years |
| Second | Nirvana Cleanser | 10,000,000 years |
| Second | Nirvana Shatterer | 100,000,000 years |
| Third and beyond | All remaining realms | Infinite |

- Removed Karma scaling from lifespan caps so the listed limits are exact at every Karma value. Karma continues to affect its other existing systems.
- Existing finite saves recompute remaining lifespan from their saved age and the new realm cap.
- Saves already in the Third Step or beyond are normalized to infinite lifespan.
- Realm advancement into the Third Step grants infinite lifespan and resets the lifespan death latch.
- The aging rate, time-speed options, Qi production, realm progression, skills, costs, and rewards are unchanged.

### Lifespan-specific tests

- Confirmed all 16 array entries match the requested realm order and values.
- Confirmed finite realm caps remain exact at Karma 0, 1, 100, and 1,000,000.
- Confirmed every Third-, Fourth-, and Fifth-Step realm returns infinite lifespan.
- Confirmed an existing finite save updates its remaining lifespan using `new cap − saved age`.
- Confirmed an existing save in the Third Step becomes immortal on load normalization.
- Confirmed a finite cultivator dies exactly at the configured cap, not before.
- Confirmed a Third-Step cultivator does not age or trigger lifespan death.
- Confirmed the in-code fallback and external `balance.json` contain the same lifespan table.
- Confirmed all JavaScript files pass `node --check` and the included progression simulator still completes with the same four results.

## Scope and limitations

The project was validated with static checks and its included Node progression simulator. This report does not claim exhaustive manual testing on every browser/device combination. Browser audio autoplay and local storage availability remain subject to platform policies. Optional soundtrack files are not included in this source archive; the game remains playable without them.
