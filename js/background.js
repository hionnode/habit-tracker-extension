// Background service worker for website time tracking

const WebsiteTracker = {
  // Current tracking state
  currentDomain: null,
  currentFavicon: null,
  trackingStartTime: null,
  isUserActive: true,

  // Save interval in milliseconds
  SAVE_INTERVAL: 30000,

  // Idle detection threshold in seconds
  IDLE_THRESHOLD: 60,

  // Track which domains are currently blocked (in-memory cache)
  blockedDomains: new Set(),

  async init() {
    // Set up idle detection
    chrome.idle.setDetectionInterval(this.IDLE_THRESHOLD);

    // Restore blocked state from session storage (survives service worker termination)
    await this.restoreBlockedState();

    // Initialize blocking system
    this.initBlockingSystem();

    // Listen for idle state changes
    chrome.idle.onStateChanged.addListener((state) => {
      this.handleIdleStateChange(state);
    });

    // Listen for tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo);
    });

    // Listen for tab URL changes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdated(tabId, changeInfo, tab);
    });

    // Listen for window focus changes
    chrome.windows.onFocusChanged.addListener((windowId) => {
      this.handleWindowFocusChanged(windowId);
    });

    // Start periodic save
    this.startPeriodicSave();

    // Initialize with current tab
    this.initCurrentTab();
  },

  async initCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        this.startTracking(tab.url, tab.favIconUrl);
      }
    } catch (e) {
      console.error('Error initializing current tab:', e);
    }
  },

  handleIdleStateChange(state) {
    if (state === 'active') {
      this.isUserActive = true;
      // Resume tracking
      if (this.currentDomain && !this.trackingStartTime) {
        this.trackingStartTime = Date.now();
      }
    } else {
      // User is idle or locked
      this.isUserActive = false;
      // Save current time and pause tracking
      this.saveCurrentTime();
      this.trackingStartTime = null;
    }
  },

  async handleTabActivated(activeInfo) {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab && tab.url) {
        this.switchToUrl(tab.url, tab.favIconUrl);
      }
    } catch (e) {
      console.error('Error handling tab activation:', e);
    }
  },

  handleTabUpdated(tabId, changeInfo, tab) {
    // Only track URL changes on the active tab
    if (changeInfo.url && tab.active) {
      this.switchToUrl(changeInfo.url, tab.favIconUrl);
    }
    // Update favicon if it changes
    if (changeInfo.favIconUrl && tab.active && this.currentDomain) {
      const domain = this.extractDomain(tab.url);
      if (domain === this.currentDomain) {
        this.currentFavicon = changeInfo.favIconUrl;
      }
    }
  },

  async handleWindowFocusChanged(windowId) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Browser lost focus - save current time
      this.saveCurrentTime();
      this.trackingStartTime = null;
    } else {
      // Browser gained focus - resume tracking
      try {
        const [tab] = await chrome.tabs.query({ active: true, windowId });
        if (tab && tab.url) {
          this.switchToUrl(tab.url, tab.favIconUrl);
        }
      } catch (e) {
        console.error('Error handling window focus:', e);
      }
    }
  },

  switchToUrl(url, faviconUrl) {
    const domain = this.extractDomain(url);

    // Skip invalid domains
    if (!domain) {
      this.saveCurrentTime();
      this.currentDomain = null;
      this.currentFavicon = null;
      this.trackingStartTime = null;
      return;
    }

    // If domain changed, save time for previous domain
    if (domain !== this.currentDomain) {
      this.saveCurrentTime();
      this.startTracking(url, faviconUrl);
    }
  },

  startTracking(url, faviconUrl) {
    const domain = this.extractDomain(url);
    if (!domain) return;

    this.currentDomain = domain;
    this.currentFavicon = faviconUrl || this.getFaviconUrl(domain);
    this.trackingStartTime = this.isUserActive ? Date.now() : null;
  },

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      // Skip chrome:// and other browser URLs
      if (!urlObj.protocol.startsWith('http')) {
        return null;
      }
      return urlObj.hostname;
    } catch (e) {
      return null;
    }
  },

  getFaviconUrl(domain) {
    // Use DuckDuckGo's favicon service
    return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  },

  async saveCurrentTime() {
    if (!this.currentDomain || !this.trackingStartTime) return;

    const elapsedSeconds = Math.floor((Date.now() - this.trackingStartTime) / 1000);
    if (elapsedSeconds < 1) return;

    const today = this.formatDate(new Date());

    try {
      // Get current data
      const result = await chrome.storage.local.get(['websiteEntries']);
      const websiteEntries = result.websiteEntries || {};

      if (!websiteEntries[today]) {
        websiteEntries[today] = {};
      }

      if (!websiteEntries[today][this.currentDomain]) {
        websiteEntries[today][this.currentDomain] = {
          totalSeconds: 0,
          favicon: this.currentFavicon
        };
      }

      websiteEntries[today][this.currentDomain].totalSeconds += elapsedSeconds;

      // Update favicon if we have a newer one
      if (this.currentFavicon) {
        websiteEntries[today][this.currentDomain].favicon = this.currentFavicon;
      }

      await chrome.storage.local.set({ websiteEntries });

      // Check if time limit exceeded after saving
      const exceeded = await this.checkTimeLimit(this.currentDomain);
      if (exceeded) {
        await this.addBlockRule(this.currentDomain);
      }

      // Reset tracking start time
      this.trackingStartTime = this.isUserActive ? Date.now() : null;
    } catch (e) {
      console.error('Error saving website time:', e);
    }
  },

  startPeriodicSave() {
    // Use chrome.alarms for reliable periodic execution in service workers
    chrome.alarms.create('saveWebsiteTime', {
      periodInMinutes: 0.5 // 30 seconds
    });

    // Storage cleanup alarm - runs once per day
    chrome.alarms.create('storageCleanup', {
      periodInMinutes: 24 * 60 // Once per day
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'saveWebsiteTime') {
        this.saveCurrentTime();
      }
      if (alarm.name === 'dailyLimitReset') {
        this.clearAllBlockRules();
      }
      if (alarm.name === 'storageCleanup') {
        this.runStorageCleanup();
      }
    });
  },

  // Run storage cleanup to prevent unbounded growth
  async runStorageCleanup() {
    try {
      // Access Storage via chrome.storage since this is a service worker
      const result = await chrome.storage.local.get(['websiteEntries', 'entries']);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days for websites
      const websiteCutoff = this.formatDate(cutoffDate);

      cutoffDate.setDate(cutoffDate.getDate() - 310); // 400 days total for habits
      const habitCutoff = this.formatDate(cutoffDate);

      // Clean website entries
      const websiteEntries = result.websiteEntries || {};
      const cleanedWebsiteEntries = {};
      for (const [date, entries] of Object.entries(websiteEntries)) {
        if (date >= websiteCutoff) {
          cleanedWebsiteEntries[date] = entries;
        }
      }

      // Clean habit entries
      const habitEntries = result.entries || {};
      const cleanedHabitEntries = {};
      for (const [date, entries] of Object.entries(habitEntries)) {
        if (date >= habitCutoff) {
          cleanedHabitEntries[date] = entries;
        }
      }

      await chrome.storage.local.set({
        websiteEntries: cleanedWebsiteEntries,
        entries: cleanedHabitEntries
      });

      console.log('Storage cleanup completed');
    } catch (e) {
      console.error('Storage cleanup error:', e);
    }
  },

  // Initialize blocking system on startup
  async initBlockingSystem() {
    // Clear any stale rules from previous sessions
    await this.clearAllBlockRules();

    // Check all domains with limits and block if already exceeded
    await this.checkAllTimeLimits();

    // Set up daily reset alarm
    this.setupDailyReset();
  },

  // Check if a domain has exceeded its time limit
  async checkTimeLimit(domain) {
    const today = this.formatDate(new Date());

    const result = await chrome.storage.local.get(['websiteSettings', 'websiteEntries']);
    const settings = result.websiteSettings || {};
    const entries = result.websiteEntries || {};

    const domainSettings = settings[domain];
    if (!domainSettings?.dailyLimitSeconds) return false;

    const todayEntry = entries[today]?.[domain];
    const usedSeconds = todayEntry?.totalSeconds || 0;

    return usedSeconds >= domainSettings.dailyLimitSeconds;
  },

  // Persist blocked state to session storage (survives service worker termination)
  async persistBlockedState() {
    try {
      await chrome.storage.session.set({
        blockedDomains: Array.from(this.blockedDomains)
      });
    } catch (e) {
      console.error('Error persisting blocked state:', e);
    }
  },

  // Restore blocked state from session storage
  async restoreBlockedState() {
    try {
      const { blockedDomains } = await chrome.storage.session.get(['blockedDomains']);
      this.blockedDomains = new Set(blockedDomains || []);
      console.log('Restored blocked domains:', this.blockedDomains.size);

      // Re-check all time limits in case they changed while service worker was inactive
      await this.checkAllTimeLimits();
    } catch (e) {
      console.error('Error restoring blocked state:', e);
      this.blockedDomains = new Set();
    }
  },

  // Block a domain by notifying content scripts
  async addBlockRule(domain) {
    if (this.blockedDomains.has(domain)) return;

    const result = await chrome.storage.local.get(['websiteSettings']);
    const limit = result.websiteSettings?.[domain]?.dailyLimitSeconds || 0;

    this.blockedDomains.add(domain);

    // Persist to session storage
    await this.persistBlockedState();

    console.log(`Blocked domain: ${domain}`);

    // Send block message to all tabs with this domain
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url) {
          const tabDomain = this.extractDomain(tab.url);
          if (tabDomain === domain) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'BLOCK_DOMAIN',
              domain: domain,
              limit: limit
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error('Error sending block message:', e);
    }
  },

  // Remove block for a domain (not used much since blocks reset at midnight)
  async removeBlockRule(domain) {
    this.blockedDomains.delete(domain);
    await this.persistBlockedState();
    console.log(`Unblocked domain: ${domain}`);
  },

  // Clear all blocks (used on daily reset)
  async clearAllBlockRules() {
    this.blockedDomains.clear();
    await this.persistBlockedState();
    console.log('Cleared all block rules');
  },

  // Check all domains with time limits
  async checkAllTimeLimits() {
    const result = await chrome.storage.local.get(['websiteSettings', 'websiteEntries']);
    const settings = result.websiteSettings || {};
    const entries = result.websiteEntries || {};
    const today = this.formatDate(new Date());
    const todayEntries = entries[today] || {};

    for (const [domain, domainSettings] of Object.entries(settings)) {
      if (domainSettings.dailyLimitSeconds) {
        const usedSeconds = todayEntries[domain]?.totalSeconds || 0;
        if (usedSeconds >= domainSettings.dailyLimitSeconds) {
          await this.addBlockRule(domain);
        }
      }
    }
  },

  // Set up daily reset at midnight
  setupDailyReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const msUntilMidnight = midnight.getTime() - now.getTime();

    chrome.alarms.create('dailyLimitReset', {
      when: Date.now() + msUntilMidnight,
      periodInMinutes: 24 * 60
    });
  },

  formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

// Initialize tracker
WebsiteTracker.init();
