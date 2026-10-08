/* =============================================
   VOID — Cyberpunk Canvas Engine v3
   + Interactive hero spacecraft (mouse-controlled)
   + Ambient background ships
   + Black particles (scroll-reactive)
   + Hex grid (cursor-interactive)
   ============================================= */

(() => {
  'use strict';

  // Respect prefers-reduced-motion — minimal canvas + typewriter changes only
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ==========================================
  // STATE
  // ==========================================
  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let scrollSpeed = 0;
  let lastScrollY = window.pageYOffset;
  let scrollProgress = 0;
  let time = 0;
  let lastTime = performance.now();
  let fps = 60;

  // ==========================================
  // CANVAS SETUP
  // ==========================================
  const canvas = document.getElementById('cyber-canvas');
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ==========================================
  // MOUSE TRACKING
  // ==========================================
  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // ==========================================
  // SCROLL VELOCITY
  // ==========================================
  const speedBar = document.getElementById('speed-bar');
  const scrollProgressBar = document.getElementById('scroll-progress');

  window.addEventListener('scroll', () => {
    const currentY = window.pageYOffset;
    const rawSpeed = Math.abs(currentY - lastScrollY);
    lastScrollY = currentY;
    scrollSpeed = scrollSpeed * 0.5 + rawSpeed * 0.5;  // More responsive
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = docHeight > 0 ? currentY / docHeight : 0;
    if (scrollProgressBar) scrollProgressBar.style.width = (scrollProgress * 100) + '%';
  }, { passive: true });

  // ==========================================
  // HERO INTERACTIVE SPACECRAFT
  // Inspired by the reference: clustered disc
  // engines with glowing concentric rings
  // Mouse-controlled: tilts & follows cursor
  // ==========================================
  class HeroShip {
    constructor() {
      // Position: right side of hero, centered vertically
      this.baseX = canvas.width * 0.72;
      this.baseY = canvas.height * 0.50;
      this.x = this.baseX;
      this.y = this.baseY;

      // Smooth follow targets
      this.tx = this.baseX;
      this.ty = this.baseY;

      this.hover = 0;          // hover bob phase
      this.tiltX = 0;         // tilt toward mouse X
      this.tiltY = 0;         // tilt toward mouse Y
      this.thrust = 0;        // engine glow intensity
      this.size = Math.min(canvas.width, canvas.height) * 0.18;
      this.enginePhase = 0;   // engine ring rotation
      this.clicked = false;
      this.clickPulse = 0;

      // Engine pod layout (reference-inspired: clustered pods)
      this.pods = [
        { ox: 0, oy: -0.38, r: 0.38, phase: 0 },  // top-center
        { ox: -0.36, oy: 0.18, r: 0.32, phase: 1.2 },  // bottom-left
        { ox: 0.36, oy: 0.18, r: 0.32, phase: 2.4 },  // bottom-right
        { ox: -0.14, oy: 0.44, r: 0.22, phase: 0.7 },  // bottom-center-left
        { ox: 0.14, oy: 0.44, r: 0.22, phase: 1.8 },  // bottom-center-right
      ];
    }

    update() {
      this.hover += 0.025;
      this.enginePhase += 0.03;

      // Recalculate base on resize
      this.baseX = canvas.width * 0.72;
      this.baseY = canvas.height * 0.50;

      // Mouse influence: ship drifts toward cursor (limited range)
      const mx = (mouse.x - canvas.width / 2) / canvas.width;
      const my = (mouse.y - canvas.height / 2) / canvas.height;

      // Target position: hover around base + subtle mouse pull
      this.tx = this.baseX + mx * 60 + Math.sin(this.hover * 0.7) * 8;
      this.ty = this.baseY + my * 40 + Math.sin(this.hover) * 12;

      // Smooth lerp
      this.x += (this.tx - this.x) * 0.06;
      this.y += (this.ty - this.y) * 0.06;

      // Tilt based on velocity toward cursor
      this.tiltX += (mx * 0.25 - this.tiltX) * 0.08;
      this.tiltY += (my * 0.15 - this.tiltY) * 0.08;

      // Thrust from scroll speed
      this.thrust = Math.min(1, scrollSpeed / 30);

      // Click pulse decay
      if (this.clickPulse > 0) this.clickPulse -= 0.03;
    }

    drawPod(px, py, radius, podPhase, glowIntensity) {
      const s = this.size;

      // Pod body
      const bodyGrad = ctx.createRadialGradient(px - radius * 0.25, py - radius * 0.25, 0, px, py, radius);
      bodyGrad.addColorStop(0, 'rgba(40, 40, 50, 0.95)');
      bodyGrad.addColorStop(0.5, 'rgba(20, 20, 28, 0.98)');
      bodyGrad.addColorStop(1, 'rgba(8, 8, 12, 1)');

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring glow
      ctx.strokeStyle = `rgba(0, 200, 255, ${0.15 + glowIntensity * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Concentric glowing rings (reference style)
      const rings = 4;
      for (let r = 0; r < rings; r++) {
        const rFrac = (r + 1) / (rings + 1);
        const rRadius = radius * rFrac * 0.9;
        const rotAngle = this.enginePhase * (r % 2 === 0 ? 1 : -1) * (0.5 + r * 0.2) + podPhase;
        const alpha = 0.4 + glowIntensity * 0.4 + Math.sin(this.hover + podPhase + r) * 0.1;
        const blueShift = r / rings;

        // Ring fill
        const ringCol = `rgba(${Math.round(0 + blueShift * 100)}, ${Math.round(180 + r * 20)}, 255, ${alpha * 0.7})`;
        ctx.strokeStyle = ringCol;
        ctx.lineWidth = 1.5 - r * 0.2;

        // Segmented rotating ring
        const segments = 12;
        for (let seg = 0; seg < segments; seg++) {
          if (seg % 3 === 0) continue; // gaps in ring
          const startA = rotAngle + (seg / segments) * Math.PI * 2;
          const endA = startA + (Math.PI * 2 / segments) * 0.7;
          ctx.beginPath();
          ctx.arc(px, py, rRadius, startA, endA);
          ctx.stroke();
        }

        // Inner dot at center of each segment gap
        if (r === 0) {
          ctx.fillStyle = `rgba(180, 240, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, rRadius * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Engine core glow
      const coreGrad = ctx.createRadialGradient(px, py, 0, px, py, radius * 0.4);
      coreGrad.addColorStop(0, `rgba(150, 230, 255, ${0.6 + glowIntensity * 0.3 + this.clickPulse * 0.3})`);
      coreGrad.addColorStop(0.4, `rgba(0, 180, 255, ${0.2 + glowIntensity * 0.2})`);
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(px, py, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Outer atmosphere halo
      const haloGrad = ctx.createRadialGradient(px, py, radius * 0.7, px, py, radius * 1.4);
      haloGrad.addColorStop(0, `rgba(0, 160, 255, ${0.04 + glowIntensity * 0.06})`);
      haloGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(px, py, radius * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    draw() {
      const s = this.size;

      ctx.save();
      ctx.translate(this.x, this.y);

      // Apply tilt (skew transform)
      ctx.transform(1, this.tiltY * 0.3, this.tiltX * 0.3, 1, 0, 0);

      const glowInt = this.thrust + 0.3 + this.clickPulse * 0.5;

      // Hull body underneath all pods
      const hullGrad = ctx.createRadialGradient(0, s * 0.05, 0, 0, 0, s * 0.55);
      hullGrad.addColorStop(0, 'rgba(30, 32, 40, 0.9)');
      hullGrad.addColorStop(0.6, 'rgba(15, 16, 22, 0.95)');
      hullGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = hullGrad;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Draw cables/wires between pods (reference detail)
      ctx.strokeStyle = 'rgba(20, 20, 30, 0.7)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < this.pods.length; i++) {
        for (let j = i + 1; j < this.pods.length; j++) {
          const pi = this.pods[i];
          const pj = this.pods[j];
          const d = Math.sqrt((pi.ox - pj.ox) ** 2 + (pi.oy - pj.oy) ** 2);
          if (d < 0.7) {
            ctx.beginPath();
            ctx.moveTo(pi.ox * s, pi.oy * s);
            // Slight curve
            const cx = ((pi.ox + pj.ox) / 2 + (Math.random() - 0.5) * 0.05) * s;
            const cy = ((pi.oy + pj.oy) / 2 + 0.05) * s;
            ctx.quadraticCurveTo(cx, cy, pj.ox * s, pj.oy * s);
            ctx.stroke();
          }
        }
      }

      // Draw each engine pod
      this.pods.forEach(pod => {
        this.drawPod(pod.ox * s, pod.oy * s, pod.r * s, pod.phase, glowInt);
      });

      // Click pulse shockwave
      if (this.clickPulse > 0) {
        const pulseR = s * (1 - this.clickPulse) * 1.2;
        ctx.strokeStyle = `rgba(0, 200, 255, ${this.clickPulse * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Thrust exhaust (when scrolling)
      if (this.thrust > 0.05) {
        const exhaustCount = 3;
        for (let i = 0; i < exhaustCount; i++) {
          const ex = (i - 1) * s * 0.28;
          const ey = s * 0.52;
          const exhaustLen = this.thrust * s * 0.8;

          const exGrad = ctx.createLinearGradient(ex, ey, ex, ey + exhaustLen);
          exGrad.addColorStop(0, `rgba(0, 180, 255, ${this.thrust * 0.5})`);
          exGrad.addColorStop(0.4, `rgba(0, 100, 255, ${this.thrust * 0.2})`);
          exGrad.addColorStop(1, 'transparent');

          ctx.strokeStyle = exGrad;
          ctx.lineWidth = 3 + this.thrust * 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex + (Math.random() - 0.5) * 6, ey + exhaustLen);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }

      ctx.restore();

      // "INTERACTIVE" label near ship
      const labelAlpha = 0.45 + Math.sin(time * 2) * 0.15;
      ctx.fillStyle = `rgba(0, 160, 60, ${labelAlpha})`;
      ctx.font = `500 10px 'Share Tech Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('[ CLICK TO ENGAGE ]', this.x, this.y + s * 0.85);
      ctx.textAlign = 'left';
    }

    click() {
      this.clickPulse = 1;
    }
  }

  const heroShip = new HeroShip();

  // Ship click handler
  canvas.addEventListener('click', (e) => {
    const dx = e.clientX - heroShip.x;
    const dy = e.clientY - heroShip.y;
    if (Math.sqrt(dx * dx + dy * dy) < heroShip.size * 0.7) {
      heroShip.click();
    }
  });

  // ==========================================
  // AMBIENT BACKGROUND SHIPS
  // Smaller patrol ships floating across scene
  // ==========================================
  class AmbientShip {
    constructor(index) {
      this.reset(true, index);
    }

    reset(initial = false, index = 0) {
      // Start from left or right edge
      this.fromLeft = Math.random() > 0.5;
      this.x = this.fromLeft ? -150 : canvas.width + 150;
      this.y = Math.random() * canvas.height * 0.85 + canvas.height * 0.05;

      if (initial) {
        this.x = Math.random() * canvas.width;
      }

      this.speed = Math.random() * 0.3 + 0.1;
      this.dir = this.fromLeft ? 1 : -1;
      this.size = Math.random() * 28 + 14;
      this.altitude = this.y;
      this.bobPhase = Math.random() * Math.PI * 2;
      this.bobAmp = Math.random() * 4 + 2;
      this.enginePhase = Math.random() * Math.PI * 2;
      this.opacity = Math.random() * 0.4 + 0.15;
      this.type = Math.floor(Math.random() * 3); // 0: fighter, 1: cruiser, 2: drone
    }

    update() {
      const speedMult = 1 + scrollSpeed * 0.15;  // More dramatic response
      this.x += this.speed * this.dir * speedMult;
      this.y = this.altitude + Math.sin(time * 0.8 + this.bobPhase) * this.bobAmp;
      this.enginePhase += 0.04;

      // Off screen — reset
      if ((this.dir > 0 && this.x > canvas.width + 200) ||
        (this.dir < 0 && this.x < -200)) {
        this.reset();
      }
    }

    drawFighter(cx, cy, s, alpha) {
      // Sleek forward-swept fighter
      ctx.save();
      ctx.translate(cx, cy);
      if (this.dir < 0) ctx.scale(-1, 1);

      // Main body
      ctx.fillStyle = `rgba(20, 22, 30, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(s * 1.4, 0);
      ctx.lineTo(-s * 0.6, -s * 0.25);
      ctx.lineTo(-s * 1.0, 0);
      ctx.lineTo(-s * 0.6, s * 0.25);
      ctx.closePath();
      ctx.fill();

      // Wing sweep
      ctx.fillStyle = `rgba(15, 16, 22, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.moveTo(s * 0.2, -s * 0.25);
      ctx.lineTo(-s * 0.8, -s * 0.9);
      ctx.lineTo(-s * 1.0, -s * 0.1);
      ctx.lineTo(-s * 0.3, 0);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.25);
      ctx.lineTo(-s * 0.8, s * 0.9);
      ctx.lineTo(-s * 1.0, s * 0.1);
      ctx.lineTo(-s * 0.3, 0);
      ctx.closePath();
      ctx.fill();

      // Engine glow
      const eng = ctx.createRadialGradient(-s, 0, 0, -s, 0, s * 0.35);
      eng.addColorStop(0, `rgba(0, 200, 255, ${alpha * 0.9})`);
      eng.addColorStop(0.5, `rgba(0, 100, 200, ${alpha * 0.4})`);
      eng.addColorStop(1, 'transparent');
      ctx.fillStyle = eng;
      ctx.beginPath();
      ctx.arc(-s, 0, s * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Cockpit
      ctx.fillStyle = `rgba(100, 220, 255, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(s * 0.5, 0, s * 0.18, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawCruiser(cx, cy, s, alpha) {
      // Bulky pod-based cruiser (reference-inspired)
      ctx.save();
      ctx.translate(cx, cy);
      if (this.dir < 0) ctx.scale(-1, 1);

      // Main hull
      ctx.fillStyle = `rgba(18, 20, 28, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.2, s * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Top structure
      ctx.fillStyle = `rgba(25, 27, 36, ${alpha * 0.9})`;
      ctx.beginPath();
      ctx.rect(-s * 0.6, -s * 0.55, s * 0.9, s * 0.25);
      ctx.fill();

      // Engine pods (3, like reference)
      [-s * 0.3, 0, s * 0.3].forEach((oy, i) => {
        const ering = ctx.createRadialGradient(-s * 1.1, oy, 0, -s * 1.1, oy, s * 0.22);
        ering.addColorStop(0, `rgba(0, 210, 255, ${alpha})`);
        ering.addColorStop(0.6, `rgba(0, 130, 220, ${alpha * 0.5})`);
        ering.addColorStop(1, 'transparent');
        ctx.fillStyle = ering;
        ctx.beginPath();
        ctx.arc(-s * 1.1, oy, s * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.strokeStyle = `rgba(0, 200, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-s * 1.1, oy, s * 0.18, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Detail lines on hull
      ctx.strokeStyle = `rgba(0, 180, 255, ${alpha * 0.2})`;
      ctx.lineWidth = 0.8;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s * 0.15, -s * 0.3);
        ctx.lineTo(i * s * 0.15, s * 0.3);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawDrone(cx, cy, s, alpha) {
      // Small round drone with concentric rings
      ctx.save();
      ctx.translate(cx, cy);

      // Body
      ctx.fillStyle = `rgba(15, 17, 25, ${alpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();

      // Rotating rings
      for (let r = 1; r <= 3; r++) {
        const rAngle = this.enginePhase * (r % 2 === 0 ? 1.2 : -0.8) + r;
        const rAlpha = alpha * (0.4 + r * 0.1);
        ctx.strokeStyle = `rgba(0, 200, 255, ${rAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, s * (r / 3.5), rAngle, rAngle + Math.PI * 1.4);
        ctx.stroke();
      }

      // Center glow
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.45);
      cg.addColorStop(0, `rgba(150, 235, 255, ${alpha * 0.9})`);
      cg.addColorStop(1, 'transparent');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    draw() {
      const alpha = this.opacity;
      if (this.type === 0) this.drawFighter(this.x, this.y, this.size, alpha);
      else if (this.type === 1) this.drawCruiser(this.x, this.y, this.size, alpha);
      else this.drawDrone(this.x, this.y, this.size, alpha);
    }
  }

  const SHIP_COUNT = 2;
  const ambientShips = [];
  for (let i = 0; i < SHIP_COUNT; i++) {
    ambientShips.push(new AmbientShip(i));
  }

  // Stagger initial positions
  ambientShips.forEach((ship, i) => {
    ship.x = (canvas.width / SHIP_COUNT) * i + Math.random() * 200;
  });

  // ==========================================
  // BLACK FLOATING PARTICLES & PHYSICS
  // ==========================================
  const shockwaves = [];

  canvas.addEventListener('click', (e) => {
    // Inject a kinetic click-ripple into the canvas environment
    shockwaves.push({ x: e.clientX, y: e.clientY, radius: 0, force: 14, maxRadius: Math.max(canvas.width, canvas.height) });
  });
  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      if (initial) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      } else {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { this.x = -10; this.y = Math.random() * canvas.height; }
        else if (edge === 1) { this.x = canvas.width + 10; this.y = Math.random() * canvas.height; }
        else if (edge === 2) { this.x = Math.random() * canvas.width; this.y = -10; }
        else { this.x = Math.random() * canvas.width; this.y = canvas.height + 10; }
      }

      const angle = Math.random() * Math.PI * 2;
      this.baseVx = Math.cos(angle) * (Math.random() * 0.35 + 0.05);
      this.baseVy = Math.sin(angle) * (Math.random() * 0.35 + 0.05);
      this.size = Math.random() * 3 + 1;
      this.opacity = Math.random() * 0.55 + 0.2;
      this.shape = Math.random() > 0.72 ? 'square' : 'circle';
      this.rotation = Math.random() * Math.PI;
      this.rotSpeed = (Math.random() - 0.5) * 0.018;
    }

    update() {
      const speedMult = 1 + scrollSpeed * 1.5;  // Extremely aggressive scroll acceleration
      let vx = this.baseVx * speedMult;
      let vy = this.baseVy * speedMult;

      // Mouse Fluid Waves (Swirl + Gentle Repel)
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 40000 && distSq > 0) { // 200px radius
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / 200);

        // Push outward lightly
        vx += (dx / dist) * force * 1.2;
        vy += (dy / dist) * force * 1.2;

        // Swirl angular velocity
        vx += (-dy / dist) * force * 3.5;
        vy += (dx / dist) * force * 3.5;
      }

      // Shockwave physical impact
      shockwaves.forEach(sw => {
        const sdx = this.x - sw.x;
        const sdy = this.y - sw.y;
        const sdistSq = sdx * sdx + sdy * sdy;
        if (sdistSq > 0) {
          const sdist = Math.sqrt(sdistSq);
          // Push particles intensely if they are inside the shockwave band
          if (Math.abs(sdist - sw.radius) < 40) {
            vx += (sdx / sdist) * sw.force;
            vy += (sdy / sdist) * sw.force;
          }
        }
      });

      // Ship repulsion (hero ship)
      const sdx = this.x - heroShip.x;
      const sdy = this.y - heroShip.y;
      const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
      if (sdist < heroShip.size * 0.6 && sdist > 0) {
        const sforce = (1 - sdist / (heroShip.size * 0.6)) * 2.5;
        vx += (sdx / sdist) * sforce;
        vy += (sdy / sdist) * sforce;
      }

      if (scrollSpeed > 1) {
        vx += Math.sin(time * 3 + this.x * 0.01) * scrollSpeed * 0.12;
        vy += Math.cos(time * 2 + this.y * 0.01) * scrollSpeed * 0.12;
      }

      this.x += vx;
      this.y += vy;
      this.rotation += this.rotSpeed * speedMult;

      const m = 20;
      if (this.x < -m) this.x = canvas.width + m;
      if (this.x > canvas.width + m) this.x = -m;
      if (this.y < -m) this.y = canvas.height + m;
      if (this.y > canvas.height + m) this.y = -m;
    }

    draw() {
      const alpha = this.opacity + Math.min(0.25, scrollSpeed * 0.012);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

      if (this.shape === 'square') {
        const h = this.size * 0.7;
        ctx.fillRect(-h, -h, h * 2, h * 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  const particles = [];
  const PARTICLE_COUNT = reducedMotion ? 60 : 120;
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

  // ==========================================
  // PARTICLE CONNECTIONS
  // ==========================================
  let frameCounter = 0;
  function drawParticleConnections() {
    frameCounter++;
    // Only draw connections every 2 frames to boost performance
    if (frameCounter % 2 !== 0) return;

    const maxDist = 75 + scrollSpeed * 2.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distSq = dx * dx + dy * dy;
        const maxDistSq = maxDist * maxDist;
        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          ctx.strokeStyle = `rgba(0,0,0,${(1 - dist / maxDist) * 0.12})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  // ==========================================
  // CYBERPUNK HEX GRID
  // ==========================================
  const HEX_SIZE = 40;

  function drawHexGrid() {
    const colW = HEX_SIZE * Math.sqrt(3);
    const rowH = HEX_SIZE * 1.5;
    const cols = Math.ceil(canvas.width / colW) + 3;
    const rows = Math.ceil(canvas.height / rowH) + 3;

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const offset = (row % 2) * (colW / 2);
        const cx = col * colW + offset;
        const cy = row * rowH;

        const dx = cx - mouse.x;
        const dy = cy - mouse.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > 380 * 380) continue;

        const dist = Math.sqrt(distSq);
        const intensity = Math.max(0, 1 - dist / 320);
        if (intensity < 0.01) continue;

        ctx.strokeStyle = `rgba(0, 180, 70, ${intensity * 0.18})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 3) * i - Math.PI / 6;
          const hx = cx + HEX_SIZE * 0.48 * Math.cos(ang);
          const hy = cy + HEX_SIZE * 0.48 * Math.sin(ang);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();

        if (intensity > 0.45) {
          ctx.fillStyle = `rgba(0, 210, 80, ${(intensity - 0.45) * 0.25})`;
          ctx.beginPath();
          ctx.arc(cx, cy, intensity * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // ==========================================
  // FLOATING GEOMETRIC SHAPES
  // ==========================================
  class GeoShape {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 55 + 25;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.003;
      this.sides = Math.floor(Math.random() * 4) + 3;
      this.drift = { x: (Math.random() - 0.5) * 0.08, y: (Math.random() - 0.5) * 0.06 };
    }

    update() {
      this.rotation += this.rotSpeed * (1 + scrollSpeed * 0.08);
      this.x += this.drift.x * (1 + scrollSpeed * 0.15);
      this.y += this.drift.y * (1 + scrollSpeed * 0.15);
      if (this.x < -120) this.x = canvas.width + 120;
      if (this.x > canvas.width + 120) this.x = -120;
      if (this.y < -120) this.y = canvas.height + 120;
      if (this.y > canvas.height + 120) this.y = -120;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < this.sides; i++) {
        const a = (i / this.sides) * Math.PI * 2;
        const px = Math.cos(a) * this.size;
        const py = Math.sin(a) * this.size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  const geoShapes = [];
  for (let i = 0; i < 2; i++) geoShapes.push(new GeoShape());

  // ==========================================
  // CURSOR EFFECT
  // ==========================================
  function drawCursorEffect() {
    // Outer ring
    ctx.strokeStyle = `rgba(0, 180, 60, ${0.25 + Math.sin(time * 2) * 0.08})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 28 + Math.sin(time * 2) * 2, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating arc segments
    for (let i = 0; i < 4; i++) {
      const ang = time * 1.5 + i * Math.PI / 2;
      ctx.strokeStyle = 'rgba(0, 200, 70, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 42, ang, ang + 0.38);
      ctx.stroke();
    }

    // Crosshair
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mouse.x - 7, mouse.y); ctx.lineTo(mouse.x + 7, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 7); ctx.lineTo(mouse.x, mouse.y + 7);
    ctx.stroke();
  }

  // ==========================================
  // HUD CORNER BRACKETS
  // ==========================================
  function drawHUD() {
    ctx.strokeStyle = 'rgba(0, 160, 60, 0.35)';
    ctx.lineWidth = 1.5;
    const brackets = [
      { x: 22, y: 72, dx: 1, dy: 1 },
      { x: canvas.width - 22, y: 72, dx: -1, dy: 1 },
      { x: 22, y: canvas.height - 22, dx: 1, dy: -1 },
      { x: canvas.width - 22, y: canvas.height - 22, dx: -1, dy: -1 },
    ];
    brackets.forEach(c => {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + c.dy * 18);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x + c.dx * 18, c.y);
      ctx.stroke();
    });
  }

  // ==========================================
  // MAIN RENDER LOOP
  // ==========================================
  const particleCountEl = document.getElementById('particle-count');
  const fpsCounterEl = document.getElementById('fps-counter');
  let frameCount = 0, fpsTimer = 0;

  function render(now) {
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;
    time += dt * 0.001;

    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 600) {
      fps = Math.round(frameCount * 1000 / fpsTimer);
      frameCount = 0; fpsTimer = 0;
      if (fpsCounterEl) fpsCounterEl.textContent = `FPS: ${fps}`;
    }

    // Scroll speed decay
    if (window.moodState === 'fm_on') {
      if (scrollSpeed < 50) scrollSpeed += 3;
    } else {
      scrollSpeed *= 0.88;  // Slower decay - particles stay active longer
    }
    if (scrollSpeed < 0.01) scrollSpeed = 0;

    // Update speed bar
    const ns = Math.min(1, scrollSpeed / 25);  // More sensitive speed bar
    if (speedBar) speedBar.style.width = (ns * 100) + '%';

    // Clear with white background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Draw order (back to front) ---
    drawHUD();
    geoShapes.forEach(s => { s.update(); s.draw(); });
    drawHexGrid();

    // Ambient ships (behind hero ship)
    ambientShips.forEach(s => { s.update(); s.draw(); });

    // Particles
    particles.forEach(p => { p.update(); p.draw(); });
    drawParticleConnections();

    // Update and Draw Shockwaves
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.radius += 10 + scrollSpeed * 0.8;
      sw.force *= 0.93; // decay over time

      // Draw visible energy shockwave distortion ring
      ctx.strokeStyle = `rgba(0, 221, 85, ${Math.min(0.2, sw.force * 0.04)})`;
      ctx.lineWidth = sw.force * 0.8;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();

      if (sw.radius > sw.maxRadius || sw.force < 0.1) {
        shockwaves.splice(i, 1);
      }
    }

    // Hero ship (always in hero viewport section only)
    const heroSection = document.getElementById('hero');
    if (heroSection) {
      const rect = heroSection.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < canvas.height;
      if (inView) {
        heroShip.update();
        heroShip.draw();
      }
    }

    drawCursorEffect();

    if (particleCountEl) particleCountEl.textContent = `PARTICLES: 200`;

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  // ==========================================
  // SCROLL REVEALS & DYNAMIC TYPOGRAPHY
  // ==========================================
  function typeOutElement(el, baseDelay = 0) {
    if (!el.dataset.typeText || el.innerHTML !== '') return;
    const textToType = el.dataset.typeText;

    // Respect reduced-motion: reveal instantly without character-by-character typing
    if (reducedMotion) {
      el.innerHTML = textToType;
      return;
    }

    el.style.borderRight = '2px solid var(--neon-green)';
    el.style.paddingRight = '4px';
    let i = 0;

    setTimeout(() => {
      function typeNext() {
        if (i < textToType.length) {
          el.innerHTML += textToType.charAt(i);
          i++;
          setTimeout(typeNext, 12 + Math.random() * 18); // Fast typing to avoid user annoyance
        } else {
          setTimeout(() => {
            el.style.borderRight = 'none';
            el.style.paddingRight = '0';
          }, 1000);
        }
      }
      typeNext();
    }, baseDelay);
  }

  // Type Hero Sub immediately 
  setTimeout(() => {
    const heroSub = document.querySelector('.hero-sub.type-effect');
    if (heroSub) typeOutElement(heroSub, 300);
  }, 100);

  const revealEls = document.querySelectorAll('[data-reveal]');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const siblings = entry.target.parentElement.querySelectorAll('[data-reveal]');
        let delay = 0;
        siblings.forEach((sib, i) => { if (sib === entry.target) delay = i * 100; });

        setTimeout(() => {
          entry.target.classList.add('revealed');

          // Trigger Typewriter effect on any nested paragraph
          const typeEls = entry.target.querySelectorAll('.type-effect');
          if (entry.target.classList.contains('type-effect')) {
            typeOutElement(entry.target, 300);
          }
          typeEls.forEach((el, idx) => {
            // Stagger typing if there are multiple paragraphs
            typeOutElement(el, 300 + (idx * 600));
          });

        }, delay);

        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => revealObs.observe(el));

  // ==========================================
  // ACTIVE NAV
  // ==========================================
  const sections = document.querySelectorAll('.section');
  const navLinks = document.querySelectorAll('.nav-link');
  const navObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.toggle('active', l.dataset.section === entry.target.id));
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => navObs.observe(s));

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(link.dataset.section)?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ==========================================
  // BUTTONS
  // ==========================================
  document.getElementById('enter-btn')?.addEventListener('click', () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  });

  // ==========================================
  // STAT COUNTERS
  // ==========================================
  document.querySelectorAll('.stat-num').forEach(el => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const target = parseInt(el.dataset.target, 10);
        let current = 0;
        const step = Math.max(1, Math.floor(target / 40));
        const timer = setInterval(() => {
          current += step;
          if (current >= target) { current = target; clearInterval(timer); }
          el.textContent = current;
        }, 28);
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });
    obs.observe(el);
  });

  // ==========================================
  // REAL-TIME SUPABASE CHAT
  // ==========================================
  const chatMessagesEl = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send');
  const chatModeSwitch = document.getElementById('chat-mode-switch');
  const chatTitleEl = document.getElementById('chat-title-el');
  const cyberChatEl = document.getElementById('cyber-chat');

  let currentChatMode = 'global';

  const aiResponses = [
    "Signal received.",
    "The void is processing your input.",
    "Response incomplete. Try again.",
    "Data streams merging...",
    "Anomaly detected in sector 4.",
    "System override initiated.",
    "Unknown variable. Recalibrating...",
    "Connection unstable. Please repeat.",
    "Ghost trace found in the mainframe.",
    "Protocol 77 engaged."
  ];

  if (chatMessagesEl && chatInput && chatSendBtn) {
    // Generate/Load Guest Identity
    let guestUser = localStorage.getItem('void_chat_user');
    if (!guestUser) {
      guestUser = 'Guest_' + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem('void_chat_user', guestUser);
    }

    let lastMsgTime = 0;

    function addSystemMessage(text) {
      const el = document.createElement('div');
      el.className = 'chat-sys-msg';
      el.textContent = `// ${text}`;
      chatMessagesEl.appendChild(el);
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    function typeSystemMessage(text, callback) {
      const el = document.createElement('div');
      el.className = 'chat-sys-msg';
      chatMessagesEl.appendChild(el);
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

      let i = 0;
      function typeNext() {
        if (i < text.length) {
          el.textContent += text.charAt(i);
          i++;
          chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
          setTimeout(typeNext, 20 + Math.random() * 30);
        } else {
          if (callback) callback();
        }
      }
      typeNext();
    }

    function addChatMessage(msg) {
      const el = document.createElement('div');
      el.className = 'chat-msg';

      const time = new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Sanitize input to prevent basic XSS
      const sanTxt = document.createTextNode(msg.content);

      el.innerHTML = `
        <div class="msg-meta">
          <span class="msg-user">${msg.username}</span>
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-text"></div>
      `;
      el.querySelector('.msg-text').appendChild(sanTxt);
      chatMessagesEl.appendChild(el);

      // Only keep last 50 messages locally
      while (chatMessagesEl.children.length > 50) {
        chatMessagesEl.removeChild(chatMessagesEl.firstChild);
      }
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    // -------------------------------------------------------------
    // SETUP: SUPABASE CREDENTIALS
    // -------------------------------------------------------------
    const SUPABASE_URL = 'https://xbhegcaqydeaoastecyr.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_Taa3bbvQw3DaB4sKfBbdAg_ZF3Pz6hK';

    let supabaseObj = null;

    if (window.supabase) {
      if (SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE') {
        supabaseObj = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      }
    }

    function loadGlobalChat() {
      chatMessagesEl.innerHTML = '';
      if (!supabaseObj) {
        addSystemMessage("NOTICE: Live network disconnected.");
        addSystemMessage(`Assigned local ID: ${guestUser}`);
        addSystemMessage("Supabase database credentials are required in script.js to sync with main server.");
      } else {
        addSystemMessage(`Uplink established. Assigned ID: ${guestUser}`);

        // Fetch initial history
        supabaseObj.from('messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
          .then(({ data, error }) => {
            if (!error && data) {
              data.reverse().forEach(addChatMessage);
            }
          });
      }
    }

    // Init global
    loadGlobalChat();

    if (supabaseObj) {
      // Subscribe to inserts
      supabaseObj.channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          if (currentChatMode === 'global') {
            addChatMessage(payload.new);
          }
        })
        .subscribe();
    }

    // Toggle logic
    if (chatModeSwitch) {
      chatModeSwitch.addEventListener('click', () => {
        if (currentChatMode === 'global') {
          currentChatMode = 'ai';
          chatModeSwitch.textContent = 'SWITCH TO GLOBAL';
          chatTitleEl.textContent = 'VOID SIGNAL AI';
          cyberChatEl.classList.add('ai-mode');
          chatMessagesEl.innerHTML = '';
          typeSystemMessage('Uplink established. AI Protocol active. Input query...');
        } else {
          currentChatMode = 'global';
          chatModeSwitch.textContent = 'SWITCH TO AI';
          chatTitleEl.textContent = 'GLOBAL COMMS';
          cyberChatEl.classList.remove('ai-mode');
          loadGlobalChat();
        }
      });
    }

    function sendMessage() {
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = '';

      if (currentChatMode === 'ai') {
        addChatMessage({ username: 'You', content: text, created_at: new Date() });
        chatInput.disabled = true;
        chatSendBtn.style.opacity = '0.5';

        const sysId = Math.random().toString(36).substr(2, 9);
        const el = document.createElement('div');
        el.className = 'chat-sys-msg delay-msg-' + sysId;
        el.textContent = '...';
        chatMessagesEl.appendChild(el);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

        // OPENROUTER API CALL
        // Note: You must replace this placeholder with your actual OpenRouter API key
        const OPENROUTER_API_KEY = "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"

        fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://void-signal.vercel.app",
            "X-Title": "Void Signal Cyberpunk UI"
          },
          body: JSON.stringify({
            "model": "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
            "messages": [
              { "role": "user", "content": "[SYSTEM INSTRUCTION: You are 'VOID SIGNAL', a mysterious, short-spoken cyberpunk AI. Respond in terse, cryptic, machine-like sentences.]\n\nINPUT: " + text }
            ]
          })
        })
          .then(response => response.json())
          .then(data => {
            const delayNode = document.querySelector('.delay-msg-' + sysId);
            if (delayNode) delayNode.remove();

            let aiText = "Connection timeout. Invalid response.";
            if (data && data.choices && data.choices[0] && data.choices[0].message) {
              aiText = data.choices[0].message.content;
            } else if (data && data.error) {
              aiText = `ERROR: ${data.error.message}`;
            }

            typeSystemMessage(aiText, () => {
              chatInput.disabled = false;
              chatSendBtn.style.opacity = '1';
              chatInput.focus();
            });
          })
          .catch(err => {
            const delayNode = document.querySelector('.delay-msg-' + sysId);
            if (delayNode) delayNode.remove();
            typeSystemMessage("ERROR: Uplink severed. Check API key or network.", () => {
              chatInput.disabled = false;
              chatSendBtn.style.opacity = '1';
              chatInput.focus();
            });
          });

        return;
      }

      // Rate Throttle (5 seconds)
      const now = Date.now();
      if (now - lastMsgTime < 5000) {
        addSystemMessage("RATE LIMIT: Transmission throttled. Wait 5s.");
        return;
      }

      lastMsgTime = now;

      if (supabaseObj) {
        supabaseObj.from('messages').insert([
          { username: guestUser, content: text }
        ]).then(({ error }) => {
          if (error) addSystemMessage(`TX ERROR: ${error.message}`);
        });
      } else {
        // Fallback local echo if not connected
        addChatMessage({ username: guestUser, content: text, created_at: new Date() });
      }
    }

    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // ==========================================
  // PERF
  // ==========================================
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lastTime = performance.now();
  });

})();

