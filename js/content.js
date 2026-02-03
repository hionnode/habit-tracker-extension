// Content script - injects irrevocable blocking overlay when time limit exceeded

(async function() {
  const domain = window.location.hostname;
  if (!domain) return;

  // Check if this domain is blocked on page load
  await checkAndBlock();

  // Listen for block messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'BLOCK_DOMAIN' && message.domain === domain) {
      showBlockOverlay();
    }
    if (message.type === 'CHECK_BLOCK') {
      checkAndBlock();
    }
  });

  async function checkAndBlock() {
    try {
      const result = await chrome.storage.local.get(['websiteSettings', 'websiteEntries']);
      const settings = result.websiteSettings || {};
      const entries = result.websiteEntries || {};

      const domainSettings = settings[domain];
      if (!domainSettings?.dailyLimitSeconds) return;

      const today = formatDate(new Date());
      const todayEntry = entries[today]?.[domain];
      const usedSeconds = todayEntry?.totalSeconds || 0;

      if (usedSeconds >= domainSettings.dailyLimitSeconds) {
        showBlockOverlay();
      }
    } catch (e) {
      console.error('Error checking block status:', e);
    }
  }

  // Box Breathing exercise (most researched, simplest to follow)
  const boxBreathing = {
    name: 'Box',
    steps: [
      { action: 'Inhale', duration: 4 },
      { action: 'Hold', duration: 4 },
      { action: 'Exhale', duration: 4 },
      { action: 'Hold', duration: 4 }
    ]
  };

  // Settings state
  let selectedDuration = 120; // 2 minutes default
  let breathingInterval = null;
  let isActive = false;

  function showBlockOverlay() {
    // Prevent multiple overlays
    if (document.getElementById('habit-tracker-block-overlay')) return;

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'habit-tracker-block-overlay';

    overlay.innerHTML = `
      <style>
        #habit-tracker-block-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%) !important;
          z-index: 2147483647 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          color: #e0e0e0 !important;
          text-align: center !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        #habit-tracker-block-overlay * {
          box-sizing: border-box !important;
        }

        /* Main breathing circle - the primary UI element */
        .htb-circle-container {
          position: relative !important;
          cursor: pointer !important;
          margin-bottom: 32px !important;
        }
        .htb-breathing-circle {
          width: 220px !important;
          height: 220px !important;
          border-radius: 50% !important;
          background: radial-gradient(circle, rgba(100, 181, 246, 0.15) 0%, rgba(100, 181, 246, 0.03) 70%, transparent 100%) !important;
          border: 2px solid rgba(100, 181, 246, 0.4) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 0 60px rgba(100, 181, 246, 0.15) !important;
          transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s, box-shadow 0.3s !important;
        }

        /* Idle pulse animation - invites engagement */
        .htb-breathing-circle.idle {
          animation: idlePulse 4s ease-in-out infinite !important;
        }
        @keyframes idlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        /* Active breathing states */
        .htb-breathing-circle.expand {
          transform: scale(1.3) !important;
          animation: none !important;
        }
        .htb-breathing-circle.contract {
          transform: scale(0.8) !important;
          animation: none !important;
        }
        .htb-breathing-circle.hold {
          animation: none !important;
        }

        /* Circle inner content */
        .htb-circle-content {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 4px !important;
        }
        .htb-countdown {
          font-size: 48px !important;
          font-weight: 200 !important;
          color: #64b5f6 !important;
          line-height: 1 !important;
          opacity: 0 !important;
          transition: opacity 0.3s !important;
        }
        .htb-countdown.show {
          opacity: 1 !important;
        }

        /* Headline - single word */
        .htb-headline {
          font-size: 32px !important;
          font-weight: 300 !important;
          color: #fff !important;
          margin: 0 0 12px 0 !important;
          letter-spacing: -0.5px !important;
          transition: opacity 0.3s !important;
        }

        /* Instruction text */
        .htb-instruction {
          font-size: 18px !important;
          color: #8892b0 !important;
          margin: 0 !important;
          font-weight: 300 !important;
          min-height: 24px !important;
          transition: opacity 0.3s !important;
        }
        .htb-instruction.subtle {
          color: #5a6785 !important;
          font-size: 15px !important;
        }

        /* Settings gear - tiny, corner */
        .htb-settings-btn {
          position: fixed !important;
          bottom: 24px !important;
          right: 24px !important;
          width: 32px !important;
          height: 32px !important;
          background: transparent !important;
          border: none !important;
          color: rgba(255, 255, 255, 0.2) !important;
          font-size: 16px !important;
          cursor: pointer !important;
          transition: color 0.2s !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .htb-settings-btn:hover {
          color: rgba(255, 255, 255, 0.5) !important;
        }

        /* Settings panel - hidden by default */
        .htb-settings-panel {
          position: fixed !important;
          bottom: 64px !important;
          right: 24px !important;
          background: rgba(30, 35, 50, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          padding: 16px !important;
          opacity: 0 !important;
          visibility: hidden !important;
          transform: translateY(10px) !important;
          transition: all 0.2s ease !important;
        }
        .htb-settings-panel.show {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateY(0) !important;
        }
        .htb-settings-group {
          margin-bottom: 16px !important;
        }
        .htb-settings-group:last-child {
          margin-bottom: 0 !important;
        }
        .htb-settings-label {
          font-size: 11px !important;
          color: #666 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          margin-bottom: 8px !important;
        }
        .htb-settings-options {
          display: flex !important;
          gap: 6px !important;
        }
        .htb-settings-option {
          padding: 6px 12px !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 6px !important;
          color: #8892b0 !important;
          font-size: 12px !important;
          cursor: pointer !important;
          transition: all 0.15s !important;
        }
        .htb-settings-option:hover {
          background: rgba(255, 255, 255, 0.08) !important;
        }
        .htb-settings-option.active {
          background: rgba(100, 181, 246, 0.2) !important;
          border-color: rgba(100, 181, 246, 0.4) !important;
          color: #64b5f6 !important;
        }

        /* Completion state */
        .htb-complete-text {
          font-size: 24px !important;
          font-weight: 300 !important;
          color: #fff !important;
          opacity: 0 !important;
          transition: opacity 0.5s !important;
        }
        .htb-complete-text.show {
          opacity: 1 !important;
        }

        /* Stop button during exercise */
        .htb-stop-btn {
          position: fixed !important;
          bottom: 24px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          padding: 8px 24px !important;
          background: transparent !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 20px !important;
          color: rgba(255, 255, 255, 0.4) !important;
          font-size: 13px !important;
          cursor: pointer !important;
          opacity: 0 !important;
          visibility: hidden !important;
          transition: all 0.2s !important;
        }
        .htb-stop-btn.show {
          opacity: 1 !important;
          visibility: visible !important;
        }
        .htb-stop-btn:hover {
          border-color: rgba(255, 255, 255, 0.3) !important;
          color: rgba(255, 255, 255, 0.6) !important;
        }
      </style>

      <!-- Breathing circle - tappable -->
      <div class="htb-circle-container" id="htb-circle-container">
        <div class="htb-breathing-circle idle" id="htb-breathing-circle">
          <div class="htb-circle-content">
            <span class="htb-countdown" id="htb-countdown">4</span>
          </div>
        </div>
      </div>

      <!-- Single word headline -->
      <h1 class="htb-headline" id="htb-headline">Breathe.</h1>

      <!-- Instruction - changes based on state -->
      <p class="htb-instruction subtle" id="htb-instruction">tap to begin</p>

      <!-- Completion text - hidden initially -->
      <p class="htb-complete-text" id="htb-complete-text">Well done.</p>

      <!-- Settings gear -->
      <button class="htb-settings-btn" id="htb-settings-btn" title="Settings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      <!-- Settings panel (simplified - duration only) -->
      <div class="htb-settings-panel" id="htb-settings-panel">
        <div class="htb-settings-group">
          <div class="htb-settings-label">Duration</div>
          <div class="htb-settings-options" id="htb-duration-options">
            <button class="htb-settings-option" data-duration="60">1m</button>
            <button class="htb-settings-option active" data-duration="120">2m</button>
            <button class="htb-settings-option" data-duration="180">3m</button>
            <button class="htb-settings-option" data-duration="300">5m</button>
          </div>
        </div>
      </div>

      <!-- Stop button -->
      <button class="htb-stop-btn" id="htb-stop-btn">stop</button>
    `;

    // Inject into page
    if (document.body) {
      document.body.appendChild(overlay);
    } else {
      document.documentElement.appendChild(overlay);
    }

    // Make it irrevocable - prevent removal
    const observer = new MutationObserver(() => {
      if (!document.getElementById('habit-tracker-block-overlay')) {
        if (document.body) {
          document.body.appendChild(overlay);
        } else {
          document.documentElement.appendChild(overlay);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Prevent scrolling on body
    document.documentElement.style.overflow = 'hidden';
    if (document.body) document.body.style.overflow = 'hidden';

    // Block keyboard shortcuts
    document.addEventListener('keydown', blockKeyboard, true);

    // Initialize UI
    initBreathingUI();
  }

  function initBreathingUI() {
    const circleContainer = document.getElementById('htb-circle-container');
    const settingsBtn = document.getElementById('htb-settings-btn');
    const settingsPanel = document.getElementById('htb-settings-panel');
    const stopBtn = document.getElementById('htb-stop-btn');

    // Tap circle to start
    circleContainer.addEventListener('click', () => {
      if (!isActive) {
        startBreathingExercise();
      }
    });

    // Settings toggle
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsPanel.classList.toggle('show');
    });

    // Close settings when clicking elsewhere
    document.getElementById('habit-tracker-block-overlay').addEventListener('click', (e) => {
      if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
        settingsPanel.classList.remove('show');
      }
    });

    // Duration options
    document.querySelectorAll('#htb-duration-options .htb-settings-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#htb-duration-options .htb-settings-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDuration = parseInt(btn.dataset.duration);
      });
    });

    // Stop button
    stopBtn.addEventListener('click', () => {
      stopBreathingExercise();
      resetToIdle();
    });
  }

  function startBreathingExercise() {
    isActive = true;
    const exercise = boxBreathing;

    const circle = document.getElementById('htb-breathing-circle');
    const countdown = document.getElementById('htb-countdown');
    const headline = document.getElementById('htb-headline');
    const instruction = document.getElementById('htb-instruction');
    const settingsBtn = document.getElementById('htb-settings-btn');
    const settingsPanel = document.getElementById('htb-settings-panel');
    const stopBtn = document.getElementById('htb-stop-btn');

    // Hide settings
    settingsPanel.classList.remove('show');
    settingsBtn.style.opacity = '0';
    settingsBtn.style.visibility = 'hidden';

    // Show stop button
    stopBtn.classList.add('show');

    // Remove idle animation
    circle.classList.remove('idle');

    // Show countdown
    countdown.classList.add('show');

    // Update instruction style
    instruction.classList.remove('subtle');

    let totalRemaining = selectedDuration;
    let stepIndex = 0;
    let stepRemaining = exercise.steps[0].duration;

    function updateStep() {
      const step = exercise.steps[stepIndex];
      headline.textContent = step.action;
      countdown.textContent = stepRemaining;

      // Animate circle
      circle.classList.remove('expand', 'contract', 'hold');
      if (step.action.toLowerCase().includes('inhale')) {
        circle.classList.add('expand');
      } else if (step.action.toLowerCase().includes('exhale')) {
        circle.classList.add('contract');
      } else {
        circle.classList.add('hold');
      }
    }

    // Hide tap instruction during exercise
    instruction.style.opacity = '0';

    updateStep();

    breathingInterval = setInterval(() => {
      totalRemaining--;
      stepRemaining--;

      if (totalRemaining <= 0) {
        completeExercise();
        return;
      }

      if (stepRemaining <= 0) {
        stepIndex = (stepIndex + 1) % exercise.steps.length;
        stepRemaining = exercise.steps[stepIndex].duration;
        updateStep();
      } else {
        countdown.textContent = stepRemaining;
      }
    }, 1000);
  }

  function stopBreathingExercise() {
    if (breathingInterval) {
      clearInterval(breathingInterval);
      breathingInterval = null;
    }
    isActive = false;
  }

  function resetToIdle() {
    const circle = document.getElementById('htb-breathing-circle');
    const countdown = document.getElementById('htb-countdown');
    const headline = document.getElementById('htb-headline');
    const instruction = document.getElementById('htb-instruction');
    const settingsBtn = document.getElementById('htb-settings-btn');
    const stopBtn = document.getElementById('htb-stop-btn');
    const completeText = document.getElementById('htb-complete-text');

    circle.classList.remove('expand', 'contract', 'hold');
    circle.classList.add('idle');
    countdown.classList.remove('show');
    headline.textContent = 'Breathe.';
    instruction.textContent = 'tap to begin';
    instruction.classList.add('subtle');
    instruction.style.opacity = '1';
    settingsBtn.style.opacity = '';
    settingsBtn.style.visibility = '';
    stopBtn.classList.remove('show');
    completeText.classList.remove('show');
  }

  function completeExercise() {
    stopBreathingExercise();

    const circle = document.getElementById('htb-breathing-circle');
    const countdown = document.getElementById('htb-countdown');
    const headline = document.getElementById('htb-headline');
    const instruction = document.getElementById('htb-instruction');
    const completeText = document.getElementById('htb-complete-text');
    const stopBtn = document.getElementById('htb-stop-btn');

    // Reset circle to neutral
    circle.classList.remove('expand', 'contract', 'hold');

    // Hide active UI
    countdown.classList.remove('show');
    headline.style.opacity = '0';
    stopBtn.classList.remove('show');

    // Show completion
    completeText.classList.add('show');

    // After 2 seconds, return to idle
    setTimeout(() => {
      completeText.classList.remove('show');
      headline.style.opacity = '';
      resetToIdle();
    }, 2000);
  }

  function blockKeyboard(e) {
    if (e.key === 'Escape' ||
        (e.ctrlKey && e.key === 'w') ||
        (e.ctrlKey && e.key === 'W') ||
        (e.key === 'F5') ||
        (e.ctrlKey && e.key === 'r')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

})();
