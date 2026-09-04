# TubeTrim ✂️

> **Take back your focus on YouTube.** A high-performance, zero-dependency Manifest V3 Chrome Extension that removes Shorts, eliminates algorithmic distractions, and redirects Shorts links to the standard video player.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-success?style=flat-square)
![Dependencies](https://img.shields.io/badge/Dependencies-0-blue?style=flat-square)
![Privacy](https://img.shields.io/badge/Privacy-No%20Data%20Collected-green?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)

---

## 🌟 Overview

YouTube Shorts are designed for infinite, algorithmic scrolling. **TubeTrim** cleans your YouTube experience across every page, keeping normal videos, search results, subscriptions, and navigation intact while cleanly removing Shorts shelves, reels, sidebar lockups, and redirecting Shorts URLs into YouTube's standard full-featured watch player.

---

## ✨ Features

- 🚫 **Shorts Removal Everywhere**:
  - **Homepage**: Cleans grid shelves (`ytd-rich-shelf-renderer[is-shorts]`) and rich sections.
  - **Subscriptions & Channels**: Removes Shorts sections while keeping standard video uploads untouched.
  - **Search Results**: Hides Shorts reels (`ytd-reel-shelf-renderer`) and standalone Shorts cards.
  - **Watch Page Sidebar**: Cleans "Up Next" / related video recommendations without affecting normal related videos.
  - **Left Navigation Drawer**: Cleans Shorts entries from both standard and mini guide bars.
- 🔁 **Direct Shorts Link Redirection**:
  - Navigating directly to or opening any `https://www.youtube.com/shorts/<id>` link automatically opens in the standard video player: `https://www.youtube.com/watch?v=<id>`.
  - Enjoy standard controls: scrubbing, playback speed, comments, and theater mode.
- 🎮 **YouTube Playables Removal**:
  - Automatically eliminates the "YouTube Playables" instant games shelf from feeds and homepages.
  - Cleans Playables shortcuts from the navigation sidebar.
  - Fully toggleable in the popup (enabled by default).
- 🏷️ **Topic Filter Chips Preserved by Default**:
  - The top category bar (*"All"*, *"Music"*, *"Gaming"*, etc.) remains visible and functional by default.
  - An optional toggle in the popup allows you to hide it if you prefer an even more minimalist layout.
- ⚡ **Zero Visual Flash & Instant Live Toggling**:
  - CSS-level root rules ensure elements never flash during page loads.
  - Changes made in the extension popup apply **immediately** across open YouTube tabs without needing to refresh.
  - Paired `hide()` and `unhide()` logic ensures previously hidden elements are restored cleanly when toggled off.
- 🚦 **Selector-Drift Canary Diagnostics**:
  - Built-in diagnostic self-check logs a single grouped warning in the developer console if 5 consecutive passes on Home or Search detect zero Shorts, signaling potential DOM selector updates without interrupting your browsing.

---

## 🎛️ Extension Popup Controls

Click the TubeTrim extension icon in your Chrome toolbar to customize your experience:

| Setting | Default | Description |
| :--- | :---: | :--- |
| **Enable YouTube Clean** | `ON` | Master toggle. Pauses or resumes all extension features with one click. |
| **Hide Shorts** | `ON` | Hides Shorts shelves, feeds, search results, and sidebar lockups. |
| **Hide Playables** | `ON` | Hides YouTube Playables instant games shelves and navigation links. |
| **Hide topic chips** | `OFF` | Keeps category chips visible by default; toggle ON to hide them. |
| **Redirect Shorts links** | `ON` | Automatically converts `/shorts/<id>` URLs to standard `/watch?v=<id>`. |

*Note: Sub-toggles automatically dim and disable when the master switch is turned off.*

---

## 🔒 Privacy & Permissions

TubeTrim is built on the principle of **least privilege**:

```json
"permissions": ["storage"],
"host_permissions": ["*://*.youtube.com/*"]
```

- **`storage`**: Used solely to persist your popup toggle preferences locally (`chrome.storage.local`).
- **`*://*.youtube.com/*`**: Limits content script execution strictly to YouTube domains.
- ❌ **No `<all_urls>` permission**
- ❌ **No background service worker**
- ❌ **No telemetry, tracking, or network calls**
- ❌ **No third-party libraries or CDNs**

---

## 📦 Project Architecture

```text
TubeTrim/
├── manifest.json       # Manifest V3 configuration & permission boundaries
├── content.js          # Core engine (detection, hiding, selective unhiding, redirect, canary)
├── styles.css          # Instant-hide CSS rules and reversible state classes
├── popup.html          # Interactive extension settings popup
├── popup.css           # Sleek dark-mode styling matching YouTube's design system
├── popup.js            # Controller syncing popup toggles with chrome.storage.local
├── icons/              # Extension icons (16x16, 48x48, 128x128 PNG)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # Documentation
```

### Core Logic Overview

- **`SELECTORS`**: Comprehensive map of YouTube DOM components (shelves, links, containers, chips, and sidebars).
- **`processNode(node)`**: Identifies candidate nodes and walks up to the nearest video container (`closest(SELECTORS.cardContainers)`), ensuring standard videos are never hidden.
- **`hide(element, feature)` & `unhide(feature)`**: Tags DOM elements with `data-yt-clean-hidden` and specific CSS classes, enabling selective and non-destructive restoration.
- **`checkShortsRedirect()`**: Parses `/shorts/:id` in `window.location.pathname` and safely redirects using `location.replace()`.
- **`initializeObserver()`**: Uses a single batched `MutationObserver` combined with `requestAnimationFrame` for minimal CPU usage.
- **`initializeNavigationHandling()`**: Debounces YouTube SPA navigation events (`yt-navigate-finish`, `popstate`).

---

## 🚀 Installation Guide

### Load Unpacked in Chrome / Chromium

1. **Download or Clone this repository**:
   ```bash
   git clone https://github.com/your-username/TubeTrim.git
   ```
2. Open your browser and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle in the upper right-hand corner.
4. Click the **Load unpacked** button in the top toolbar.
5. Select the `TubeTrim` project folder (the folder containing `manifest.json`).
6. TubeTrim is now installed! Pin the extension icon to your toolbar for quick toggle access.

*(Compatible with Chrome, Brave, Microsoft Edge, Opera, Vivaldi, and Arc).*

---

## 🧪 Testing & Verification

1. **Shorts Removal**: Visit the [YouTube Homepage](https://www.youtube.com). Observe that the Shorts shelf is completely hidden, while regular video rows remain undisturbed.
2. **Category Chips**: Verify the top category bar (*All*, *Music*, *Gaming*, etc.) is visible. Toggle "Hide topic chips" ON in the popup to confirm it hides, and turn it OFF to verify it reappears instantly.
3. **Sidebar Check**: Open any standard video. Look at the "Up next" related videos sidebar on the right — Shorts items/shelves are filtered out, while normal related videos display normally.
4. **URL Redirection**: Paste a Shorts URL (e.g. `https://www.youtube.com/shorts/<video-id>`) into your address bar. You will be smoothly redirected to `https://www.youtube.com/watch?v=<video-id>`.
5. **Persistence**: Open the popup, change a setting, close the popup, and reload the browser. Settings are preserved via `chrome.storage.local`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
