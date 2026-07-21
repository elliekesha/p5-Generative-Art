/*
  Reactive Civic Sun System
  --------------------------------
  Features
  - Circles react to each other
  - Long-lived circles
  - Archived background memory
  - Mouse generates new circles
  - Sun attraction + orbit
  - Clean editable settings at the top
*/

const SETTINGS = {
  canvas: {
    background: [0, 0, 0]
  },

  sun: {
    xRatio: 0.32,
    yRatio: 0.55,
    radiusRatio: 0.1,
    attractStrength: 0.08,
    orbitStrength: 0.06,
    coreColor: [245, 213, 102],
    glowColor: [255, 220, 110],
    glowLayers: 10,
    glowStep: 14,
    glowAlpha: 10,
    shadowBlur: 45,
    highlightOffsetX: -0.2,
    highlightOffsetY: -0.2,
    highlightSizeRatio: 0.55,
    highlightColor: [255, 245, 190, 55]
  },

  flow: {
    enabled: true,
    lineSpacing: 10,
    pointSpacing: 30,
    noiseScaleX: 0.1,
    noiseScaleY: 0.06,
    noiseSpeed: 0.03,
    displacement: 50,
    strokeAlpha: 60,
    colorBase: [160, 130, 90]
  },

  activeCircles: {
    initialCount: 800,
    maxCount: 820,

    minRadius: 5,
    maxRadius: 52,

    minStroke: 1.0,
    maxStroke: 2.2,

    minAlpha: 130,
    maxAlpha: 220,

    spawnDistanceMin: 0.9,
    spawnDistanceMax: 4.6,
    spawnJitter: 16,

    maxSpeed: 10,
    damping: 5,

    neighborRadius: 120,
    repelDistance: 50,
    repelStrength: 0.018,
    attractStrength: 0.005,
    alignStrength: 0.003,

    wobbleStrength: 0.015,

    glowChance: 0.28,
    glowBlur: 10,
    glowColor: "rgba(255, 174, 0, 0.82)",
    color: [193, 163, 77],

    birthFrames: 500,
    activeFrames: 1400,
    fadeFrames: 700
  },

  archivedCircles: {
    maxCount: 1800,
    alphaMultiplier: 0.922,
    strokeMultiplier: 10.7,
    driftAmount: 0.03
  },

  mouseSpawn: {
    enabled: false,
    circlesPerMove: 2,
    positionJitter: 18,
    velocityJitter: 0.6,
    radiusMin: 10,
    radiusMax: 46,
    alphaMin: 150,
    alphaMax: 235,
    strokeMin: 1.0,
    strokeMax: 2.2,
    glowChance: 0.52
  },

  overlay: {
    enabled: true,
    pointCount: 140,
    alpha: 8
  }
};

let activeCircles = [];
let archivedCircles = [];
let flowOffset = 0;
let sun = {};

function setup() {
  createCanvas(windowWidth, windowHeight);
  initializeSun();
  generateInitialCircles();
}

function draw() {
  drawBackground();
  drawFlowField();
  drawArchivedCircles();
  drawSun();
  updateActiveCircles();
  drawActiveCircles();
  drawOverlayNoise();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initializeSun();
}

function initializeSun() {
  sun = {
    x: width * SETTINGS.sun.xRatio,
    y: height * SETTINGS.sun.yRatio,
    r: min(width, height) * SETTINGS.sun.radiusRatio
  };
}

function drawBackground() {
  const bg = SETTINGS.canvas.background;
  background(bg[0], bg[1], bg[2]);
}

function drawFlowField() {
  const flow = SETTINGS.flow;
  if (!flow.enabled) return;

  push();
  noFill();

  for (let y = 0; y < height; y += flow.lineSpacing) {
    beginShape();

    for (let x = 0; x <= width; x += flow.pointSpacing) {
      const n = noise(x * flow.noiseScaleX, y * flow.noiseScaleY, flowOffset);
      const yy = y + map(n, 0, 1, -flow.displacement, flow.displacement);

      stroke(
        flow.colorBase[0] + 20 * sin((x + y) * 0.01),
        flow.colorBase[1] + 20 * n,
        flow.colorBase[2],
        flow.strokeAlpha
      );

      vertex(x, yy);
    }

    endShape();
  }

  flowOffset += flow.noiseSpeed;
  pop();
}

function drawSun() {
  const s = SETTINGS.sun;

  push();
  noStroke();

  for (let i = s.glowLayers; i > 0; i--) {
    const glowRadius = sun.r + i * s.glowStep;
    fill(s.coreColor[0], s.coreColor[1], s.coreColor[2], s.glowAlpha);
    ellipse(sun.x, sun.y, glowRadius * 2);
  }

  drawingContext.shadowBlur = s.shadowBlur;
  drawingContext.shadowColor = rgbaString(s.glowColor, 0.85);

  fillColor(s.coreColor);
  ellipse(sun.x, sun.y, sun.r * 2);

  drawingContext.shadowBlur = 0;

  fillColor(s.highlightColor);
  ellipse(
    sun.x + sun.r * s.highlightOffsetX,
    sun.y + sun.r * s.highlightOffsetY,
    sun.r * s.highlightSizeRatio
  );

  pop();
}

