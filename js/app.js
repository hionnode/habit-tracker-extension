// Main application logic

const App = {
  selectedDate: null,
  selectedWebsiteDomain: null,

  // Helper to escape HTML for safe insertion (used only for static content with dynamic attributes)
  escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  async init() {
    this.selectedDate = Storage.formatDate(new Date());

    await this.renderDaysRemaining();
    this.renderTodayTitle();
    await this.renderChart();
    await this.renderHabits();
    await this.renderStreaks();
    await this.updateHabitCounter();
    await this.initWebsitesSection();
    this.bindEvents();
  },

  // Render today's date as the title
  renderTodayTitle() {
    const title = document.querySelector('.today-title');
    if (!title) return;

    const today = new Date();
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    title.textContent = today.toLocaleDateString('en-US', options);
  },

  // Render day of the year (progress-framed instead of loss-framed)
  async renderDaysRemaining() {
    const today = new Date();
    const year = today.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const diff = today - startOfYear;
    const dayOfYear = Math.ceil(diff / (1000 * 60 * 60 * 24));

    // Rotating encouraging subtitles
    const subtitles = [
      "Make it count",
      "You're building momentum",
      "Every day matters",
      "Keep showing up",
      "Progress over perfection",
      "Small steps, big results",
      "Today is your opportunity"
    ];
    const subtitleIndex = dayOfYear % subtitles.length;

    document.getElementById('daysCount').textContent = `Day ${dayOfYear}`;
    document.getElementById('daysLabel').textContent = subtitles[subtitleIndex];
  },

  // Render the year chart
  async renderChart() {
    const container = document.getElementById('chartContainer');
    await Chart.render(container, (dateStr) => this.selectDate(dateStr));
  },

  // Habit templates for quick start
  habitTemplates: [
    { name: 'Exercise', type: 'binary', target: 1, icon: '\u{1F3CB}' },
    { name: 'Read', type: 'binary', target: 1, icon: '\u{1F4D6}' },
    { name: 'Meditate', type: 'binary', target: 1, icon: '\u{1F9D8}' },
    { name: 'Water', type: 'count', target: 8, icon: '\u{1F4A7}' },
    { name: 'Sleep 8h', type: 'binary', target: 1, icon: '\u{1F634}' }
  ],

  // Render today's habits or selected day
  async renderHabits() {
    const habits = await Storage.getHabits();
    const entries = await Storage.getAllEntries();
    const container = document.getElementById('habitsList');
    const todayStr = Storage.formatDate(new Date());
    const isToday = this.selectedDate === todayStr;

    // Clear container
    container.innerHTML = '';

    if (habits.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';

      const icon = document.createElement('div');
      icon.className = 'empty-state-icon';
      icon.textContent = '\u{1F4CB}'; // clipboard emoji

      const title = document.createElement('div');
      title.className = 'empty-state-title';
      title.textContent = 'Start your habit journey';

      const text = document.createElement('div');
      text.className = 'empty-state-text';
      text.textContent = 'Pick a template or create your own';

      emptyState.appendChild(icon);
      emptyState.appendChild(title);
      emptyState.appendChild(text);

      // Add template buttons
      const templateGrid = document.createElement('div');
      templateGrid.className = 'template-grid';

      for (const template of this.habitTemplates) {
        const btn = document.createElement('button');
        btn.className = 'template-btn';
        btn.dataset.templateName = template.name;
        btn.dataset.templateType = template.type;
        btn.dataset.templateTarget = template.target;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'template-icon';
        iconSpan.textContent = template.icon;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'template-name';
        nameSpan.textContent = template.name;

        btn.appendChild(iconSpan);
        btn.appendChild(nameSpan);
        templateGrid.appendChild(btn);
      }

      emptyState.appendChild(templateGrid);
      container.appendChild(emptyState);

      // Bind template button clicks
      templateGrid.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const name = btn.dataset.templateName;
          const type = btn.dataset.templateType;
          const target = parseInt(btn.dataset.templateTarget) || 1;

          const habit = Habits.createHabit(name, type, target);
          try {
            await Storage.saveHabit(habit);
            await this.renderHabits();
            await this.renderStreaks();
            await this.updateHabitCounter();
            Toast.success(`Added "${name}" habit`);
          } catch (error) {
            Toast.error(error.message);
          }
        });
      });

      return;
    }

    const dayEntries = entries[this.selectedDate] || {};

    // Calculate streaks for all habits (only for today view)
    const streaks = {};
    if (isToday) {
      for (const habit of habits) {
        streaks[habit.id] = await Habits.calculateStreak(habit.id);
      }
    }

    // Check if selected date is in the past (can edit) vs future (cannot)
    const selectedDateObj = new Date(this.selectedDate + 'T00:00:00');
    const todayDateObj = new Date(todayStr + 'T00:00:00');
    const isPastOrToday = selectedDateObj <= todayDateObj;
    const canEdit = isPastOrToday; // Allow editing today and past dates, not future

    for (const habit of habits) {
      // Check if habit existed on the selected date
      if (habit.createdAt > this.selectedDate) continue;

      const entry = dayEntries[habit.id] || { completed: false, value: 0 };
      const isCompleted = Habits.isCompleted(entry, habit);
      const streak = streaks[habit.id] || 0;

      const habitItem = document.createElement('div');
      habitItem.className = `habit-item ${isCompleted ? 'completed' : ''}${!isToday && canEdit ? ' past-date' : ''}`;

      if (habit.type === 'binary') {
        if (canEdit) {
          const label = document.createElement('label');
          label.className = 'habit-checkbox';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.dataset.habitId = habit.id;
          checkbox.checked = isCompleted;

          const checkmark = document.createElement('span');
          checkmark.className = 'checkmark';

          label.appendChild(checkbox);
          label.appendChild(checkmark);
          habitItem.appendChild(label);
        } else {
          const status = document.createElement('span');
          status.className = 'habit-status';
          status.textContent = isCompleted ? '\u2713' : '\u25CB';
          habitItem.appendChild(status);
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'habit-name';
        nameSpan.textContent = habit.name;
        habitItem.appendChild(nameSpan);

        // Add inline streak for today view
        if (isToday && streak > 0) {
          const streakSpan = document.createElement('span');
          streakSpan.className = 'habit-inline-streak';
          streakSpan.textContent = `\u{1F525}${streak}`;
          habitItem.appendChild(streakSpan);
        }
      } else {
        const nameSpan = document.createElement('span');
        nameSpan.className = 'habit-name';
        nameSpan.textContent = habit.name;
        habitItem.appendChild(nameSpan);

        // Add inline streak for today view (before counter)
        if (isToday && streak > 0) {
          const streakSpan = document.createElement('span');
          streakSpan.className = 'habit-inline-streak';
          streakSpan.textContent = `\u{1F525}${streak}`;
          habitItem.appendChild(streakSpan);
        }

        const progressPercent = Math.min(100, (entry.value / habit.target) * 100);

        if (canEdit) {
          const counter = document.createElement('div');
          counter.className = 'habit-counter';

          const minusBtn = document.createElement('button');
          minusBtn.className = 'counter-btn minus';
          minusBtn.dataset.habitId = habit.id;
          minusBtn.textContent = '\u2212';

          const progress = document.createElement('div');
          progress.className = 'habit-progress';

          const counterValue = document.createElement('span');
          counterValue.className = 'counter-value';
          counterValue.textContent = `${entry.value}/${habit.target}`;

          const progressBar = document.createElement('div');
          progressBar.className = 'habit-progress-bar';

          const progressFill = document.createElement('div');
          progressFill.className = 'habit-progress-fill';
          progressFill.style.width = `${progressPercent}%`;

          progressBar.appendChild(progressFill);
          progress.appendChild(counterValue);
          progress.appendChild(progressBar);

          const plusBtn = document.createElement('button');
          plusBtn.className = 'counter-btn plus';
          plusBtn.dataset.habitId = habit.id;
          plusBtn.textContent = '+';

          counter.appendChild(minusBtn);
          counter.appendChild(progress);
          counter.appendChild(plusBtn);
          habitItem.appendChild(counter);
        } else {
          const progress = document.createElement('div');
          progress.className = 'habit-progress';

          const valueSpan = document.createElement('span');
          valueSpan.className = 'habit-value';
          valueSpan.textContent = `${entry.value}/${habit.target}`;

          const progressBar = document.createElement('div');
          progressBar.className = 'habit-progress-bar';

          const progressFill = document.createElement('div');
          progressFill.className = 'habit-progress-fill';
          progressFill.style.width = `${progressPercent}%`;

          progressBar.appendChild(progressFill);
          progress.appendChild(valueSpan);
          progress.appendChild(progressBar);
          habitItem.appendChild(progress);
        }
      }

      container.appendChild(habitItem);
    }

    this.bindHabitEvents();
  },