// ==========================================
// VOID_BEATS (MOD_05) & GLOBAL PERSISTENT AUDIO ENGINE
// Controls root persistent audio (#void-core-audio)
// Bi-directionally synchronized with AMBIENT.SYNC widget,
// MOD_05 card, and DECIBEL MATRIX v1.0 modal overlay.
// ==========================================
(function initVoidBeatsEngine() {
  'use strict';

  // Declare ONE Global Audio Singleton & ONE Unified Queue
  window.VOID_GLOBAL_AUDIO = window.VOID_GLOBAL_AUDIO || new Audio();
  const player = window.VOID_GLOBAL_AUDIO;

  window.playQueue = window.playQueue || [];
  window.currentTrackIndex = window.currentTrackIndex || 0;
  // FIX 1: currentQueueIndex is now a proper independent variable (was a
  // getter/setter alias for currentTrackIndex, causing both to always mirror
  // each other — legacy playlist navigation clobbered the radio queue cursor).
  if (window.currentQueueIndex === undefined) {
    window.currentQueueIndex = 0;
  }

  // Ensure audio is completely unmuted and full volume
  player.muted = false;
  player.volume = 1.0;

  // Kill any duplicate/legacy audio players
  if (window.bgMusic && window.bgMusic !== player) {
    try { window.bgMusic.pause(); window.bgMusic.src = ''; } catch(e){}
  }
  if (window.voidDeckAudio && window.voidDeckAudio !== player) {
    try { window.voidDeckAudio.pause(); window.voidDeckAudio.src = ''; } catch(e){}
  }
  window.voidDeckAudio = player;
  window.voidAudioPlayer = player;

  const legacyCoreAudio = document.getElementById('void-core-audio');
  if (legacyCoreAudio && legacyCoreAudio !== player) {
    try { legacyCoreAudio.pause(); legacyCoreAudio.src = ''; } catch(e){}
  }
  const legacyBgMusic = document.getElementById('bg-music');
  if (legacyBgMusic && legacyBgMusic !== player) {
    try { legacyBgMusic.pause(); legacyBgMusic.src = ''; } catch(e){}
  }

  const coreAudio = player;
  if (!player.src) player.src = 'music.mp3';
  player.preload = 'auto';

  // Floating AMBIENT.SYNC widget elements
  const ambientBtn = document.getElementById('music-toggle');
  const ambientIconPlay = document.getElementById('music-icon-play');
  const ambientIconPause = document.getElementById('music-icon-pause');
  const ambientTrackPanel = document.getElementById('music-track-panel');
  const ambientPlayerWrap = document.getElementById('music-player');
  const ambientTrackName = document.getElementById('mtp-track-name');
  const ambientTrackSub = document.getElementById('mtp-track-sub');

  // MOD_05 Card elements
  const cardPlayBtn = document.getElementById('void-card-play-btn');
  const cardTrackTitle = document.getElementById('void-card-track-title');
  const cardArtistTag = document.getElementById('void-card-artist-tag');
  const cardEqBars = document.querySelectorAll('#void-card-eq .void-eq-bar');
  const launchModalBtn = document.getElementById('void-launch-modal-btn');
  const cardVideo = document.getElementById('void-beats-card-video');
  const cardOscCanvas = document.getElementById('void-card-oscilloscope');

  // DECIBEL MATRIX Modal elements
  const modal = document.getElementById('void-music-modal');
  const modalWindow = document.getElementById('void-modal-window');
  const modalCloseBtn = document.getElementById('void-modal-close-btn');
  const modalPlayBtn = document.getElementById('play-pause-btn') || document.getElementById('void-modal-play-btn') || document.querySelector('.modal-play-btn');
  const modalPrevBtn = document.getElementById('void-prev-track-btn');
  const modalNextBtn = document.getElementById('void-next-track-btn');
  const modalTrackTitle = document.getElementById('current-track-title') || document.getElementById('void-modal-track-title');
  const modalArtistTag = document.getElementById('current-track-artist') || document.getElementById('void-modal-artist-tag');
  const modalAlbumImg = document.getElementById('album-cover-img') || document.getElementById('void-modal-album-img');
  const scrubberTrack = document.getElementById('progress-track-container') || document.getElementById('void-scrubber-track');
  const scrubberFill = document.getElementById('audio-progress-bar') || document.getElementById('void-scrubber-fill');
  const scrubberThumb = document.getElementById('void-scrubber-thumb') || document.getElementById('scrubber-thumb');
  const timeCurrent = document.getElementById('current-time-display') || document.getElementById('void-time-current');
  const timeDuration = document.getElementById('total-duration-display') || document.getElementById('void-time-duration');
  const volumeSlider = document.getElementById('void-volume-slider');
  const volumeLabel = document.getElementById('void-volume-label');
  const loopToggleBtn = document.getElementById('void-loop-toggle');
  const searchTerminal = document.getElementById('void-search-terminal');
  const filterTabs = document.querySelectorAll('.void-filter-tab');
  const trackListContainer = document.getElementById('playlist-container') || document.getElementById('void-track-list');
  const visualizerCanvas = document.getElementById('void-deck-visualizer-canvas');
  const trackCountEl = document.getElementById('void-track-count');

  // Track Database
  const TRACKS = [
    {
      id: '01',
      title: 'CYBER_DRIFT_808',
      artist: 'NEO_TOKYO_ARCHIVE',
      channel: 'lofi',
      channelLabel: 'LO-FI CYBERPUNK',
      duration: '03:45',
      durationSec: 225,
      bitrate: '320kbps FLAC',
      cover: 'assets/images/album-art.png',
      src: 'music.mp3'
    },
    {
      id: '02',
      title: 'Resonance',
      artist: 'HOME',
      channel: 'synthwave',
      channelLabel: 'SYNTHWAVE',
      duration: '03:32',
      durationSec: 212,
      bitrate: '320kbps / 48kHz',
      query: 'Resonance HOME',
      cover: ''
    },
    {
      id: '03',
      title: 'After Dark',
      artist: 'Mr.Kitty',
      channel: 'synthwave',
      channelLabel: 'SYNTHWAVE',
      duration: '04:19',
      durationSec: 259,
      bitrate: '320kbps / 44.1kHz',
      query: 'After Dark Mr Kitty',
      cover: ''
    },
    {
      id: '04',
      title: 'Memory Reboot',
      artist: 'VØJ & Narvent',
      channel: 'synthwave',
      channelLabel: 'SYNTHWAVE',
      duration: '01:43',
      durationSec: 103,
      bitrate: '48kHz FLAC',
      query: 'Memory Reboot VOJ Narvent',
      cover: ''
    },
    {
      id: '05',
      title: 'Nightcall',
      artist: 'Kavinsky',
      channel: 'synthwave',
      channelLabel: 'SYNTHWAVE',
      duration: '04:19',
      durationSec: 259,
      bitrate: '320kbps / 48kHz',
      query: 'Nightcall Kavinsky',
      cover: ''
    },
    {
      id: '06',
      title: 'Metamorphosis',
      artist: 'INTERWORLD',
      channel: 'synthwave',
      channelLabel: 'SYNTHWAVE',
      duration: '02:22',
      durationSec: 142,
      bitrate: '320kbps MP3',
      query: 'Metamorphosis INTERWORLD',
      cover: ''
    }
  ];

  let currentTrackIndex = 0;
  let isLooping = false;
  window.isRepeatOneActive = false;
  let activeFilter = 'all';
  let searchQuery = '';
  let hasUserInteracted = false;

  // Format MM:SS helper
  function formatTime(sec) {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  function formatSeconds(sec) {
    return formatTime(sec);
  }

  // 2. Universal State Sync Function (Syncs BOTH Card & Modal simultaneously)
  function syncPlaybackUI(isPlaying) {
    // 1. Target BOTH buttons (in Modal and on Main Page Card)
    const modalPlayBtn = document.getElementById('play-pause-btn') || document.querySelector('.modal-play-btn');
    const cardPlayBtn = document.querySelector('#music-deck-card button') || document.querySelector('.card-play-btn') || document.getElementById('void-card-play-btn');

    const pauseSvg = `
      <svg class="w-6 h-6 fill-current text-black" viewBox="0 0 24 24">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>`;

    const playSvg = `
      <svg class="w-6 h-6 fill-current text-black translate-x-0.5" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>`;

    if (modalPlayBtn) modalPlayBtn.innerHTML = isPlaying ? pauseSvg : playSvg;
    if (cardPlayBtn) {
      cardPlayBtn.innerHTML = isPlaying ? pauseSvg : playSvg;
      cardPlayBtn.style.background = isPlaying ? '#10b981' : '#ffffff';
      cardPlayBtn.style.color = '#000000';
    }

    // Also sync floating AMBIENT.SYNC widget and EQ bars
    if (ambientBtn) {
      ambientBtn.classList.toggle('playing', isPlaying);
      if (ambientIconPlay) ambientIconPlay.classList.toggle('hidden', isPlaying);
      if (ambientIconPause) ambientIconPause.classList.toggle('hidden', !isPlaying);
      if (ambientTrackPanel) ambientTrackPanel.classList.toggle('open', isPlaying);
      if (ambientPlayerWrap) ambientPlayerWrap.classList.toggle('panel-open', isPlaying);
    }
    cardEqBars.forEach(bar => {
      bar.style.animationPlayState = isPlaying ? 'running' : 'paused';
    });

    const activeDots = document.querySelectorAll('.void-track-playing-dot');
    activeDots.forEach(dot => {
      dot.style.boxShadow = isPlaying ? '0 0 10px #10b981' : 'none';
      dot.style.opacity = isPlaying ? '1' : '0.4';
    });
  }
  const syncAllUI = syncPlaybackUI;

  // Global Play/Pause Toggle
  window.toggleVoidPlayback = function() {
    if (!player.src) {
      if (typeof TRACKS !== 'undefined' && TRACKS.length > 0) {
        window.playSelectedTrack(TRACKS[currentTrackIndex || 0]);
      } else {
        player.src = 'music.mp3';
        player.play().catch(console.error);
      }
      return;
    }
    if (player.paused) {
      player.play().catch(console.error);
    } else {
      player.pause();
    }
  };

  function togglePlay() {
    window.toggleVoidPlayback();
  }
  function playAudio() {
    if (player.paused) player.play().catch(console.error);
  }
  function pauseAudio() {
    player.pause();
  }

  // ─── ITUNES ARTWORK RESOLUTION & HYDRATION UTILITY ─────────────────────────
  const artworkCache = new Map();

  function isMissingOrPlaceholderCover(url) {
    if (!url) return true;
    const s = String(url).toLowerCase();
    return s.includes('album-art.png') || s.includes('album_art.jpg') || s.includes('2a96cbd8b46e442fc41c2b86b821562f') || s.includes('placeholder') || s.includes('default');
  }

  async function fetchTrackArtwork(title, artist) {
    const cleanTitle = (title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const cleanArtist = (artist || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const cacheKey = `${cleanTitle.toLowerCase()}||${cleanArtist.toLowerCase()}`;

    if (artworkCache.has(cacheKey)) {
      return artworkCache.get(cacheKey);
    }

    try {
      const term = encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim());
      const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1`);
      if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
      const data = await res.json();
      const raw = data.results?.[0]?.artworkUrl100;
      if (raw) {
        const hdUrl = raw.replace('100x100bb', '600x600bb');
        artworkCache.set(cacheKey, hdUrl);
        return hdUrl;
      }
    } catch (err) {
      console.warn('// ARTWORK HYDRATION ERROR:', err.message);
    }

    artworkCache.set(cacheKey, null);
    return null;
  }
  window.fetchTrackArtwork = fetchTrackArtwork;
  window.artworkCache = artworkCache;

  function hydrateQueueArtwork() {
    const queue = window.playQueue || [];
    queue.forEach((track, i) => {
      if (!track) return;
      const cleanKey = `${(track.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}||${(track.artist || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}`;
      if (!isMissingOrPlaceholderCover(track.cover)) {
        if (!artworkCache.has(cleanKey)) artworkCache.set(cleanKey, track.cover);
        return;
      }

      // Non-blocking background fetch
      fetchTrackArtwork(track.title, track.artist).then(hdUrl => {
        if (!hdUrl) return;
        track.cover = hdUrl;

        // Patch live <img> in #queue-items-list without re-rendering the DOM tree
        const img = document.querySelector(
          `#queue-items-list [data-qi="${i}"] img, #queue-view-container [data-qi="${i}"] img, #queue-items-list .queue-item-row:nth-child(${i + 1}) img`
        );
        if (img) {
          img.src = hdUrl;
        }

        // Active cover sync if this item is currently playing
        if (window.currentQueueIndex === i) {
          const coverEl = document.getElementById('album-cover-img');
          if (coverEl) coverEl.src = hdUrl;
          document.querySelectorAll('.track-cover-card').forEach(c => { c.src = hdUrl; });
        }
      });
    });
  }
  // ─── HARDWARE & OS-LEVEL MEDIASESSION API ─────────────────────────────────
  function updateMediaSessionMetadata(track) {
    if (!('mediaSession' in navigator) || !track) return;
    try {
      const coverUrl = track.cover || 'assets/images/album-art.png';
      const absCover = new URL(coverUrl, window.location.href).href;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown Track',
        artist: track.artist || 'VOID Audio',
        album: 'VOID Cyber-Deck',
        artwork: [
          { src: absCover, sizes: '96x96', type: 'image/jpeg' },
          { src: absCover, sizes: '256x256', type: 'image/jpeg' },
          { src: absCover, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    } catch (err) {
      console.warn('// MediaSession metadata update failed:', err);
    }
  }
  window.updateMediaSessionMetadata = updateMediaSessionMetadata;

  function updateMediaSessionPositionState() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    try {
      if (player.duration && !isNaN(player.duration) && isFinite(player.duration) && player.duration > 0) {
        navigator.mediaSession.setPositionState({
          duration: player.duration,
          playbackRate: player.playbackRate || 1.0,
          position: Math.min(player.currentTime, player.duration)
        });
      }
    } catch (err) {}
  }

  function initMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;

    const actionHandlers = {
      play: () => {
        player.play().catch(console.error);
      },
      pause: () => {
        player.pause();
      },
      previoustrack: () => {
        playPreviousTrack();
      },
      nexttrack: () => {
        playNextTrack();
      },
      seekto: (details) => {
        if (details.seekTime !== undefined && !isNaN(details.seekTime)) {
          player.currentTime = details.seekTime;
          updateMediaSessionPositionState();
        }
      }
    };

    for (const [action, handler] of Object.entries(actionHandlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.warn(`MediaSession action "${action}" not supported.`, error);
      }
    }
  }

  function playPreviousTrack() {
    if (window.currentQueueIndex > 0) {
      window.currentQueueIndex--;
      window.currentTrackIndex = window.currentQueueIndex;
      const prevSong = window.playQueue[window.currentQueueIndex];
      const cleanKey = `${(prevSong?.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}||${(prevSong?.artist || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}`;
      const cached = prevSong?.cover && !isMissingOrPlaceholderCover(prevSong.cover)
        ? prevSong.cover
        : (artworkCache.get(cleanKey) || null);
      const coverEl = document.getElementById('album-cover-img');
      if (cached && coverEl) {
        coverEl.src = cached;
        if (prevSong) prevSong.cover = cached;
      }
      window.playSelectedTrack(prevSong);
      if (typeof window.renderQueueList === 'function') window.renderQueueList();
    }
  }
  window.playPreviousTrack = playPreviousTrack;

  function playNextTrack() {
    if (typeof playQueueNext === 'function') {
      playQueueNext();
    }
  }
  window.playNextTrack = playNextTrack;

  // ─── TRACK FAVORITING & LIKE ENGINE (LOCAL PERSISTENCE) ───────────────────
  function loadLikedTracks() {
    try {
      const raw = localStorage.getItem('void_liked_tracks');
      window.likedTracks = raw ? JSON.parse(raw) : [];
    } catch (e) {
      window.likedTracks = [];
    }
    return window.likedTracks;
  }
  window.loadLikedTracks = loadLikedTracks;

  function saveLikedTracks() {
    try {
      localStorage.setItem('void_liked_tracks', JSON.stringify(window.likedTracks || []));
    } catch (e) {}
  }

  function isTrackLiked(track) {
    if (!track || !window.likedTracks) return false;
    const tTitle = (track.title || '').toLowerCase().trim();
    const tArtist = (track.artist || '').toLowerCase().trim();
    return window.likedTracks.some(lt => {
      return (lt.title || '').toLowerCase().trim() === tTitle &&
             (lt.artist || '').toLowerCase().trim() === tArtist;
    });
  }
  window.isTrackLiked = isTrackLiked;

  function toggleLikeTrack(track) {
    if (!track) return false;
    loadLikedTracks();
    const tTitle = (track.title || '').toLowerCase().trim();
    const tArtist = (track.artist || '').toLowerCase().trim();
    const existingIdx = window.likedTracks.findIndex(lt => {
      return (lt.title || '').toLowerCase().trim() === tTitle &&
             (lt.artist || '').toLowerCase().trim() === tArtist;
    });

    let nowLiked = false;
    if (existingIdx >= 0) {
      window.likedTracks.splice(existingIdx, 1);
      nowLiked = false;
    } else {
      window.likedTracks.unshift({
        id: track.id || `liked_${Date.now()}`,
        title: track.title,
        artist: track.artist,
        cover: track.cover || 'assets/images/album-art.png',
        duration: track.duration || '03:30',
        previewUrl: track.previewUrl || track.src || '',
        likedAt: Date.now()
      });
      nowLiked = true;
    }
    saveLikedTracks();
    updateLikeUI(track);
    if (typeof renderPlaylistsView === 'function') renderPlaylistsView();
    return nowLiked;
  }
  window.toggleLikeTrack = toggleLikeTrack;

  function updateLikeUI(track) {
    const targetTrack = track || window.currentActiveTrack;
    const isLiked = isTrackLiked(targetTrack);
    const likeBtn = document.getElementById('void-like-btn');
    const likeIcon = document.getElementById('void-like-icon');
    if (!likeBtn || !likeIcon) return;

    if (isLiked) {
      likeBtn.classList.add('liked');
      likeBtn.style.color = '#10b981';
      likeIcon.setAttribute('fill', '#10b981');
      likeIcon.style.filter = 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.7))';
    } else {
      likeBtn.classList.remove('liked');
      likeBtn.style.color = '#6b7280';
      likeIcon.setAttribute('fill', 'none');
      likeIcon.style.filter = 'none';
    }
  }
  window.updateLikeUI = updateLikeUI;

  // ─── CUSTOM PLAYLIST ENGINE (LOCAL PERSISTENCE) ───────────────────────────
  function esc(s) {
    return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function loadCustomPlaylists() {
    try {
      const raw = localStorage.getItem('void_custom_playlists');
      if (raw) {
        window.customPlaylists = JSON.parse(raw);
      } else {
        window.customPlaylists = [
          { id: 'pl_1', name: 'NEURAL_DRIFT', tracks: [] }
        ];
        saveCustomPlaylists();
      }
    } catch (e) {
      window.customPlaylists = [{ id: 'pl_1', name: 'NEURAL_DRIFT', tracks: [] }];
    }
    return window.customPlaylists;
  }
  window.loadCustomPlaylists = loadCustomPlaylists;

  function saveCustomPlaylists() {
    try {
      localStorage.setItem('void_custom_playlists', JSON.stringify(window.customPlaylists || []));
    } catch (e) {}
  }

  function createPlaylist(name) {
    if (!name || !name.trim()) return null;
    loadCustomPlaylists();
    const newPl = {
      id: 'pl_' + Date.now(),
      name: name.trim().toUpperCase(),
      tracks: []
    };
    window.customPlaylists.push(newPl);
    saveCustomPlaylists();
    renderPlaylistsView();
    return newPl;
  }
  window.createPlaylist = createPlaylist;

  function addTrackToPlaylist(playlistId, track) {
    if (!track) return false;
    loadCustomPlaylists();
    const pl = window.customPlaylists.find(p => p.id === playlistId);
    if (!pl) return false;

    const exists = pl.tracks.some(t =>
      (t.title || '').toLowerCase().trim() === (track.title || '').toLowerCase().trim() &&
      (t.artist || '').toLowerCase().trim() === (track.artist || '').toLowerCase().trim()
    );
    if (!exists) {
      pl.tracks.push({
        id: track.id || `track_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        title: track.title,
        artist: track.artist,
        duration: track.duration || '03:30',
        cover: track.cover || 'assets/images/album-art.png',
        previewUrl: track.previewUrl || track.src || '',
        channel: track.channel || 'all',
        addedAt: Date.now()
      });
      saveCustomPlaylists();
      if (typeof renderPlaylistsView === 'function') renderPlaylistsView();
      return true;
    }
    return false;
  }
  window.addTrackToPlaylist = addTrackToPlaylist;

  // ─── PLAYLIST PICKER MODAL ────────────────────────────────────────────────
  function openPlaylistPicker(track) {
    const targetTrack = track || window.currentActiveTrack || (window.playQueue && window.playQueue[window.currentQueueIndex]);
    if (!targetTrack) {
      alert('No track selected to add.');
      return;
    }

    loadCustomPlaylists();

    let modal = document.getElementById('void-pl-picker-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'void-pl-picker-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 999999;
      background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center;
      padding: 16px; opacity: 0; transition: opacity .2s ease;
    `;

    const renderModalContent = () => {
      const playlists = window.customPlaylists || [];
      const coverArt = targetTrack.cover || 'assets/images/album-art.png';

      modal.innerHTML = `
        <div style="background: #0d0f14; border: 1px solid rgba(16,185,129,0.3); border-radius: 14px; width: 100%; max-width: 420px; box-shadow: 0 25px 60px rgba(0,0,0,0.9), 0 0 30px rgba(16,185,129,0.15); overflow: hidden; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; display: flex; flex-direction: column;">
          <!-- Header -->
          <div style="padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #10b981; font-weight: 700; font-size: 11px; letter-spacing: 0.08em;">// ADD TO PLAYLIST</span>
            </div>
            <button id="void-pl-modal-close" style="background: transparent; border: none; color: #9ca3af; font-size: 18px; cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 4px;">×</button>
          </div>

          <!-- Target Track Mini Preview -->
          <div style="padding: 12px 16px; background: rgba(16,185,129,0.05); border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 12px;">
            <img src="${coverArt}" onerror="this.src='assets/images/album-art.png'" style="width: 42px; height: 42px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;">
            <div style="min-width: 0; flex: 1;">
              <div style="color: #fff; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(targetTrack.title)}</div>
              <div style="color: #9ca3af; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(targetTrack.artist)}</div>
            </div>
          </div>

          <!-- Create New Playlist -->
          <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; gap: 8px;">
            <input type="text" id="void-pl-new-name-input" placeholder="NEW PLAYLIST NAME..."
                   style="flex: 1; min-width: 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 7px; padding: 7px 10px; color: #fff; font-size: 11px; font-family: monospace; outline: none;">
            <button id="void-pl-create-btn"
                    style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); color: #10b981; font-weight: 700; font-size: 10px; font-family: monospace; padding: 7px 12px; border-radius: 7px; cursor: pointer; white-space: nowrap; transition: all .15s;">
              + CREATE
            </button>
          </div>

          <!-- Playlists List -->
          <div style="padding: 10px 16px; max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 9px; color: #6b7280; letter-spacing: 0.08em; margin-bottom: 2px;">// SELECT DESTINATION</div>
            ${playlists.length === 0 ? '<div style="color: #6b7280; font-size: 11px; text-align: center; padding: 16px;">// NO PLAYLISTS CREATED YET</div>' : ''}
            ${playlists.map(pl => {
              const alreadyIn = pl.tracks.some(t =>
                (t.title || '').toLowerCase().trim() === (targetTrack.title || '').toLowerCase().trim() &&
                (t.artist || '').toLowerCase().trim() === (targetTrack.artist || '').toLowerCase().trim()
              );
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; gap: 10px;">
                  <div style="min-width: 0; flex: 1;">
                    <div style="font-size: 12px; font-weight: 600; color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">// ${esc(pl.name)}</div>
                    <div style="font-size: 10px; color: #6b7280;">${pl.tracks.length} ${pl.tracks.length === 1 ? 'track' : 'tracks'}</div>
                  </div>
                  <button class="void-btn-modal-add" data-plid="${pl.id}"
                          style="background: ${alreadyIn ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.08)'};
                                 border: 1px solid ${alreadyIn ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'};
                                 color: ${alreadyIn ? '#10b981' : '#e5e7eb'};
                                 font-size: 10px; font-family: monospace; font-weight: 600; padding: 5px 10px; border-radius: 6px; cursor: pointer; white-space: nowrap; transition: all .15s;">
                    ${alreadyIn ? '✓ IN PLAYLIST' : '+ ADD'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Modal Footer: Quick Switch to // PLAYLISTS -->
          <div style="padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3);">
            <button id="void-pl-modal-view-tab" style="background: transparent; border: none; color: #10b981; font-size: 10px; font-family: monospace; cursor: pointer; padding: 4px 0; text-decoration: underline;">
              → VIEW ALL IN // PLAYLISTS TAB
            </button>
            <span style="font-size: 9px; color: #4b5563;">VOID_STORAGE</span>
          </div>
        </div>
      `;

      // Wire modal events
      modal.querySelector('#void-pl-modal-close')?.addEventListener('click', () => closeModal());

      const createBtn = modal.querySelector('#void-pl-create-btn');
      const nameInput = modal.querySelector('#void-pl-new-name-input');
      const handleCreate = () => {
        const val = nameInput?.value?.trim();
        if (val) {
          const newPl = createPlaylist(val);
          if (newPl) {
            addTrackToPlaylist(newPl.id, targetTrack);
            renderModalContent();
          }
        }
      };
      createBtn?.addEventListener('click', handleCreate);
      nameInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleCreate();
      });

      modal.querySelectorAll('.void-btn-modal-add').forEach(btn => {
        btn.addEventListener('click', () => {
          const plId = btn.dataset.plid;
          const added = addTrackToPlaylist(plId, targetTrack);
          if (added) {
            btn.textContent = '✓ ADDED';
            btn.style.background = 'rgba(16,185,129,0.2)';
            btn.style.borderColor = 'rgba(16,185,129,0.5)';
            btn.style.color = '#10b981';
            setTimeout(() => renderModalContent(), 700);
          } else {
            btn.textContent = 'EXISTS';
            setTimeout(() => renderModalContent(), 700);
          }
        });
      });

      modal.querySelector('#void-pl-modal-view-tab')?.addEventListener('click', () => {
        closeModal();
        if (typeof switchToTab === 'function') switchToTab('playlists');
        if (typeof switchTab === 'function') switchTab('playlists');
      });
    };

    const closeModal = () => {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 200);
    };

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    renderModalContent();
    document.body.appendChild(modal);
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
    });
  }
  window.openPlaylistPicker = openPlaylistPicker;

  function removeTrackFromPlaylist(playlistId, trackIndex) {
    loadCustomPlaylists();
    const pl = window.customPlaylists.find(p => p.id === playlistId);
    if (pl && pl.tracks[trackIndex]) {
      pl.tracks.splice(trackIndex, 1);
      saveCustomPlaylists();
      renderPlaylistsView();
    }
  }
  window.removeTrackFromPlaylist = removeTrackFromPlaylist;

  function deletePlaylist(playlistId) {
    loadCustomPlaylists();
    window.customPlaylists = window.customPlaylists.filter(p => p.id !== playlistId);
    saveCustomPlaylists();
    renderPlaylistsView();
  }
  window.deletePlaylist = deletePlaylist;

  function playCustomPlaylist(playlistId) {
    loadCustomPlaylists();
    const pl = window.customPlaylists.find(p => p.id === playlistId);
    if (!pl || pl.tracks.length === 0) {
      alert('Playlist is empty. Add songs first!');
      return;
    }
    window.playQueue = [...pl.tracks];
    window.currentQueueIndex = 0;
    window.currentTrackIndex = 0;
    player.loop = false;
    window.playSelectedTrack(window.playQueue[0]);
    switchToTab('queue');
    renderQueueList();
    hydrateQueueArtwork();
  }
  window.playCustomPlaylist = playCustomPlaylist;

  function playLikedTracksPlaylist() {
    loadLikedTracks();
    if (!window.likedTracks || window.likedTracks.length === 0) {
      alert('No liked tracks yet! Click the heart on any song to like it.');
      return;
    }
    window.playQueue = [...window.likedTracks];
    window.currentQueueIndex = 0;
    window.currentTrackIndex = 0;
    player.loop = false;
    window.playSelectedTrack(window.playQueue[0]);
    switchToTab('queue');
    renderQueueList();
    hydrateQueueArtwork();
  }
  window.playLikedTracksPlaylist = playLikedTracksPlaylist;

  let expandedPlaylistId = null;

  function renderPlaylistsView() {
    const container = document.getElementById('playlists-view-container');
    if (!container) return;

    loadLikedTracks();
    loadCustomPlaylists();

    const likedCount = (window.likedTracks || []).length;
    const playlists = window.customPlaylists || [];

    container.innerHTML = `
      <div style="padding:4px 2px;display:flex;flex-direction:column;gap:12px;">
        <!-- LIKED SONGS HERO CARD -->
        <div style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(6,78,59,0.25));border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;border-radius:8px;background:#10b981;display:flex;align-items:center;justify-content:center;color:#000;box-shadow:0 0 12px rgba(16,185,129,0.4);">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
            <div>
              <div style="font-size:13px;font-weight:600;color:#fff;letter-spacing:.03em;">LIKED SONGS</div>
              <div style="font-size:10px;font-family:monospace;color:#10b981;">${likedCount} ${likedCount === 1 ? 'TRACK' : 'TRACKS'} // TASTE SEED ACTIVE</div>
            </div>
          </div>
          <button id="btn-play-liked" style="background:#10b981;border:none;color:#000;font-size:10px;font-family:monospace;font-weight:700;padding:6px 12px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:4px;transition:opacity .15s;">
            ▶ PLAY ALL
          </button>
        </div>

        <!-- CUSTOM PLAYLISTS HEADER -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px;">
          <span style="font-size:10px;font-family:monospace;color:#6b7280;letter-spacing:.08em;">// CUSTOM PLAYLIST STORAGE</span>
          <button id="btn-create-playlist" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#10b981;font-size:10px;font-family:monospace;padding:4px 9px;border-radius:6px;cursor:pointer;transition:background .15s;">
            + NEW PLAYLIST
          </button>
        </div>

        <!-- PLAYLISTS LIST -->
        <div id="playlists-list" style="display:flex;flex-direction:column;gap:8px;">
          ${playlists.length === 0 ? '<p style="font-size:11px;font-family:monospace;color:#4b5563;text-align:center;padding:16px;">// NO PLAYLISTS CREATED</p>' : ''}
          ${playlists.map(pl => {
            const isExp = expandedPlaylistId === pl.id;
            return `
              <div class="void-pl-card" data-plid="${pl.id}" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:9px;overflow:hidden;transition:border-color .15s;">
                <div style="padding:9px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                  <div style="flex:1;min-width:0;cursor:pointer;" class="btn-toggle-pl" data-plid="${pl.id}">
                    <div style="font-size:12px;font-weight:600;color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">// ${esc(pl.name)}</div>
                    <div style="font-size:10px;font-family:monospace;color:#6b7280;">${pl.tracks.length} ${pl.tracks.length === 1 ? 'track' : 'tracks'}</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:5px;">
                    <button class="btn-add-curr-pl" data-plid="${pl.id}" title="Add currently playing track" style="background:rgba(255,255,255,0.06);border:none;color:#9ca3af;padding:4px 7px;border-radius:5px;font-size:9px;font-family:monospace;cursor:pointer;">
                      + ADD NOW
                    </button>
                    <button class="btn-play-pl" data-plid="${pl.id}" style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10b981;padding:4px 8px;border-radius:5px;font-size:10px;font-family:monospace;cursor:pointer;">
                      ▶ PLAY
                    </button>
                    <button class="btn-del-pl" data-plid="${pl.id}" title="Delete playlist" style="background:transparent;border:none;color:#ef4444;padding:4px 6px;cursor:pointer;font-size:11px;">
                      ×
                    </button>
                  </div>
                </div>

                ${isExp ? `
                  <div style="border-top:1px solid rgba(255,255,255,0.05);background:rgba(0,0,0,0.25);padding:8px 10px;max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;">
                    ${pl.tracks.length === 0 ? '<p style="font-size:10px;font-family:monospace;color:#4b5563;text-align:center;padding:8px;">// EMPTY PLAYLIST — CLICK "+ ADD NOW"</p>' : ''}
                    ${pl.tracks.map((t, tIdx) => `
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:5px;background:rgba(255,255,255,0.02);font-size:11px;">
                        <div style="flex:1;min-width:0;display:flex;align-items:center;gap:6px;">
                          <span style="font-family:monospace;font-size:9px;color:#10b981;cursor:pointer;" class="btn-play-single-pl" data-plid="${pl.id}" data-tidx="${tIdx}">▶</span>
                          <span style="color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${esc(t.title)}</span>
                          <span style="color:#6b7280;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;">${esc(t.artist)}</span>
                        </div>
                        <button class="btn-remove-track-pl" data-plid="${pl.id}" data-tidx="${tIdx}" style="background:transparent;border:none;color:#6b7280;cursor:pointer;font-size:11px;padding:0 4px;">×</button>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-play-liked')?.addEventListener('click', playLikedTracksPlaylist);

    document.getElementById('btn-create-playlist')?.addEventListener('click', () => {
      const name = prompt('ENTER PLAYLIST IDENTIFIER:');
      if (name && name.trim()) {
        createPlaylist(name);
      }
    });

    container.querySelectorAll('.btn-toggle-pl').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.plid;
        expandedPlaylistId = (expandedPlaylistId === id) ? null : id;
        renderPlaylistsView();
      });
    });

    container.querySelectorAll('.btn-play-pl').forEach(btn => {
      btn.addEventListener('click', () => {
        playCustomPlaylist(btn.dataset.plid);
      });
    });

    container.querySelectorAll('.btn-del-pl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('DELETE THIS PLAYLIST?')) {
          deletePlaylist(btn.dataset.plid);
        }
      });
    });

    container.querySelectorAll('.btn-add-curr-pl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const curTrack = window.currentActiveTrack || (window.playQueue && window.playQueue[window.currentQueueIndex]);
        if (!curTrack) {
          alert('No track currently playing.');
          return;
        }
        const added = addTrackToPlaylist(btn.dataset.plid, curTrack);
        if (added) {
          btn.textContent = '✓ ADDED';
          setTimeout(() => { if (btn) btn.textContent = '+ ADD NOW'; }, 1500);
        } else {
          btn.textContent = 'EXISTS';
          setTimeout(() => { if (btn) btn.textContent = '+ ADD NOW'; }, 1500);
        }
      });
    });

    container.querySelectorAll('.btn-play-single-pl').forEach(btn => {
      btn.addEventListener('click', () => {
        const pl = (window.customPlaylists || []).find(p => p.id === btn.dataset.plid);
        const tIdx = parseInt(btn.dataset.tidx, 10);
        if (pl && pl.tracks[tIdx]) {
          window.playQueue = [...pl.tracks];
          window.currentQueueIndex = tIdx;
          window.currentTrackIndex = tIdx;
          player.loop = false;
          window.playSelectedTrack(pl.tracks[tIdx]);
          switchToTab('queue');
          renderQueueList();
          hydrateQueueArtwork();
        }
      });
    });

    container.querySelectorAll('.btn-remove-track-pl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeTrackFromPlaylist(btn.dataset.plid, parseInt(btn.dataset.tidx, 10));
      });
    });
  }
  window.renderPlaylistsView = renderPlaylistsView;

  // 1. Robust Stream Resolution with Multi-Source Fallback
  async function resolveAndPlayStream(track) {
    window.currentActiveTrack = track;
    updateLikeUI(track);
    updateMediaSessionMetadata(track);

    // Update UI Elements in both Modal and Card
    document.querySelectorAll('#current-track-title, .track-title-card, #void-card-track-title').forEach(el => el.innerText = track.title);
    document.querySelectorAll('#current-track-artist, .track-artist-card, #void-card-artist-tag').forEach(el => el.innerText = track.artist);
    if (track.duration) {
      const totalTimeEl = document.getElementById('total-duration-display') || document.querySelector('.total-time');
      if (totalTimeEl) totalTimeEl.innerText = track.duration;
    }

    // Active Playback Cover Sync:
    const coverEl = document.getElementById('album-cover-img');
    const cleanArtKey = `${(track.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}||${(track.artist || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}`;

    // Direct local audio path for track 01 / CYBER_DRIFT_808
    if (track.id === '01' || track.title === 'CYBER_DRIFT_808' || track.isLocal) {
      track.cover = track.cover || 'assets/images/album-art.png';
      if (coverEl) coverEl.src = track.cover;
      document.querySelectorAll('.track-cover-card').forEach(img => { img.src = track.cover; });
      updateMediaSessionMetadata(track);
      player.src = track.src || 'music.mp3';
      player.currentTime = 0;
      await player.play().catch(console.error);
      updateButtonVisual(true);
      return;
    }

    const cachedArt = (!isMissingOrPlaceholderCover(track.cover))
      ? track.cover
      : (artworkCache.get(cleanArtKey) || (typeof defaultArtworkCache !== 'undefined' ? defaultArtworkCache.get(cleanArtKey) : null) || null);

    if (cachedArt) {
      track.cover = cachedArt;
      if (coverEl) coverEl.src = cachedArt;
      document.querySelectorAll('.track-cover-card').forEach(img => { img.src = cachedArt; });
      updateMediaSessionMetadata(track);
    } else {
      if (track.cover && coverEl) coverEl.src = track.cover;
      document.querySelectorAll('.track-cover-card').forEach(img => { if (track.cover) img.src = track.cover; });
      updateMediaSessionMetadata(track);
      // Not yet resolved: fetch on the fly so spinning vinyl/cover art never remains blank
      fetchTrackArtwork(track.title, track.artist).then(hdUrl => {
        if (hdUrl) {
          track.cover = hdUrl;
          if (coverEl) coverEl.src = hdUrl;
          document.querySelectorAll('.track-cover-card').forEach(img => { img.src = hdUrl; });
          updateMediaSessionMetadata(track);
          const curIdx = window.currentQueueIndex || 0;
          const qImg = document.querySelector(`#queue-items-list [data-qi="${curIdx}"] img, #queue-view-container [data-qi="${curIdx}"] img`);
          if (qImg) qImg.src = hdUrl;
        }
      });
    }

    try {
      const searchStr = track.query || `${track.title} ${track.artist}`;
      const cleanQuery = encodeURIComponent(searchStr.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim());
      let candidate = null;
      try {
        const resMirror = await fetch(`https://saavn-api-one.vercel.app/search/songs?query=${cleanQuery}`);
        if (resMirror.ok) {
          const dataMirror = await resMirror.json();
          candidate = dataMirror.data?.results?.[0] || (Array.isArray(dataMirror.data) ? dataMirror.data[0] : null);
        }
      } catch (e) {}

      // Secondary fallback mirror
      if (!candidate) {
        try {
          const res = await fetch(`https://saavn.dev/api/search/songs?query=${cleanQuery}&limit=3`);
          if (res.ok) {
            const data = await res.json();
            candidate = data.data?.results?.[0];
          }
        } catch(e) {}
      }

      let streamUrl = null;
      if (candidate && candidate.downloadUrl) {
        // Find direct 320kbps or 160kbps MP3 link
        const best = candidate.downloadUrl.find(q => q.quality === '320kbps') || candidate.downloadUrl.slice(-1)[0];
        streamUrl = best?.url || best?.link || (typeof best === 'string' ? best : null);
      }

      // Safety fallback
      if (!streamUrl && track.previewUrl) {
        streamUrl = track.previewUrl;
      }

      // Safety fallback: iTunes 30s preview
      if (!streamUrl) {
        try {
          const itunesRes = await fetch(`https://itunes.apple.com/search?term=${cleanQuery}&entity=song&limit=1`);
          if (itunesRes.ok) {
            const itunesData = await itunesRes.json();
            if (itunesData.results?.[0]?.previewUrl) {
              streamUrl = itunesData.results[0].previewUrl;
              track.previewUrl = streamUrl;
            }
          }
        } catch(e) {}
      }

      // Local track fallback
      if (!streamUrl && (track.src || track.url)) {
        streamUrl = track.src || track.url;
      }
      if (!streamUrl) {
        streamUrl = 'music.mp3';
      }

      if (!streamUrl) throw new Error("No playable stream");

      // Force clean audio element refresh
      player.pause();
      player.removeAttribute('src');
      player.load();

      // IMPORTANT: Set crossOrigin BEFORE src to avoid CORS-mode mismatch
      // Setting it after src causes the browser to ignore the CORS header
      player.crossOrigin = "anonymous";
      player.muted = false;
      player.volume = 0.9;

      // Use HTTPS directly
      player.src = streamUrl.replace(/^http:\/\//i, 'https://');

      // Resume AudioContext if it was suspended (autoplay policy)
      if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      await player.play();
      console.log("// AUDIO PLAYING AT VOLUME:", player.volume, "MUTED:", player.muted, "SRC:", player.src);
      updateButtonVisual(true);

    } catch (err) {
      console.error("// STREAM ERROR:", err);
      // Last-ditch: try without crossOrigin (some CDNs block anonymous)
      try {
        player.crossOrigin = null;
        player.muted = false;
        player.volume = 0.9;
        await player.play();
        console.log("// AUDIO PLAYING (no-cors fallback) VOLUME:", player.volume);
        updateButtonVisual(true);
      } catch(e2) {
        updateButtonVisual(false);
      }
    }
  }

  window.playSelectedTrack = resolveAndPlayStream;

  // 2. Bulletproof Play/Pause Button Logic
  function updateButtonVisual(isPlaying) {
    syncPlaybackUI(isPlaying);
  }

  const updatePlayPauseUI = updateButtonVisual;

  // Master Toggle Handler
  const playBtn = document.getElementById('play-pause-btn');
  if (playBtn) {
    playBtn.onclick = (e) => {
      e.stopPropagation();
      if (!player.src) {
        if (typeof TRACKS !== 'undefined' && TRACKS.length > 0) {
          window.playSelectedTrack(TRACKS[currentTrackIndex || 0]);
        }
        return;
      }

      if (player.paused) {
        player.play().then(() => updateButtonVisual(true)).catch(console.error);
      } else {
        player.pause();
        updateButtonVisual(false);
      }
    };
  }

  player.onplay = () => {
    updateButtonVisual(true);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  };
  player.onpause = () => {
    updateButtonVisual(false);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  };

  // 3. Connect Timer Directly to Native timeupdate
  player.ontimeupdate = () => {
    updateMediaSessionPositionState();
    if (!player.duration || isNaN(player.duration)) return;

    const cur = Math.floor(player.currentTime);
    const dur = Math.floor(player.duration);

    const curMin = Math.floor(cur / 60);
    const curSec = cur % 60;
    const durMin = Math.floor(dur / 60);
    const durSec = dur % 60;

    const curEl = document.getElementById('current-time-display');
    const durEl = document.getElementById('total-duration-display');
    const bar = document.getElementById('audio-progress-bar');
    const thumb = document.getElementById('void-scrubber-thumb') || document.getElementById('scrubber-thumb');

    if (curEl) curEl.innerText = `${curMin}:${curSec < 10 ? '0' : ''}${curSec}`;
    if (durEl) durEl.innerText = `${durMin}:${durSec < 10 ? '0' : ''}${durSec}`;
    if (bar) bar.style.width = `${(cur / dur) * 100}%`;
    if (thumb) thumb.style.left = `${(cur / dur) * 100}%`;
  };

  // Scrubber Click-to-Seek Handler
  const progressTrack = document.getElementById('progress-track-container') || document.getElementById('void-scrubber-track') || document.querySelector('.scrubber-track');
  if (progressTrack) {
    progressTrack.onclick = (e) => {
      if (!player.duration) return;
      const rect = progressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, clickX / rect.width));
      player.currentTime = percent * player.duration;
    };
  }

  // Bind clicks to ALL play buttons
  document.querySelectorAll('#play-pause-btn, .modal-play-btn, .card-play-btn, #void-card-play-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.toggleVoidPlayback();
    };
  });

  // ─── DEDICATED DEFAULT TRACKLIST ARTWORK CACHE & HYDRATION ────────────────
  const defaultArtworkCache = new Map();
  window.defaultArtworkCache = defaultArtworkCache;

  // Background artwork fetcher for default tracks via iTunes
  function hydrateDefaultTrackArtwork(track, rowImg) {
    if (!track) return;
    const cleanKey = `${(track.title || '').trim().toLowerCase()}||${(track.artist || '').trim().toLowerCase()}`;

    // 1. If already resolved in cache, apply immediately
    if (defaultArtworkCache.has(cleanKey)) {
      const cached = defaultArtworkCache.get(cleanKey);
      if (cached) {
        track.cover = cached;
        if (rowImg && rowImg.src !== cached) rowImg.src = cached;
      }
      return;
    }

    // 2. If track already has a valid live cover, cache and return
    if (track.cover && !isMissingOrPlaceholderCover(track.cover)) {
      defaultArtworkCache.set(cleanKey, track.cover);
      return;
    }

    // 3. Query iTunes live: https://itunes.apple.com/search?term=${encodeURIComponent(track.title + ' ' + track.artist)}&entity=song&limit=1
    const term = encodeURIComponent(`${track.title} ${track.artist}`.trim());
    fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1`)
      .then(res => {
        if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const raw = data.results?.[0]?.artworkUrl100;
        if (raw) {
          const hdCover = raw.replace('100x100bb', '600x600bb');
          defaultArtworkCache.set(cleanKey, hdCover);
          if (typeof artworkCache !== 'undefined' && artworkCache) {
            artworkCache.set(cleanKey, hdCover);
          }
          track.cover = hdCover;
          if (rowImg) rowImg.src = hdCover;

          // If currently selected or active, update #album-cover-img directly
          if (TRACKS[currentTrackIndex]?.id === track.id || window.currentActiveTrack?.id === track.id) {
            const coverEl = document.getElementById('album-cover-img');
            if (coverEl) coverEl.src = hdCover;
            document.querySelectorAll('.track-cover-card').forEach(img => { img.src = hdCover; });
          }
        }
      })
      .catch(err => console.warn('// iTunes default track hydration error for', track.title, err));
  }

  // Load and apply track
  function loadTrack(index, autoPlay = false) {
    currentTrackIndex = (index + TRACKS.length) % TRACKS.length;
    window.currentTrackIndex = currentTrackIndex;
    window.playQueue = TRACKS;
    const track = TRACKS[currentTrackIndex];

    if (autoPlay) {
      window.playSelectedTrack(track);
    } else {
      document.querySelectorAll('#current-track-title, .track-title-card, #void-card-track-title').forEach(el => el.innerText = track.title);
      document.querySelectorAll('#current-track-artist, .track-artist-card, #void-card-artist-tag').forEach(el => el.innerText = track.artist);
      if (track.duration) {
        const totalTimeEl = document.getElementById('total-duration-display') || document.querySelector('.total-time');
        if (totalTimeEl) totalTimeEl.innerText = track.duration;
      }
      const coverEl = document.getElementById('album-cover-img');
      const cleanKey = `${(track.title || '').trim().toLowerCase()}||${(track.artist || '').trim().toLowerCase()}`;
      const resolvedCover = track.cover || defaultArtworkCache.get(cleanKey) || (typeof artworkCache !== 'undefined' ? artworkCache.get(cleanKey) : null);
      if (coverEl && resolvedCover) coverEl.src = resolvedCover;
      document.querySelectorAll('.track-cover-card').forEach(img => { if (resolvedCover) img.src = resolvedCover; });
      player.src = track.src;
    }
    renderPlaylist();
  }

  // Render Modern Sleek Playlist
  function renderPlaylist() {
    if (!trackListContainer) return;
    trackListContainer.innerHTML = '';

    const filtered = TRACKS.filter(t => activeFilter === 'all' || t.channel === activeFilter);

    if (trackCountEl) trackCountEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'Track' : 'Tracks'}`;

    filtered.forEach(track => {
      const origIndex = TRACKS.findIndex(t => t.id === track.id);
      const isActive = origIndex === currentTrackIndex;

      const cleanKey = `${(track.title || '').trim().toLowerCase()}||${(track.artist || '').trim().toLowerCase()}`;
      const initialCover = track.cover || defaultArtworkCache.get(cleanKey) || (typeof artworkCache !== 'undefined' ? artworkCache.get(cleanKey) : null) || 'assets/images/album-art.png';

      const item = document.createElement('div');
      item.className = `void-track-row flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition group ${isActive ? 'active' : ''}`;
      item.innerHTML = `
        <div class="void-track-row-left flex items-center gap-3 overflow-hidden">
          <div class="void-track-thumb-box">
            <img src="${initialCover}" class="void-track-thumb-img w-10 h-10 rounded-lg object-cover border border-white/5" alt="${track.title}">
            ${isActive ? '<div class="void-track-playing-badge"><span class="void-track-playing-dot"></span></div>' : ''}
          </div>
          <div class="void-track-row-meta truncate">
            <div class="void-track-title text-sm text-white font-medium truncate group-hover:text-emerald-400 transition">${track.title}</div>
            <div class="void-track-artist text-xs text-neutral-400 truncate">${track.artist}</div>
          </div>
        </div>
        <div class="void-track-row-right text-xs text-neutral-500 font-mono pl-3 flex items-center gap-2">
          <button class="void-row-add-pl text-neutral-500 hover:text-emerald-400 p-1 mr-1 transition" title="Add to Playlist"><i class="fa-solid fa-plus text-xs"></i></button>
          <span class="void-track-dur">${track.duration}</span>
        </div>
      `;

      // Hydrate artwork for default tracks (index > 0) via iTunes live
      const rowImg = item.querySelector('.void-track-thumb-img');
      if (origIndex > 0) {
        hydrateDefaultTrackArtwork(track, rowImg);
      }

      item.addEventListener('click', (e) => {
        if (e.target.closest('.void-row-add-pl')) {
          e.stopPropagation();
          if (typeof openAddToPlaylistModal === 'function') {
            openAddToPlaylistModal(track);
          }
          return;
        }
        currentTrackIndex = origIndex;
        window.currentTrackIndex = origIndex;

        // Preserve Selection Handling: Pass resolved track.cover straight to #album-cover-img
        const coverEl = document.getElementById('album-cover-img');
        const resolvedCover = track.cover || defaultArtworkCache.get(cleanKey) || (typeof artworkCache !== 'undefined' ? artworkCache.get(cleanKey) : null);
        if (resolvedCover) {
          track.cover = resolvedCover;
          if (coverEl) coverEl.src = resolvedCover;
          document.querySelectorAll('.track-cover-card').forEach(img => { img.src = resolvedCover; });
        }

        playTrackAndStartRadio(track);
        renderPlaylist();
      });

      trackListContainer.appendChild(item);
    });
  }

  // Modal Open & Close Logic (Decoupled from audio: CLOSING NEVER PAUSES)
  function openModal() {
    if (window.innerWidth < 768) {
      window.location.href = 'voidbeats.html';
      return;
    }
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    resizeVisualizerCanvas();
    renderPlaylist();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (launchModalBtn) launchModalBtn.addEventListener('click', openModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Keyboard Shortcuts (Escape to close modal; Space to toggle play)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
      closeModal();
    }
    // Prevent ambient player triggering if voidDeckAudio is active or on voidbeats page
    if (window.voidDeckAudio && (window.voidDeckAudio.src || !window.voidDeckAudio.paused)) {
      return;
    }
    if (window.location.pathname.includes('voidbeats')) {
      return;
    }
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'input' || activeTag === 'textarea') return;

    if (e.code === 'Space' || e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      togglePlay();
    }
  });

  // Buttons Event Handlers
  if (ambientBtn) ambientBtn.addEventListener('click', togglePlay);
  if (cardPlayBtn) cardPlayBtn.addEventListener('click', togglePlay);
  if (modalPlayBtn) modalPlayBtn.addEventListener('click', togglePlay);
  if (modalPrevBtn) modalPrevBtn.addEventListener('click', () => loadTrack(currentTrackIndex - 1, true));
  if (modalNextBtn) modalNextBtn.addEventListener('click', () => loadTrack(currentTrackIndex + 1, true));


  // Volume Slider
  const volSlider = document.querySelector('input[type="range"]') || document.getElementById('volume-slider') || volumeSlider;
  if (volSlider) {
    volSlider.value = 80;
    player.volume = 0.8;
    volSlider.oninput = (e) => {
      player.volume = parseFloat(e.target.value) / 100;
      if (typeof coreAudio !== 'undefined' && coreAudio) coreAudio.volume = player.volume;
      const lbl = document.getElementById('volume-label') || document.getElementById('void-volume-label') || volumeLabel;
      if (lbl) lbl.textContent = `${e.target.value}%`;
    };
  }

  // Loop & Shuffle Toggles
  if (loopToggleBtn) {
    loopToggleBtn.addEventListener('click', () => {
      window.isRepeatOneActive = !window.isRepeatOneActive;
      isLooping = window.isRepeatOneActive;
      coreAudio.loop = false;
      player.loop = false;
      if (typeof deckAudio !== 'undefined' && deckAudio) deckAudio.loop = false;
      loopToggleBtn.classList.toggle('active', window.isRepeatOneActive);
      loopToggleBtn.setAttribute('title', window.isRepeatOneActive ? 'Repeat: On' : 'Repeat: Off');
    });
  }

  const shuffleBtn = document.getElementById('void-shuffle-btn');
  let isShuffle = false;
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      isShuffle = !isShuffle;
      shuffleBtn.classList.toggle('active', isShuffle);
      shuffleBtn.setAttribute('title', isShuffle ? 'Shuffle: On' : 'Shuffle: Off');
    });
  }

  // ==========================================
  // VOID_BEATS AUDIO ENGINE (ITUNES METADATA + DIRECT STREAMING + INTERNAL AUTOPLAY)
  // ==========================================
  window.playQueue = window.playQueue || [];
  window.currentTrackIndex = window.currentTrackIndex || 0;
  let isAutoplayActive = true;

  // Connect to the unified global audio singleton
  const deckAudio = player;

  // ─────────────────────────────────────────────────────────────
  // 1. UNIFIED LAST.FM FETCHER (WITH VERCEL ROUTE + DIRECT FALLBACK)
  // ─────────────────────────────────────────────────────────────
  async function fetchSimilarTracksRadio(trackTitle, artistName) {
    console.log(`// RADIO: Station for "${trackTitle}" by "${artistName}"`);

    const LFM_KEY = '77db9b1ef3618ce60cff5c372123ee61';
    const FALLBACK_COVER = 'assets/images/album-art.png';

    // Normalise punctuation and diacritics without destroying non-Latin titles.
    function norm(s) {
      return (s || '')
        .replace(/\(.*?\)|\[.*?\]/g, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N} ]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    const cleanTitle  = norm(trackTitle);
    const cleanArtist = norm(artistName);

    // Dynamic Taste Weighting: Inject seed tracks from user's liked pool into discovery cascade
    async function applyTasteWeighting(tracks) {
      if (!tracks || tracks.length === 0) return tracks;
      loadLikedTracks();
      if (!window.likedTracks || window.likedTracks.length === 0) return tracks;

      const likedArtists = [...new Set(
        window.likedTracks
          .map(t => t.artist)
          .filter(a => a && a.toLowerCase().trim() !== cleanArtist.toLowerCase().trim())
      )];

      if (likedArtists.length === 0) return tracks;

      // FIX 4: Work on a copy so the caller's array (e.g. _lastSearchTracks)
      // is never mutated — previously splice() on the shared reference caused
      // liked-artist duplicates to accumulate on repeated calls.
      const result = [...tracks];
      const sampleArtists = likedArtists.slice(0, 2);
      for (const likedArt of sampleArtists) {
        try {
          const topUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(norm(likedArt))}&api_key=${LFM_KEY}&format=json&limit=2`;
          const res = await fetch(topUrl);
          if (res.ok) {
            const d = await res.json();
            const items = d.toptracks?.track || [];
            if (items.length > 0) {
              const picked = items[0];
              const injected = {
                title: picked.name,
                artist: likedArt,
                duration: '03:30',
                cover: FALLBACK_COVER
              };
              console.log(`// TASTE ENGINE: Injected "${injected.title}" by liked artist "${likedArt}"`);
              const insertIdx = Math.min(2, result.length);
              result.splice(insertIdx, 0, injected);
            }
          }
        } catch (_) {}
      }
      return result;
    }

    // ── TIER 1: /api/recommend (Last.fm getsimilar via server proxy) ──────────
    try {
      const res = await fetch(`/api/recommend?track=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.tracks && data.tracks.length > 0) {
          console.log(`// RADIO T1: ${data.tracks.length} tracks via /api/recommend`);
          const t1Tracks = data.tracks.map(t => ({ ...t, cover: t.cover || FALLBACK_COVER }));
          return await applyTasteWeighting(t1Tracks);
        }
      }
    } catch (_) {}

    // ── TIER 2: Direct Last.fm getsimilar → then artist.gettoptracks ─────────
    try {
      const simUrl = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(cleanArtist)}&track=${encodeURIComponent(cleanTitle)}&api_key=${LFM_KEY}&format=json&limit=10`;
      const simRes = await fetch(simUrl);
      if (!simRes.ok) throw new Error(`Last.fm getsimilar HTTP ${simRes.status}`);
      const simData = await simRes.json();
      const simList = simData.similartracks?.track || [];
      if (simList.length > 0) {
        console.log(`// RADIO T2a: ${simList.length} tracks via getsimilar`);
        const t2aTracks = simList.map(item => ({
          title: item.name,
          artist: item.artist?.name || 'Unknown Artist',
          duration: '03:30',
          cover: FALLBACK_COVER
        }));
        return await applyTasteWeighting(t2aTracks);
      }
    } catch (err) {
      // A transport/HTTP failure must still allow the independent artist tier.
      console.warn('// RADIO T2a getsimilar failed:', err.message);
    }

    try {
      console.warn(`// RADIO T2a: no results, trying artist.gettoptracks for "${cleanArtist}"`);
      const topUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(cleanArtist)}&api_key=${LFM_KEY}&format=json&limit=10`;
      const topRes = await fetch(topUrl);
      if (!topRes.ok) throw new Error(`Last.fm top tracks HTTP ${topRes.status}`);
      const topData = await topRes.json();
      // FIX 5: Normalize item name before comparing to already-normalized cleanTitle
      // so the seed track is reliably excluded even when it has accents or symbols.
      const topList = (topData.toptracks?.track || []).filter(t => norm(t.name) !== cleanTitle);
      if (topList.length > 0) {
        console.log(`// RADIO T2b: ${topList.length} tracks via artist.gettoptracks`);
        const t2bTracks = topList.map(item => ({
          title: item.name,
          artist: artistName,
          duration: '03:30',
          cover: FALLBACK_COVER
        }));
        return await applyTasteWeighting(t2bTracks);
      }
    } catch (err) {
      console.warn('// RADIO T2b artist top tracks failed:', err.message);
    }

    // ── TIER 3: Saavn song search on title only ───────────────────────────────
    try {
      const saavnUrl = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(cleanTitle)}&limit=8`;
      const saavnRes = await fetch(saavnUrl);
      if (saavnRes.ok) {
        const saavnData = await saavnRes.json();
        const saavnList = saavnData.data?.results || [];
        const mapped = saavnList
          .filter(s => s.name !== trackTitle) // exclude exact seed
          .map(s => ({
            title: s.name || s.title || 'Unknown',
            artist: s.artists?.primary?.[0]?.name || s.primaryArtists || 'Unknown Artist',
            duration: s.duration ? `${Math.floor(s.duration/60)}:${String(s.duration%60).padStart(2,'0')}` : '03:30',
            cover: s.image?.[2]?.url || s.image?.[1]?.url || FALLBACK_COVER
          }));
        if (mapped.length > 0) {
          console.log(`// RADIO T3: ${mapped.length} tracks via Saavn`);
          return await applyTasteWeighting(mapped);
        }
      }
    } catch (err) {
      console.warn('// RADIO T3 Saavn failed:', err.message);
    }

    // ── TIER 4: Fall back to whatever is currently in the search pool ─────────
    try {
      const rows = document.querySelectorAll('#playlist-container .playlist-track-row');
      if (rows.length > 1) {
        // Pull track data from the DOM rows' stored data (set during renderTracksList)
        const poolTracks = (window._lastSearchTracks || []).filter(t => t.title !== trackTitle);
        if (poolTracks.length > 0) {
          console.log(`// RADIO T4: ${poolTracks.length} tracks from search pool`);
          return await applyTasteWeighting(poolTracks);
        }
      }
    } catch (_) {}

    console.warn('// RADIO: All tiers exhausted, queue stays at 1 track.');
    return [];
  }
  window.fetchSimilarTracksRadio = fetchSimilarTracksRadio;

  // ─── UNIVERSAL QUEUE DEDUPLICATION FILTER ──────────────────────────────────
  function deduplicateTracksAgainstQueue(freshTracks) {
    if (!freshTracks || !Array.isArray(freshTracks)) return [];
    const queue = window.playQueue || [];

    const normKey = (title, artist) => {
      const cleanT = (title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      const cleanA = (artist || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      return `${cleanT}::${cleanA}`;
    };

    const existingKeys = new Set(
      queue.map(t => normKey(t.title, t.artist))
    );

    const seenInBatch = new Set();
    const uniqueNewTracks = freshTracks.filter(t => {
      if (!t || !t.title) return false;
      const key = normKey(t.title, t.artist);
      if (existingKeys.has(key) || seenInBatch.has(key)) {
        return false;
      }
      seenInBatch.add(key);
      return true;
    });

    return uniqueNewTracks;
  }
  window.deduplicateTracksAgainstQueue = deduplicateTracksAgainstQueue;

  // ─────────────────────────────────────────────────────────────
  // 2. REWIRE TRACK CLICK TO INITIALIZE SONG RADIO QUEUE
  // ─────────────────────────────────────────────────────────────

  // FIX 3: Monotonic token — incremented before every async queue-build.
  // Each build captures the token at start; if it no longer matches when the
  // fetch resolves, a newer click has taken over and this result is dropped.
  let _queueBuildToken = 0;

  function findTrackInQueue(track) {
    if (!track) return -1;
    return (window.playQueue || []).findIndex(candidate => {
      if (!candidate) return false;
      if (track.id && candidate.id && String(track.id) === String(candidate.id)) return true;
      return (candidate.title || '').trim().toLowerCase() === (track.title || '').trim().toLowerCase() &&
        (candidate.artist || '').trim().toLowerCase() === (track.artist || '').trim().toLowerCase();
    });
  }

  async function playTrackAndStartRadio(seedTrack) {
    const existingIndex = findTrackInQueue(seedTrack);
    if (existingIndex >= 0) {
      // Queue navigation is never a new radio request.
      window.currentQueueIndex = existingIndex;
      window.currentTrackIndex = existingIndex;
      window.playSelectedTrack(window.playQueue[existingIndex]);
      if (typeof window.renderQueueList === 'function') window.renderQueueList();
      return;
    }

    // A genuinely new selection becomes the seed for a new radio station.
    window.playQueue = [seedTrack];
    window.currentQueueIndex = 0;
    window.currentTrackIndex = 0;
    window.playSelectedTrack(seedTrack);

    // 3. Immediately pre-fetch the dynamic radio queue
    const myToken = ++_queueBuildToken;
    const recommendations = await fetchSimilarTracksRadio(seedTrack.title, seedTrack.artist);

    // Abort if a newer play request superseded us
    if (myToken !== _queueBuildToken) return;

    const uniqueRecs = deduplicateTracksAgainstQueue(recommendations);

    if (uniqueRecs.length > 0) {
      window.playQueue = [seedTrack, ...uniqueRecs];
      console.log(`// RADIO STATION ACTIVE: Seed track loaded with ${uniqueRecs.length} recommended songs queued up.`);
    } else {
      console.log("// RADIO: No close similarity found, fallback to original search pool.");
    }
    if (typeof window.renderQueueList === 'function') window.renderQueueList();
    hydrateQueueArtwork();
  }
  window.playTrackAndStartRadio = playTrackAndStartRadio;

  // ─────────────────────────────────────────────────────────────
  // 4. ADVANCE QUEUE ON AUDIO END (SPOTIFY SONG RADIO)
  // ─────────────────────────────────────────────────────────────
  let isFetchingQueueRecommendations = false;

  // ─── playQueueNext: the single source of truth for queue advance ─────────
  async function playQueueNext() {
    if (window.isRepeatOneActive || isLooping) {
      player.currentTime = 0;
      player.play().catch(console.error);
      return;
    }

    if (isFetchingQueueRecommendations) return;

    window.currentQueueIndex = (window.currentQueueIndex || 0) + 1;
    window.currentTrackIndex = window.currentQueueIndex;

    const queue = window.playQueue || [];

    if (window.currentQueueIndex < queue.length) {
      const next = queue[window.currentQueueIndex];
      console.log('// QUEUE ADVANCE ->', next.title, 'by', next.artist);

      // Active Playback Cover Sync
      const cleanKey = `${(next?.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}||${(next?.artist || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}`;
      const cached = next?.cover && !isMissingOrPlaceholderCover(next.cover)
        ? next.cover
        : (artworkCache.get(cleanKey) || null);
      const coverEl = document.getElementById('album-cover-img');
      if (cached && coverEl) {
        coverEl.src = cached;
        if (next) next.cover = cached;
      }

      window.playSelectedTrack(next);
      if (typeof window.renderQueueList === 'function') window.renderQueueList();
    } else if (queue.length > 0) {
      // End of queue — fetch fresh recommendations from last played track
      const last = queue[queue.length - 1];
      isFetchingQueueRecommendations = true;
      try {
        const fresh = await fetchSimilarTracksRadio(last.title, last.artist);
        const uniqueNewTracks = deduplicateTracksAgainstQueue(fresh);

        if (uniqueNewTracks.length > 0) {
          console.log(`// RADIO: Appending ${uniqueNewTracks.length} unique tracks to queue.`);
          window.playQueue.push(...uniqueNewTracks);
          window.playSelectedTrack(window.playQueue[window.currentQueueIndex]);
          hydrateQueueArtwork();
        } else {
          console.log('// RADIO: No unseen recommendations found from last track. Gracefully looping queue to start.');
          window.currentQueueIndex = 0;
          window.currentTrackIndex = 0;
          window.playSelectedTrack(window.playQueue[0]);
        }
      } catch (err) {
        console.warn('// Error fetching radio at queue end:', err);
        window.currentQueueIndex = 0;
        window.currentTrackIndex = 0;
        if (window.playQueue.length > 0) {
          window.playSelectedTrack(window.playQueue[0]);
        }
      } finally {
        isFetchingQueueRecommendations = false;
        if (typeof window.renderQueueList === 'function') window.renderQueueList();
      }
    }
  }

  player.onended = playQueueNext;
  deckAudio.onended = playQueueNext;

  // Next Button UI Click
  const nextBtn = document.querySelector('button[aria-label="Next"]') || document.getElementById('next-track-btn') || document.getElementById('ctrl-next') || document.getElementById('void-next-track-btn');
  if (nextBtn) {
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      playQueueNext();
    };
  }

  // Prev Button UI Click
  const prevBtn = document.querySelector('button[aria-label="Previous"]') || document.getElementById('prev-track-btn') || document.getElementById('ctrl-prev') || document.getElementById('void-prev-track-btn');
  if (prevBtn) {
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      if (window.currentQueueIndex > 0) {
        window.currentQueueIndex--;
        window.currentTrackIndex = window.currentQueueIndex;
        const prevSong = window.playQueue[window.currentQueueIndex];
        const cleanKey = `${(prevSong?.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}||${(prevSong?.artist || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}`;
        const cached = prevSong?.cover && !isMissingOrPlaceholderCover(prevSong.cover)
          ? prevSong.cover
          : (artworkCache.get(cleanKey) || null);
        const coverEl = document.getElementById('album-cover-img');
        if (cached && coverEl) {
          coverEl.src = cached;
          if (prevSong) prevSong.cover = cached;
        }
        window.playSelectedTrack(prevSong);
        if (typeof window.renderQueueList === 'function') window.renderQueueList();
      }
    };
  }

  // 1. Instant Search via iTunes Open API (Pristine 600x600 HD Album Art, Zero CORS)
  async function executeGlobalSearch(query) {
    const container = document.getElementById('playlist-container') || trackListContainer;
    if (!container) return;

    container.innerHTML = `
      <div class="text-xs text-neutral-400 p-6 text-center animate-pulse font-mono" style="padding: 24px; text-align: center; color: #a3a3a3; font-family: monospace; font-size: 12px;">
        // TUNING FREQUENCIES FOR "${query}"...
      </div>`;

    try {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=12`;
      const res = await fetch(itunesUrl);
      if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
      const data = await res.json();
      const items = data.results || [];

      if (items.length === 0) {
        container.innerHTML = `<div class="text-xs text-neutral-500 p-6 text-center font-mono" style="padding: 24px; text-align: center; color: #737373; font-family: monospace; font-size: 12px;">// NO SIGNALS FOUND.</div>`;
        if (trackCountEl) trackCountEl.textContent = '0 Tracks';
        return;
      }

      const tracks = items.map(item => {
        const rawArt = item.artworkUrl100 || '';
        const hdArt = rawArt ? rawArt.replace('100x100bb', '600x600bb') : 'assets/images/album-art.png';
        return {
          id: String(item.trackId || Math.random().toString(36).substring(2)),
          title: item.trackName || "Unknown Track",
          artist: item.artistName || "Unknown Artist",
          duration: formatTime((item.trackTimeMillis || 0) / 1000),
          cover: hdArt,
          previewUrl: item.previewUrl || ''
        };
      });

      // FIX 2: Do NOT overwrite the live radio queue here. Search results are
      // display-only; they are stored in _lastSearchTracks (set inside
      // renderTracksList) so Tier 4 radio fallback can still find them.
      renderTracksList(tracks);
    } catch (err) {
      console.error("Search failed:", err);
      container.innerHTML = `<div class="text-xs text-red-400 p-6 text-center font-mono" style="padding: 24px; text-align: center; color: #f87171; font-family: monospace; font-size: 12px;">// RELAY OFFLINE. RETRY.</div>`;
    }
  }

  // Render dynamic track list
  function renderTracksList(tracks) {
    const container = document.getElementById('playlist-container') || trackListContainer;
    if (!container) return;
    container.innerHTML = '';

    // Cache for Tier 4 radio fallback (search pool)
    window._lastSearchTracks = tracks;

    if (trackCountEl) trackCountEl.textContent = `${tracks.length} ${tracks.length === 1 ? 'Track' : 'Tracks'}`;


    tracks.forEach((track, rowIdx) => {
      const row = document.createElement('div');
      row.className = "playlist-track-row void-track-row flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition group border border-transparent";
      row.innerHTML = `
        <div class="void-track-row-left flex items-center gap-3 overflow-hidden">
          <div class="void-track-thumb-box">
            <img src="${track.cover}" class="void-track-thumb-img w-10 h-10 rounded-lg object-cover border border-white/5" alt="cover" onerror="this.src='assets/images/album-art.png'">
          </div>
          <div class="void-track-row-meta truncate">
            <div class="void-track-title text-sm text-white font-medium truncate group-hover:text-emerald-400 transition">${track.title}</div>
            <div class="void-track-artist text-xs text-neutral-400 truncate">${track.artist}</div>
          </div>
        </div>
        <div class="void-track-row-right flex items-center gap-2 text-xs text-neutral-500 font-mono pl-3">
          <span class="void-track-dur">${track.duration}</span>
          <button class="void-row-add-pl" title="Add to Playlist"
                  style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#9ca3af;width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;line-height:1;transition:all .15s;">
            +
          </button>
        </div>
      `;

      row.querySelector('.void-row-add-pl')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openPlaylistPicker(track);
      });

      row.addEventListener('click', () => {
        // Highlight active row
        document.querySelectorAll('.playlist-track-row').forEach(r => {
          r.classList.remove('bg-emerald-500/10', 'border-emerald-500/30', 'active');
        });
        row.classList.add('bg-emerald-500/10', 'border-emerald-500/30', 'active');

        player.loop = false;

        // The shared selector preserves an existing radio queue and only
        // creates a new one for a genuinely new track.
        playTrackAndStartRadio(track);
        switchToQueueTab();
        renderQueueList();
      });

      container.appendChild(row);
    });
  }

  // ─── Tab switching (Search, Queue, Playlists) ───────────────────────────
  function switchToTab(tabName) {
    const searchView    = document.getElementById('search-view-wrapper');
    const queueView     = document.getElementById('queue-view-container');
    const playlistsView = document.getElementById('playlists-view-container');
    const tabSearch     = document.getElementById('deck-tab-search');
    const tabQueue      = document.getElementById('deck-tab-queue');
    const tabPlaylists  = document.getElementById('deck-tab-playlists');

    if (searchView)    searchView.style.display    = (tabName === 'search') ? '' : 'none';
    if (queueView)     queueView.style.display     = (tabName === 'queue') ? '' : 'none';
    if (playlistsView) playlistsView.style.display = (tabName === 'playlists') ? '' : 'none';

    if (tabSearch) {
      tabSearch.classList.toggle('vq-tab-active', tabName === 'search');
      tabSearch.classList.toggle('vq-tab-inactive', tabName !== 'search');
    }
    if (tabQueue) {
      tabQueue.classList.toggle('vq-tab-active', tabName === 'queue');
      tabQueue.classList.toggle('vq-tab-inactive', tabName !== 'queue');
    }
    if (tabPlaylists) {
      tabPlaylists.classList.toggle('vq-tab-active', tabName === 'playlists');
      tabPlaylists.classList.toggle('vq-tab-inactive', tabName !== 'playlists');
    }

    if (tabName === 'queue') renderQueueList();
    if (tabName === 'playlists') renderPlaylistsView();
  }
  window.switchToTab = switchToTab;

  function switchToQueueTab() { switchToTab('queue'); }
  function switchToSearchTab() { switchToTab('search'); }
  function switchToPlaylistsTab() { switchToTab('playlists'); }

  // Wire tab buttons (injected in HTML)
  document.getElementById('deck-tab-search')?.addEventListener('click', switchToSearchTab);
  document.getElementById('deck-tab-queue')?.addEventListener('click',  switchToQueueTab);
  document.getElementById('deck-tab-playlists')?.addEventListener('click', switchToPlaylistsTab);

  // Wire Favorite / Like button
  const likeBtn = document.getElementById('void-like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const curTrack = window.currentActiveTrack || (window.playQueue && window.playQueue[window.currentQueueIndex]);
      if (curTrack) {
        toggleLikeTrack(curTrack);
      }
    });
  }

  // Wire Add-to-Playlist button on player card
  const addPlBtn = document.getElementById('void-add-to-pl-btn');
  if (addPlBtn) {
    addPlBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const curTrack = window.currentActiveTrack || (window.playQueue && window.playQueue[window.currentQueueIndex]);
      if (curTrack) {
        openPlaylistPicker(curTrack);
      } else {
        alert('No track currently selected.');
      }
    });
  }

  // Initialize MediaSession handlers and storage
  loadLikedTracks();
  loadCustomPlaylists();
  initMediaSessionHandlers();

  // ─── Queue list renderer ─────────────────────────────────────────────────
  function renderQueueList() {
    const parentEl = document.getElementById('queue-view-container');
    const el = document.getElementById('queue-items-list') || parentEl;
    if (!el) return;
    const queue  = window.playQueue || [];
    const curIdx = window.currentQueueIndex || 0;
    const badge  = document.getElementById('deck-tab-queue-badge');
    if (badge) badge.textContent = Math.max(0, queue.length - curIdx - 1);

    if (queue.length === 0) {
      el.innerHTML = '<p style="color:#4b5563;font-size:11px;font-family:monospace;padding:24px;text-align:center;">// NO QUEUE — PLAY A TRACK</p>';
      return;
    }

    el.innerHTML = queue.map((t, i) => {
      const isNow  = i === curIdx;
      const isPast = i < curIdx;
      const cover  = t.cover || 'assets/images/album-art.png';
      // Past rows: dimmed but still show a ↩ rewind cursor to signal they're clickable
      return `
        <div class="vq-row queue-item-row" data-qi="${i}"
             style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:8px;
                    cursor:pointer;border:1px solid ${isNow ? 'rgba(16,185,129,0.25)' : 'transparent'};
                    background:${isNow ? 'rgba(16,185,129,0.07)' : 'transparent'};
                    opacity:${isPast ? '0.4' : '1'};transition:opacity .15s,background .15s;">
          <span style="font-family:monospace;font-size:10px;color:${isNow ? '#10b981' : isPast ? '#374151' : '#4b5563'};min-width:18px;text-align:center;">${isNow ? '▶' : isPast ? '↩' : i + 1}</span>
          <img class="q-thumb" src="${cover}" onerror="this.src='assets/images/album-art.png'" style="width:34px;height:34px;border-radius:5px;object-fit:cover;flex-shrink:0;">
          <div style="flex:1;min-width:0;overflow:hidden;">
            <div style="font-size:12px;font-weight:500;color:${isNow ? '#10b981' : '#e5e7eb'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.title}</div>
            <div style="font-size:11px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.artist}</div>
          </div>
          ${isNow ? '<span style="display:flex;align-items:flex-end;gap:2px;height:14px;"><span style="width:3px;background:#10b981;border-radius:2px;animation:qeq .7s ease-in-out infinite alternate;"></span><span style="width:3px;background:#10b981;border-radius:2px;animation:qeq .7s .15s ease-in-out infinite alternate;"></span><span style="width:3px;background:#10b981;border-radius:2px;animation:qeq .7s .3s ease-in-out infinite alternate;"></span></span>' : ''}
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <span style="font-family:monospace;font-size:10px;color:${isNow ? '#10b981' : '#4b5563'};">${t.duration || ''}</span>
            <button class="void-q-add-pl" data-qi="${i}" title="Add to Playlist"
                    style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#9ca3af;width:20px;height:20px;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;line-height:1;transition:all .15s;">
              +
            </button>
          </div>
        </div>`;
    }).join('');

    // Bind click on ALL rows — no index restriction, any track is jumpable
    el.querySelectorAll('.vq-row').forEach(row => {
      row.addEventListener('click', () => {
        const idx = parseInt(row.dataset.qi, 10);
        window.currentQueueIndex = idx;
        window.currentTrackIndex = idx;
        const targetTrack = window.playQueue[idx];

        // Active Playback Cover Sync:
        const cleanKey = `${(targetTrack?.title || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}||${(targetTrack?.artist || '').replace(/\(.*?\)|\[.*?\]/g, '').trim().toLowerCase()}`;
        const cached = targetTrack?.cover && !isMissingOrPlaceholderCover(targetTrack.cover)
          ? targetTrack.cover
          : (artworkCache.get(cleanKey) || null);

        const coverEl = document.getElementById('album-cover-img');
        if (cached && coverEl) {
          coverEl.src = cached;
          if (targetTrack) targetTrack.cover = cached;
        }

        window.playSelectedTrack(targetTrack);
        renderQueueList();
      });
    });

    el.querySelectorAll('.void-q-add-pl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.qi, 10);
        if (queue[idx]) openPlaylistPicker(queue[idx]);
      });
    });
  }

  // Expose for onended
  window.renderQueueList = renderQueueList;

  // Direct Audio Playback Engine
  let scriptResolverToken = 0;
  async function playTrackDirect(track, fromQueue = false) {
    const thisToken = ++scriptResolverToken;

    // Initialize queue on manual selection if not starting via radio
    if (!fromQueue && (!window.playQueue || window.playQueue.length <= 1)) {
      window.playQueue = [track];
      window.currentQueueIndex = 0;
      window.currentTrackIndex = 0;
    }

    // Pause ambient background music if active
    if (coreAudio && !coreAudio.paused) coreAudio.pause();
    if (window.backgroundAmbientAudio) {
      try { window.backgroundAmbientAudio.pause(); } catch(e) {}
    }

    const titleEl = document.getElementById('current-track-title') || modalTrackTitle;
    const artistEl = document.getElementById('current-track-artist') || modalArtistTag;
    const coverEl = document.getElementById('album-cover-img');

    if (titleEl) titleEl.innerText = track.title;
    if (artistEl) artistEl.innerText = track.artist;
    if (track.cover && coverEl) coverEl.src = track.cover;

    // Resolve HD cover if placeholder
    if (!track.cover || track.cover === 'assets/images/album-art.png') {
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(track.title + ' ' + track.artist)}&entity=song&limit=1`)
        .then(r => r.json())
        .then(d => {
          if (d.results?.[0]?.artworkUrl100) {
            const hd = d.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
            track.cover = hd;
            if (coverEl && thisToken === scriptResolverToken) coverEl.src = hd;
          }
        })
        .catch(() => {});
    }

    // Sync other widgets if present
    if (cardTrackTitle) cardTrackTitle.textContent = track.title;
    if (cardArtistTag) cardArtistTag.textContent = track.artist;
    if (ambientTrackName) ambientTrackName.textContent = track.title;
    if (ambientTrackSub) ambientTrackSub.textContent = track.artist;

    // Resolve direct audio stream
    let streamUrl = null;
    const searchQuery = `${track.title} ${track.artist}`;
    const searchEndpoints = [
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchQuery)}&page=1&limit=1`,
      `https://saavn-api-one.vercel.app/search/songs?query=${encodeURIComponent(searchQuery)}`,
      `https://saavn-api.vercel.app/search/songs?query=${encodeURIComponent(searchQuery)}`
    ];

    for (const endpoint of searchEndpoints) {
      if (thisToken !== scriptResolverToken) return;
      try {
        const res = await fetch(endpoint);
        if (!res.ok) continue;
        const json = await res.json();
        let cand = null;

        if (Array.isArray(json) && json.length > 0) {
          cand = json[0];
        } else if (json.data && Array.isArray(json.data.results) && json.data.results.length > 0) {
          cand = json.data.results[0];
        } else if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          cand = json.data[0];
        }

        if (cand) {
          if (cand.downloadUrl) {
            if (Array.isArray(cand.downloadUrl)) {
              const best = cand.downloadUrl[cand.downloadUrl.length - 1];
              streamUrl = typeof best === 'string' ? best : (best.link || best.url);
            } else if (typeof cand.downloadUrl === 'string') {
              streamUrl = cand.downloadUrl;
            }
          } else if (cand.media_url) {
            streamUrl = cand.media_url;
          } else if (cand.url && typeof cand.url === 'string' && cand.url.includes('.saavncdn.com')) {
            streamUrl = cand.url;
          }
        }
        if (streamUrl) break;
      } catch(e) {}
    }

    if (thisToken !== scriptResolverToken) return;

    if (!streamUrl) {
      streamUrl = track.previewUrl || track.src || 'music.mp3';
    }

    // Force clean audio element refresh
    deckAudio.pause();
    deckAudio.removeAttribute('src');
    deckAudio.load();

    // IMPORTANT: Set crossOrigin BEFORE src to avoid CORS-mode mismatch
    deckAudio.crossOrigin = "anonymous";
    deckAudio.muted = false;
    deckAudio.volume = 0.9;

    // Use HTTPS directly
    deckAudio.src = streamUrl.replace(/^http:\/\//i, 'https://');

    // Resume AudioContext if suspended (autoplay policy)
    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    deckAudio.play()
      .then(() => {
        console.log("// AUDIO PLAYING AT VOLUME:", deckAudio.volume, "MUTED:", deckAudio.muted, "SRC:", deckAudio.src);
        syncAllUI(true);
      })
      .catch(err => {
        console.warn("Direct stream blocked:", err);
        // Retry without crossOrigin — some Saavn CDN mirrors block anonymous mode
        deckAudio.crossOrigin = null;
        deckAudio.muted = false;
        if (track.previewUrl && deckAudio.src !== track.previewUrl) {
          deckAudio.src = track.previewUrl;
          deckAudio.play().then(() => syncAllUI(true)).catch(() => syncAllUI(false));
        } else {
          deckAudio.play().then(() => syncAllUI(true)).catch(() => syncAllUI(false));
        }
      });
  }

  const playTrackHybrid = window.playSelectedTrack;
  const playTrack = window.playSelectedTrack;

  // Volume Slider (secondary binding removed — already bound above at line ~1801)
  // Keeping only a direct player.volume guard here
  player.muted = false;
  player.volume = Math.max(player.volume, 0.8);

  // Force Input Event Attachment (Wipe cloned listeners, bind Enter key)
  const searchBar = document.querySelector('input[type="text"][placeholder*="Search"]');
  if (searchBar) {
    const newSearchBar = searchBar.cloneNode(true);
    searchBar.parentNode.replaceChild(newSearchBar, searchBar);

    newSearchBar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = newSearchBar.value.trim();
        if (query.length > 0) {
          executeGlobalSearch(query);
        } else {
          renderPlaylist();
        }
      }
      if (e.key === 'Escape') {
        newSearchBar.value = '';
        renderPlaylist();
      }
    });
  }

  // Filter Tabs Event Handler
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      renderPlaylist();
    });
  });

  // ==========================================
  // WEB AUDIO API REAL-TIME VISUALIZER
  // ==========================================
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;

  function initWebAudioNodes() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        // Use the global singleton (player === coreAudio === deckAudio)
        sourceNode = audioCtx.createMediaElementSource(player);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        // Ensure volume is audible after routing through WebAudio graph
        player.muted = false;
        player.volume = Math.max(player.volume, 0.8);
        console.log("// WebAudio graph initialized. Volume:", player.volume);
      } catch (e) {
        console.warn("// WebAudio init error (may already be connected):", e.message);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Resume AudioContext whenever audio starts playing (autoplay policy fix)
  player.addEventListener('play', () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => console.log("// AudioContext resumed on play"));
    }
    // Ensure the element itself is audible
    if (player.muted) player.muted = false;
    if (player.volume < 0.1) player.volume = 0.8;
  });

  function resizeVisualizerCanvas() {
    if (!visualizerCanvas) return;
    visualizerCanvas.width = visualizerCanvas.parentElement.clientWidth || 400;
    visualizerCanvas.height = visualizerCanvas.parentElement.clientHeight || 200;
  }
  window.addEventListener('resize', resizeVisualizerCanvas);

  function renderVisualizerLoop() {
    requestAnimationFrame(renderVisualizerLoop);

    // 1. Render Modal Visualizer Canvas
    if (visualizerCanvas && modal && modal.classList.contains('open')) {
      const ctx = visualizerCanvas.getContext('2d');
      const w = visualizerCanvas.width;
      const h = visualizerCanvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!analyser || player.paused) {
        // Generative Idle Holographic Wave
        const t = Date.now() * 0.003;
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#10b981';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';

        for (let x = 0; x < w; x += 3) {
          const y = h / 2 + Math.sin(x * 0.025 + t) * 18 * Math.sin(t * 0.4) + Math.cos(x * 0.04 + t) * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        const bufferLen = analyser.frequencyBinCount;
        const dataArr = new Uint8Array(bufferLen);
        analyser.getByteFrequencyData(dataArr);

        const barWidth = (w / bufferLen) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLen; i++) {
          const barHeight = (dataArr[i] / 255) * h * 0.85;
          const grad = ctx.createLinearGradient(0, h - barHeight, 0, h);
          grad.addColorStop(0, '#10b981');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0.15)');

          ctx.fillStyle = grad;
          ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      }
    }

    // 2. Render Card Oscilloscope Fallback Canvas
    if (cardOscCanvas) {
      const oCtx = cardOscCanvas.getContext('2d');
      const ow = cardOscCanvas.width = cardOscCanvas.parentElement.clientWidth || 300;
      const oh = cardOscCanvas.height = cardOscCanvas.parentElement.clientHeight || 200;
      oCtx.clearRect(0, 0, ow, oh);

      const t2 = Date.now() * 0.0025;
      oCtx.beginPath();
      oCtx.lineWidth = 1.5;
      oCtx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      oCtx.shadowBlur = 8;
      oCtx.shadowColor = 'rgba(16, 185, 129, 0.5)';

      for (let x = 0; x < ow; x += 4) {
        const y = oh * 0.65 + Math.sin(x * 0.03 + t2) * 14 * Math.sin(t2 * 0.7);
        if (x === 0) oCtx.moveTo(x, y);
        else oCtx.lineTo(x, y);
      }
      oCtx.stroke();
      oCtx.shadowBlur = 0;
    }
  }

  // Video Fallback Route
  if (cardVideo) {
    cardVideo.addEventListener('error', () => {
      console.info('[VOID_BEATS] Background video route fell back to live oscilloscope canvas.');
      if (cardOscCanvas) cardOscCanvas.style.opacity = '0.7';
    }, true);
  }

  // Attempt Autoplay on interaction
  function attemptAutoplay() {
    if (coreAudio.muted) coreAudio.muted = false;
    if (coreAudio.paused) {
      coreAudio.play().then(() => syncAllUI(true)).catch(() => {});
    }
  }
  document.addEventListener('click', () => {
    if (!hasUserInteracted) {
      hasUserInteracted = true;
      initWebAudioNodes();
    }
  }, { once: true });

  // Initial Boot
  loadTrack(0, false);
  renderPlaylist();
  resizeVisualizerCanvas();
  renderVisualizerLoop();

})();

