// Animation utilities using anime.js
// Provides cohesive, delightful animations for habit completion, milestones, and celebrations

const Animations = {
  // Respect user's reduced motion preference
  shouldAnimate() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Animation timings (ms)
  timings: {
    micro: 150,       // Micro-feedback
    short: 250,       // Quick transitions
    medium: 400,      // State changes
    celebration: 800, // Celebrations
    progress: 600     // Progress updates
  },

  // Easings
  easings: {
    snappy: 'easeOutExpo',
    elastic: 'easeOutElastic(1, .5)',
    smooth: 'easeInOutQuad',
    bounce: 'easeOutBounce'
  },

  // Habit completion animation sequence
  // Plays: checkbox pop -> streak bump -> ring update
  habitComplete(habitItem, streakEl, progressRing) {
    if (!this.shouldAnimate()) return;

    // Ripple effect on habit item
    anime({
      targets: habitItem,
      scale: [1, 1.02, 1],
      duration: this.timings.medium,
      easing: this.easings.snappy
    });

    // Streak counter elastic bump (if exists)
    if (streakEl) {
      anime({
        targets: streakEl,
        scale: [1, 1.3, 1],
        color: ['#ff9500', '#ffd700', '#ff9500'],
        duration: this.timings.medium,
        easing: this.easings.elastic,
        delay: 100
      });
    }

    // Progress ring pulse (handled separately via CSS)
  },

  // Streak milestone celebration
  // tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  streakMilestone(element, tier, streak) {
    if (!this.shouldAnimate()) return;

    const colors = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2'
    };

    const color = colors[tier] || colors.gold;

    // Create milestone badge
    const badge = document.createElement('div');
    badge.className = 'milestone-badge';
    badge.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      background: radial-gradient(circle, ${color}20 0%, transparent 70%);
      border: 2px solid ${color};
      border-radius: 50%;
      width: 200px;
      height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      pointer-events: none;
    `;

    const streakNum = document.createElement('div');
    streakNum.style.cssText = `
      font-size: 48px;
      font-weight: 700;
      color: ${color};
    `;
    streakNum.textContent = streak;

    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 14px;
      color: ${color};
      text-transform: uppercase;
      letter-spacing: 2px;
    `;
    label.textContent = 'day streak';

    badge.appendChild(streakNum);
    badge.appendChild(label);
    document.body.appendChild(badge);

    // Animate badge
    anime.timeline({
      complete: () => badge.remove()
    })
    .add({
      targets: badge,
      scale: [0, 1],
      opacity: [0, 1],
      duration: this.timings.celebration,
      easing: this.easings.elastic
    })
    .add({
      targets: badge,
      scale: [1, 1.1, 0],
      opacity: [1, 1, 0],
      duration: this.timings.celebration,
      easing: this.easings.snappy,
      delay: 1500
    });
  },

  // Modal open animation
  modalOpen(modal) {
    if (!this.shouldAnimate()) {
      modal.classList.add('show');
      return;
    }

    modal.classList.add('show');
    const content = modal.querySelector('.modal-content');

    anime({
      targets: content,
      scale: [0.9, 1],
      opacity: [0, 1],
      duration: this.timings.medium,
      easing: this.easings.snappy
    });
  },

  // Modal close animation
  modalClose(modal, callback) {
    if (!this.shouldAnimate()) {
      modal.classList.remove('show');
      if (callback) callback();
      return;
    }

    const content = modal.querySelector('.modal-content');

    anime({
      targets: content,
      scale: [1, 0.95],
      opacity: [1, 0],
      duration: this.timings.short,
      easing: this.easings.snappy,
      complete: () => {
        modal.classList.remove('show');
        if (callback) callback();
      }
    });
  },

  // All habits complete celebration
  celebrate(habitsList, progressRing) {
    if (!this.shouldAnimate()) return;

    // Glow animation on habits list
    anime({
      targets: habitsList,
      boxShadow: [
        '0 0 0 0 rgba(80, 200, 120, 0)',
        '0 0 30px 10px rgba(80, 200, 120, 0.3)',
        '0 0 0 0 rgba(80, 200, 120, 0)'
      ],
      duration: 1500,
      easing: this.easings.smooth
    });

    // Progress ring pulse
    if (progressRing) {
      anime({
        targets: progressRing,
        scale: [1, 1.15, 1],
        duration: this.timings.celebration,
        easing: this.easings.elastic
      });
    }
  },

  // Counter increment animation (for count habits)
  counterIncrement(valueEl, oldValue, newValue) {
    if (!this.shouldAnimate()) {
      valueEl.textContent = newValue;
      return;
    }

    anime({
      targets: { val: oldValue },
      val: newValue,
      round: 1,
      duration: this.timings.medium,
      easing: this.easings.snappy,
      update: (anim) => {
        valueEl.textContent = Math.round(anim.animations[0].currentValue);
      }
    });
  },

  // Progress ring animation
  updateProgressRing(ringFill, progress, circumference) {
    if (!this.shouldAnimate()) {
      ringFill.style.strokeDashoffset = circumference * (1 - progress);
      return;
    }

    const targetOffset = circumference * (1 - progress);

    anime({
      targets: ringFill,
      strokeDashoffset: targetOffset,
      duration: this.timings.progress,
      easing: this.easings.smooth
    });
  },

  // Chart cell highlight (on hover or selection)
  highlightCell(cell) {
    if (!this.shouldAnimate()) return;

    anime({
      targets: cell,
      scale: [1, 1.2, 1],
      duration: this.timings.short,
      easing: this.easings.snappy
    });
  },

  // Toast notification entrance
  toastEnter(toast) {
    if (!this.shouldAnimate()) {
      toast.classList.add('show');
      return;
    }

    anime({
      targets: toast,
      translateX: ['120%', 0],
      opacity: [0, 1],
      duration: this.timings.medium,
      easing: this.easings.snappy,
      begin: () => toast.classList.add('show')
    });
  },

  // Toast notification exit
  toastExit(toast, callback) {
    if (!this.shouldAnimate()) {
      toast.classList.remove('show');
      if (callback) callback();
      return;
    }

    anime({
      targets: toast,
      translateX: [0, '120%'],
      opacity: [1, 0],
      duration: this.timings.short,
      easing: this.easings.snappy,
      complete: () => {
        toast.classList.remove('show');
        if (callback) callback();
      }
    });
  },

  // Stagger animation for list items
  staggerIn(items) {
    if (!this.shouldAnimate()) return;

    anime({
      targets: items,
      opacity: [0, 1],
      translateY: [20, 0],
      delay: anime.stagger(50),
      duration: this.timings.medium,
      easing: this.easings.snappy
    });
  },

  // Variable reward - enhanced celebration (20% chance)
  maybeVariableReward() {
    return Math.random() < 0.2;
  },

  // Enhanced completion with variable reward
  enhancedCompletion(habitItem) {
    if (!this.shouldAnimate()) return;

    // Extra sparkle effect
    anime({
      targets: habitItem,
      scale: [1, 1.05, 1],
      rotate: [0, 1, -1, 0],
      duration: this.timings.celebration,
      easing: this.easings.elastic
    });

    // Create sparkle particles
    this.createSparkles(habitItem);
  },

  // Create sparkle particles around element
  createSparkles(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 8; i++) {
      const sparkle = document.createElement('div');
      sparkle.style.cssText = `
        position: fixed;
        width: 6px;
        height: 6px;
        background: #ffd700;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        left: ${centerX}px;
        top: ${centerY}px;
      `;
      document.body.appendChild(sparkle);

      const angle = (i / 8) * Math.PI * 2;
      const distance = 40 + Math.random() * 20;

      anime({
        targets: sparkle,
        translateX: Math.cos(angle) * distance,
        translateY: Math.sin(angle) * distance,
        opacity: [1, 0],
        scale: [1, 0],
        duration: this.timings.celebration,
        easing: this.easings.snappy,
        complete: () => sparkle.remove()
      });
    }
  }
};

// Make available globally
window.Animations = Animations;
