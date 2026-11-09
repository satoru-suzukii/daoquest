# Dao Quest 1.0 — Stress and Regression QA Report

**Release:** Dao Quest 1.0  
**Audit date:** 9 November 2026  
**Scope:** Stability, correctness, save compatibility, lifespan behavior, performance edge cases, and interface regression only. No new gameplay features or progression content were added.

## Summary

The release candidate passed the static checks, the focused browser regression suite, the randomized save/skill tests, and the end-to-end state-transition checks described below. The audit did uncover and repair three save/lifespan edge cases:

1. **Imported saves could show the wrong lifespan.** An imported save could carry a finite cap into an immortal realm, or `∞` into a finite realm. Lifespan is now rebuilt from the authoritative realm table on import, just as it is on normal slot loading.
2. **Very old `ageYears` saves could lose the character's age.** Migration previously merged in the default `age: 0` before reading `ageYears`, masking the legacy value. The legacy field is now migrated before defaults are merged, and then removed.
3. **An imported save captured during death/reincarnation could remain frozen.** The normal slot loader already resumed interrupted death flows, but the import path did not. Imported pending-death flags now enter the same guarded death/reincarnation recovery path.

These fixes do not alter lifespan values, cultivation costs, rewards, Qi rates, realm requirements, skills, or progression balance.

## Static and packaging checks

- `node --check` passed for all five game JavaScript files and `playtest.js`.
- `balance.json` parsed successfully.
- `balance.json` SHA-256: `a0a1a0c86b9f5bc49820470f68abe435d57ba36c2147ef2b2c8a8a7616301ea1`.
- The version constant and visible build label remain **1.0**.
- No duplicate HTML IDs were found.
- All local HTML script, stylesheet, and image references resolve to files in the project.
- All local CSS `url(...)` references resolve to files in the project.
- No video element, cutscene trigger, video-player, or skip-video references remain in shipped HTML/CSS/JavaScript/simulator source.
- No old visible project branding was found in the shipped app or README.
- `unzip -t` and clean extraction passed for the release archive.

## Automated test results

### Browser regression suite — 29/29 passed

The suite exercised the actual project HTML, CSS, JavaScript, and `balance.json` in headless Chromium. The 29 checks covered:

- Dao Quest title, version, title-menu state, and pre-start achievement suppression.
- Hiding session controls before the journey begins and restoring them after starting.
- Pointer click debouncing.
- All 160 breakthrough requirement values being finite, positive, and strictly increasing.
- All 16 lifespan entries matching the requested schedule.
- Repairing missing or malformed lifespan configuration while forcing Third Step onward to infinite lifespan.
- Lifespan limits remaining independent of Karma.
- Qi production remaining independent of time speed while aging scales with speed.
- 15,000 high-speed ticks in an immortal realm without aging or death.
- Finite-life clamping at the exact cap, with the death handler invoked once.
- 1,200 malformed/partial save migration fuzz cases.
- Legacy `ageYears` migration.
- Save/load and save-slot isolation.
- Import normalization between finite and infinite lifespan realms.
- Invalid-import rollback without overwriting the existing save.
- Legacy local-save loading.
- Offline Qi arithmetic, same-tab at-most-once claiming, paused-session handling, and storage-write failure handling.
- Final Dao completion latching without repeat spending.
- Settings and achievement panel interactions.
- Responsive layouts at widths 320, 360, 375, 414, 768, 1024, 1280, and 1920 CSS pixels, with no horizontal overflow.
- Modal queue order, single resolution, and cleanup.
- No uncaught page exceptions or unexpected browser console errors. The invalid-import and deliberately simulated storage-quota paths emit their expected error logs during those negative tests.

### Additional stress and focused flow tests

- **1,500 randomized bulk skill purchases/previews:** passed; no negative/non-finite Qi, rank over-cap, NaN preview values, or uncaught exceptions.
- **2,000 click burst:** passed; all 2,000 clicks were recorded, Qi remained finite, and all temporary floating-number DOM nodes were removed after their animation timeout.
- **160 breakthrough transitions:** passed from the starting realm through Ancestor Realm and the final completion trigger. The final state was Ancestor Realm Stage 10, Third-Step-and-beyond lifespan `∞`, age zero, and the one-time completion choice pending.
- **Natural lifespan death and forced reincarnation:** passed. The death count incremented once, the forced-reincarnation count incremented once, and the dead/reincarnating guards cleared after rebirth.
- **Import during an interrupted death flow:** passed after the fix. The death handler resumed, the death modal appeared after queued import/achievement notices, and confirming it completed exactly one forced reincarnation. A separate import-at-exact-lifespan-cap case also entered the death flow immediately.
- **Offline aging to lifespan cap:** passed. An offline session aged a finite cultivator to the exact cap, persisted the consumed snapshot, and invoked the death handler once without replaying offline Qi on a second claim.
- **Export/import round trip:** passed. New exports use `dao-quest-save`, retain game state and achievements, and restore the tested Qi/click values.
- **Reset confirmation:** cancelling preserved the save; confirming cleared the game save and counters. Because reset keeps the current session active, the starting Qi Condensation achievement is immediately earned again for the fresh in-place journey; no other prior achievement/click/purchase state was retained.
- **Full included `playtest.js` run:** completed and produced the same four preset profile results as the lifespan-adjusted baseline. These preset profiles stop in the Nirvana realms; they do not simulate a completed 16-realm playthrough. The separate 160-transition browser test covers the full realm ladder logic.

## Lifespan table verified

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

The Karma lifespan multiplier remains removed. `yearsPerSecond` remains `0.5`; Qi speed behavior and all non-lifespan balance data remain unchanged.

## Test environment and limitations

The browser sandbox blocked direct local HTTP navigation. To test the app, the harness embedded the actual HTML/CSS and loaded the actual JavaScript in Chromium, provided the project's real `balance.json`, and substituted an in-memory `localStorage` implementation plus the balance fetch response. This validates the application logic and DOM behavior, but it is not a test against the deployed website's real origin or browser storage implementation.

The suite used headless Chromium only. It does not establish compatibility with every version of Firefox, Safari, WebView, or every physical mobile device. The optional MP3 soundtrack files are not included in this source archive, so actual track playback could not be verified; the music controls and missing-track fallback remain in place. No QA process can prove the absence of every possible bug or replace extended real-player testing.

## Release conclusion

**Dao Quest 1.0 is the recommended stable baseline after this audit.** The identified reproducible defects were repaired, automated regression and stress checks passed, and no gameplay expansion or balance changes were introduced. Future changes should remain limited to reproducible bug fixes unless the project scope is intentionally reopened.