function generateInitialCircles() {
  const c = SETTINGS.activeCircles;
  activeCircles = [];

  for (let i = 0; i < c.initialCount; i++) {
    const angle = random(TWO_PI);
    const d = random(sun.r * c.spawnDistanceMin, sun.r * c.spawnDistanceMax);
    activeCircles.push(createCircleAroundSun(angle, d));
  }
}

function createCircleAroundSun(angle, distanceFromSun) {
  const c = SETTINGS.activeCircles;

  return {
    x: sun.x + cos(angle) * distanceFromSun + random(-c.spawnJitter, c.spawnJitter),
    y: sun.y + sin(angle) * distanceFromSun + random(-c.spawnJitter, c.spawnJitter),

    vx: random(-0.4, 0.4),
    vy: random(-0.4, 0.4),

    ax: 0,
    ay: 0,

    r: random(c.minRadius, c.maxRadius),
    baseAlpha: random(c.minAlpha, c.maxAlpha),
    strokeW: random(c.minStroke, c.maxStroke),

    age: floor(random(0, c.activeFrames * 0.35)),
    birthFrames: c.birthFrames,
    activeFrames: c.activeFrames,
    fadeFrames: c.fadeFrames,

    glow: random() < c.glowChance,
    seed: random(1000)
  };
}

function createCircleAtMouse() {
  const m = SETTINGS.mouseSpawn;
  const c = SETTINGS.activeCircles;

  return {
    x: mouseX + random(-m.positionJitter, m.positionJitter),
    y: mouseY + random(-m.positionJitter, m.positionJitter),

    vx: random(-m.velocityJitter, m.velocityJitter),
    vy: random(-m.velocityJitter, m.velocityJitter),

    ax: 0,
    ay: 0,

    r: random(m.radiusMin, m.radiusMax),
    baseAlpha: random(m.alphaMin, m.alphaMax),
    strokeW: random(m.strokeMin, m.strokeMax),

    age: 0,
    birthFrames: c.birthFrames,
    activeFrames: c.activeFrames,
    fadeFrames: c.fadeFrames,

    glow: random() < m.glowChance,
    seed: random(1000)
  };
}

function mouseMoved() {
  if (!SETTINGS.mouseSpawn.enabled) return;
  if (!isMouseInsideCanvas()) return;

  for (let i = 0; i < SETTINGS.mouseSpawn.circlesPerMove; i++) {
    activeCircles.push(createCircleAtMouse());
  }
}

function isMouseInsideCanvas() {
  return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}

function updateActiveCircles() {
  for (let i = 0; i < activeCircles.length; i++) {
    const circle = activeCircles[i];

    circle.ax = 0;
    circle.ay = 0;

    applyNeighborForces(circle, i);
    applySunForces(circle);
    applyWobble(circle);
    integrateCircle(circle);

    circle.age++;
  }

  archiveExpiredCircles();
  trimActiveCircleCount();
}

function applyNeighborForces(circle, selfIndex) {
  const c = SETTINGS.activeCircles;

  let avgVX = 0;
  let avgVY = 0;
  let neighborCount = 0;

  for (let i = 0; i < activeCircles.length; i++) {
    if (i === selfIndex) continue;

    const other = activeCircles[i];
    const dx = other.x - circle.x;
    const dy = other.y - circle.y;
    const d = sqrt(dx * dx + dy * dy);

    if (d <= 0 || d > c.neighborRadius) continue;

    neighborCount++;
    avgVX += other.vx;
    avgVY += other.vy;

    if (d < c.repelDistance) {
      const force = (1 - d / c.repelDistance) * c.repelStrength;
      circle.ax -= (dx / d) * force;
      circle.ay -= (dy / d) * force;
    } else {
      const localAttract = c.attractStrength * (1 - d / c.neighborRadius);
      circle.ax += (dx / d) * localAttract;
      circle.ay += (dy / d) * localAttract;
    }
  }

  if (neighborCount > 0) {
    avgVX /= neighborCount;
    avgVY /= neighborCount;

    circle.ax += (avgVX - circle.vx) * c.alignStrength;
    circle.ay += (avgVY - circle.vy) * c.alignStrength;
  }
}

function applySunForces(circle) {
  const dx = sun.x - circle.x;
  const dy = sun.y - circle.y;
  const d = max(1, sqrt(dx * dx + dy * dy));

  const radialX = dx / d;
  const radialY = dy / d;

  circle.ax += radialX * SETTINGS.sun.attractStrength;
  circle.ay += radialY * SETTINGS.sun.attractStrength;

  const tangentX = -radialY;
  const tangentY = radialX;

  circle.ax += tangentX * SETTINGS.sun.orbitStrength;
  circle.ay += tangentY * SETTINGS.sun.orbitStrength;
}

function applyWobble(circle) {
  const wobble = SETTINGS.activeCircles.wobbleStrength;

  circle.ax += sin(frameCount * 0.02 + circle.seed) * wobble;
  circle.ay += cos(frameCount * 0.018 + circle.seed) * wobble;
}

