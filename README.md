<div align="center">

# ☯️ DAO QUEST

### 🏯 A Browser-Based Cultivation Incremental Game

*Gather Qi. Refine your path. Break through the realms. Pursue the Dao.*

![Version](https://img.shields.io/badge/version-1.0-8b5cf6?style=for-the-badge)
![Technology](https://img.shields.io/badge/HTML-CSS-JavaScript-f59e0b?style=for-the-badge&logo=javascript&logoColor=white)
![Platform](https://img.shields.io/badge/platform-Web%20Browser-0ea5e9?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge)

**A self-contained, browser-based idle cultivation game built with HTML, CSS, and vanilla JavaScript.**

</div>

---

## 📜 Table of Contents

- [🌌 About the Game](#-about-the-game)
- [✨ Features](#-features)
- [🏔️ Cultivation Progression](#️-cultivation-progression)
- [⌛ Lifespan System](#-lifespan-system)
- [🎮 How to Play](#-how-to-play)
- [💾 Saves and Backups](#-saves-and-backups)
- [🚀 Run Locally](#-run-locally)
- [🗂️ Project Structure](#️-project-structure)
- [🛠️ Development and Testing](#️-development-and-testing)
- [🎵 Audio and Optional Assets](#-audio-and-optional-assets)
- [📦 Version, Scope and License](#-version-scope-and-license)

---

## 🌌 About the Game

**Dao Quest** is an incremental cultivation game inspired by the progression and realm structure commonly found in cultivation and xianxia fiction.

Begin your journey at **Qi Condensation**, gather spiritual energy, strengthen your techniques, and advance through **16 cultivation realms across five steps**. Each realm contains ten stages. Progress comes from a combination of active Qi gathering and passive cultivation, with breakthroughs, achievements, lifespan management, reincarnation, and offline progress supporting the journey.

> 🧘 **The goal:** advance through the cultivation hierarchy and reach the **Ancestor Realm**, the highest realm currently implemented in Version 1.0.

### ⚙️ Built to run simply

| | Project detail |
|:--|:--|
| 🧱 **Technologies** | HTML5 · CSS3 · Vanilla JavaScript |
| 🌐 **Platform** | Modern desktop and mobile browsers |
| 📦 **Dependencies** | No framework or package installation required |
| 🏗️ **Build process** | No compilation or bundling step |
| 💽 **Persistence** | Browser-local storage with export/import backups |
| 📄 **License** | MIT — see [`LICENSE`](LICENSE) |

---

## ✨ Features

<table>
  <tr>
    <td width="50%">
      <h3>☯️ Active Cultivation</h3>
      Click or tap the cultivator artwork to gather Qi directly.
    </td>
    <td width="50%">
      <h3>🌀 Passive Cultivation</h3>
      Generate Qi over time as your cultivation develops.
    </td>
  </tr>
  <tr>
    <td>
      <h3>🏔️ Realm Progression</h3>
      Advance through 16 realms, five cultivation steps, and ten stages per realm.
    </td>
    <td>
      <h3>📚 Techniques and Skills</h3>
      Spend Qi on upgrades and realm-related cultivation improvements.
    </td>
  </tr>
  <tr>
    <td>
      <h3>⌛ Lifespan and Time Flow</h3>
      Manage finite lifespans in the first two steps. Lifespan becomes infinite from the Third Step onward.
    </td>
    <td>
      <h3>♻️ Reincarnation</h3>
      Begin another life while retaining accumulated legacy benefits.
    </td>
  </tr>
  <tr>
    <td>
      <h3>🌙 Offline Progress</h3>
      Receive eligible progress when returning to a saved journey, subject to the configured time cap.
    </td>
    <td>
      <h3>🏆 Achievements</h3>
      Track cultivation milestones, techniques, reincarnation, playtime, and more.
    </td>
  </tr>
  <tr>
    <td>
      <h3>💾 Save Management</h3>
      Use three browser-local save slots, automatic persistence, and manual export/import.
    </td>
    <td>
      <h3>📱 Responsive Interface</h3>
      Play on desktop or mobile-sized screens.
    </td>
  </tr>
</table>

---

## 🏔️ Cultivation Progression

Every realm contains **10 stages**. The current hierarchy contains 16 realms:

<details open>
<summary><strong>🟢 First Step — Seven Realms</strong></summary>

| # | Realm | Lifespan |
|:--:|---|---:|
| 01 | Qi Condensation | 100 years |
| 02 | Foundation Establishment | 200 years |
| 03 | Golden Core | 3,000 years |
| 04 | Nascent Soul | 10,000 years |
| 05 | Soul Formation | 30,000 years |
| 06 | Soul Transformation | 100,000 years |
| 07 | Ascendant | 500,000 years |

</details>

<details open>
<summary><strong>🔵 Second Step — Three Realms</strong></summary>

| # | Realm | Lifespan |
|:--:|---|---:|
| 08 | Nirvana Scryer | 1,000,000 years |
| 09 | Nirvana Cleanser | 10,000,000 years |
| 10 | Nirvana Shatterer | 100,000,000 years |

</details>

<details open>
<summary><strong>🟣 Third Step — Four Realms</strong></summary>

| # | Realm | Lifespan |
|:--:|---|---:|
| 11 | Nirvana Void | ♾️ Infinite |
| 12 | Spirit Void | ♾️ Infinite |
| 13 | Arcane Void | ♾️ Infinite |
| 14 | Void Tribulant | ♾️ Infinite |

</details>

<details open>
<summary><strong>🟠 Fourth Step — One Realm</strong></summary>

| # | Realm | Lifespan |
|:--:|---|---:|
| 15 | Dao Source Realm | ♾️ Infinite |

</details>

<details open>
<summary><strong>🔴 Fifth Step — The Current Apex</strong></summary>

| # | Realm | Lifespan |
|:--:|---|---:|
| 16 | **Ancestor Realm** | ♾️ Infinite |

</details>

> 📌 **Progression notes**
> - Breaking through **Ascendant Stage 10** advances the character into the Second Step; this transition does not force reincarnation.
> - Voluntary reincarnation becomes available after crossing the First-Step boundary and can be chosen while at Ascendant or a higher realm.
> - **Ancestor Realm** is the highest currently implemented realm in Version 1.0.

---

## ⌛ Lifespan System

Lifespan limits are fixed values. **Karma does not multiply or extend them.**

| Cultivation stage | Lifespan rule |
|---|---:|
| First Step | Realm-specific finite lifespan |
| Second Step | Realm-specific finite lifespan |
| Third Step onward | ♾️ Infinite lifespan |

- ⚠️ Reaching the lifespan limit in a finite-lifespan realm triggers death and forced reincarnation.
- ⏱️ Time-flow settings change lifespan aging only.
- ☯️ Time flow does **not** increase or decrease Qi generated per click or per second.

---

## 🎮 How to Play

1. 🚪 **Begin** — start a new journey or load an existing save slot.
2. 👆 **Gather Qi** — click or tap the cultivator artwork.
3. 🌱 **Cultivate** — allow passive Qi production to accumulate.
4. 📚 **Improve** — purchase available techniques and skills.
5. ⚡ **Break Through** — advance when you have enough Qi for the next stage.
6. ⌛ **Watch your lifespan** — monitor age and lifespan while in finite-lifespan realms.
7. 🕰️ **Manage time flow** — adjust aging speed when needed; Qi production is unaffected.
8. ♻️ **Continue your journey** — progress through the steps and choose when to reincarnate after crossing the First-Step boundary.

### 📊 What the interface tracks

Current Qi · Qi per click · Qi per second · Realm and stage · Breakthrough requirements · Age and lifespan · Time-flow settings · Techniques · Achievements · Save settings.

---

## 💾 Saves and Backups

Dao Quest stores progress in the browser's **`localStorage`**. There is no cloud account or remote save service. Your three save slots belong to the browser profile and device where they were created.

<div align="center">

| 💡 Good practice | Why it matters |
|---|---|
| 📤 Export important journeys | Keep a portable backup outside the browser. |
| 🔄 Export before switching devices or browsers | Browser-local saves do not automatically transfer. |
| 🧹 Back up before clearing site data | Clearing browser storage can permanently erase local saves. |
| 📥 Use Import to restore a backup | Restore a previously exported journey. |

</div>

✅ Supported older saves are migrated when loaded or imported. Older legacy storage keys are also recognized for compatibility.

> **⚠️ Important:** Export a backup before clearing browser data. This is the safest way to preserve your progress.

---

## 🚀 Run Locally

Dao Quest requires **no build tools, package manager, or dependency installation**. The game loads `balance.json` using `fetch()`, so run it through a local HTTP server instead of opening `index.html` directly with a `file://` URL.

### 1. Start a local server

Open a terminal in the project directory and run:

```bash
python -m http.server 8000
```

If your system uses `python3`, run:

```bash
python3 -m http.server 8000
```

### 2. Open the game

Visit this address in your browser:

```text
http://localhost:8000
```

To stop the server, return to the terminal and press **Ctrl + C**.

---

## 🗂️ Project Structure

```text
Dao-Quest/
├── index.html                         # Main application page
├── balance.json                       # Realm, skill, reward and lifespan data
├── README.md                          # GitHub project documentation
├── README.txt                         # Plain-text documentation
├── QA-REPORT.md                       # Release audit and test report
├── LICENSE                            # MIT License
├── playtest.js                        # Node.js progression simulator
│
├── assets/
│   ├── cultivator.jpg                 # Cultivator artwork
│   └── cultivator2.jpg                # Alternate cultivator artwork
│
├── css/
│   └── style.css                      # Layout and responsive styling
│
└── js/
    ├── 01-config-realms.js            # Configuration, defaults and realm data
    ├── 02-cultivation-systems.js      # Qi, breakthroughs, lifespan and reincarnation
    ├── 03-achievements-persistence.js # Achievements, saves and offline progress
    ├── 04-interface.js               # UI rendering, menus and interactions
    └── 05-audio-bootstrap.js          # Optional music and startup sequence
```

### 🔍 Main file guide

| File | What it does |
|---|---|
| `index.html` | Application shell, interface structure, and script loading. |
| `balance.json` | Data-driven skills, realm requirements, rewards, reincarnation, offline progress, lifespan, and time-flow values. |
| `css/style.css` | Layout, responsive styling, and visual effects. |
| `js/01-config-realms.js` | Shared configuration, default state, realm definitions, and validation. |
| `js/02-cultivation-systems.js` | Qi generation, breakthroughs, techniques, lifespan, time flow, and reincarnation. |
| `js/03-achievements-persistence.js` | Achievements, save slots, offline progress, migration, and persistence. |
| `js/04-interface.js` | Rendering, menus, panels, settings, save controls, and UI events. |
| `js/05-audio-bootstrap.js` | Optional background-music initialization and startup sequence. |
| `playtest.js` | Node.js-based progression and balance simulator. |
| `QA-REPORT.md` | Release audit, regression coverage, stress-test results, and limitations. |

---

## 🛠️ Development and Testing

The game itself does **not** require Node.js. Node.js is only needed for the included progression simulator and JavaScript syntax checks.

### ▶️ Run the progression simulator

From the project directory:

```bash
node playtest.js
```

### 🧪 Check JavaScript syntax

```bash
node --check js/01-config-realms.js
node --check js/02-cultivation-systems.js
node --check js/03-achievements-persistence.js
node --check js/04-interface.js
node --check js/05-audio-bootstrap.js
node --check playtest.js
```

The simulator evaluates example play-style profiles and estimates their progress under the current balance configuration. It is a balance simulator, **not** a replacement for browser-based gameplay testing.

📋 The separate [`QA-REPORT.md`](QA-REPORT.md) documents the release audit, regression coverage, stress tests, and test-environment limitations. The browser-test harness itself is not included in this source archive.

---

## 🎵 Audio and Optional Assets

The audio controls and music bootstrap are included, but the optional MP3 soundtrack files are **not bundled** with this source archive.

To enable music, create `assets/music/` and add authorized audio files using these expected names:

```text
assets/music/music1.mp3
assets/music/music2.mp3
assets/music/music3.mp3
assets/music/music4.mp3
assets/music/music5.mp3
assets/music/music6.mp3
assets/music/music7.mp3
```

- 🎧 The game remains playable without soundtrack files.
- 🔊 Browsers may restrict autoplay until the player interacts with the page.
- 🎬 The former cutscene and video playback system has been removed. Death, reincarnation, and completion continue through in-game result dialogs.

---

## 📦 Version, Scope and License

<div align="center">

### ☯️ DAO QUEST — VERSION 1.0

**Stable maintenance release · MIT License**

</div>

Version 1.0 preserves the existing cultivation game and its current progression: 16 realms, five steps, lifespan management, techniques, achievements, reincarnation, offline progress, and local save management.

- 🚫 No additional realms beyond Ancestor Realm are included.
- 🚫 The former cutscene/video playback system is not part of this release.
- ⚖️ The current lifespan configuration and progression balance are documented above and in `balance.json`.

This project is distributed under the **MIT License**. See [`LICENSE`](LICENSE) for the complete terms.

For the detailed reliability audit, test coverage, and known limitations, see [`QA-REPORT.md`](QA-REPORT.md).

---

<div align="center">

**☯️ Cultivate with patience. Break through with purpose. Follow the Dao.**

*Dao Quest 1.0*

</div>
