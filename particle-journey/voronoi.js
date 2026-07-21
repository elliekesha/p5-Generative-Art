

/* ============================================================
   PARAMETERS
   ============================================================ */

const P = {
  // --- canvas ---
  background:         '#050505',
  pixelRatio:         Math.min(window.devicePixelRatio, 2),
  squareCanvas:       false,

  // --- sites ---
  count:              800,
  speedMin:           0.01,
  speedMax:           1.32,
  centerBias:         true,
  centerStrength:     26,
  margin:             30,

  // --- motion feel ---
  friction:           0.978,
  noiseStrength:      0.010,
  noiseScale:         0.022,
  noiseTimeSpeed:     0.0022,
  maxSpeedFactor:     1.8,

  // --- social field ---
  socialEnabled:      true,
  socialRadius:       95,
  preferredDistance:  508,
  socialRepel:        0.10,
  socialAttract:      0.0025,
  socialDamping:      10.995,

  // --- zones ---
  zonesEnabled:       true,
  zoneGatherForce:    0.009,
  zoneQuietSlowdown:  10.985,
  zoneThresholdPush:  10.0012,

  // --- cells ---
  fillCells:          true,
  colorSmall:         '#0b2a6a55',
  colorLarge:         '#c65b4e88',
  colorPresence:      '#f2d7a1',
  colorCalm:          '#6ea8ff',

  // --- edges ---
  drawEdges:          true,
  edgeColorSmall:     'rgba(130,170,255,0.55)',
  edgeColorLarge:     'rgba(255,255,255,0.92)',
  edgeWidthSmall:     0.8,
  edgeWidthLarge:     1.35,

  // --- dots ---
  drawDots:           true,
  dotColor:           '#ffffff',
  dotSizeMin:         1.8,
  dotSizeMax:         6.5,
  dotFixedSize:       3,
  dotScaleByArea:     true,

  // --- mouse / presence ---
  mouseEnabled:       true,
  mouseMode:          'presence', // 'presence' | 'repel' | 'attract' | 'vortex' | 'none'
  mouseRadius:        280,
  mouseStrength:      1.05,
  presenceWarmth:     0.32,
  presenceSlowdown:   0.992,

  // --- trails ---
  useTrails:          true,
  trailAlpha:         0.05,

  // --- recording ---
  videoDuration:      15,
  videoFPS:           60,
  videoBitrate:       8_000_000,

  // --- debug ---
  showHUD:            false,
  showDelaunay:       false,
};


/* ============================================================
   CANVAS
   ============================================================ */

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');
const hud    = document.getElementById('hud');

const recCanvas = document.createElement('canvas');
const recCtx    = recCanvas.getContext('2d');

let W, H;
let sites = [];
let zones = [];
let paused = false;
let lastT = 0;
let fpsSmooth = 0;

const mouse = {
  x: -9999,
  y: -9999,
  active: false,
};

let recorder     = null;
let recChunks    = [];
let recStartTime = 0;
let isRecording  = false;


/* ============================================================
   RESIZE
   ============================================================ */

