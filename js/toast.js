// Toast notification and custom confirm dialog

const Toast = {
  container: null,

  // Initialize toast container
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  // Show a toast message
  show(message, type = 'info', duration = 4000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('aria-label', 'Dismiss');
    closeBtn.textContent = '\u00D7';

    toast.appendChild(messageSpan);
    toast.appendChild(closeBtn);

    // Close button handler
    closeBtn.addEventListener('click', () => {
      this.dismiss(toast);
    });

    this.container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    return toast;
  },

  // Dismiss a toast
  dismiss(toast) {
    toast.classList.remove('show');
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },

  // Convenience methods
  success(message, duration) {
    return this.show(message, 'success', duration);
  },

  error(message, duration) {
    return this.show(message, 'error', duration);
  },

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
};

// Custom confirm dialog
const Confirm = {
  // Show a confirm dialog
  show(options) {
    return new Promise((resolve) => {
      const {
        title = 'Confirm',
        message,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        destructive = false
      } = options;

      // Create modal using safe DOM methods
      const modal = document.createElement('div');
      modal.className = 'modal confirm-modal show';

      const content = document.createElement('div');
      content.className = 'modal-content confirm-content';

      const h3 = document.createElement('h3');
      h3.textContent = title;

      const p = document.createElement('p');
      p.className = 'confirm-message';
      p.textContent = message;

      const actions = document.createElement('div');
      actions.className = 'modal-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn-cancel';
      cancelBtn.id = 'confirmCancel';
      cancelBtn.textContent = cancelText;

      const okBtn = document.createElement('button');
      okBtn.className = `btn-submit ${destructive ? 'btn-destructive' : ''}`;
      okBtn.id = 'confirmOk';
      okBtn.textContent = confirmText;

      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      content.appendChild(h3);
      content.appendChild(p);
      content.appendChild(actions);
      modal.appendChild(content);

      document.body.appendChild(modal);

      // Initialize accessibility
      A11y.initModal(modal);

      // Handle responses
      const handleConfirm = (result) => {
        A11y.closeModal(modal);
        setTimeout(() => {
          if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
          }
        }, 100);
        resolve(result);
      };

      okBtn.addEventListener('click', () => handleConfirm(true));
      cancelBtn.addEventListener('click', () => handleConfirm(false));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) handleConfirm(false);
      });
    });
  }
};