// Render streaks in the right panel with horizontal year charts
  async renderStreaks() {
    const habits = await Storage.getHabits();
    const container = document.getElementById('streaksList');

    // Clear container
    container.innerHTML = '';

    if (habits.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';

      const icon = document.createElement('div');
      icon.className = 'empty-state-icon';
      icon.textContent = '\u{1F4CA}'; // chart emoji

      const title = document.createElement('div');
      title.className = 'empty-state-title';
      title.textContent = 'No habits yet';

      const text = document.createElement('div');
      text.className = 'empty-state-text';
      text.textContent = 'Add habits to see your yearly progress here';

      emptyState.appendChild(icon);
      emptyState.appendChild(title);
      emptyState.appendChild(text);
      container.appendChild(emptyState);
      return;
    }

    // Calculate all streaks and stats
    const streaksData = [];
    let overallBestStreak = 0;
    let totalCompleted = 0;
    for (const habit of habits) {
      const streak = await Habits.calculateStreak(habit.id);
      const bestStreak = await Habits.calculateBestStreak(habit.id);
      const stats = await Habits.getCompletionStats(habit.id);
      streaksData.push({ habit, streak, bestStreak, stats });
      if (bestStreak > overallBestStreak) overallBestStreak = bestStreak;
      totalCompleted += stats.completedDays;
    }

    // Build streak list with horizontal year charts
    const streakList = document.createElement('div');
    streakList.className = 'streak-list-with-charts';

    for (const { habit, streak, stats } of streaksData) {
      const completionPercent = Math.round(stats.completionRate * 100);

      const row = document.createElement('div');
      row.className = 'streak-row-with-chart';
      row.dataset.habitId = habit.id;

      const header = document.createElement('div');
      header.className = 'streak-row-header';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'streak-row-name';
      nameSpan.textContent = habit.name;

      const statsSpan = document.createElement('span');
      statsSpan.className = 'streak-row-stats';

      const completionSpan = document.createElement('span');
      completionSpan.className = 'streak-completion';
      completionSpan.textContent = `${completionPercent}%`;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'streak-row-value';

      const fireSpan = document.createElement('span');
      fireSpan.className = 'streak-fire';
      fireSpan.textContent = '\u{1F525}'; // fire emoji

      valueSpan.appendChild(fireSpan);
      valueSpan.appendChild(document.createTextNode(` ${streak}`));

      statsSpan.appendChild(completionSpan);
      statsSpan.appendChild(valueSpan);
      header.appendChild(nameSpan);
      header.appendChild(statsSpan);

      const chartContainer = document.createElement('div');
      chartContainer.className = 'streak-horizontal-chart';
      chartContainer.id = `horizontalChart-${habit.id}`;

      row.appendChild(header);
      row.appendChild(chartContainer);
      streakList.appendChild(row);
    }

    container.appendChild(streakList);

    // Add summary
    const summary = document.createElement('div');
    summary.className = 'streaks-summary';

    const bestStreakItem = document.createElement('div');
    bestStreakItem.className = 'summary-item';

    const bestLabel = document.createElement('span');
    bestLabel.className = 'summary-label';
    bestLabel.textContent = 'Best streak (all habits)';

    const bestValue = document.createElement('span');
    bestValue.className = 'summary-value';
    bestValue.textContent = `${overallBestStreak} day${overallBestStreak !== 1 ? 's' : ''}`;

    bestStreakItem.appendChild(bestLabel);
    bestStreakItem.appendChild(bestValue);

    const totalItem = document.createElement('div');
    totalItem.className = 'summary-item';

    const totalLabel = document.createElement('span');
    totalLabel.className = 'summary-label';
    totalLabel.textContent = 'Total completions';

    const totalValue = document.createElement('span');
    totalValue.className = 'summary-value';
    totalValue.textContent = String(totalCompleted);

    totalItem.appendChild(totalLabel);
    totalItem.appendChild(totalValue);

    summary.appendChild(bestStreakItem);
    summary.appendChild(totalItem);
    container.appendChild(summary);

    // Render horizontal year charts for each habit
    for (const { habit } of streaksData) {
      const chartEl = document.getElementById(`horizontalChart-${habit.id}`);
      if (chartEl) {
        await Chart.renderHorizontalYearChart(chartEl, habit.id);
      }
    }

    // Bind click events for habit detail
    container.querySelectorAll('.streak-row-with-chart').forEach(row => {
      row.addEventListener('click', () => {
        const habitId = row.dataset.habitId;
        this.showHabitDetail(habitId);
      });
    });
  },

  // Currently viewed habit in detail modal
  detailHabitId: null,

  // Show habit detail modal with year view
  async showHabitDetail(habitId) {
    const habits = await Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    this.detailHabitId = habitId;

    const currentStreak = await Habits.calculateStreak(habitId);
    const bestStreak = await Habits.calculateBestStreak(habitId);
    const stats = await Habits.getCompletionStats(habitId);

    // Format creation date
    const createdDate = new Date(habit.createdAt);
    const formattedDate = createdDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Populate modal content
    document.getElementById('habitDetailName').textContent = habit.name;
    document.getElementById('habitDetailCurrentStreak').textContent = currentStreak;
    document.getElementById('habitDetailBestStreak').textContent = bestStreak;
    document.getElementById('habitDetailCompletionRate').textContent = `${Math.round(stats.completionRate * 100)}%`;
    document.getElementById('habitDetailCreatedAt').textContent = formattedDate;

    // Update freeze section
    await this.updateFreezeSection(habitId);

    // Render year chart
    const chartContainer = document.getElementById('habitDetailYearChart');
    await Chart.renderHabitYearChart(chartContainer, habitId);

    // Show modal
    this.openModal('habitDetailModal');
  },

  // Update the freeze section in habit detail modal
  async updateFreezeSection(habitId) {
    const freezes = await Storage.getStreakFreezes();
    const habitFreezes = freezes[habitId] || [];
    const freezeCount = habitFreezes.length;

    // Update freeze count display
    document.getElementById('freezeCount').textContent = `${freezeCount} used`;

    // Check if yesterday was missed and can be frozen
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = Storage.formatDate(yesterday);

    const habits = await Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    const entries = await Storage.getAllEntries();
    const yesterdayEntry = entries[yesterdayStr]?.[habitId];
    const yesterdayCompleted = Habits.isCompleted(yesterdayEntry, habit);
    const yesterdayFrozen = habitFreezes.includes(yesterdayStr);

    const freezeBtn = document.getElementById('freezeYesterdayBtn');
    if (yesterdayCompleted) {
      freezeBtn.textContent = 'Yesterday completed';
      freezeBtn.disabled = true;
    } else if (yesterdayFrozen) {
      freezeBtn.textContent = 'Yesterday frozen';
      freezeBtn.disabled = true;
    } else if (yesterdayStr < habit.createdAt) {
      freezeBtn.textContent = 'Habit not created yet';
      freezeBtn.disabled = true;
    } else {
      freezeBtn.textContent = 'Freeze Yesterday';
      freezeBtn.disabled = false;
    }
  },

  // Track if we've already celebrated today
  _celebratedToday: false,

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
    const habitsListEl = document.getElementById('habitsList');

    // Count completed habits for today
    let completedToday = 0;
    for (const habit of habits) {
      const entry = dayEntries[habit.id];
      if (Habits.isCompleted(entry, habit)) {
        completedToday++;
      }
    }

    const allComplete = count > 0 && completedToday === count;

    // Update progress ring
    const progressRingFill = document.getElementById('progressRingFill');
    const progressRingText = document.getElementById('progressRingText');
    const progressRingContainer = document.getElementById('progressRingContainer');

    if (progressRingFill && progressRingText) {
      const circumference = 2 * Math.PI * 16; // r=16
      const progress = count > 0 ? completedToday / count : 0;
      const offset = circumference * (1 - progress);

      progressRingFill.style.strokeDashoffset = offset;
      progressRingText.textContent = `${completedToday}/${count}`;

      if (allComplete && count > 0) {
        progressRingFill.classList.add('all-done');
        progressRingText.classList.add('all-done');
      } else {
        progressRingFill.classList.remove('all-done');
        progressRingText.classList.remove('all-done');
      }

      // Hide ring if no habits
      if (progressRingContainer) {
        progressRingContainer.style.display = count > 0 ? 'flex' : 'none';
      }
    }

    if (counterEl) {
      if (allComplete) {
        counterEl.textContent = `${count} of ${count} complete`;
        counterEl.classList.add('all-complete');
        counterEl.classList.remove('at-limit');
      } else {
        counterEl.textContent = `${completedToday} of ${count} complete`;
        counterEl.classList.remove('all-complete');
        counterEl.classList.remove('at-limit');
      }
    }

    // Trigger celebration when all habits are complete (only once per session)
    if (allComplete && !this._celebratedToday && this.selectedDate === todayStr) {
      this._celebratedToday = true;
      this.triggerCelebration();
    }

    // Remove celebration message if not all complete
    if (!allComplete) {
      const existingMessage = document.querySelector('.celebration-message');
      if (existingMessage) {
        existingMessage.remove();
      }
    }

    if (addBtn) {
      addBtn.disabled = count >= max;
      addBtn.style.display = count >= max ? 'none' : 'block';
    }
  },

  // Trigger celebration effects
  triggerCelebration() {
    const habitsListEl = document.getElementById('habitsList');
    const addHabitSection = document.querySelector('.add-habit-section');

    // Add glow animation
    if (habitsListEl) {
      habitsListEl.classList.add('celebrating');
      setTimeout(() => {
        habitsListEl.classList.remove('celebrating');
      }, 1500);
    }

    // Trigger confetti
    if (typeof Confetti !== 'undefined') {
      Confetti.celebrate();
    }

    // Add celebration message
    if (addHabitSection && !document.querySelector('.celebration-message')) {
      const messages = [
        "Perfect day! You're building something great.",
        "All habits complete! Keep the momentum going.",
        "Amazing! Every day like this shapes who you become.",
        "You did it! Small wins lead to big transformations."
      ];
      const message = messages[Math.floor(Math.random() * messages.length)];

      const messageEl = document.createElement('div');
      messageEl.className = 'celebration-message';
      messageEl.textContent = message;
      addHabitSection.insertAdjacentElement('beforebegin', messageEl);
    }
  },

  // Select a date to view
  async selectDate(dateStr) {
    this.selectedDate = dateStr;
    const todayStr = Storage.formatDate(new Date());
    const title = document.querySelector('.today-title');

    if (dateStr === todayStr) {
      this.renderTodayTitle();
    } else {
      // Format the selected date nicely
      const selectedDate = new Date(dateStr + 'T00:00:00');
      const options = { weekday: 'long', month: 'short', day: 'numeric' };
      title.textContent = selectedDate.toLocaleDateString('en-US', options);
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

    // Clear container safely
    container.innerHTML = '';

    if (dateStr === todayStr) {
      return;
    }

    const rate = await Habits.getCompletionRate(dateStr);

    // Build DOM safely to prevent XSS
    const details = document.createElement('div');
    details.className = 'day-details';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'day-details-date';
    dateSpan.textContent = dateStr;

    const rateSpan = document.createElement('span');
    rateSpan.className = 'day-details-rate';
    rateSpan.textContent = `${Math.round(rate * 100)}% completed`;

    details.appendChild(dateSpan);
    details.appendChild(rateSpan);
    container.appendChild(details);
  },

  // Bind habit-specific events
  bindHabitEvents() {
    // Binary habit checkboxes
    document.querySelectorAll('.habit-checkbox input').forEach(checkbox => {
      checkbox.addEventListener('change', async (e) => {
        const habitId = e.target.dataset.habitId;
        const habitItem = e.target.closest('.habit-item');
        const value = e.target.checked ? 1 : 0;
        const wasCompleted = habitItem.classList.contains('completed');

        habitItem.classList.add('saving');
        await Storage.saveEntry(this.selectedDate, habitId, value);

        // Trigger success pulse if completing (not uncompleting)
        const shouldPulse = value === 1 && !wasCompleted;

        await this.renderChart();
        await this.renderHabits();
        await this.renderStreaks();
        await this.updateHabitCounter();

        // Apply animation after re-render
        if (shouldPulse) {
          const newHabitItem = document.querySelector(`[data-habit-id="${habitId}"]`)?.closest('.habit-item');
          if (newHabitItem) {
            newHabitItem.classList.add('success-pulse');
            setTimeout(() => newHabitItem.classList.remove('success-pulse'), 600);
          }
        }
      });
    });

    // Count habit buttons
    document.querySelectorAll('.counter-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const habitId = e.target.dataset.habitId;
        const habitItem = e.target.closest('.habit-item');
        const isPlus = e.target.classList.contains('plus');
        const wasCompleted = habitItem.classList.contains('completed');

        const habits = await Storage.getHabits();
        const habit = habits.find(h => h.id === habitId);
        const entries = await Storage.getAllEntries();
        const entry = entries[this.selectedDate]?.[habitId] || { value: 0 };
        const newValue = Math.max(0, entry.value + (isPlus ? 1 : -1));

        // Check if this will complete the habit
        const willComplete = habit && newValue >= habit.target;

        habitItem.classList.add('saving');
        await Storage.saveEntry(this.selectedDate, habitId, newValue);

        // Trigger success pulse if just reached target
        const shouldPulse = willComplete && !wasCompleted;

        await this.renderChart();
        await this.renderHabits();
        await this.renderStreaks();
        await this.updateHabitCounter();

        // Apply animation after re-render
        if (shouldPulse) {
          const newHabitItem = document.querySelector(`[data-habit-id="${habitId}"]`)?.closest('.habit-item');
          if (newHabitItem) {
            newHabitItem.classList.add('success-pulse');
            setTimeout(() => newHabitItem.classList.remove('success-pulse'), 600);
          }
        }
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
    // Website usage toggle (collapsible)
    const websitesToggle = document.getElementById('websitesToggle');
    const categoryGroups = document.getElementById('categoryGroups');
    if (websitesToggle && categoryGroups) {
      websitesToggle.addEventListener('click', () => {
        const isExpanded = websitesToggle.getAttribute('aria-expanded') === 'true';
        websitesToggle.setAttribute('aria-expanded', !isExpanded);
        categoryGroups.classList.toggle('expanded', !isExpanded);
      });
    }

    // Close website detail modal
    document.getElementById('closeDetailBtn').addEventListener('click', () => {
      this.closeModal('websiteDetailModal');
    });

    // Close habit detail modal
    document.getElementById('closeHabitDetailBtn').addEventListener('click', () => {
      this.closeModal('habitDetailModal');
    });

    // Freeze yesterday button
    document.getElementById('freezeYesterdayBtn').addEventListener('click', async () => {
      if (!this.detailHabitId) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = Storage.formatDate(yesterday);

      await Storage.addStreakFreeze(this.detailHabitId, yesterdayStr);

      // Update displays
      await this.updateFreezeSection(this.detailHabitId);
      const currentStreak = await Habits.calculateStreak(this.detailHabitId);
      document.getElementById('habitDetailCurrentStreak').textContent = currentStreak;

      // Refresh main views
      await this.renderStreaks();
      await this.renderHabits();
      await this.renderChart();

      Toast.success('Streak protected! Yesterday is now frozen.');
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

    // Clear container
    container.innerHTML = '';

    if (habits.length === 0) {
      const noHabits = document.createElement('div');
      noHabits.className = 'no-habits';
      noHabits.textContent = 'No habits to manage.';
      container.appendChild(noHabits);
    } else {
      for (const habit of habits) {
        const item = document.createElement('div');
        item.className = 'habit-manage-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'habit-manage-name';
        nameSpan.textContent = habit.name;

        const typeSpan = document.createElement('span');
        typeSpan.className = 'habit-manage-type';
        typeSpan.textContent = habit.type === 'binary' ? 'Binary' : `Count (${habit.target})`;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'habit-manage-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-habit-btn';
        editBtn.dataset.habitId = habit.id;
        editBtn.textContent = 'Edit';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-habit-btn';
        deleteBtn.dataset.habitId = habit.id;
        deleteBtn.textContent = 'Delete';

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        item.appendChild(nameSpan);
        item.appendChild(typeSpan);
        item.appendChild(actionsDiv);
        container.appendChild(item);
      }

      // Bind edit buttons
      container.querySelectorAll('.edit-habit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const habitId = e.target.dataset.habitId;
          this.closeModal('settingsModal');
          this.openEditHabitModal(habitId);
        });
      });

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

    // Clear container
    container.innerHTML = '';

    for (const category of categories) {
      const item = document.createElement('div');
      item.className = 'category-manage-item';

      const colorDot = document.createElement('span');
      colorDot.className = 'category-color-dot';
      colorDot.style.background = category.color;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'category-manage-name';
      nameSpan.textContent = category.name;

      item.appendChild(colorDot);
      item.appendChild(nameSpan);

      if (!category.isDefault) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-category-btn';
        deleteBtn.dataset.categoryId = category.id;
        deleteBtn.textContent = 'Delete';
        item.appendChild(deleteBtn);
      }

      container.appendChild(item);
    }

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

    // Clear container
    container.innerHTML = '';

    // Render each category group (only those with activity)
    for (const cat of categories) {
      const group = grouped[cat.id];
      // Only render categories that have websites with time
      if (group.totalSeconds > 0) {
        container.appendChild(this.renderCategoryGroup(group));
      }
    }
    // Add uncategorized if has websites
    if (grouped['uncategorized'].totalSeconds > 0) {
      container.appendChild(this.renderCategoryGroup(grouped['uncategorized']));
    }

    // Bind click events for detail view
    container.querySelectorAll('.website-card').forEach(card => {
      card.addEventListener('click', () => {
        this.showWebsiteDetail(card.dataset.domain);
      });
    });
  },

  // Render a single category group - returns DOM element
  renderCategoryGroup(group) {
    const { category, websites, totalSeconds } = group;

    const groupEl = document.createElement('div');
    groupEl.className = 'category-group';

    const header = document.createElement('div');
    header.className = 'category-group-header';

    const colorBar = document.createElement('span');
    colorBar.className = 'category-color-bar';
    colorBar.style.background = category.color;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-group-name';
    nameSpan.textContent = category.name;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'category-group-time';
    timeSpan.textContent = Websites.formatTime(totalSeconds);

    header.appendChild(colorBar);
    header.appendChild(nameSpan);
    header.appendChild(timeSpan);
    groupEl.appendChild(header);

    const websitesEl = document.createElement('div');
    websitesEl.className = 'category-websites';

    for (const website of websites) {
      const card = document.createElement('div');
      card.className = 'website-card';
      card.dataset.domain = website.domain;

      const favicon = document.createElement('img');
      favicon.className = 'website-card-favicon';
      favicon.src = website.favicon;
      favicon.alt = '';
      favicon.onerror = function() {
        this.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23666%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>';
      };

      const domainSpan = document.createElement('span');
      domainSpan.className = 'website-card-domain';
      domainSpan.textContent = this.truncateDomain(website.displayName);

      const cardTimeSpan = document.createElement('span');
      cardTimeSpan.className = 'website-card-time';
      cardTimeSpan.textContent = Websites.formatTime(website.totalSeconds);

      card.appendChild(favicon);
      card.appendChild(domainSpan);
      card.appendChild(cardTimeSpan);
      websitesEl.appendChild(card);
    }

    groupEl.appendChild(websitesEl);
    return groupEl;
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

    // Populate time limit section
    const settings = await Storage.getWebsiteSettings();
    const currentLimit = settings[domain]?.dailyLimitSeconds || null;
    const limitMinutes = currentLimit ? Math.floor(currentLimit / 60) : '';
    document.getElementById('timeLimitInput').value = limitMinutes;

    // Show remaining time
    const remaining = await Websites.getRemainingTime(domain);
    const remainingEl = document.getElementById('remainingTime');
    if (remaining !== null) {
      remainingEl.textContent = remaining > 0
        ? `${Websites.formatTime(remaining)} remaining today`
        : 'Limit reached - blocked';
      remainingEl.classList.toggle('exceeded', remaining <= 0);
    } else {
      remainingEl.textContent = '';
      remainingEl.classList.remove('exceeded');
    }

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

    // Time limit input
    document.getElementById('timeLimitInput').addEventListener('change', async (e) => {
      const minutes = parseInt(e.target.value, 10);
      const seconds = minutes > 0 ? minutes * 60 : null;

      await Storage.setWebsiteSetting(this.selectedWebsiteDomain, {
        dailyLimitSeconds: seconds
      });

      // Update remaining time display
      const remaining = await Websites.getRemainingTime(this.selectedWebsiteDomain);
      const remainingEl = document.getElementById('remainingTime');
      if (remaining !== null) {
        remainingEl.textContent = remaining > 0
          ? `${Websites.formatTime(remaining)} remaining today`
          : 'Limit reached - blocked';
        remainingEl.classList.toggle('exceeded', remaining <= 0);
      } else {
        remainingEl.textContent = '';
        remainingEl.classList.remove('exceeded');
      }

      await this.renderWebsites();
      Toast.success(seconds ? `Time limit set: ${minutes} minutes/day` : 'Time limit removed');
    });

    // Edit habit type change
    document.getElementById('editHabitType').addEventListener('change', (e) => {
      const targetGroup = document.getElementById('editTargetGroup');
      const hint = document.getElementById('editHabitTypeHint');
      const isCount = e.target.value === 'count';
      targetGroup.style.display = isCount ? 'block' : 'none';
      hint.textContent = isCount
        ? 'Set a daily goal to reach (e.g., 8 glasses of water)'
        : 'Check off when completed';
    });

    // Cancel edit habit
    document.getElementById('cancelEditHabitBtn').addEventListener('click', () => {
      this.closeModal('editHabitModal');
      document.getElementById('editHabitForm').reset();
      this.openModal('settingsModal');
    });

    // Edit habit form submit
    document.getElementById('editHabitForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveEditedHabit();
    });
  },

  // Open edit habit modal with pre-filled data
  async openEditHabitModal(habitId) {
    const habits = await Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Fill form with current values
    document.getElementById('editHabitId').value = habit.id;
    document.getElementById('editHabitName').value = habit.name;
    document.getElementById('editHabitType').value = habit.type;
    document.getElementById('editHabitTarget').value = habit.target || 1;

    // Update UI based on type
    const targetGroup = document.getElementById('editTargetGroup');
    const hint = document.getElementById('editHabitTypeHint');
    const isCount = habit.type === 'count';
    targetGroup.style.display = isCount ? 'block' : 'none';
    hint.textContent = isCount
      ? 'Set a daily goal to reach (e.g., 8 glasses of water)'
      : 'Check off when completed';

    this.openModal('editHabitModal');
  },

  // Save edited habit
  async saveEditedHabit() {
    const habitId = document.getElementById('editHabitId').value;
    const name = document.getElementById('editHabitName').value.trim();
    const type = document.getElementById('editHabitType').value;
    const target = parseInt(document.getElementById('editHabitTarget').value) || 1;

    if (!name) {
      Toast.error('Habit name is required');
      return;
    }

    const habits = await Storage.getHabits();
    const habitIndex = habits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) {
      Toast.error('Habit not found');
      return;
    }

    // Update habit (preserve createdAt)
    const updatedHabit = {
      ...habits[habitIndex],
      name: name,
      type: type,
      target: type === 'binary' ? 1 : Math.max(1, target)
    };

    try {
      await Storage.saveHabit(updatedHabit);

      this.closeModal('editHabitModal');
      document.getElementById('editHabitForm').reset();

      await this.renderHabits();
      await this.renderStreaks();
      await this.updateHabitCounter();
      Toast.success('Habit updated');
    } catch (error) {
      Toast.error('Failed to update habit: ' + error.message);
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
