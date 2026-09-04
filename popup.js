/**
 * TubeTrim / YouTube Clean — Popup Controller (v0.2)
 *
 * Manages extension state, reads/writes settings to chrome.storage.local,
 * and updates popup UI components dynamically.
 */

(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    hideShorts: true,
    hidePlayables: true, // YouTube Playables removed by default
    hideChips: false,    // Topic chip bar preserved by default
    redirectShorts: true
  };

  // Elements
  const toggleEnabled = /** @type {HTMLInputElement} */ (document.getElementById('toggle-enabled'));
  const toggleHideShorts = /** @type {HTMLInputElement} */ (document.getElementById('toggle-hide-shorts'));
  const toggleHidePlayables = /** @type {HTMLInputElement} */ (document.getElementById('toggle-hide-playables'));
  const toggleHideChips = /** @type {HTMLInputElement} */ (document.getElementById('toggle-hide-chips'));
  const toggleRedirectShorts = /** @type {HTMLInputElement} */ (document.getElementById('toggle-redirect-shorts'));
  const subSettingsContainer = document.getElementById('sub-settings-container');
  const masterStatusDesc = document.getElementById('master-status-desc');

  /**
   * Update the visual state of sub-settings based on the master toggle.
   * @param {boolean} isEnabled
   */
  function updateSubSettingsVisuals(isEnabled) {
    if (subSettingsContainer) {
      if (isEnabled) {
        subSettingsContainer.classList.remove('disabled');
      } else {
        subSettingsContainer.classList.add('disabled');
      }
    }

    if (masterStatusDesc) {
      masterStatusDesc.textContent = isEnabled
        ? 'All cleaning features active'
        : 'Extension is paused';
    }
  }

  /**
   * Load saved settings from chrome.storage.local and set switch states.
   */
  function loadSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      console.warn('[TubeTrim Popup] chrome.storage.local is unavailable.');
      return;
    }

    chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
      if (chrome.runtime.lastError) {
        console.error('[TubeTrim Popup] Failed to load settings:', chrome.runtime.lastError);
        return;
      }

      const enabled = items.enabled !== false;
      const hideShorts = items.hideShorts !== false;
      const hidePlayables = items.hidePlayables !== false;
      const hideChips = items.hideChips === true;
      const redirectShorts = items.redirectShorts !== false;

      if (toggleEnabled) toggleEnabled.checked = enabled;
      if (toggleHideShorts) toggleHideShorts.checked = hideShorts;
      if (toggleHidePlayables) toggleHidePlayables.checked = hidePlayables;
      if (toggleHideChips) toggleHideChips.checked = hideChips;
      if (toggleRedirectShorts) toggleRedirectShorts.checked = redirectShorts;

      updateSubSettingsVisuals(enabled);
    });
  }

  /**
   * Save a single setting change to chrome.storage.local.
   * @param {string} key
   * @param {boolean} value
   */
  function saveSetting(key, value) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }

    const payload = {};
    payload[key] = value;

    chrome.storage.local.set(payload, () => {
      if (chrome.runtime.lastError) {
        console.error(`[TubeTrim Popup] Error saving ${key}:`, chrome.runtime.lastError);
      }
    });
  }

  // Event Listeners
  if (toggleEnabled) {
    toggleEnabled.addEventListener('change', () => {
      const isEnabled = toggleEnabled.checked;
      updateSubSettingsVisuals(isEnabled);
      saveSetting('enabled', isEnabled);
    });
  }

  if (toggleHideShorts) {
    toggleHideShorts.addEventListener('change', () => {
      saveSetting('hideShorts', toggleHideShorts.checked);
    });
  }

  if (toggleHidePlayables) {
    toggleHidePlayables.addEventListener('change', () => {
      saveSetting('hidePlayables', toggleHidePlayables.checked);
    });
  }

  if (toggleHideChips) {
    toggleHideChips.addEventListener('change', () => {
      saveSetting('hideChips', toggleHideChips.checked);
    });
  }

  if (toggleRedirectShorts) {
    toggleRedirectShorts.addEventListener('change', () => {
      saveSetting('redirectShorts', toggleRedirectShorts.checked);
    });
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', loadSettings);
})();
