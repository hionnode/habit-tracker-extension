// Accessibility utilities

const A11y = {
  // Store the element that had focus before modal opened
  previousFocus: null,

  // Focusable elements selector
  FOCUSABLE_SELECTOR: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',

  // Initialize a modal with focus trapping
  initModal(modalElement) {
    // Store previous focus and focus first element
    this.previousFocus = document.activeElement;

    const focusable = modalElement.querySelectorAll(this.FOCUSABLE_SELECTOR);
    if (focusable.length > 0) {
      setTimeout(() => focusable[0].focus(), 50);
    }

    // Add keyboard handler for this modal
    modalElement._keyHandler = (e) => this.handleModalKeydown(e, modalElement);
    modalElement.addEventListener('keydown', modalElement._keyHandler);
  },

  // Close modal and restore focus
  closeModal(modalElement) {
    modalElement.classList.remove('show');

    // Remove keyboard handler
    if (modalElement._keyHandler) {
      modalElement.removeEventListener('keydown', modalElement._keyHandler);
      delete modalElement._keyHandler;
    }

    // Restore focus
    if (this.previousFocus && this.previousFocus.focus) {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  },

  // Handle keyboard events within modal
  handleModalKeydown(e, modalElement) {
    // Escape to close
    if (e.key === 'Escape') {
      e.preventDefault();
      this.closeModal(modalElement);
      return;
    }

    // Tab trapping
    if (e.key === 'Tab') {
      const focusable = Array.from(modalElement.querySelectorAll(this.FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, go to last
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  },

  // Add keyboard support to an interactive element
  makeKeyboardAccessible(element, onClick) {
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'button');

    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    });
  },

  // Announce message to screen readers
  announce(message, priority = 'polite') {
    const announcer = document.getElementById('sr-announcer') || this.createAnnouncer();
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  },

  // Create screen reader announcer element
  createAnnouncer() {
    const announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
    return announcer;
  }
};
