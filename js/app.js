// Main application logic

const App = {
  selectedDate: null,
  selectedWebsiteDomain: null,

  async init() {
    this.selectedDate = Storage.formatDate(new Date());

    await this.renderDaysRemaining();
    await this.renderChart();
    await this.renderHabits();
    await this.renderStreaks();
    await this.updateHabitCounter();
    await this.initWebsitesSection();
    this.bindEvents();
  },

  // Render days remaining in the year
  async renderDaysRemaining() {
    const today = new Date();
    const year = today.getFullYear();
    const endOfYear = new Date(year, 11, 31);
    const diff = endOfYear - today;
    const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));

    document.getElementById('daysCount').textContent = daysRemaining;
    document.getElementById('daysLabel').textContent = `days left in ${year}`;
  },

  // Render the year chart
  async renderChart() {
    const container = document.getElementById('chartContainer');
    await Chart.render(container, (dateStr) => this.selectDate(dateStr));
  },

  // Render today's habits or selected day
  async renderHabits() {
    const habits = await Storage.getHabits();
    const entries = await Storage.getAllEntries();
    const container = document.getElementById('habitsList');
    const todayStr = Storage.formatDate(new Date());
    const isToday = this.selectedDate === todayStr;

    if (habits.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">No habits yet</div>
          <div class="empty-state-text">Start tracking habits like Exercise, Reading, or Meditation</div>
        </div>
      `;
      return;
    }

    const dayEntries = entries[this.selectedDate] || {};

    let html = '';
    for (const habit of habits) {
      const entry = dayEntries[habit.id] || { completed: false, value: 0 };
      const isCompleted = Habits.isCompleted(entry, habit);

      html += `<div class="habit-item ${isCompleted ? 'completed' : ''}">`;

      if (habit.type === 'binary') {
        if (isToday) {
          html += `
            <label class="habit-checkbox">
              <input type="checkbox"
                     data-habit-id="${habit.id}"
                     ${isCompleted ? 'checked' : ''}>
              <span class="checkmark"></span>
            </label>
          `;
        } else {
          html += `<span class="habit-status">${isCompleted ? '✓' : '○'}</span>`;
        }
        html += `<span class="habit-name">${habit.name}</span>`;
      } else {
        html += `<span class="habit-name">${habit.name}</span>`;
        const progressPercent = Math.min(100, (entry.value / habit.target) * 100);
        if (isToday) {
          html += `
            <div class="habit-counter">
              <button class="counter-btn minus" data-habit-id="${habit.id}">−</button>
              <div class="habit-progress">
                <span class="counter-value">${entry.value}/${habit.target}</span>
                <div class="habit-progress-bar">
                  <div class="habit-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
              </div>
              <button class="counter-btn plus" data-habit-id="${habit.id}">+</button>
            </div>
          `;
        } else {
          html += `
            <div class="habit-progress">
              <span class="habit-value">${entry.value}/${habit.target}</span>
              <div class="habit-progress-bar">
                <div class="habit-progress-fill" style="width: ${progressPercent}%"></div>
              </div>
            </div>
          `;
        }
      }

      html += `</div>`;
    }

    container.innerHTML = html;
    this.bindHabitEvents();
  },

  // Render streaks in the right column with compact list
  async renderStreaks() {
    const habits = await Storage.getHabits();
    const container = document.getElementById('streaksList');

    if (habits.length === 0) {
      container.innerHTML = '<div class="no-streaks">Add habits to track streaks</div>';
      return;
    }

    // Calculate all streaks
    const streaks = [];
    let bestStreak = 0;
    for (const habit of habits) {
      const streak = await Habits.calculateStreak(habit.id);
      streaks.push({ habit, streak });
      if (streak > bestStreak) bestStreak = streak;
    }

    // Build compact streak list
    let html = '<div class="streak-list-compact">';
    for (const { habit, streak } of streaks) {
      html += `
        <div class="streak-row">
          <span class="streak-row-name">${habit.name}</span>
          <span class="streak-row-value"><span class="streak-fire">🔥</span> ${streak}</span>
        </div>
      `;
    }
    html += '</div>';

    // Add combined mini chart
    html += '<div class="combined-chart-container" id="combinedMiniChart"></div>';

    // Add summary
    html += `
      <div class="streaks-summary">
        <div class="summary-item">
          <span class="summary-label">Best streak</span>
          <span class="summary-value">${bestStreak} day${bestStreak !== 1 ? 's' : ''}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total habits</span>
          <span class="summary-value">${habits.length}</span>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Render combined mini chart (overall completion)
    const chartContainer = document.getElementById('combinedMiniChart');
    if (chartContainer) {
      await Chart.renderCombinedMiniChart(chartContainer, (dateStr) => this.selectDate(dateStr));
    }
  },

  // Update the habit counter display
  async updateHabitCounter() {
    const habits = await Storage.getHabits();
    const entries = await Storage.getAllEntries();
    const count = habits.length;
    const max = Storage.MAX_HABITS;
    const counterEl = document.getElementById('habitCounter');
    const addBtn = document.getElementById('addHabitBtn');
    const todayStr = Storage.formatDate(new Date());
    const dayEntries = entries[todayStr] || {};

    // Count completed habits for today
    let completedToday = 0;
    for (const habit of habits) {
      const entry = dayEntries[habit.id];
      if (Habits.isCompleted(entry, habit)) {
        completedToday++;
      }
    }

    if (counterEl) {
      if (count > 0 && completedToday === count) {
        counterEl.textContent = `All ${count} habits today`;
        counterEl.classList.add('all-complete');
        counterEl.classList.remove('at-limit');
      } else {
        counterEl.textContent = `${completedToday}/${count} habits today`;
        counterEl.classList.remove('all-complete');
        counterEl.classList.remove('at-limit');
      }
    }

    if (addBtn) {
      addBtn.disabled = count >= max;
      addBtn.style.display = count >= max ? 'none' : 'block';
    }
  },

  // Select a date to view
  async selectDate(dateStr) {
    this.selectedDate = dateStr;
    const todayStr = Storage.formatDate(new Date());
    const title = document.querySelector('.today-title');

    if (dateStr === todayStr) {
      title.textContent = "Today's Habits";
    } else {
      title.textContent = dateStr;
    }

    // Update selected cell styling
    document.querySelectorAll('.chart-cell.selected').forEach(el => {
      el.classList.remove('selected');
    });
    const cell = document.querySelector(`[data-date="${dateStr}"]`);
    if (cell) {
      cell.classList.add('selected');
    }

    await this.renderHabits();
    this.showSelectedDayDetails(dateStr);
  },

  // Show details for selected day
  async showSelectedDayDetails(dateStr) {
    const container = document.getElementById('selectedDayDetails');
    const todayStr = Storage.formatDate(new Date());

    if (dateStr === todayStr) {
      container.innerHTML = '';
      return;
    }

    const rate = await Habits.getCompletionRate(dateStr);
    container.innerHTML = `
      <div class="day-details">
        <span class="day-details-date">${dateStr}</span>
        <span class="day-details-rate">${Math.round(rate * 100)}% completed</span>
      </div>
    `;
  },

  // Bind habit-specific events
  bindHabitEvents() {
    // Binary habit checkboxes
    document.querySelectorAll('.habit-checkbox input').forEach(checkbox => {
      checkbox.addEventListener('change', async (e) => {
        const habitId = e.target.dataset.habitId;
        const habitItem = e.target.closest('.habit-item');
        const value = e.target.checked ? 1 : 0;

        habitItem.classList.add('saving');
        await Storage.saveEntry(this.selectedDate, habitId, value);
        await this.renderChart();
        await this.renderHabits();
        await this.renderStreaks();
      });
    });

    // Count habit buttons
    document.querySelectorAll('.counter-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const habitId = e.target.dataset.habitId;
        const habitItem = e.target.closest('.habit-item');
        const isPlus = e.target.classList.contains('plus');

        const entries = await Storage.getAllEntries();
        const entry = entries[this.selectedDate]?.[habitId] || { value: 0 };
        const newValue = Math.max(0, entry.value + (isPlus ? 1 : -1));

        habitItem.classList.add('saving');
        await Storage.saveEntry(this.selectedDate, habitId, newValue);
        await this.renderChart();
        await this.renderHabits();
        await this.renderStreaks();
      });
    });
  },

  // Helper to open a modal with accessibility
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    A11y.initModal(modal);
  },

  // Helper to close a modal with accessibility
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    A11y.closeModal(modal);
  },

  // Bind global events
  bindEvents() {
    // Close website detail modal
    document.getElementById('closeDetailBtn').addEventListener('click', () => {
      this.closeModal('websiteDetailModal');
    });

    // Website category change in detail modal
    this.bindWebsiteCategoryChange();

    // Add category button
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
      this.closeModal('settingsModal');
      this.openModal('addCategoryModal');
    });

    // Cancel add category
    document.getElementById('cancelCategoryBtn').addEventListener('click', () => {
      this.closeModal('addCategoryModal');
      document.getElementById('addCategoryForm').reset();
      this.openModal('settingsModal');
    });

    // Add category form submit
    document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('categoryName').value;
      const color = document.getElementById('categoryColor').value;

      const category = {
        id: Websites.generateCategoryId(),
        name,
        color,
        isDefault: false
      };

      await Storage.saveWebsiteCategory(category);

      this.closeModal('addCategoryModal');
      document.getElementById('addCategoryForm').reset();
      this.openModal('settingsModal');

      await this.renderCategoriesManageList();
      await this.renderWebsites();
    });

    // Add habit button
    document.getElementById('addHabitBtn').addEventListener('click', () => {
      this.openModal('addHabitModal');
    });

    // Cancel add habit
    document.getElementById('cancelHabitBtn').addEventListener('click', () => {
      this.closeModal('addHabitModal');
      document.getElementById('addHabitForm').reset();
    });

    // Habit type change
    document.getElementById('habitType').addEventListener('change', (e) => {
      const targetGroup = document.getElementById('targetGroup');
      const hint = document.getElementById('habitTypeHint');
      const isCount = e.target.value === 'count';
      targetGroup.style.display = isCount ? 'block' : 'none';
      hint.textContent = isCount
        ? 'Set a daily goal to reach (e.g., 8 glasses of water)'
        : 'Check off when completed';
    });

    // Add habit form submit
    document.getElementById('addHabitForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('habitName').value;
      const type = document.getElementById('habitType').value;
      const target = parseInt(document.getElementById('habitTarget').value) || 1;

      const habit = Habits.createHabit(name, type, target);

      try {
        await Storage.saveHabit(habit);

        this.closeModal('addHabitModal');
        document.getElementById('addHabitForm').reset();
        this.hideFormError();

        await this.renderHabits();
        await this.renderStreaks();
        await this.updateHabitCounter();
      } catch (error) {
        this.showFormError(error.message);
      }
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          A11y.closeModal(modal);
        }
      });
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', async () => {
      const data = await Storage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `habit-tracker-${Storage.formatDate(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import button
    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });

    // Import file change
    document.getElementById('importFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          await Storage.importData(event.target.result);
          await this.renderChart();
          await this.renderHabits();
          await this.renderStreaks();
          await this.updateHabitCounter();
          Toast.success('Data imported successfully!');
        } catch (error) {
          Toast.error('Import failed: ' + error.message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', async () => {
      await this.renderSettingsModal();
      this.openModal('settingsModal');
    });

    // Close settings
    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
      this.closeModal('settingsModal');
    });
  },

  // Show error message in add habit form
  showFormError(message) {
    let errorEl = document.getElementById('habitFormError');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.id = 'habitFormError';
      errorEl.className = 'form-error';
      const form = document.getElementById('addHabitForm');
      form.insertBefore(errorEl, form.firstChild);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  },

  // Hide error message in add habit form
  hideFormError() {
    const errorEl = document.getElementById('habitFormError');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  },

  // Render settings modal content
  async renderSettingsModal() {
    const habits = await Storage.getHabits();
    const container = document.getElementById('habitsManageList');

    if (habits.length === 0) {
      container.innerHTML = '<div class="no-habits">No habits to manage.</div>';
    } else {
      let html = '';
      for (const habit of habits) {
        html += `
          <div class="habit-manage-item">
            <span class="habit-manage-name">${habit.name}</span>
            <span class="habit-manage-type">${habit.type === 'binary' ? 'Binary' : `Count (${habit.target})`}</span>
            <button class="delete-habit-btn" data-habit-id="${habit.id}">Delete</button>
          </div>
        `;
      }
      container.innerHTML = html;

      // Bind delete buttons
      container.querySelectorAll('.delete-habit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const habitId = e.target.dataset.habitId;
          const habit = habits.find(h => h.id === habitId);
          const confirmed = await Confirm.show({
            title: 'Delete Habit',
            message: `Delete "${habit?.name || 'this habit'}"? This will permanently remove all tracking history. This cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Keep',
            destructive: true
          });
          if (confirmed) {
            await Storage.deleteHabit(habitId);
            await this.renderSettingsModal();
            await this.renderChart();
            await this.renderHabits();
            await this.renderStreaks();
            await this.updateHabitCounter();
            Toast.success('Habit deleted');
          }
        });
      });
    }

    // Render categories section
    await this.renderCategoriesManageList();
  },

  // Render categories management in settings
  async renderCategoriesManageList() {
    const categories = await Storage.getWebsiteCategories();
    const container = document.getElementById('categoriesManageList');

    let html = '';
    for (const category of categories) {
      html += `
        <div class="category-manage-item">
          <span class="category-color-dot" style="background: ${category.color}"></span>
          <span class="category-manage-name">${category.name}</span>
          ${!category.isDefault ? `<button class="delete-category-btn" data-category-id="${category.id}">Delete</button>` : ''}
        </div>
      `;
    }

    container.innerHTML = html;

    // Bind delete buttons
    container.querySelectorAll('.delete-category-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const categoryId = e.target.dataset.categoryId;
        const category = categories.find(c => c.id === categoryId);
        const confirmed = await Confirm.show({
          title: 'Delete Category',
          message: `Delete "${category?.name || 'this category'}"? Websites in this category will become uncategorized.`,
          confirmText: 'Delete',
          cancelText: 'Keep',
          destructive: true
        });
        if (confirmed) {
          await Storage.deleteWebsiteCategory(categoryId);
          await this.renderCategoriesManageList();
          await this.renderWebsites();
          Toast.success('Category deleted');
        }
      });
    });
  },

  // ============== Website Section Methods ==============

  // Initialize websites section
  async initWebsitesSection() {
    await this.renderWebsites();
  },

  // Render websites grouped by category
  async renderWebsites() {
    const websites = await Websites.getTodayWebsites();
    const categories = await Storage.getWebsiteCategories();
    const container = document.getElementById('categoryGroups');
    const totalTimeEl = document.getElementById('websitesTotalTime');

    // Calculate total time
    const totalSeconds = websites.reduce((sum, w) => sum + w.totalSeconds, 0);
    totalTimeEl.textContent = Websites.formatTime(totalSeconds);

    // Group websites by category
    const grouped = {};
    for (const cat of categories) {
      grouped[cat.id] = { category: cat, websites: [], totalSeconds: 0 };
    }
    grouped['uncategorized'] = {
      category: { id: 'uncategorized', name: 'Other', color: '#666' },
      websites: [],
      totalSeconds: 0
    };

    for (const website of websites) {
      const catId = website.category?.id || 'uncategorized';
      if (grouped[catId]) {
        grouped[catId].websites.push(website);
        grouped[catId].totalSeconds += website.totalSeconds;
      }
    }

    // Render each category group (only those with activity)
    let html = '';
    for (const cat of categories) {
      const group = grouped[cat.id];
      // Only render categories that have websites with time
      if (group.totalSeconds > 0) {
        html += this.renderCategoryGroup(group);
      }
    }
    // Add uncategorized if has websites
    if (grouped['uncategorized'].totalSeconds > 0) {
      html += this.renderCategoryGroup(grouped['uncategorized']);
    }

    container.innerHTML = html;

    // Bind click events for detail view
    container.querySelectorAll('.website-card').forEach(card => {
      card.addEventListener('click', () => {
        this.showWebsiteDetail(card.dataset.domain);
      });
    });
  },

  // Render a single category group
  renderCategoryGroup(group) {
    const { category, websites, totalSeconds } = group;

    let html = `
      <div class="category-group">
        <div class="category-group-header">
          <span class="category-color-bar" style="background: ${category.color}"></span>
          <span class="category-group-name">${category.name}</span>
          <span class="category-group-time">${Websites.formatTime(totalSeconds)}</span>
        </div>
        <div class="category-websites">
    `;

    for (const website of websites) {
      html += `
        <div class="website-card" data-domain="${website.domain}">
          <img class="website-card-favicon" src="${website.favicon}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23666%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'">
          <span class="website-card-domain">${this.truncateDomain(website.displayName)}</span>
          <span class="website-card-time">${Websites.formatTime(website.totalSeconds)}</span>
        </div>
      `;
    }

    html += `</div></div>`;
    return html;
  },

  // Truncate domain for card display
  truncateDomain(domain) {
    let short = domain.replace(/^(www\.|m\.)/, '');
    // Remove common TLDs for brevity
    short = short.replace(/\.(com|org|net|io|co)$/, '');
    if (short.length > 12) {
      short = short.substring(0, 11) + '...';
    }
    return short;
  },

  // Show website detail modal
  async showWebsiteDetail(domain) {
    this.selectedWebsiteDomain = domain;

    const websites = await Websites.getTodayWebsites();
    const website = websites.find(w => w.domain === domain);

    // Populate modal
    document.getElementById('detailFavicon').src = website?.favicon || `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    document.getElementById('detailDomain').textContent = domain;
    document.getElementById('detailTodayTime').textContent = Websites.formatTime(website?.totalSeconds || 0);

    // Populate category select
    const categories = await Storage.getWebsiteCategories();
    const currentCategoryId = await Websites.getCategoryForDomain(domain);
    const select = document.getElementById('detailCategorySelect');

    let html = '<option value="">Uncategorized</option>';
    for (const category of categories) {
      const selected = category.id === currentCategoryId ? 'selected' : '';
      html += `<option value="${category.id}" ${selected}>${category.name}</option>`;
    }
    select.innerHTML = html;

    // Render trend charts
    const weeklyTrend = await Websites.getWeeklyTrend(domain);
    const monthlyTrend = await Websites.getMonthlyTrend(domain);

    WebsiteChart.renderWeeklyBarChart(document.getElementById('weeklyTrendChart'), weeklyTrend);
    WebsiteChart.renderMonthlyLineChart(document.getElementById('monthlyTrendChart'), monthlyTrend);

    // Show modal
    this.openModal('websiteDetailModal');
  },

  // Bind website category change
  bindWebsiteCategoryChange() {
    document.getElementById('detailCategorySelect').addEventListener('change', async (e) => {
      const categoryId = e.target.value || null;
      await Storage.setWebsiteSetting(this.selectedWebsiteDomain, { categoryId });
      await this.renderWebsites();
    });
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
