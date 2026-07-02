/* ── Star field — disk centered on ring, rotates around ring center ── */
(function () {
  const canvas = document.getElementById('stars');
  const ctx    = canvas.getContext('2d');

  let W, H;
  let lastFrameTs = 0;
  const mouse = { x: -9999, y: -9999 };
  const warp  = { x: -9999, y: -9999 };
  const EASE  = 0.04;

  function clearPointerInfluence() {
    mouse.x = -9999;
    mouse.y = -9999;
    /* Snap warp too so attraction stops immediately when window loses focus. */
    warp.x = mouse.x;
    warp.y = mouse.y;
  }

  const STAR_COUNT    = 600;
  const ROT_SPEED     = (Math.PI * 2) / 120;   /* very fast inner swirl: ~1 full rotation every 2 min */
  const WARP_STRENGTH = 2800;
  const WARP_MAX      = 1.175;
  const WARP_RADIUS   = 51;
  const WARP_SOFTEN   = 40;
  const WARP_DAMP     = 0.915;
  const TANGENTIAL    = 0.24;
  const WARP_VMAX     = 1.85;

  const PAL = [
    [232, 228, 245],
    [232, 228, 245],
    [232, 228, 245],
    [232, 228, 245],
    [232, 228, 245],
    [255, 244, 215],
    [255, 228, 190],
    [210, 224, 255],
  ];

  const stars = [];

  let spiralState  = 'wait'; // starts invisible; erupt fires on first Start click
  let spiralStartT = 0;
  const COLLAPSE_DUR = 2.5;
  const ERUPT_DUR    = 1.4;

  /* disk origin = ring center; diskR = distance to farthest viewport corner */
  let diskCx = 0, diskCy = 0, diskR = 0;
  let mask   = null;

  function updateGeometry() {
    const el = document.getElementById('ringWrapEl');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return false;

    diskCx = rect.left + rect.width  / 2;
    diskCy = rect.top  + rect.height / 2;

    /* radius must reach every viewport corner from the ring center */
    diskR = Math.max(
      Math.hypot(diskCx,         diskCy),
      Math.hypot(W - diskCx,     diskCy),
      Math.hypot(diskCx,     H - diskCy),
      Math.hypot(W - diskCx, H - diskCy),
    ) * 1.04;

    mask = {
      cx:     diskCx,
      cy:     diskCy,
      radius: 98 * (rect.width / 260),  /* event horizon inside r=103 (min of innermost ghost ring) */
    };
    return true;
  }

  function mkStar() {
    const bright = Math.random() < 0.07;
    const c = PAL[Math.floor(Math.random() * PAL.length)];
    const dist  = diskR * Math.sqrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const rNorm = dist / diskR;
    const centerBoost = 1 + Math.pow(1 - rNorm, 2) * 2.6;
    const baseAngSpeed = (ROT_SPEED * centerBoost) / (1 + rNorm * 4.8 + rNorm * rNorm * 22);
    const angSpeed = baseAngSpeed * (0.93 + Math.random() * 0.14);
    return {
      dist, theta, angSpeed,
      sz:    bright ? Math.random() * 1.5 + 1.8 : Math.pow(Math.random(), 1.6) * 1.9 + 0.3,
      base:  bright ? Math.random() * 0.12 + 0.78 : Math.random() * 0.52 + 0.18,
      phase: Math.random() * Math.PI * 2,
      speed: bright ? Math.random() * 0.35 + 0.08 : Math.random() * 1.6 + 0.5,
      rgb: `rgb(${c[0]},${c[1]},${c[2]})`,
      vx: 0, vy: 0,
      swirlDir: Math.random() < 0.5 ? -1 : 1,
    };
  }

  function populate() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) stars.push(mkStar());
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    /* fall back to screen center if ring not yet laid out */
    if (!updateGeometry()) {
      diskCx = W / 2;
      diskCy = H / 2;
      diskR  = Math.hypot(W, H) / 2;
    }
    populate();
    warp.x = mouse.x;
    warp.y = mouse.y;
  }

  function draw(ts) {
    const minInterval = 1000 / ((typeof CFG !== 'undefined' && CFG.starsFps) || 60);
    if (ts - lastFrameTs < minInterval) {
      if (!document.hidden) requestAnimationFrame(draw);
      return;
    }
    lastFrameTs = ts;

    const t = ts * 0.001;

    warp.x += (mouse.x - warp.x) * EASE;
    warp.y += (mouse.y - warp.y) * EASE;

    ctx.clearRect(0, 0, W, H);

    /* spiral progress */
    let colP = 0, eruptP = 0;
    if (spiralState === 'collapsing') {
      colP = Math.min((t - spiralStartT) / COLLAPSE_DUR, 1);
      if (colP >= 1) spiralState = 'wait';
    } else if (spiralState === 'erupting') {
      eruptP = Math.min((t - spiralStartT) / ERUPT_DUR, 1);
      if (eruptP >= 1) spiralState = 'idle';
    }

    for (const s of stars) {
      /* orbital position — spin faster as stars collapse */
      const spinMult = spiralState === 'collapsing' ? 1 + colP * 12 : 1;
      const a  = s.theta + t * s.angSpeed * spinMult;
      let px = diskCx + s.dist * Math.cos(a);
      let py = diskCy + s.dist * Math.sin(a);
      const orbX = px;
      const orbY = py;

      /* cursor gravity with tangential component for slingshot-like arcs */
      if (spiralState === 'idle') {
        const gdx = px - warp.x;
        const gdy = py - warp.y;
        const gd  = Math.sqrt(gdx * gdx + gdy * gdy);
        if (gd < WARP_RADIUS && gd > 0.5) {
          const edgeFade = Math.pow(1 - gd / WARP_RADIUS, 1.5);
          const pull = Math.min(WARP_STRENGTH / (gd * gd + WARP_SOFTEN), WARP_MAX) * edgeFade;
          const ux = gdx / gd;
          const uy = gdy / gd;
          const tx = -uy * s.swirlDir;
          const ty =  ux * s.swirlDir;

          s.vx -= ux * pull;
          s.vy -= uy * pull;
          s.vx += tx * pull * TANGENTIAL * (0.45 + edgeFade * 0.55);
          s.vy += ty * pull * TANGENTIAL * (0.45 + edgeFade * 0.55);
        }

        s.vx *= WARP_DAMP;
        s.vy *= WARP_DAMP;

        const vMag = Math.hypot(s.vx, s.vy);
        if (vMag > WARP_VMAX) {
          const k = WARP_VMAX / vMag;
          s.vx *= k;
          s.vy *= k;
        }

        const nx = px + s.vx;
        const ny = py + s.vy;
        const ndx = nx - diskCx;
        const ndy = ny - diskCy;
        const nd  = Math.sqrt(ndx * ndx + ndy * ndy);

        if (nd > 4 && nd < diskR * 1.08) {
          s.dist  = nd;
          s.theta = Math.atan2(ndy, ndx) - t * s.angSpeed;
          px = nx;
          py = ny;
        }
      } else {
        s.vx *= 0.75;
        s.vy *= 0.75;
      }

      let alphaScale = 1;

      if (spiralState === 'collapsing') {
        const ease = Math.pow(colP, 0.65);
        px = px + (mask.cx - px) * ease;
        py = py + (mask.cy - py) * ease;
        alphaScale = 1 - Math.pow(ease, 1.2);
      } else if (spiralState === 'wait') {
        alphaScale = 0;
      } else if (spiralState === 'erupting') {
        const ease = 1 - Math.pow(1 - eruptP, 2.5);
        px = mask.cx + (orbX - mask.cx) * ease;
        py = mask.cy + (orbY - mask.cy) * ease;
        alphaScale = Math.pow(eruptP, 0.5);
      }

      const twinkle = Math.sin(t * s.speed + s.phase) * 0.28 + 0.72;
      const alpha   = s.base * twinkle * alphaScale;
      if (alpha < 0.005) continue;

      ctx.globalAlpha = alpha;
      ctx.fillStyle   = s.rgb;   /* pre-computed — zero string allocs per frame */
      ctx.beginPath();
      ctx.arc(px, py, s.sz, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    /* eruption flash — bloom burst from event horizon on bang */
    if (spiralState === 'erupting' && eruptP < 0.3 && mask) {
      const flashA = Math.pow(1 - eruptP / 0.3, 2) * 0.9;
      const r = mask.radius * 5;
      const g = ctx.createRadialGradient(mask.cx, mask.cy, 0, mask.cx, mask.cy, r);
      g.addColorStop(0,    `rgba(255,230,150,${flashA.toFixed(3)})`);
      g.addColorStop(0.25, `rgba(245,170,80,${(flashA * 0.55).toFixed(3)})`);
      g.addColorStop(1,    'rgba(200,100,40,0)');
      ctx.beginPath();
      ctx.arc(mask.cx, mask.cy, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    /* event horizon void — pitch-black, matched to --void */
    if (mask) {
      ctx.beginPath();
      ctx.arc(mask.cx, mask.cy, mask.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#060C12';
      ctx.fill();
    }

    if (!document.hidden) requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) requestAnimationFrame(draw);
  });

  window.starCollapse = function() {
    if (spiralState !== 'idle') return;
    spiralState  = 'collapsing';
    spiralStartT = performance.now() * 0.001;
    for (const s of stars) { s.vx = 0; s.vy = 0; }
  };
  window.starErupt = function() {
    if (spiralState !== 'wait') return;  /* only erupt from collapsed/initial state */
    spiralState  = 'erupting';
    spiralStartT = performance.now() * 0.001;
  };

  window.addEventListener('resize', () => { resize(); });
  window.addEventListener('scroll', () => { if (updateGeometry()) populate(); }, { passive: true });
  window.addEventListener('mousemove',  e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', clearPointerInfluence);
  window.addEventListener('blur', clearPointerInfluence);
  window.addEventListener('pagehide', clearPointerInfluence);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearPointerInfluence();
  });
  window.addEventListener('touchmove',  e => {
    if (e.touches.length) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
  }, { passive: true });
  window.addEventListener('touchend', clearPointerInfluence);
  window.addEventListener('touchcancel', clearPointerInfluence);

  /* re-center on ring after full layout + fonts load */
  window.addEventListener('load', () => { if (updateGeometry()) populate(); });

  resize();
  requestAnimationFrame(draw);
})();