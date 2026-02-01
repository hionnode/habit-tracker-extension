// SVG Year Chart rendering

const Chart = {
  cellSize: 12,
  cellGap: 2,

  // Generate the year chart SVG (vertical layout)
  async render(container, onDayClick) {
    const today = new Date();
    const year = today.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    // Calculate dimensions for vertical layout
    // 7 columns (days of week) x 53 rows (weeks)
    const cols = 7;
    const rows = 53;
    const width = cols * (this.cellSize + this.cellGap);
    const height = rows * (this.cellSize + this.cellGap);

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'year-chart');

    // Get all completion rates
    const completionRates = await this.getYearCompletionRates(year);

    // Draw cells for each day
    let currentDate = new Date(startOfYear);
    const todayStr = Storage.formatDate(today);

    while (currentDate <= endOfYear) {
      const dateStr = Storage.formatDate(currentDate);
      const dayOfYear = this.getDayOfYear(currentDate);
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday
      const weekOfYear = Math.floor((dayOfYear - 1 + startOfYear.getDay()) / 7);

      // Vertical layout: x is day of week, y is week of year
      const x = dayOfWeek * (this.cellSize + this.cellGap);
      const y = weekOfYear * (this.cellSize + this.cellGap);

      const isFuture = currentDate > today;
      const isToday = dateStr === todayStr;
      const rate = completionRates[dateStr] || 0;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', this.cellSize);
      rect.setAttribute('height', this.cellSize);
      rect.setAttribute('rx', 2);
      rect.setAttribute('fill', Habits.getColor(rate, isFuture));
      rect.setAttribute('data-date', dateStr);
      rect.setAttribute('class', `chart-cell${isToday ? ' today' : ''}`);

      // Tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${dateStr}: ${Math.round(rate * 100)}% complete`;
      rect.appendChild(title);

      // Click handler
      rect.addEventListener('click', () => {
        if (onDayClick) onDayClick(dateStr);
      });

      svg.appendChild(rect);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    container.innerHTML = '';
    container.appendChild(svg);
  },

  // Get day of year (1-366)
  getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  },

  // Pre-calculate completion rates for all days in the year
  async getYearCompletionRates(year) {
    const habits = await Storage.getHabits();
    const entries = await Storage.getAllEntries();
    const rates = {};

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    const today = new Date();

    let currentDate = new Date(startOfYear);

    while (currentDate <= endOfYear && currentDate <= today) {
      const dateStr = Storage.formatDate(currentDate);
      const dayEntries = entries[dateStr] || {};

      // Only count habits that existed on that date
      const activeHabits = habits.filter(h => h.createdAt <= dateStr);

      if (activeHabits.length > 0) {
        let completed = 0;
        for (const habit of activeHabits) {
          const entry = dayEntries[habit.id];
          if (Habits.isCompleted(entry, habit)) {
            completed++;
          }
        }
        rates[dateStr] = completed / activeHabits.length;
      } else {
        rates[dateStr] = 0;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return rates;
  },

  // Mini chart settings
  miniCellSize: 6,
  miniCellGap: 1,

  // Render a mini year chart for a single habit
  async renderMiniChart(container, habitId, onDayClick) {
    const today = new Date();
    const year = today.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    // Calculate dimensions for vertical layout (same as main chart)
    const cols = 7;
    const rows = 53;
    const width = cols * (this.miniCellSize + this.miniCellGap);
    const height = rows * (this.miniCellSize + this.miniCellGap);

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'mini-year-chart');

    // Get completion data for this habit
    const completionData = await this.getHabitYearCompletion(habitId, year);

    // Draw cells for each day
    let currentDate = new Date(startOfYear);
    const todayStr = Storage.formatDate(today);

    while (currentDate <= endOfYear) {
      const dateStr = Storage.formatDate(currentDate);
      const dayOfYear = this.getDayOfYear(currentDate);
      const dayOfWeek = currentDate.getDay();
      const weekOfYear = Math.floor((dayOfYear - 1 + startOfYear.getDay()) / 7);

      const x = dayOfWeek * (this.miniCellSize + this.miniCellGap);
      const y = weekOfYear * (this.miniCellSize + this.miniCellGap);

      const isFuture = currentDate > today;
      const isToday = dateStr === todayStr;
      const completed = completionData[dateStr];

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', this.miniCellSize);
      rect.setAttribute('height', this.miniCellSize);
      rect.setAttribute('rx', 1);
      rect.setAttribute('fill', this.getMiniChartColor(completed, isFuture));
      rect.setAttribute('data-date', dateStr);
      rect.setAttribute('class', `mini-chart-cell${isToday ? ' today' : ''}`);

      // Tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${dateStr}: ${completed ? 'Completed' : 'Not completed'}`;
      rect.appendChild(title);

      // Click handler
      rect.addEventListener('click', () => {
        if (onDayClick) onDayClick(dateStr);
      });

      svg.appendChild(rect);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    container.innerHTML = '';
    container.appendChild(svg);
  },

  // Get completion data for a single habit for the year
  async getHabitYearCompletion(habitId, year) {
    const habits = await Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    const entries = await Storage.getAllEntries();
    const data = {};

    if (!habit) return data;

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    const today = new Date();

    let currentDate = new Date(startOfYear);

    while (currentDate <= endOfYear && currentDate <= today) {
      const dateStr = Storage.formatDate(currentDate);

      // Only show data from when habit was created
      if (dateStr >= habit.createdAt) {
        const entry = entries[dateStr]?.[habitId];
        data[dateStr] = Habits.isCompleted(entry, habit);
      } else {
        data[dateStr] = null; // Habit didn't exist yet
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  },

  // Get color for mini chart cell (binary: completed or not)
  getMiniChartColor(completed, isFuture) {
    if (isFuture) return '#2a2a2a';
    if (completed === null) return '#2a2a2a'; // Before habit existed
    return completed ? '#44ff44' : '#ff4444';
  }
};
