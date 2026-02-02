// Confetti celebration animation

const Confetti = {
  canvas: null,
  ctx: null,
  particles: [],
  animationId: null,
  isRunning: false,

  init() {
    this.canvas = document.getElementById('confettiCanvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  createParticle(x, y) {
    const colors = ['#50c878', '#4a9eff', '#ff9500', '#ff4444', '#ffcc00', '#9b59b6'];
    return {
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -15 - 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.3,
      drag: 0.99,
      opacity: 1
    };
  },

  burst(x, y, count = 50) {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(x, y));
    }
  },

  celebrate() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.particles = [];

    // Burst from multiple points across the screen
    const centerX = window.innerWidth / 2;
    const topY = window.innerHeight * 0.3;

    this.burst(centerX, topY, 60);

    // Delayed side bursts
    setTimeout(() => {
      this.burst(centerX - 150, topY + 50, 30);
      this.burst(centerX + 150, topY + 50, 30);
    }, 100);

    this.animate();

    // Stop after 3 seconds
    setTimeout(() => {
      this.stop();
    }, 3000);
  },

  animate() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update physics
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.01;

      // Remove dead particles
      if (p.opacity <= 0 || p.y > this.canvas.height) {
        this.particles.splice(i, 1);
        continue;
      }

      // Draw particle
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation * Math.PI / 180);
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.stop();
    }
  },

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isRunning = false;
    this.particles = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => Confetti.init());