function integrateCircle(circle) {
  const c = SETTINGS.activeCircles;

  circle.vx += circle.ax;
  circle.vy += circle.ay;

  circle.vx *= c.damping;
  circle.vy *= c.damping;

  const speed = sqrt(circle.vx * circle.vx + circle.vy * circle.vy);
  if (speed > c.maxSpeed) {
    circle.vx = (circle.vx / speed) * c.maxSpeed;
    circle.vy = (circle.vy / speed) * c.maxSpeed;
  }

  circle.x += circle.vx;
  circle.y += circle.vy;

  softlyContain(circle);
}

function softlyContain(circle) {
  const margin = 40;

  if (circle.x < -margin) {
    circle.x = -margin;
    circle.vx *= -0.5;
  }
  if (circle.x > width + margin) {
    circle.x = width + margin;
    circle.vx *= -0.5;
  }
  if (circle.y < -margin) {
    circle.y = -margin;
    circle.vy *= -0.5;
  }
  if (circle.y > height + margin) {
    circle.y = height + margin;
    circle.vy *= -0.5;
  }
}

function isExpired(circle) {
  const totalLife = circle.birthFrames + circle.activeFrames + circle.fadeFrames;
  return circle.age > totalLife;
}

function toArchivedCircle(circle) {
  const a = SETTINGS.archivedCircles;

  return {
    x: circle.x,
    y: circle.y,
    r: circle.r,
    alpha: circle.baseAlpha * a.alphaMultiplier,
    strokeW: circle.strokeW * a.strokeMultiplier,
    seed: circle.seed
  };
}

function archiveExpiredCircles() {
  const survivors = [];

  for (const circle of activeCircles) {
    if (isExpired(circle)) {
      archivedCircles.push(toArchivedCircle(circle));
    } else {
      survivors.push(circle);
    }
  }

  activeCircles = survivors;
  trimArchivedCircleCount();
}

function trimActiveCircleCount() {
  const maxCount = SETTINGS.activeCircles.maxCount;
  const extra = activeCircles.length - maxCount;
  if (extra <= 0) return;

  const removed = activeCircles.splice(0, extra);
  archivedCircles.push(...removed.map(toArchivedCircle));
  trimArchivedCircleCount();
}

function trimArchivedCircleCount() {
  const maxCount = SETTINGS.archivedCircles.maxCount;
  if (archivedCircles.length > maxCount) {
    archivedCircles.splice(0, archivedCircles.length - maxCount);
  }
}

function drawArchivedCircles() {
  const color = SETTINGS.activeCircles.color;
  const drift = SETTINGS.archivedCircles.driftAmount;

  push();
  noFill();

  for (const circle of archivedCircles) {
    const offset = sin(frameCount * 0.003 + circle.seed) * drift;

    stroke(color[0], color[1], color[2], circle.alpha);
    strokeWeight(circle.strokeW);
    ellipse(circle.x + offset, circle.y + offset, circle.r * 2);
  }

  pop();
}

function drawActiveCircles() {
  const color = SETTINGS.activeCircles.color;

  for (const circle of activeCircles) {
    const alpha = getCircleDisplayAlpha(circle);
    const scale = getCircleDisplayScale(circle);

    push();
    noFill();

    if (circle.glow) {
      drawingContext.shadowBlur = SETTINGS.activeCircles.glowBlur;
      drawingContext.shadowColor = SETTINGS.activeCircles.glowColor;
    } else {
      drawingContext.shadowBlur = 0;
    }

    stroke(color[0], color[1], color[2], alpha);
    strokeWeight(circle.strokeW);
    ellipse(circle.x, circle.y, circle.r * 2 * scale);

    drawingContext.shadowBlur = 0;
    pop();
  }
}

function getCircleDisplayAlpha(circle) {
  if (circle.age < circle.birthFrames) {
    return map(circle.age, 0, circle.birthFrames, 0, circle.baseAlpha);
  }

  if (circle.age < circle.birthFrames + circle.activeFrames) {
    return circle.baseAlpha;
  }

  const fadeAge = circle.age - (circle.birthFrames + circle.activeFrames);
  return map(fadeAge, 0, circle.fadeFrames, circle.baseAlpha, 0);
}

function getCircleDisplayScale(circle) {
  if (circle.age < circle.birthFrames) {
    return map(circle.age, 0, circle.birthFrames, 0.35, 1);
  }
  return 1;
}

function drawOverlayNoise() {
  const overlay = SETTINGS.overlay;
  if (!overlay.enabled) return;

  push();
  stroke(255, 255, 255, overlay.alpha);

  for (let i = 0; i < overlay.pointCount; i++) {
    point(random(width), random(height));
  }

  pop();
}

function fillColor(arr) {
  fill(arr[0], arr[1], arr[2], arr.length === 4 ? arr[3] : 255);
}

function rgbaString(rgbArray, alpha) {
  return `rgba(${rgbArray[0]}, ${rgbArray[1]}, ${rgbArray[2]}, ${alpha})`;
}