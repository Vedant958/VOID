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
// ==========================================
// MUSIC PLAYER — HTML Audio Control
// Controls background music (music.mp3)
// ==========================================
(function initMusic() {
  const btn = document.getElementById('music-toggle');
  const bgMusic = document.getElementById('bg-music');
  const iconPlay = document.getElementById('music-icon-play');
  const iconPause = document.getElementById('music-icon-pause');
  const trackPanel = document.getElementById('music-track-panel');
  const playerWrap = document.getElementById('music-player');
  if (!btn || !bgMusic) return;

  let hasUserInteracted = false;

  function openPanel() {
    if (trackPanel) trackPanel.classList.add('open');
    if (playerWrap) playerWrap.classList.add('panel-open');
  }

  function closePanel() {
    if (trackPanel) trackPanel.classList.remove('open');
    if (playerWrap) playerWrap.classList.remove('panel-open');
  }

  // ------------------------------------------
  // Try to autoplay music
  // ------------------------------------------
  function attemptAutoplay() {
    if (bgMusic.muted) {
      bgMusic.muted = false;
    }
    if (bgMusic.paused) {
      bgMusic.play().catch(err => {
        console.warn('Autoplay blocked by browser policy. Click anywhere to play.');
      });
    }
  }

  // Attempt autoplay after a short delay
  setTimeout(attemptAutoplay, 500);

  // Ensure music plays on any user interaction
  document.addEventListener('click', () => {
    if (!hasUserInteracted) {
      hasUserInteracted = true;
      attemptAutoplay();
    }
  }, { once: true });

  // ------------------------------------------
  // Handle play/pause toggle
  // ------------------------------------------
  btn.addEventListener('click', () => {
    hasUserInteracted = true;
    if (bgMusic.muted) bgMusic.muted = false;

    if (bgMusic.paused) {
      bgMusic.play().catch(err => console.warn('Play failed:', err));
      btn.classList.add('playing');
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
      openPanel();
    } else {
      bgMusic.pause();
      btn.classList.remove('playing');
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
      closePanel();
    }
  });

  // ------------------------------------------
  // Sync button state with audio element
  // Update button appearance when music plays
  // ------------------------------------------
  bgMusic.addEventListener('play', () => {
    btn.classList.add('playing');
    iconPlay.classList.add('hidden');
    iconPause.classList.remove('hidden');
    openPanel();
  });

  bgMusic.addEventListener('pause', () => {
    btn.classList.remove('playing');
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
    closePanel();
  });

  // Optional: Add keyboard shortcut (spacebar to toggle)
  document.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.key === 'm' || e.key === 'M') && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      hasUserInteracted = true;
      btn.click();
    }
  });
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

