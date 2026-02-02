// Blocked page logic - displays blocked domain info and productivity suggestions

(async function() {
  // Extract domain and limit from URL parameters
  const params = new URLSearchParams(window.location.search);
  const domain = params.get('domain') || 'Unknown site';
  const limit = parseInt(params.get('limit') || '0', 10);

  // Display blocked domain
  document.getElementById('blockedDomain').textContent = domain;

  // Format and display limit
  if (limit > 0) {
    const hours = Math.floor(limit / 3600);
    const minutes = Math.floor((limit % 3600) / 60);
    let limitText = '';
    if (hours > 0) limitText += `${hours} hour${hours > 1 ? 's' : ''} `;
    if (minutes > 0) limitText += `${minutes} minute${minutes > 1 ? 's' : ''}`;
    document.getElementById('dailyLimit').textContent = limitText.trim() || '0 minutes';
  }

  // Fetch productivity websites from storage
  await loadProductivitySuggestions();
})();

async function loadProductivitySuggestions() {
  const container = document.getElementById('productivityList');

  // Productivity category IDs
  const productivityCategoryIds = ['cat-1', 'cat-2']; // Productivity and Code

  try {
    // Get today's date
    const today = formatDate(new Date());

    // Get website entries and settings
    const result = await chrome.storage.local.get(['websiteEntries', 'websiteSettings', 'websiteCategories']);
    const entries = result.websiteEntries || {};
    const settings = result.websiteSettings || {};
    const categories = result.websiteCategories || [];

    const todayEntries = entries[today] || {};

    // Default domain to category mappings
    const defaultMappings = {
      'github.com': 'cat-2',
      'gitlab.com': 'cat-2',
      'stackoverflow.com': 'cat-2',
      'codepen.io': 'cat-2',
      'replit.com': 'cat-2',
      'npmjs.com': 'cat-2',
      'developer.mozilla.org': 'cat-2',
      'notion.so': 'cat-1',
      'trello.com': 'cat-1',
      'asana.com': 'cat-1',
      'linear.app': 'cat-1',
      'figma.com': 'cat-1',
      'docs.google.com': 'cat-1',
      'sheets.google.com': 'cat-1',
      'drive.google.com': 'cat-1',
      'calendar.google.com': 'cat-1',
      'slack.com': 'cat-1'
    };

    // Find productivity websites visited today
    const productivitySites = [];

    for (const [domain, data] of Object.entries(todayEntries)) {
      if (!domain || domain === 'null' || domain === 'undefined') continue;

      // Check category - user setting first, then default mapping
      const categoryId = settings[domain]?.categoryId || defaultMappings[domain];

      if (productivityCategoryIds.includes(categoryId)) {
        productivitySites.push({
          domain,
          totalSeconds: data.totalSeconds,
          favicon: data.favicon || `https://icons.duckduckgo.com/ip3/${domain}.ico`
        });
      }
    }

    // Sort by time spent (descending)
    productivitySites.sort((a, b) => b.totalSeconds - a.totalSeconds);

    // Take top 5
    const topSites = productivitySites.slice(0, 5);

    if (topSites.length === 0) {
      container.innerHTML = '<div class="no-productivity">No productivity sites visited today. Try GitHub, Notion, or Figma!</div>';
      return;
    }

    // Render productivity suggestions
    let html = '';
    for (const site of topSites) {
      const timeStr = formatTime(site.totalSeconds);
      html += `
        <a href="https://${site.domain}" class="productivity-item">
          <img class="productivity-favicon" src="${site.favicon}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23666%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
          <span class="productivity-domain">${site.domain}</span>
          <span class="productivity-time">${timeStr} today</span>
        </a>
      `;
    }

    container.innerHTML = html;
  } catch (e) {
    console.error('Error loading productivity suggestions:', e);
    container.innerHTML = '<div class="no-productivity">Try GitHub, Notion, or Figma!</div>';
  }
}

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}