// ==========================================
// BUTTON RIPPLE & SOUND EFFECTS
// ==========================================
(() => {
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playClickSound() {
    initAudio();

    const time = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Crisp, audible UI tick/blip
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(1600, time + 0.05);

    // Starting volume set to 0.4 (much louder than 0.08)
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  const buttons = document.querySelectorAll('.cyber-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', function (e) {
      playClickSound();

      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement('span');
      ripple.classList.add('cyber-ripple');

      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x - size / 2}px`;
      ripple.style.top = `${y - size / 2}px`;

      this.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 500);
    });
  });
})();

// ==========================================
// SYSTEM LOG PANEL
// ==========================================
(() => {
  const logText = document.getElementById('log-text');
  if (!logText) return;

  const messages = [
    "Signal locked.",
    "Scanning nearby frequencies...",
    "Unknown input detected.",
    "User presence confirmed.",
    "Bypassing security protocols...",
    "Rerouting power to main thrusters.",
    "Particle engine nominal.",
    "Intercepting local comms.",
    "Awaiting command input.",
    "Grid stabilization complete.",
    "Establishing secure handshake...",
    "Data packet intercepted.",
    "Ghost in the machine detected."
  ];

  let currentTimer = null;

  function typeMessage(msg) {
    if (currentTimer) clearTimeout(currentTimer);

    logText.classList.add('typing');
    logText.textContent = "";
    let i = 0;

    function typeChar() {
      if (i < msg.length) {
        logText.textContent += msg.charAt(i);
        i++;
        currentTimer = setTimeout(typeChar, 25 + Math.random() * 40); // Typewriter speed
      } else {
        setTimeout(() => {
          logText.classList.remove('typing'); // Turn OFF glow after typing completes
        }, 1500);
      }
    }

    typeChar();
  }

  function triggerRandomLog() {
    const nextInterval = 5000 + Math.random() * 5000; // 5 to 10 seconds random cycle
    const msg = messages[Math.floor(Math.random() * messages.length)];
    typeMessage(msg);

    setTimeout(triggerRandomLog, nextInterval);
  }

  // Start the log loop shortly after pageload
  setTimeout(triggerRandomLog, 2500);
})();

// ==========================================
// MOOD SYNC (CROSS-TAB)
// ==========================================
(() => {
  window.moodState = localStorage.getItem('void_mood') || 'idle';

  window.addEventListener('storage', (e) => {
    if (e.key === 'void_mood') {
      window.moodState = e.newValue;
      applyMoodState();
    }
  });

  function applyMoodState() {
    const scanlines = document.querySelector('.scanlines');
    if (!scanlines) return;

    if (window.moodState === 'cctv_on') {
      scanlines.classList.add('heavy-glitch');
    } else {
      scanlines.classList.remove('heavy-glitch');
    }
  }

  // Initial check
  applyMoodState();
})();

// ==========================================
// EASTER EGG (GHOST PROTOCOL)
// ==========================================
(() => {
  let vCount = 0;
  let vTimer = null;

  document.addEventListener('keydown', (e) => {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key.toLowerCase() === 'v') {
      vCount++;
      clearTimeout(vTimer);

      if (vCount >= 5) {
        vCount = 0;
        triggerGhostProtocol();
      } else {
        vTimer = setTimeout(() => { vCount = 0; }, 800); // 800ms window to type 'v' 5 times
      }
    } else {
      vCount = 0; // Reset if any other key is pressed
    }
  });

  function triggerGhostProtocol() {
    // Create blood-red flash
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.backgroundColor = '#ff2244';
    flash.style.zIndex = '9999';
    flash.style.pointerEvents = 'none';
    flash.style.mixBlendMode = 'difference';
    flash.style.transition = 'opacity 0.2s';

    // Create disturbing text
    const msg = document.createElement('div');
    msg.innerText = "YOU WEREN'T SUPPOSED TO FIND THIS.";
    msg.style.position = 'fixed';
    msg.style.top = '50%';
    msg.style.left = '50%';
    msg.style.transform = 'translate(-50%, -50%)';
    msg.style.color = '#fff';
    msg.style.fontFamily = "'Orbitron', sans-serif";
    msg.style.fontSize = 'clamp(40px, 8vw, 100px)';
    msg.style.fontWeight = '900';
    msg.style.textAlign = 'center';
    msg.style.textShadow = '10px 0 0 #ff2244, -10px 0 0 #00dd55';
    msg.style.zIndex = '10000';
    msg.style.pointerEvents = 'none';
    msg.style.textTransform = 'uppercase';

    // Shake animation
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes ghostShake {
        0%, 100% { transform: translate(-50%, -50%); }
        10% { transform: translate(-52%, -48%) rotate(-2deg); }
        20% { transform: translate(-48%, -50%) rotate(2deg); }
        30% { transform: translate(-50%, -52%) rotate(-1deg); }
        40% { transform: translate(-49%, -49%) rotate(1deg); }
        50% { transform: translate(-51%, -51%) rotate(-2deg); }
      }
      .ghost-active { animation: ghostShake 0.15s infinite; }
    `;
    document.head.appendChild(style);
    msg.classList.add('ghost-active');

    document.body.appendChild(flash);
    document.body.appendChild(msg);

    // Apply glitch to scanlines
    const scanlines = document.querySelector('.scanlines');
    if (scanlines) scanlines.classList.add('heavy-glitch');

    // Generative Glitch Alarm Sound
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, audioCtx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 2.5);
    } catch (e) {
      console.warn('Audio Context blocked for easter egg');
    }

    // Log the anomaly to the custom HUD log we built earlier
    const logText = document.getElementById('log-text');
    if (logText) {
      logText.classList.add('typing');
      logText.textContent = "FATAL ANOMALY DETECTED.";
      logText.style.color = "#ff2244";
      setTimeout(() => {
        logText.style.color = "";
        logText.classList.remove('typing');
      }, 3000);
    }

    // Terminate anomaly after 2.5s
    setTimeout(() => {
      flash.style.opacity = '0';
      msg.style.opacity = '0';
      if (scanlines && window.moodState !== 'cctv_on') {
        scanlines.classList.remove('heavy-glitch');
      }

      setTimeout(() => {
        flash.remove();
        msg.remove();
        style.remove();
      }, 500);
    }, 2500);
  }
})();