function resize() {
  W = window.innerWidth;
  H = P.squareCanvas ? W : window.innerHeight;

  canvas.width        = W * P.pixelRatio;
  canvas.height       = H * P.pixelRatio;
  canvas.style.width  = `${W}px`;
  canvas.style.height = `${H}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(P.pixelRatio, P.pixelRatio);

  recCanvas.width  = W;
  recCanvas.height = H;

  buildZones();
  spawnSites();
}

window.addEventListener('resize', resize);


/* ============================================================
   ZONES
   ============================================================ */

function buildZones() {
  zones = [
    { x: W * 0.50, y: H * 0.42, r: Math.min(W, H) * 0.16, type: 'gather' },
    { x: W * 0.25, y: H * 0.72, r: Math.min(W, H) * 0.11, type: 'quiet'  },
    { x: W * 0.75, y: H * 0.72, r: Math.min(W, H) * 0.11, type: 'quiet'  },
    { x: W * 0.50, y: H * 0.84, r: Math.min(W, H) * 0.10, type: 'threshold' },
  ];
}


/* ============================================================
   SITES
   ============================================================ */

function biasedRand(strength) {
  let v = 0;
  for (let i = 0; i < strength; i++) v += Math.random();
  return v / strength;
}

function spawnSites() {
  sites = [];

  for (let i = 0; i < P.count; i++) {
    const rx    = P.centerBias ? biasedRand(P.centerStrength) : Math.random();
    const ry    = P.centerBias ? biasedRand(P.centerStrength) : Math.random();
    const speed = P.speedMin + Math.random() * (P.speedMax - P.speedMin);
    const angle = Math.random() * Math.PI * 2;

    sites.push({
      x: P.margin + rx * (W - P.margin * 2),
      y: P.margin + ry * (H - P.margin * 2),

      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,

      prevArea: 0,
      area: 0,
      areaDelta: 0,

      socialEnergy: 0,
      proximityCount: 0,
      calmness: 0,
      presence: 0,
    });
  }
}


/* ============================================================
   INPUT
   ============================================================ */

canvas.addEventListener('mousemove', e => {
  const b = canvas.getBoundingClientRect();
  mouse.x = e.clientX - b.left;
  mouse.y = e.clientY - b.top;
  mouse.active = true;
});

canvas.addEventListener('mouseleave', () => {
  mouse.active = false;
});

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const b = canvas.getBoundingClientRect();
  mouse.x = e.touches[0].clientX - b.left;
  mouse.y = e.touches[0].clientY - b.top;
  mouse.active = true;
}, { passive: false });

canvas.addEventListener('touchend', () => {
  mouse.active = false;
});


/* ============================================================
   KEYBOARD
   ============================================================ */

window.addEventListener('keydown', e => {
  if (e.key === ' ') paused = !paused;
  if (e.key === 'r' || e.key === 'R') spawnSites();

  if (e.key === 'h' || e.key === 'H') {
    P.showHUD = !P.showHUD;
    hud.classList.toggle('hidden', !P.showHUD);
  }

  if (e.key === 'd' || e.key === 'D') P.showDelaunay = !P.showDelaunay;
  if (e.key === 'v' || e.key === 'V') toggleRecord();

  if (e.key === 'm' || e.key === 'M') {
    if (P.mouseMode === 'presence') P.mouseMode = 'repel';
    else if (P.mouseMode === 'repel') P.mouseMode = 'attract';
    else if (P.mouseMode === 'attract') P.mouseMode = 'vortex';
    else if (P.mouseMode === 'vortex') P.mouseMode = 'none';
    else P.mouseMode = 'presence';
  }

  if (e.key === 't' || e.key === 'T') {
    P.useTrails = !P.useTrails;
  }
});

document.addEventListener('visibilitychange', () => {
  paused = document.hidden;
});


/* ============================================================
   RECORDING
   ============================================================ */

function toggleRecord() {
  isRecording ? stopRecord() : startRecord();
}

function startRecord() {
  if (isRecording) return;

  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

  const stream = recCanvas.captureStream(P.videoFPS);
  recorder     = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: P.videoBitrate
  });

  recChunks = [];

  recorder.ondataavailable = e => {
    if (e.data.size > 0) recChunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(recChunks, { type: mimeType });
    const url  = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `thuis-voronoi-${Date.now()}.webm`;
    a.click();

    URL.revokeObjectURL(url);
    updateRecBtn(false);
    isRecording = false;
  };

  recorder.start(100);
  recStartTime = performance.now();
  isRecording  = true;
  updateRecBtn(true);

  setTimeout(() => {
    if (isRecording) stopRecord();
  }, P.videoDuration * 1000);
}

function stopRecord() {
  if (recorder && recorder.state !== 'inactive') recorder.stop();
}

function updateRecBtn(active) {
  const btn = document.getElementById('rec-btn');
  if (!btn) return;

  btn.textContent       = active ? `■ stop  (${P.videoDuration}s)` : `● record  ${P.videoDuration}s`;
  btn.style.color       = active ? '#ff4444' : 'rgba(255,255,255,0.6)';
  btn.style.borderColor = active ? '#ff4444' : 'rgba(255,255,255,0.25)';
}


/* ============================================================
   MATH
   ============================================================ */

function circumcircle(a, b, c) {
  const D = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(D) < 1e-10) return null;

  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;

  const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / D;
  const y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / D;

  return { x, y, r2: (a.x - x) ** 2 + (a.y - y) ** 2 };
}

function triangulate(pts) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];

  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }

  const d = Math.max(x1 - x0, y1 - y0) * 10;
  const s = [
    { x: x0 - d,           y: y0 - (y1 - y0), _s: true },
    { x: x0 + (x1 - x0)/2, y: y1 + d,         _s: true },
    { x: x1 + d,           y: y0 - (y1 - y0), _s: true },
  ];

  let tris = [[s[0], s[1], s[2]]];

  for (const p of pts) {
    const bad = [];
    const edges = [];

    for (const t of tris) {
      const cc = circumcircle(t[0], t[1], t[2]);
      if (cc && (p.x - cc.x) ** 2 + (p.y - cc.y) ** 2 < cc.r2 + 0.01) {
        bad.push(t);
        edges.push([t[0], t[1]], [t[1], t[2]], [t[2], t[0]]);
      }
    }

    tris = tris.filter(t => !bad.includes(t));

    const boundary = edges.filter((e, i) =>
      !edges.some((f, j) => i !== j && e[0] === f[1] && e[1] === f[0])
    );

    for (const e of boundary) {
      tris.push([e[0], e[1], p]);
    }
  }

  return tris.filter(t => !t.some(v => v._s));
}

function voronoi(pts, tris) {
  const map = new Map(pts.map(p => [p, []]));

  for (const t of tris) {
    const cc = circumcircle(t[0], t[1], t[2]);
    if (!cc) continue;

    for (const v of t) {
      map.get(v)?.push(cc);
    }
  }

  return [...map.entries()]
    .filter(([, verts]) => verts.length >= 3)
    .map(([site, verts]) => {
      verts.sort((a, b) =>
        Math.atan2(a.y - site.y, a.x - site.x) - Math.atan2(b.y - site.y, b.x - site.x)
      );
      return { site, poly: verts };
    });
}

function polyArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    a += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return Math.abs(a) / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function flowAngle(x, y, now) {
  const n =
    Math.sin(x * P.noiseScale + now * P.noiseTimeSpeed) *
    Math.cos(y * P.noiseScale - now * P.noiseTimeSpeed * 0.7);
  return n * Math.PI * 2;
}

function parseColor(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}

function lerpColor(c1, c2, t) {
  const a = parseColor(c1);
  const b = parseColor(c2);
  const out = a.map((v, i) => Math.round(lerp(v, b[i], t)));
  return `rgba(${out[0]},${out[1]},${out[2]},${(out[3] / 255).toFixed(3)})`;
}


/* ============================================================
   SOCIAL / SPATIAL LOGIC
   ============================================================ */

function applySocialForces() {
  if (!P.socialEnabled) return;

  for (let i = 0; i < sites.length; i++) {
    const a = sites[i];

    for (let j = i + 1; j < sites.length; j++) {
      const b = sites[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d  = Math.hypot(dx, dy);

      if (d <= 0.001 || d > P.socialRadius) continue;

      const nx = dx / d;
      const ny = dy / d;

      if (d < P.preferredDistance) {
        const f = (1 - d / P.preferredDistance) * P.socialRepel;

        a.vx -= nx * f;
        a.vy -= ny * f;
        b.vx += nx * f;
        b.vy += ny * f;
      } else {
        const range = P.socialRadius - P.preferredDistance;
        const t = (d - P.preferredDistance) / Math.max(range, 0.001);
        const f = (1 - t) * P.socialAttract;

        a.vx += nx * f;
        a.vy += ny * f;
        b.vx -= nx * f;
        b.vy -= ny * f;
      }
    }
  }
}

function applyZoneForces(site) {
  if (!P.zonesEnabled) return;

  for (const z of zones) {
    const dx = z.x - site.x;
    const dy = z.y - site.y;
    const d  = Math.hypot(dx, dy);

    if (d > z.r || d <= 0.001) continue;

    const nx = dx / d;
    const ny = dy / d;
    const t  = 1 - d / z.r;

    if (z.type === 'gather') {
      site.vx += nx * t * P.zoneGatherForce;
      site.vy += ny * t * P.zoneGatherForce;
    }

    if (z.type === 'quiet') {
      const slowdown = lerp(1, P.zoneQuietSlowdown, t);
      site.vx *= slowdown;
      site.vy *= slowdown;
    }

    if (z.type === 'threshold') {
      site.vy -= t * P.zoneThresholdPush;
    }
  }
}

function measureSocialState() {
  for (const s of sites) {
    s.socialEnergy = 0;
    s.proximityCount = 0;
    s.presence = 0;
  }

  for (let i = 0; i < sites.length; i++) {
    const a = sites[i];

    for (let j = i + 1; j < sites.length; j++) {
      const b = sites[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d  = Math.hypot(dx, dy);

      if (d < P.socialRadius) {
        const tension = Math.max(0, 1 - d / P.socialRadius);
        a.socialEnergy += tension;
        b.socialEnergy += tension;
        a.proximityCount++;
        b.proximityCount++;
      }
    }
  }

  if (mouse.active) {
    for (const s of sites) {
      const dx = s.x - mouse.x;
      const dy = s.y - mouse.y;
      const d  = Math.hypot(dx, dy);

      if (d < P.mouseRadius) {
        s.presence = 1 - d / P.mouseRadius;
      }
    }
  }

  for (const s of sites) {
    s.calmness = 1 / (1 + s.socialEnergy * 0.7);
  }
}


/* ============================================================
   RENDER
   ============================================================ */

function renderScene(c, cells, tris, maxA) {
  if (P.useTrails) {
    c.fillStyle = `rgba(5,5,5,${P.trailAlpha})`;
    c.fillRect(0, 0, W, H);
  } else {
    c.fillStyle = P.background;
    c.fillRect(0, 0, W, H);
  }

  if (P.showDelaunay) {
    c.strokeStyle = 'rgba(0,200,255,0.18)';
    c.lineWidth   = 0.5;

    for (const t of tris) {
      c.beginPath();
      c.moveTo(t[0].x, t[0].y);
      c.lineTo(t[1].x, t[1].y);
      c.lineTo(t[2].x, t[2].y);
      c.closePath();
      c.stroke();
    }
  }

  for (const { site, poly } of cells) {
    const area  = polyArea(poly);
    const sizeT = Math.min(area / maxA, 1);
    const delta = clamp(site.areaDelta * 0.002, -1, 1);
    const socialT   = clamp(site.socialEnergy * 0.18, 0, 1);
    const calmT     = clamp(site.calmness, 0, 1);
    const presenceT = clamp(site.presence, 0, 1);

    c.beginPath();
    c.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) c.lineTo(poly[i].x, poly[i].y);
    c.closePath();

    if (P.fillCells) {
      let fillT = sizeT * 0.35 + socialT * 0.45 + delta * 0.16;
      fillT = clamp(fillT, 0, 1);

      let baseFill = lerpColor(P.colorSmall, P.colorLarge, fillT);

      if (presenceT > 0.001) {
        baseFill = lerpColor(baseFillToHex(baseFill), P.colorPresence, presenceT * P.presenceWarmth);
      } else if (calmT > 0.75) {
        const calmMix = (calmT - 0.75) / 0.25;
        baseFill = lerpColor(baseFillToHex(baseFill), P.colorCalm, calmMix * 0.25);
      }

      c.fillStyle = baseFill;
      c.fill();
    }

    if (P.drawEdges) {
      const edgeMix = clamp(sizeT * 0.45 + socialT * 0.55, 0, 1);
      c.strokeStyle = edgeMix < 0.5 ? P.edgeColorSmall : P.edgeColorLarge;
      c.lineWidth   = lerp(P.edgeWidthSmall, P.edgeWidthLarge, edgeMix + presenceT * 0.15);
      c.stroke();
    }

    if (P.drawDots) {
      const r = P.dotScaleByArea
        ? lerp(P.dotSizeMin, P.dotSizeMax, sizeT * 0.7 + socialT * 0.3)
        : P.dotFixedSize;

      c.beginPath();
      c.arc(site.x, site.y, r + presenceT * 1.2, 0, Math.PI * 2);
      c.fillStyle = P.dotColor;
      c.fill();
    }
  }
}

// helper to convert rgba(...) string into #rrggbbaa-ish compatible hex source via parsing
// keeps your lerpColor workflow simple
function baseFillToHex(rgbaString) {
  const nums = rgbaString.match(/[\d.]+/g);
  if (!nums) return '#000000ff';

  const r = clamp(Math.round(Number(nums[0])), 0, 255);
  const g = clamp(Math.round(Number(nums[1])), 0, 255);
  const b = clamp(Math.round(Number(nums[2])), 0, 255);
  const a = clamp(Math.round((Number(nums[3] ?? 1)) * 255), 0, 255);

  return (
    '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0') +
    a.toString(16).padStart(2, '0')
  );
}


/* ============================================================
   ANIMATION
   ============================================================ */

function updateSites(now) {
  applySocialForces();

  for (const s of sites) {
    // organic drift
    const a = flowAngle(s.x, s.y, now);
    s.vx += Math.cos(a) * P.noiseStrength;
    s.vy += Math.sin(a) * P.noiseStrength;

    // zones
    applyZoneForces(s);

    // mouse / presence
    if (P.mouseEnabled && P.mouseMode !== 'none' && mouse.active) {
      const dx = s.x - mouse.x;
      const dy = s.y - mouse.y;
      const d  = Math.hypot(dx, dy);

      if (d < P.mouseRadius && d > 0.5) {
        const f = (1 - d / P.mouseRadius) * P.mouseStrength * 0.06;

        if (P.mouseMode === 'repel') {
          s.vx += (dx / d) * f;
          s.vy += (dy / d) * f;
        } else if (P.mouseMode === 'attract') {
          s.vx -= (dx / d) * f;
          s.vy -= (dy / d) * f;
        } else if (P.mouseMode === 'vortex') {
          s.vx += (-dy / d) * f;
          s.vy += ( dx / d) * f;
        } else if (P.mouseMode === 'presence') {
          s.vx += (dx / d) * f * 0.35;
          s.vy += (dy / d) * f * 0.35;
          s.vx *= P.presenceSlowdown;
          s.vy *= P.presenceSlowdown;
        }
      }
    }

    // damping / friction
    s.vx *= P.socialDamping;
    s.vy *= P.socialDamping;
    s.vx *= P.friction;
    s.vy *= P.friction;

    // soft containment instead of hard bounce
    if (s.x < P.margin)         s.vx += 0.020;
    if (s.x > W - P.margin)     s.vx -= 0.020;
    if (s.y < P.margin)         s.vy += 0.020;
    if (s.y > H - P.margin)     s.vy -= 0.020;

    // speed cap
    const spd = Math.hypot(s.vx, s.vy);
    const cap = P.speedMax * P.maxSpeedFactor;
    if (spd > cap && spd > 0) {
      s.vx = (s.vx / spd) * cap;
      s.vy = (s.vy / spd) * cap;
    }

    s.x += s.vx;
    s.y += s.vy;

    // soft clamp to keep system stable
    s.x = clamp(s.x, P.margin, W - P.margin);
    s.y = clamp(s.y, P.margin, H - P.margin);
  }
}

function draw(now) {
  requestAnimationFrame(draw);
  if (paused) return;

  fpsSmooth = lerp(fpsSmooth, 1000 / (now - lastT || 16), 0.1);
  lastT = now;

  updateSites(now);

  let tris;
  try {
    tris = triangulate(sites);
  } catch (_) {
    return;
  }

  const cells = voronoi(sites, tris);

  for (const cell of cells) {
    const a = polyArea(cell.poly);
    cell.site.areaDelta = a - (cell.site.prevArea || a);
    cell.site.prevArea  = a;
    cell.site.area      = a;
  }

  measureSocialState();

  const maxA = W * H / 4;

  renderScene(ctx, cells, tris, maxA);

  if (isRecording) {
    renderScene(recCtx, cells, tris, maxA);
  }

  if (isRecording) {
    const progress = Math.min(
      (performance.now() - recStartTime) / (P.videoDuration * 1000),
      1
    );

    ctx.fillStyle = 'rgba(255,60,60,0.85)';
    ctx.fillRect(0, H - 3, W * progress, 3);
  }

  if (P.showHUD) {
    document.getElementById('hud-sites').textContent = sites.length;
    document.getElementById('hud-fps').textContent   = Math.round(fpsSmooth);
  }
}


/* ============================================================
   BOOT
   ============================================================ */

resize();
requestAnimationFrame(draw);