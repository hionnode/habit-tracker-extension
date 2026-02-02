// SVG Year Chart rendering

const Chart = {
  cellSize: 18,
  cellGap: 2,

  // Create SVG pattern definitions for colorblind accessibility
  createPatternDefs() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Pattern for 0% - diagonal lines (incomplete)
    const patternNone = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    patternNone.setAttribute('id', 'pattern-none');
    patternNone.setAttribute('patternUnits', 'userSpaceOnUse');
    patternNone.setAttribute('width', '4');
    patternNone.setAttribute('height', '4');
    patternNone.innerHTML = `
      <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
    `;
    defs.appendChild(patternNone);

    // Pattern for partial - dots
    const patternPartial = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    patternPartial.setAttribute('id', 'pattern-partial');
    patternPartial.setAttribute('patternUnits', 'userSpaceOnUse');
    patternPartial.setAttribute('width', '4');
    patternPartial.setAttribute('height', '4');
    patternPartial.innerHTML = `
      <circle cx="2" cy="2" r="0.8" fill="rgba(0,0,0,0.25)"/>
    `;
    defs.appendChild(patternPartial);

    return defs;
  },

  // Get pattern ID based on completion rate
  getPatternId(rate, isFuture) {
    if (isFuture) return null;
    if (rate === 0) return 'pattern-none';
    if (rate < 1) return 'pattern-partial';
    return null; // Solid fill for 100%
  },

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
    svg.setAttribute('role', 'grid');
    svg.setAttribute('aria-label', `Year ${year} habit completion chart`);

    // Add pattern definitions for colorblind accessibility
    svg.appendChild(this.createPatternDefs());

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

      // Accessibility attributes
      rect.setAttribute('role', 'gridcell');
      rect.setAttribute('tabindex', isToday ? '0' : '-1');
      rect.setAttribute('aria-label', `${dateStr}: ${Math.round(rate * 100)}% complete. ${isFuture ? 'Future date.' : 'Click to view details.'}`);

      // Tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${dateStr}: ${Math.round(rate * 100)}% complete`;
      rect.appendChild(title);

      // Click handler
      const handleClick = () => {
        if (onDayClick) onDayClick(dateStr);
      };
      rect.addEventListener('click', handleClick);

      // Keyboard handler
      rect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
        // Arrow key navigation
        this.handleChartNavigation(e, svg, dateStr);
      });

      svg.appendChild(rect);

      // Add pattern overlay for colorblind accessibility
      const patternId = this.getPatternId(rate, isFuture);
      if (patternId) {
        const patternRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        patternRect.setAttribute('x', x);
        patternRect.setAttribute('y', y);
        patternRect.setAttribute('width', this.cellSize);
        patternRect.setAttribute('height', this.cellSize);
        patternRect.setAttribute('rx', 2);
        patternRect.setAttribute('fill', `url(#${patternId})`);
        patternRect.setAttribute('pointer-events', 'none');
        svg.appendChild(patternRect);
      }

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
    return completed ? '#50c878' : '#ff4444';
  },

  // Render a combined mini year chart showing overall completion
  async renderCombinedMiniChart(container, onDayClick) {
    const today = new Date();
    const year = today.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    // Calculate dimensions for vertical layout
    const cols = 7;
    const rows = 53;
    const width = cols * (this.miniCellSize + this.miniCellGap);
    const height = rows * (this.miniCellSize + this.miniCellGap);

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'mini-year-chart combined-chart');

    // Get overall completion rates (reuse main chart logic)
    const completionRates = await this.getYearCompletionRates(year);

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
      const rate = completionRates[dateStr] || 0;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', this.miniCellSize);
      rect.setAttribute('height', this.miniCellSize);
      rect.setAttribute('rx', 1);
      rect.setAttribute('fill', Habits.getColor(rate, isFuture));
      rect.setAttribute('data-date', dateStr);
      rect.setAttribute('class', `mini-chart-cell${isToday ? ' today' : ''}`);

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