// ==========================================
// TERMINAL COMMAND INTERFACE (`T` key)
// ==========================================
(() => {
  let isOpen = false;

  // 1. Inject Styles dynamically
  const style = document.createElement('style');
  style.innerHTML = `
    #cyber-term-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(5,5,8,0.95);
      backdrop-filter: blur(5px);
      font-family: 'Share Tech Mono', monospace;
      color: #00dd55;
      padding: 40px;
      display: none; flex-direction: column;
      opacity: 0; transition: opacity 0.2s;
    }
    #cyber-term-overlay.open {
      display: flex; opacity: 1;
    }
    #term-history {
      flex: 1; overflow-y: auto; margin-bottom: 20px;
      display: flex; flex-direction: column; gap: 8px;
    }
    #term-history::-webkit-scrollbar { width: 4px; }
    #term-history::-webkit-scrollbar-thumb { background: #00dd55; }
    .term-line { display: flex; gap: 10px; font-size: 14px; letter-spacing: 1px; }
    .term-prompt { color: #00dd55; font-weight: bold; }
    .term-input-row { display: flex; gap: 10px; align-items: center; font-size: 16px; }
    #term-input {
      background: transparent; border: none; outline: none;
      color: #fff; font-family: 'Share Tech Mono', monospace;
      font-size: 16px; flex: 1; text-shadow: 0 0 5px #00dd55;
    }
    .term-msg { color: #fff; }
    .term-err { color: #ff2244; }
  `;
  document.head.appendChild(style);

  // 2. Inject DOM Elements
  const overlay = document.createElement('div');
  overlay.id = 'cyber-term-overlay';
  overlay.innerHTML = `
    <div id="term-history">
      <div class="term-line"><span class="term-msg">VOID OS v2.0.26 INITIALIZED. Type 'help' for commands.</span></div>
    </div>
    <div class="term-input-row">
      <span class="term-prompt">root@void:~#</span>
      <input type="text" id="term-input" autocomplete="off" spellcheck="false" autofocus>
    </div>
  `;
  document.body.appendChild(overlay);

  const historyEl = document.getElementById('term-history');
  const inputEl = document.getElementById('term-input');

  function printLine(text, isErr = false) {
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = `<span class="${isErr ? 'term-err' : 'term-msg'}">${text}</span>`;
    historyEl.appendChild(line);
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function handleCommand(cmd) {
    const trimmed = cmd.trim().toLowerCase();

    // Echo the command
    const echo = document.createElement('div');
    echo.className = 'term-line';
    echo.innerHTML = `<span class="term-prompt">root@void:~#</span> <span class="term-msg">${cmd}</span>`;
    historyEl.appendChild(echo);

    if (trimmed === '') return;

    // Command Logic
    if (trimmed === 'help') {
      printLine('AVAILABLE COMMANDS:');
      printLine('  help        - Show this message');
      printLine('  open fm     - Connect to WORLD FM module');
      printLine('  open vision - Tap into global CCTV feeds');
      printLine('  clear       - Clear terminal output');
      printLine('  exit        - Close terminal interface');
    } else if (trimmed === 'open fm') {
      printLine('Establishing secure connection to WORLD FM...');
      setTimeout(() => { window.location.href = 'worldfm.html'; }, 600);
    } else if (trimmed === 'open vision') {
      printLine('Decrypting worldwide camera feeds...');
      setTimeout(() => { window.location.href = 'eyes.html'; }, 600);
    } else if (trimmed === 'clear') {
      historyEl.innerHTML = '';
    } else if (trimmed === 'exit') {
      toggleTerminal();
    } else {
      printLine(`command not found: ${cmd}`, true);
    }
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function toggleTerminal() {
    isOpen = !isOpen;
    if (isOpen) {
      overlay.classList.add('open');
      setTimeout(() => inputEl.focus(), 100);
    } else {
      overlay.classList.remove('open');
      inputEl.value = '';
      inputEl.blur();
    }
  }

  // 3. Event Listeners
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 't' && !isOpen) {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      e.preventDefault();
      toggleTerminal();
    }
    if (e.key === 'Escape' && isOpen) {
      toggleTerminal();
    }
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = inputEl.value;
      inputEl.value = '';
      handleCommand(cmd);
    }
  });

  overlay.addEventListener('click', () => {
    inputEl.focus();
  });
})();

