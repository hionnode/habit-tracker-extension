// Main application logic

const App = {
  selectedDate: null,

  async init() {
    this.selectedDate = Storage.formatDate(new Date());

    await this.renderDaysRemaining();
    await this.renderChart();
    await this.renderHabits();
    await this.renderStreaks();
    await this.updateHabitCounter();
    this.bindEvents();
  },

  // Render days remaining in the year
  async renderDaysRemaining() {
    const today = new Date();
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    const diff = endOfYear - today;
    const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));

    document.getElementById('daysCount').textContent = daysRemaining;
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
      container.innerHTML = '<div class="no-habits">No habits yet. Add your first habit!</div>';
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
        if (isToday) {
          html += `
            <div class="habit-counter">
              <button class="counter-btn minus" data-habit-id="${habit.id}">−</button>
              <span class="counter-value">${entry.value}/${habit.target}</span>
              <button class="counter-btn plus" data-habit-id="${habit.id}">+</button>
            </div>
          `;
        } else {
          html += `<span class="habit-value">${entry.value}/${habit.target}</span>`;
        }
      }

      html += `</div>`;
    }

    container.innerHTML = html;
    this.bindHabitEvents();
  },

  // Render streaks in the right column with mini year charts
  async renderStreaks() {
    const habits = await Storage.getHabits();
    const container = document.getElementById('streaksList');

    if (habits.length === 0) {
      container.innerHTML = '<div class="no-streaks">No habits yet.</div>';
      return;
    }

    // Clear and rebuild with mini charts
    container.innerHTML = '';

    for (const habit of habits) {
      const streak = await Habits.calculateStreak(habit.id);

      const card = document.createElement('div');
      card.className = 'streak-card';

      // Habit name
      const nameEl = document.createElement('div');
      nameEl.className = 'streak-card-name';
      nameEl.textContent = habit.name;
      card.appendChild(nameEl);

      // Mini chart container
      const chartContainer = document.createElement('div');
      chartContainer.className = 'mini-chart-container';
      card.appendChild(chartContainer);

      // Streak value
      const streakEl = document.createElement('div');
      streakEl.className = 'streak-card-value';
      streakEl.innerHTML = `<span class="streak-fire">🔥</span> ${streak} day${streak !== 1 ? 's' : ''}`;
      card.appendChild(streakEl);

      container.appendChild(card);

      // Render mini chart (async)
      await Chart.renderMiniChart(chartContainer, habit.id, (dateStr) => this.selectDate(dateStr));
    }
  },

  // Update the habit counter display
  async updateHabitCounter() {
    const habits = await Storage.getHabits();
    const count = habits.length;
    const max = Storage.MAX_HABITS;
    const counterEl = document.getElementById('habitCounter');
    const addBtn = document.getElementById('addHabitBtn');

    if (counterEl) {
      counterEl.textContent = `${count}/${max} habits`;
      counterEl.classList.toggle('at-limit', count >= max);
    }

    if (addBtn) {
      addBtn.disabled = count >= max;
      if (count >= max) {
        addBtn.textContent = 'Habit Limit Reached';
      } else {
        addBtn.textContent = '+ Add Habit';
      }
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
        const value = e.target.checked ? 1 : 0;
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
        const isPlus = e.target.classList.contains('plus');

        const entries = await Storage.getAllEntries();
        const entry = entries[this.selectedDate]?.[habitId] || { value: 0 };
        const newValue = Math.max(0, entry.value + (isPlus ? 1 : -1));

        await Storage.saveEntry(this.selectedDate, habitId, newValue);
        await this.renderChart();
        await this.renderHabits();
        await this.renderStreaks();
      });
    });
  },

  // Bind global events
  bindEvents() {
    // Add habit button
    document.getElementById('addHabitBtn').addEventListener('click', () => {
      document.getElementById('addHabitModal').classList.add('show');
    });

    // Cancel add habit
    document.getElementById('cancelHabitBtn').addEventListener('click', () => {
      document.getElementById('addHabitModal').classList.remove('show');
      document.getElementById('addHabitForm').reset();
    });

    // Habit type change
    document.getElementById('habitType').addEventListener('change', (e) => {
      const targetGroup = document.getElementById('targetGroup');
      targetGroup.style.display = e.target.value === 'count' ? 'block' : 'none';
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

        document.getElementById('addHabitModal').classList.remove('show');
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
          modal.classList.remove('show');
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
          alert('Data imported successfully!');
        } catch (error) {
          alert('Import failed: ' + error.message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', async () => {
      await this.renderSettingsModal();
      document.getElementById('settingsModal').classList.add('show');
    });

    // Close settings
    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
      document.getElementById('settingsModal').classList.remove('show');
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
      return;
    }

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
        if (confirm('Are you sure you want to delete this habit? All data will be lost.')) {
          await Storage.deleteHabit(habitId);
          await this.renderSettingsModal();
          await this.renderChart();
          await this.renderHabits();
          await this.renderStreaks();
          await this.updateHabitCounter();
        }
      });
    });
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
