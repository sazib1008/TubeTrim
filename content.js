/**
 * YouTube Clean / TubeTrim — Content Script (v0.2)
 *
 * Efficient, zero-dependency Manifest V3 content script to eliminate YouTube Shorts,
 * hide topic chip bars, and redirect direct Shorts URLs to the standard watch player.
 */

(function () {
  'use strict';

  // --- 1. Default Configuration & Settings ---
  const DEFAULT_SETTINGS = {
    enabled: true,
    hideShorts: true,
    hidePlayables: true, // YouTube Playables removed by default
    hideChips: false,    // Topic chip bar preserved by default
    redirectShorts: true
  };

  let currentSettings = { ...DEFAULT_SETTINGS };

  // --- 2. Selectors Architecture ---
  const SELECTORS = {
    // Structural Shorts shelves & sections across Home, Subscriptions, Channels, and Search
    shortsRenderers: [
      'ytd-rich-shelf-renderer[is-shorts]',
      'ytd-reel-shelf-renderer',
      'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
      'ytd-rich-section-renderer:has(ytd-reel-shelf-renderer)',
      'ytd-guide-entry-renderer:has(a[title="Shorts"])',
      'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])',
      'ytm-shorts-lockup-view-model',
      'ytd-reel-item-renderer'
    ].join(', '),

    // Specific links pointing directly to shorts
    shortsLinks: [
      'a[href^="/shorts/"]',
      'a[href*="/shorts/"]',
      'a#thumbnail[href^="/shorts"]'
    ].join(', '),

    // YouTube Playables shelves and items
    playablesRenderers: [
      'ytd-rich-section-renderer:has(a[href*="/playables"])',
      'ytd-rich-shelf-renderer:has(a[href*="/playables"])',
      'ytd-shelf-renderer:has(a[href*="/playables"])',
      'ytd-guide-entry-renderer:has(a[href*="/playables"])',
      'ytd-mini-guide-entry-renderer:has(a[href*="/playables"])'
    ].join(', '),
    playablesLinks: 'a[href*="/playables"]',

    // Card containers that wrap individual video items
    cardContainers: [
      'ytd-rich-item-renderer',
      'ytd-video-renderer',
      'ytd-compact-video-renderer',
      'ytd-grid-video-renderer',
      'yt-lockup-view-model',
      'ytd-reel-item-renderer'
    ].join(', '),

    // Topic chip bar elements
    topicChips: [
      'ytd-feed-filter-chip-bar-renderer',
      '#chips-wrapper.ytd-feed-filter-chip-bar-renderer',
      'yt-chip-cloud-renderer.ytd-feed-filter-chip-bar-renderer'
    ].join(', '),

    // Watch-page sidebar container (related videos panel)
    watchSidebar: 'ytd-watch-next-secondary-results-renderer'
  };

  // --- 3. Canary Diagnostics State ---
  let consecutiveZeroPasses = 0;
  const CONSECUTIVE_PASS_THRESHOLD = 5;
  let canaryWarnedThisSession = false;

  // Track hidden elements for fast & selective unhiding
  const HIDDEN_CLASS_SHORTS = 'yt-clean-hidden-shorts';
  const HIDDEN_CLASS_CHIPS = 'yt-clean-hidden-chips';
  const HIDDEN_CLASS_PLAYABLES = 'yt-clean-hidden-playables';

  // --- 4. Hiding & Selective Unhiding ---

  /**
   * Hide an element and tag it with the feature key for selective restoration.
   * @param {HTMLElement} el
   * @param {'shorts'|'chips'} feature
   */
  function hide(el, feature) {
    if (!el || !(el instanceof HTMLElement)) return;

    if (feature === 'shorts') {
      if (!el.classList.contains(HIDDEN_CLASS_SHORTS)) {
        el.classList.add(HIDDEN_CLASS_SHORTS);
        el.setAttribute('data-yt-clean-hidden', 'shorts');
      }
    } else if (feature === 'chips') {
      if (!el.classList.contains(HIDDEN_CLASS_CHIPS)) {
        el.classList.add(HIDDEN_CLASS_CHIPS);
        el.setAttribute('data-yt-clean-hidden', 'chips');
      }
    } else if (feature === 'playables') {
      if (!el.classList.contains(HIDDEN_CLASS_PLAYABLES)) {
        el.classList.add(HIDDEN_CLASS_PLAYABLES);
        el.setAttribute('data-yt-clean-hidden', 'playables');
      }
    }
  }

  /**
   * Unhide all elements previously hidden by a specific feature (or all).
   * @param {'shorts'|'chips'|'playables'|'all'} feature
   */
  function unhide(feature) {
    if (feature === 'shorts' || feature === 'all') {
      const hiddenShorts = document.querySelectorAll(`.${HIDDEN_CLASS_SHORTS}, [data-yt-clean-hidden="shorts"]`);
      for (let i = 0; i < hiddenShorts.length; i++) {
        hiddenShorts[i].classList.remove(HIDDEN_CLASS_SHORTS);
        hiddenShorts[i].removeAttribute('data-yt-clean-hidden');
      }
      document.documentElement.removeAttribute('data-yt-clean-shorts');
    }

    if (feature === 'chips' || feature === 'all') {
      const hiddenChips = document.querySelectorAll(`.${HIDDEN_CLASS_CHIPS}, [data-yt-clean-hidden="chips"]`);
      for (let i = 0; i < hiddenChips.length; i++) {
        hiddenChips[i].classList.remove(HIDDEN_CLASS_CHIPS);
        hiddenChips[i].removeAttribute('data-yt-clean-hidden');
      }
      document.documentElement.removeAttribute('data-yt-clean-chips');
    }

    if (feature === 'playables' || feature === 'all') {
      const hiddenPlayables = document.querySelectorAll(`.${HIDDEN_CLASS_PLAYABLES}, [data-yt-clean-hidden="playables"]`);
      for (let i = 0; i < hiddenPlayables.length; i++) {
        hiddenPlayables[i].classList.remove(HIDDEN_CLASS_PLAYABLES);
        hiddenPlayables[i].removeAttribute('data-yt-clean-hidden');
      }
      document.documentElement.removeAttribute('data-yt-clean-playables');
    }
  }

  /**
   * Synchronize root element data attributes to support zero-flash CSS hiding.
   */
  function syncRootAttributes() {
    const isMasterActive = currentSettings.enabled;

    if (isMasterActive && currentSettings.hideShorts) {
      document.documentElement.setAttribute('data-yt-clean-shorts', 'true');
    } else {
      document.documentElement.removeAttribute('data-yt-clean-shorts');
    }

    if (isMasterActive && currentSettings.hidePlayables) {
      document.documentElement.setAttribute('data-yt-clean-playables', 'true');
    } else {
      document.documentElement.removeAttribute('data-yt-clean-playables');
    }

    if (isMasterActive && currentSettings.hideChips) {
      document.documentElement.setAttribute('data-yt-clean-chips', 'true');
    } else {
      document.documentElement.removeAttribute('data-yt-clean-chips');
    }
  }

  // --- 5. Direct Shorts Navigation / Redirect ---

  /**
   * Check if current location is a direct Shorts URL and redirect to the standard watch player.
   */
  function checkShortsRedirect() {
    if (!currentSettings.enabled || !currentSettings.redirectShorts) {
      return;
    }

    const pathname = window.location.pathname;
    if (pathname.startsWith('/shorts/')) {
      const parts = pathname.split('/');
      const videoId = parts[2];
      if (videoId && videoId.length > 0) {
        const search = window.location.search || '';
        const newUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}${search ? '&' + search.slice(1) : ''}`;
        window.location.replace(newUrl);
      }
    }
  }

  // --- 6. Processing Logic ---

  /**
   * Process a single DOM node (or subtree root) to find and hide Shorts or Chips.
   * @param {Node} node
   * @returns {number} Number of Shorts elements hidden in this node
   */
  function processNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return 0;
    if (!currentSettings.enabled) return 0;

    let shortsCount = 0;
    const el = /** @type {HTMLElement} */ (node);

    // 1. Process Topic Chips
    if (currentSettings.hideChips) {
      if (el.matches && el.matches(SELECTORS.topicChips)) {
        hide(el, 'chips');
      } else {
        const chipElements = el.querySelectorAll(SELECTORS.topicChips);
        for (let i = 0; i < chipElements.length; i++) {
          hide(/** @type {HTMLElement} */ (chipElements[i]), 'chips');
        }
      }
    }

    // 2. Process Shorts
    if (currentSettings.hideShorts) {
      // 2a. Check if the element itself is a Shorts shelf/renderer
      if (el.matches && el.matches(SELECTORS.shortsRenderers)) {
        // If it's inside a rich-section-renderer, hide the section parent so it doesn't leave an empty row
        const parentSection = el.closest('ytd-rich-section-renderer');
        hide(parentSection || el, 'shorts');
        shortsCount++;
      } else {
        // 2b. Find child Shorts shelves
        const shelves = el.querySelectorAll(SELECTORS.shortsRenderers);
        for (let i = 0; i < shelves.length; i++) {
          const shelf = /** @type {HTMLElement} */ (shelves[i]);
          const parentSection = shelf.closest('ytd-rich-section-renderer');
          hide(parentSection || shelf, 'shorts');
          shortsCount++;
        }
      }

      // 2c. Find individual Shorts links and hide their wrapping card container
      const shortsLinks = el.querySelectorAll(SELECTORS.shortsLinks);
      for (let i = 0; i < shortsLinks.length; i++) {
        const link = shortsLinks[i];
        // Confirm it is genuinely a shorts link
        const href = link.getAttribute('href') || '';
        if (href.includes('/shorts/')) {
          const card = link.closest(SELECTORS.cardContainers);
          if (card && !card.classList.contains(HIDDEN_CLASS_SHORTS)) {
            hide(/** @type {HTMLElement} */ (card), 'shorts');
            shortsCount++;
          }
        }
      }
    }

    // 3. Process YouTube Playables
    if (currentSettings.hidePlayables) {
      // 3a. Find links pointing to playables and hide their shelf or container
      const playablesLinks = el.querySelectorAll ? el.querySelectorAll(SELECTORS.playablesLinks) : [];
      for (let i = 0; i < playablesLinks.length; i++) {
        const link = playablesLinks[i];
        const shelf = link.closest('ytd-rich-section-renderer, ytd-rich-shelf-renderer, ytd-shelf-renderer, ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer');
        if (shelf) {
          hide(/** @type {HTMLElement} */ (shelf), 'playables');
        } else {
          hide(/** @type {HTMLElement} */ (link), 'playables');
        }
      }

      // 3b. Check shelves with title or header text matching "Playables"
      const shelves = el.querySelectorAll ? el.querySelectorAll('ytd-rich-section-renderer, ytd-rich-shelf-renderer, ytd-shelf-renderer') : [];
      for (let i = 0; i < shelves.length; i++) {
        const shelf = shelves[i];
        const titleEl = shelf.querySelector('#title, #title-text, #header, h2');
        if (titleEl && titleEl.textContent && /playables/i.test(titleEl.textContent)) {
          hide(/** @type {HTMLElement} */ (shelf), 'playables');
        }
      }
    }

    return shortsCount;
  }

  /**
   * Run a full document pass across the page.
   */
  function runFullPass() {
    if (!currentSettings.enabled) return;

    checkShortsRedirect();
    syncRootAttributes();

    let totalShortsHidden = 0;
    totalShortsHidden += processNode(document.body || document.documentElement);

    // Run canary self-check if on a page where Shorts are typically expected (Home or Search)
    checkSelectorDriftCanary(totalShortsHidden);
  }

  /**
   * Selector-drift canary: warns once in console if zero shorts elements are detected
   * across multiple consecutive passes on Home or Search pages.
   * @param {number} matchedCount
   */
  function checkSelectorDriftCanary(matchedCount) {
    const path = window.location.pathname;
    const isCandidatePage = path === '/' || path === '/results';

    if (!isCandidatePage || !currentSettings.enabled || !currentSettings.hideShorts) {
      return;
    }

    if (matchedCount > 0) {
      consecutiveZeroPasses = 0;
    } else {
      consecutiveZeroPasses++;
      if (consecutiveZeroPasses >= CONSECUTIVE_PASS_THRESHOLD && !canaryWarnedThisSession) {
        canaryWarnedThisSession = true;
        console.groupCollapsed('[TubeTrim: YouTube Clean] Diagnostic Warning: Selector Drift Canary');
        console.warn(
          'Zero Shorts elements matched across all selectors over %d consecutive passes on %s.',
          consecutiveZeroPasses,
          path
        );
        console.warn('YouTube DOM selectors may have changed. Please inspect DOM or update selectors.');
        console.groupEnd();
      }
    }
  }

  // --- 7. MutationObserver Setup ---
  let observer = null;
  let pendingNodes = [];
  let rafId = null;

  /**
   * Batch process added nodes during DOM mutations using requestAnimationFrame.
   */
  function flushPendingNodes() {
    rafId = null;
    if (!currentSettings.enabled || pendingNodes.length === 0) {
      pendingNodes = [];
      return;
    }

    const nodesToProcess = pendingNodes;
    pendingNodes = [];

    for (let i = 0; i < nodesToProcess.length; i++) {
      processNode(nodesToProcess[i]);
    }
  }

  /**
   * Initialize the single MutationObserver.
   */
  function initializeObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(mutations => {
      if (!currentSettings.enabled) return;

      for (let i = 0; i < mutations.length; i++) {
        const addedNodes = mutations[i].addedNodes;
        for (let j = 0; j < addedNodes.length; j++) {
          const node = addedNodes[j];
          if (node.nodeType === Node.ELEMENT_NODE) {
            pendingNodes.push(node);
          }
        }
      }

      if (!rafId && pendingNodes.length > 0) {
        rafId = requestAnimationFrame(flushPendingNodes);
      }
    });

    const target = document.documentElement || document;
    observer.observe(target, {
      childList: true,
      subtree: true
    });
  }

  // --- 8. Navigation Handling & Debounce ---
  let navDebounceTimer = null;
  const NAV_DEBOUNCE_MS = 120;

  /**
   * Debounced handler for SPA navigation events (`yt-navigate-finish`, `popstate`).
   */
  function onNavigation() {
    checkShortsRedirect();

    if (navDebounceTimer) {
      clearTimeout(navDebounceTimer);
    }

    navDebounceTimer = setTimeout(() => {
      navDebounceTimer = null;
      runFullPass();
    }, NAV_DEBOUNCE_MS);
  }

  /**
   * Initialize listeners for YouTube SPA navigation.
   */
  function initializeNavigationHandling() {
    window.addEventListener('yt-navigate-finish', onNavigation, { passive: true });
    window.addEventListener('popstate', onNavigation, { passive: true });
  }

  // --- 9. Storage Listener & Settings Synchronization ---

  /**
   * Handle changes made via the extension popup without requiring a page reload.
   * @param {Object} changes
   * @param {string} areaName
   */
  function handleStorageChanges(changes, areaName) {
    if (areaName !== 'local') return;

    let needUnhideShorts = false;
    let needUnhideChips = false;
    let needUnhidePlayables = false;
    let needRunPass = false;

    const oldEnabled = currentSettings.enabled;
    const oldHideShorts = currentSettings.hideShorts;
    const oldHidePlayables = currentSettings.hidePlayables;
    const oldHideChips = currentSettings.hideChips;

    if ('enabled' in changes) {
      currentSettings.enabled = Boolean(changes.enabled.newValue);
    }
    if ('hideShorts' in changes) {
      currentSettings.hideShorts = Boolean(changes.hideShorts.newValue);
    }
    if ('hidePlayables' in changes) {
      currentSettings.hidePlayables = Boolean(changes.hidePlayables.newValue);
    }
    if ('hideChips' in changes) {
      currentSettings.hideChips = Boolean(changes.hideChips.newValue);
    }
    if ('redirectShorts' in changes) {
      currentSettings.redirectShorts = Boolean(changes.redirectShorts.newValue);
    }

    syncRootAttributes();

    // Check if master was disabled
    if (oldEnabled && !currentSettings.enabled) {
      unhide('all');
      return;
    }

    // If master was re-enabled, run full pass
    if (!oldEnabled && currentSettings.enabled) {
      runFullPass();
      return;
    }

    // If master is enabled, handle sub-toggle changes
    if (currentSettings.enabled) {
      if (oldHideShorts && !currentSettings.hideShorts) {
        needUnhideShorts = true;
      } else if (!oldHideShorts && currentSettings.hideShorts) {
        needRunPass = true;
      }

      if (oldHidePlayables && !currentSettings.hidePlayables) {
        needUnhidePlayables = true;
      } else if (!oldHidePlayables && currentSettings.hidePlayables) {
        needRunPass = true;
      }

      if (oldHideChips && !currentSettings.hideChips) {
        needUnhideChips = true;
      } else if (!oldHideChips && currentSettings.hideChips) {
        needRunPass = true;
      }

      if (needUnhideShorts) {
        unhide('shorts');
      }
      if (needUnhidePlayables) {
        unhide('playables');
      }
      if (needUnhideChips) {
        unhide('chips');
      }
      if (needRunPass) {
        runFullPass();
      }

      // Check redirect if redirect was just toggled on
      if (currentSettings.redirectShorts) {
        checkShortsRedirect();
      }
    }
  }

  // --- 10. Initialization ---

  /**
   * Main entry point.
   */
  function initialize() {
    // Initial redirect check before DOM finishes loading
    checkShortsRedirect();

    // Load persisted settings
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(DEFAULT_SETTINGS, stored => {
        if (chrome.runtime.lastError) {
          console.warn('[TubeTrim] Error loading storage settings:', chrome.runtime.lastError);
        } else {
          currentSettings = {
            enabled: stored.enabled !== false,
            hideShorts: stored.hideShorts !== false,
            hidePlayables: stored.hidePlayables !== false,
            hideChips: stored.hideChips === true,
            redirectShorts: stored.redirectShorts !== false
          };
        }

        syncRootAttributes();
        if (!currentSettings.hideChips) {
          unhide('chips');
        }
        if (!currentSettings.hidePlayables) {
          unhide('playables');
        }
        checkShortsRedirect();
        runFullPass();
      });

      // Listen for dynamic toggle changes from the popup
      chrome.storage.onChanged.addListener(handleStorageChanges);
    } else {
      // Fallback if storage API is unavailable
      syncRootAttributes();
      runFullPass();
    }

    // Initialize observer and navigation handlers
    initializeObserver();
    initializeNavigationHandling();

    // Fallback pass when document finishes loading
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runFullPass, { once: true });
    } else {
      runFullPass();
    }
  }

  // Execute initialization
  initialize();
})();