// ==========================================
// TIME-BASED SYSTEM (DAY/NIGHT)
// ==========================================
(() => {
  const nightWrap = document.getElementById('night-bg-wrap');
  const nightVideo = document.getElementById('night-video');
  const navBrand = document.querySelector('.nav-brand');

  function checkTimeBasedTheme() {
    const hour = new Date().getHours();
    // Night is defined as 18:00 (6 PM) to 6:00 (6 AM)
    const isNight = (hour >= 18 || hour < 6);
    // Overriding temporarily for testing purposes to ensure the user can see it if they are testing during the day 
    // Wait, let's keep it strictly time-based as requested. The user says "raat ko different vibe din me different".

    if (isNight) {
      document.body.classList.add('night-mode');
      if (nightWrap) nightWrap.classList.add('active');
    } else {
      document.body.classList.remove('night-mode');
      if (nightWrap) nightWrap.classList.remove('active');
    }
  }

  // Initial check
  checkTimeBasedTheme();
  // Check every 1 minute
  setInterval(checkTimeBasedTheme, 60000);

  // Allow manual toggle via double click on brand logo for demo purposes if user is viewing during the day
  if (navBrand) {
    navBrand.addEventListener('dblclick', () => {
      document.body.classList.toggle('night-mode');
      if (nightWrap) nightWrap.classList.toggle('active');
    });
  }

  // Parallax effect for interactive night video
  document.addEventListener('mousemove', (e) => {
    if (document.body.classList.contains('night-mode') && nightVideo) {
      const xOffset = (e.clientX / window.innerWidth - 0.5) * 40;
      const yOffset = (e.clientY / window.innerHeight - 0.5) * 40;
      // Slight pan based on cursor position
      nightVideo.style.transform = `translate(${-xOffset}px, ${-yOffset}px)`;
    }
  });
})();

