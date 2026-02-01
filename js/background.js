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

  init() {
    // Set up idle detection
    chrome.idle.setDetectionInterval(this.IDLE_THRESHOLD);

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

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'saveWebsiteTime') {
        this.saveCurrentTime();
      }
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
