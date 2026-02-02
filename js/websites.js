// Website utilities for time formatting, trends, and category management

const Websites = {
  // Default category mappings for common domains
  DEFAULT_DOMAIN_CATEGORIES: {
    // Code
    'github.com': 'cat-2',
    'gitlab.com': 'cat-2',
    'bitbucket.org': 'cat-2',
    'stackoverflow.com': 'cat-2',
    'codepen.io': 'cat-2',
    'replit.com': 'cat-2',
    'codesandbox.io': 'cat-2',
    'jsfiddle.net': 'cat-2',
    'npmjs.com': 'cat-2',
    'developer.mozilla.org': 'cat-2',

    // Productivity
    'notion.so': 'cat-1',
    'trello.com': 'cat-1',
    'asana.com': 'cat-1',
    'monday.com': 'cat-1',
    'linear.app': 'cat-1',
    'figma.com': 'cat-1',
    'docs.google.com': 'cat-1',
    'sheets.google.com': 'cat-1',
    'slides.google.com': 'cat-1',
    'drive.google.com': 'cat-1',
    'calendar.google.com': 'cat-1',
    'mail.google.com': 'cat-1',
    'outlook.live.com': 'cat-1',
    'slack.com': 'cat-1',

    // Social Media
    'twitter.com': 'cat-3',
    'x.com': 'cat-3',
    'facebook.com': 'cat-3',
    'instagram.com': 'cat-3',
    'linkedin.com': 'cat-3',
    'reddit.com': 'cat-3',
    'tiktok.com': 'cat-3',
    'threads.net': 'cat-3',
    'mastodon.social': 'cat-3',

    // Entertainment
    'youtube.com': 'cat-4',
    'netflix.com': 'cat-4',
    'twitch.tv': 'cat-4',
    'hulu.com': 'cat-4',
    'disneyplus.com': 'cat-4',
    'primevideo.com': 'cat-4',
    'spotify.com': 'cat-4',
    'soundcloud.com': 'cat-4'
  },

  // Format seconds to human-readable time
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    return `${minutes}m`;
  },

  // Get category for a domain
  async getCategoryForDomain(domain) {
    // First check user settings
    const settings = await Storage.getWebsiteSettings();
    if (settings[domain]?.categoryId) {
      return settings[domain].categoryId;
    }

    // Fall back to default mappings
    return this.DEFAULT_DOMAIN_CATEGORIES[domain] || null;
  },

  // Get category object for a domain
  async getCategoryObjectForDomain(domain) {
    const categoryId = await this.getCategoryForDomain(domain);
    if (!categoryId) return null;

    const categories = await Storage.getWebsiteCategories();
    return categories.find(c => c.id === categoryId) || null;
  },

  // Get display name for a domain (custom name or domain itself)
  async getDisplayName(domain) {
    const settings = await Storage.getWebsiteSettings();
    return settings[domain]?.customName || domain;
  },

  // Get weekly trend data for a domain (last 7 days)
  async getWeeklyTrend(domain) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);

    const entries = await Storage.getWebsiteEntries(
      Storage.formatDate(startDate),
      Storage.formatDate(today)
    );

    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = Storage.formatDate(date);

      trend.push({
        date: dateStr,
        dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
        seconds: entries[dateStr]?.[domain]?.totalSeconds || 0
      });
    }

    return trend;
  },

  // Get monthly trend data for a domain (last 30 days)
  async getMonthlyTrend(domain) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 29);

    const entries = await Storage.getWebsiteEntries(
      Storage.formatDate(startDate),
      Storage.formatDate(today)
    );

    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = Storage.formatDate(date);

      trend.push({
        date: dateStr,
        dayNum: date.getDate(),
        seconds: entries[dateStr]?.[domain]?.totalSeconds || 0
      });
    }

    return trend;
  },

  // Get total time per category for a specific date
  async getCategoryTotals(date) {
    const entries = await Storage.getWebsiteEntries(date, date);
    const dayEntries = entries[date] || {};
    const categories = await Storage.getWebsiteCategories();

    const totals = {};
    for (const category of categories) {
      totals[category.id] = {
        category,
        totalSeconds: 0
      };
    }
    // Add uncategorized
    totals['uncategorized'] = {
      category: { id: 'uncategorized', name: 'Other', color: '#666666' },
      totalSeconds: 0
    };

    for (const [domain, data] of Object.entries(dayEntries)) {
      const categoryId = await this.getCategoryForDomain(domain);
      const key = categoryId || 'uncategorized';
      if (totals[key]) {
        totals[key].totalSeconds += data.totalSeconds;
      }
    }

    // Convert to array and filter out zeros
    return Object.values(totals).filter(t => t.totalSeconds > 0);
  },

  // Get today's websites sorted by time
  async getTodayWebsites() {
    const today = Storage.formatDate(new Date());
    const entries = await Storage.getWebsiteEntries(today, today);
    const dayEntries = entries[today] || {};

    const websites = [];
    for (const [domain, data] of Object.entries(dayEntries)) {
      // Skip null, undefined, or empty domain names
      if (!domain || domain === 'null' || domain === 'undefined') {
        continue;
      }

      const category = await this.getCategoryObjectForDomain(domain);
      const displayName = await this.getDisplayName(domain);

      websites.push({
        domain,
        displayName: displayName || 'Unknown site',
        totalSeconds: data.totalSeconds,
        favicon: data.favicon || `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        category
      });
    }

    // Sort by time descending
    websites.sort((a, b) => b.totalSeconds - a.totalSeconds);

    return websites;
  },

  // Get total time for today
  async getTodayTotalTime() {
    const websites = await this.getTodayWebsites();
    return websites.reduce((sum, w) => sum + w.totalSeconds, 0);
  },

  // Generate a unique category ID
  generateCategoryId() {
    return 'cat-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // Get remaining time for a domain today (in seconds)
  async getRemainingTime(domain) {
    const settings = await Storage.getWebsiteSettings();
    const limit = settings[domain]?.dailyLimitSeconds;

    if (!limit) return null; // No limit set

    const today = Storage.formatDate(new Date());
    const entries = await Storage.getWebsiteEntries(today, today);
    const used = entries[today]?.[domain]?.totalSeconds || 0;

    return Math.max(0, limit - used);
  },

  // Check if domain is currently blocked (limit exceeded)
  async isBlocked(domain) {
    const remaining = await this.getRemainingTime(domain);
    return remaining !== null && remaining <= 0;
  },

  // Format time limit for display (handles null)
  formatTimeLimit(seconds) {
    if (seconds === null || seconds === undefined) return 'No limit';
    return this.formatTime(seconds);
  }
};
