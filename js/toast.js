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
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

    // Close button handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
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

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'modal confirm-modal show';
      modal.innerHTML = `
        <div class="modal-content confirm-content">
          <h3>${title}</h3>
          <p class="confirm-message">${message}</p>
          <div class="modal-actions">
            <button class="btn-cancel" id="confirmCancel">${cancelText}</button>
            <button class="btn-submit ${destructive ? 'btn-destructive' : ''}" id="confirmOk">${confirmText}</button>
          </div>
        </div>
      `;

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

      modal.querySelector('#confirmOk').addEventListener('click', () => handleConfirm(true));
      modal.querySelector('#confirmCancel').addEventListener('click', () => handleConfirm(false));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) handleConfirm(false);
      });
    });
  }
};