// =======================================================
// CYBERPUNK ANIMATION SUITE: HACKER DECRYPT & TEXT SCRAMBLE
// =======================================================
(() => {
  const SYMBOLS = '!<>-_\\/[]{}—=+*^?#________';
  const runningAnimations = new WeakMap();

  function scramble(el, duration = 600) {
    if (!el) return;
    const targetText = el.getAttribute('data-original-text') || el.textContent.trim();
    if (!el.getAttribute('data-original-text')) {
      el.setAttribute('data-original-text', targetText);
    }

    if (runningAnimations.has(el)) {
      cancelAnimationFrame(runningAnimations.get(el));
    }

    const length = targetText.length;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Progressive resolution of characters
      const resolvedCount = Math.floor(progress * length);

      let result = '';
      for (let i = 0; i < length; i++) {
        const char = targetText[i];
        if (char === ' ' || char === '\n' || char === '\t') {
          result += char;
        } else if (i < resolvedCount) {
          result += char;
        } else {
          result += SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        }
      }

      el.textContent = result;

      if (progress < 1) {
        runningAnimations.set(el, requestAnimationFrame(update));
      } else {
        el.textContent = targetText;
        runningAnimations.delete(el);
      }
    }

    runningAnimations.set(el, requestAnimationFrame(update));
  }

  function triggerHeaderScramble(headerEl) {
    const targets = headerEl.querySelectorAll('.scramble-target');
    if (targets.length > 0) {
      targets.forEach((t, i) => {
        setTimeout(() => scramble(t, 600), i * 60);
      });
    } else {
      scramble(headerEl, 600);
    }
  }

  // 1. Initial Page Load Trigger (Hero Header & initial viewport)
  function initScrambleOnLoad() {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
      setTimeout(() => triggerHeaderScramble(heroTitle), 250);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrambleOnLoad);
  } else {
    initScrambleOnLoad();
  }

  // 2. IntersectionObserver trigger on scroll into viewport
  const headers = document.querySelectorAll('.scramble-header');
  let lastTriggerTimes = new WeakMap();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const now = performance.now();
        const lastTrigger = lastTriggerTimes.get(entry.target) || 0;
        // Debounce by 1.2s to prevent retriggers on minor jitter
        if (now - lastTrigger > 1200) {
          lastTriggerTimes.set(entry.target, now);
          triggerHeaderScramble(entry.target);
        }
      }
    });
  }, { threshold: 0.35, rootMargin: '0px 0px -50px 0px' });

  headers.forEach(h => observer.observe(h));
})();

// =======================================================
// 3D PARALLAX TILT PHYSICS ON MODULE CARDS
// =======================================================
(() => {
  const cards = document.querySelectorAll('.feature-card, .module-card');

  cards.forEach(card => {
    let isInside = false;

    card.addEventListener('mouseenter', () => {
      isInside = true;
      card.style.transition = 'transform 0.08s ease-out, border-color 0.3s ease, box-shadow 0.3s ease';
    });

    card.addEventListener('mousemove', (e) => {
      if (!isInside) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const maxTilt = 8; // degrees
      const rx = (((centerY - y) / centerY) * maxTilt).toFixed(2);
      const ry = (((x - centerX) / centerX) * maxTilt).toFixed(2);

      card.style.setProperty('--rx', `${rx}deg`);
      card.style.setProperty('--ry', `${ry}deg`);
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      isInside = false;
      card.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.3s ease, box-shadow 0.3s ease';
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
})();
