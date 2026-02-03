// First-time user onboarding experience
// "30-second" flow: Identity priming -> Single habit -> Year preview -> Immediate win

const Onboarding = {
  // Identity archetypes for priming
  ARCHETYPES: [
    { id: 'athlete', name: 'The Athlete', icon: '\u{1F3CB}', habit: { name: 'Exercise', type: 'binary', target: 1 } },
    { id: 'reader', name: 'The Reader', icon: '\u{1F4DA}', habit: { name: 'Read', type: 'binary', target: 1 } },
    { id: 'mindful', name: 'The Mindful', icon: '\u{1F9D8}', habit: { name: 'Meditate', type: 'binary', target: 1 } },
    { id: 'healthy', name: 'The Healthy', icon: '\u{1F957}', habit: { name: 'Eat Well', type: 'binary', target: 1 } },
    { id: 'creator', name: 'The Creator', icon: '\u{1F3A8}', habit: { name: 'Create', type: 'binary', target: 1 } }
  ],

  // Check if user is new (no habits)
  async isNewUser() {
    const habits = await Storage.getHabits();
    return habits.length === 0;
  },

  // Check if onboarding was completed or dismissed
  async wasOnboardingShown() {
    const result = await chrome.storage.local.get(['onboardingComplete']);
    return result.onboardingComplete === true;
  },

  // Mark onboarding as complete
  async markOnboardingComplete() {
    await chrome.storage.local.set({ onboardingComplete: true });
  },

  // Start onboarding if applicable
  async maybeStartOnboarding() {
    const isNew = await this.isNewUser();
    const wasShown = await this.wasOnboardingShown();

    if (isNew && !wasShown) {
      this.showOnboarding();
    }
  },

  // Show the onboarding overlay
  showOnboarding() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.className = 'onboarding-overlay';

    overlay.innerHTML = `
      <div class="onboarding-content">
        <div class="onboarding-step" id="onboarding-step-1">
          <h2 class="onboarding-title">Who do you want to become?</h2>
          <p class="onboarding-subtitle">Choose the identity that resonates with you</p>
          <div class="archetype-grid" id="archetype-grid"></div>
          <button class="onboarding-skip" id="skip-onboarding">Skip</button>
        </div>

        <div class="onboarding-step hidden" id="onboarding-step-2">
          <h2 class="onboarding-title">Your first habit</h2>
          <p class="onboarding-subtitle">Start with one. You can add more later.</p>
          <div class="habit-preview" id="habit-preview">
            <span class="habit-preview-icon" id="preview-icon"></span>
            <span class="habit-preview-name" id="preview-name">Exercise</span>
          </div>
          <div class="onboarding-actions">
            <button class="onboarding-btn secondary" id="back-to-archetypes">Back</button>
            <button class="onboarding-btn primary" id="confirm-habit">Start This Habit</button>
          </div>
        </div>

        <div class="onboarding-step hidden" id="onboarding-step-3">
          <h2 class="onboarding-title">Your year at a glance</h2>
          <p class="onboarding-subtitle">Every green cell is a day you showed up</p>
          <div class="year-preview-animation" id="year-preview"></div>
          <button class="onboarding-btn primary" id="start-now">Mark Today Complete</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Populate archetype grid
    const grid = document.getElementById('archetype-grid');
    for (const arch of this.ARCHETYPES) {
      const card = document.createElement('button');
      card.className = 'archetype-card';
      card.dataset.archetypeId = arch.id;

      const icon = document.createElement('span');
      icon.className = 'archetype-icon';
      icon.textContent = arch.icon;

      const name = document.createElement('span');
      name.className = 'archetype-name';
      name.textContent = arch.name;

      card.appendChild(icon);
      card.appendChild(name);
      grid.appendChild(card);
    }

    // Bind events
    this.bindOnboardingEvents();

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('show');
    });
  },

  selectedArchetype: null,

  bindOnboardingEvents() {
    // Archetype selection
    document.querySelectorAll('.archetype-card').forEach(card => {
      card.addEventListener('click', () => {
        const archId = card.dataset.archetypeId;
        this.selectedArchetype = this.ARCHETYPES.find(a => a.id === archId);

        // Update preview
        document.getElementById('preview-icon').textContent = this.selectedArchetype.icon;
        document.getElementById('preview-name').textContent = this.selectedArchetype.habit.name;

        // Move to step 2
        this.showStep(2);
      });
    });

    // Skip onboarding
    document.getElementById('skip-onboarding').addEventListener('click', () => {
      this.closeOnboarding();
    });

    // Back to archetypes
    document.getElementById('back-to-archetypes').addEventListener('click', () => {
      this.showStep(1);
    });

    // Confirm habit
    document.getElementById('confirm-habit').addEventListener('click', async () => {
      // Create the habit
      const habit = Habits.createHabit(
        this.selectedArchetype.habit.name,
        this.selectedArchetype.habit.type,
        this.selectedArchetype.habit.target
      );

      await Storage.saveHabit(habit);
      this.createdHabitId = habit.id;

      // Show year preview with animation
      this.showStep(3);
      this.animateYearPreview();
    });

    // Start now (mark today complete)
    document.getElementById('start-now').addEventListener('click', async () => {
      if (this.createdHabitId) {
        // Mark today as complete
        const today = Storage.formatDate(new Date());
        await Storage.saveEntry(today, this.createdHabitId, 1);
      }

      await this.markOnboardingComplete();
      this.closeOnboarding();

      // Refresh the main app
      await App.renderChart();
      await App.renderHabits();
      await App.renderStreaks();
      await App.updateHabitCounter();

      // Celebrate!
      if (typeof Confetti !== 'undefined') {
        Confetti.celebrate();
      }

      Toast.success("You're on your way! Day 1 complete.");
    });
  },

  showStep(stepNum) {
    document.querySelectorAll('.onboarding-step').forEach((step, i) => {
      step.classList.toggle('hidden', i + 1 !== stepNum);
    });
  },

  animateYearPreview() {
    const container = document.getElementById('year-preview');
    container.innerHTML = '';

    // Create mini grid (7x10 for preview)
    const cols = 7;
    const rows = 10;
    const cellSize = 12;
    const gap = 2;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', cols * (cellSize + gap));
    svg.setAttribute('height', rows * (cellSize + gap));
    svg.setAttribute('class', 'year-preview-svg');

    // Create cells
    const cells = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', col * (cellSize + gap));
        rect.setAttribute('y', row * (cellSize + gap));
        rect.setAttribute('width', cellSize);
        rect.setAttribute('height', cellSize);
        rect.setAttribute('rx', 2);
        rect.setAttribute('fill', '#2a2a2a');
        rect.style.transition = 'fill 0.3s';
        svg.appendChild(rect);
        cells.push(rect);
      }
    }

    container.appendChild(svg);

    // Animate cells filling in
    const fillPattern = this.generateFillPattern(cells.length);
    let filled = 0;

    const fillInterval = setInterval(() => {
      if (filled >= fillPattern.length) {
        clearInterval(fillInterval);
        return;
      }

      const cellIndex = fillPattern[filled];
      cells[cellIndex].setAttribute('fill', '#50c878');
      filled++;
    }, 50);
  },

  // Generate a pattern that simulates real habit streaks
  generateFillPattern(totalCells) {
    const pattern = [];
    let currentIndex = 0;

    // Fill roughly 60% of cells in streaky patterns
    while (pattern.length < totalCells * 0.6) {
      // Start a streak
      const streakLength = Math.floor(Math.random() * 7) + 3;
      for (let i = 0; i < streakLength && currentIndex < totalCells; i++) {
        if (!pattern.includes(currentIndex)) {
          pattern.push(currentIndex);
        }
        currentIndex++;
      }

      // Skip some days (break)
      currentIndex += Math.floor(Math.random() * 3) + 1;

      // Reset if we've gone too far
      if (currentIndex >= totalCells) {
        currentIndex = Math.floor(Math.random() * totalCells);
      }
    }

    return pattern;
  },

  closeOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }
    this.markOnboardingComplete();
  },

  createdHabitId: null
};

// Make available globally
window.Onboarding = Onboarding;