// Horizontal year chart settings (full year, 53 weeks x 7 days laid out horizontally)
  horizontalYearCellSize: 8,
  horizontalYearCellGap: 1,

  // Render a horizontal full-year chart for a single habit (weeks as columns, days as rows)
  async renderHorizontalYearChart(container, habitId) {
    const today = new Date();
    const year = today.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    const todayStr = Storage.formatDate(today);

    // Get habit data
    const habits = await Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
      container.innerHTML = '';
      return;
    }

    const entries = await Storage.getAllEntries();

    // Horizontal layout: 53 columns (weeks) x 7 rows (days)
    const cols = 53;
    const rows = 7;
    const cellSize = this.horizontalYearCellSize;
    const gap = this.horizontalYearCellGap;
    const width = cols * (cellSize + gap);
    const height = rows * (cellSize + gap);

    // Create SVG with viewBox for responsive scaling
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.setAttribute('class', 'horizontal-year-chart');

    // Draw cells for each day
    let currentDate = new Date(startOfYear);

    while (currentDate <= endOfYear) {
      const dateStr = Storage.formatDate(currentDate);
      const dayOfYear = this.getDayOfYear(currentDate);
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday (row)
      const weekOfYear = Math.floor((dayOfYear - 1 + startOfYear.getDay()) / 7); // column

      // Horizontal: x is week, y is day of week
      const x = weekOfYear * (cellSize + gap);
      const y = dayOfWeek * (cellSize + gap);

      const isFuture = currentDate > today;
      const isToday = dateStr === todayStr;
      const isBeforeHabit = dateStr < habit.createdAt;

      let color;
      if (isFuture || isBeforeHabit) {
        color = '#2a2a2a';
      } else {
        const entry = entries[dateStr]?.[habitId];
        const completed = Habits.isCompleted(entry, habit);
        color = completed ? '#50c878' : '#ff4444';
      }

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', cellSize);
      rect.setAttribute('height', cellSize);
      rect.setAttribute('rx', 2);
      rect.setAttribute('fill', color);
      rect.setAttribute('data-date', dateStr);

      if (isToday) {
        rect.setAttribute('stroke', '#fff');
        rect.setAttribute('stroke-width', '1.5');
      }

      // Tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      if (isFuture) {
        title.textContent = `${dateStr}: Future`;
      } else if (isBeforeHabit) {
        title.textContent = `${dateStr}: Before habit created`;
      } else {
        const entry = entries[dateStr]?.[habitId];
        const completed = Habits.isCompleted(entry, habit);
        title.textContent = `${dateStr}: ${completed ? 'Completed' : 'Missed'}`;
      }
      rect.appendChild(title);

      svg.appendChild(rect);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    container.innerHTML = '';
    container.appendChild(svg);
  },

  // Legacy: Horizontal mini chart (kept for compatibility)
  horizontalCellWidth: 2,
  horizontalCellHeight: 12,
  horizontalCellGap: 1,

  async renderHorizontalMiniChart(container, habitId, days = 180) {
    // Redirect to the new horizontal year chart
    return this.renderHorizontalYearChart(container, habitId);
  },

  // Render a larger year chart for habit detail modal
  async renderHabitYearChart(container, habitId, onDayClick) {
    const today = new Date();
    const year = today.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    // Use slightly larger cells for modal view
    const cellSize = 14;
    const cellGap = 2;

    // Calculate dimensions for vertical layout
    const cols = 7;
    const rows = 53;
    const width = cols * (cellSize + cellGap);
    const height = rows * (cellSize + cellGap);

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'habit-year-chart');

    // Get completion data for this habit
    const completionData = await this.getHabitYearCompletion(habitId, year);
    const habits = await Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);

    // Draw cells for each day
    let currentDate = new Date(startOfYear);
    const todayStr = Storage.formatDate(today);

    while (currentDate <= endOfYear) {
      const dateStr = Storage.formatDate(currentDate);
      const dayOfYear = this.getDayOfYear(currentDate);
      const dayOfWeek = currentDate.getDay();
      const weekOfYear = Math.floor((dayOfYear - 1 + startOfYear.getDay()) / 7);

      const x = dayOfWeek * (cellSize + cellGap);
      const y = weekOfYear * (cellSize + cellGap);

      const isFuture = currentDate > today;
      const isToday = dateStr === todayStr;
      const isBeforeHabit = habit && dateStr < habit.createdAt;
      const completed = completionData[dateStr];

      let color;
      if (isFuture || isBeforeHabit) {
        color = '#2a2a2a';
      } else {
        color = completed ? '#50c878' : '#ff4444';
      }

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', cellSize);
      rect.setAttribute('height', cellSize);
      rect.setAttribute('rx', 2);
      rect.setAttribute('fill', color);
      rect.setAttribute('data-date', dateStr);
      rect.setAttribute('class', `habit-chart-cell${isToday ? ' today' : ''}`);

      // Tooltip
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      if (isFuture) {
        title.textContent = `${dateStr}: Future`;
      } else if (isBeforeHabit) {
        title.textContent = `${dateStr}: Before habit created`;
      } else {
        title.textContent = `${dateStr}: ${completed ? 'Completed' : 'Missed'}`;
      }
      rect.appendChild(title);

      // Click handler
      if (onDayClick) {
        rect.style.cursor = 'pointer';
        rect.addEventListener('click', () => onDayClick(dateStr));
      }

      svg.appendChild(rect);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    container.innerHTML = '';
    container.appendChild(svg);
  },

  // Handle arrow key navigation in chart
  handleChartNavigation(e, svg, currentDateStr) {
    const current = new Date(currentDateStr);
    let targetDate = null;

    switch (e.key) {
      case 'ArrowRight':
        targetDate = new Date(current);
        targetDate.setDate(targetDate.getDate() + 1);
        break;
      case 'ArrowLeft':
        targetDate = new Date(current);
        targetDate.setDate(targetDate.getDate() - 1);
        break;
      case 'ArrowDown':
        targetDate = new Date(current);
        targetDate.setDate(targetDate.getDate() + 7);
        break;
      case 'ArrowUp':
        targetDate = new Date(current);
        targetDate.setDate(targetDate.getDate() - 7);
        break;
      default:
        return;
    }

    if (targetDate) {
      e.preventDefault();
      const targetDateStr = Storage.formatDate(targetDate);
      const targetCell = svg.querySelector(`[data-date="${targetDateStr}"]`);
      if (targetCell) {
        targetCell.setAttribute('tabindex', '0');
        targetCell.focus();
        // Remove tabindex from current
        const currentCell = svg.querySelector(`[data-date="${currentDateStr}"]`);
        if (currentCell && currentCell !== targetCell) {
          currentCell.setAttribute('tabindex', '-1');
        }
      }
    }
  }
};
