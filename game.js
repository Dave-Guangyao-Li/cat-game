const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const menuPanel = document.getElementById("menu-panel");
const startBtn = document.getElementById("start-btn");

const WORLD_WIDTH = canvas.width;
const WORLD_HEIGHT = canvas.height;

const STATIONS = [
  { id: "food", label: "Food", x: 130, y: 120, color: "#f2a35e", radius: 40 },
  { id: "toy", label: "Toy", x: 830, y: 120, color: "#78bf78", radius: 40 },
  { id: "clean", label: "Clean", x: 150, y: 430, color: "#6fb4d6", radius: 40 },
  { id: "bed", label: "Bed", x: 810, y: 430, color: "#ae8fe9", radius: 40 },
];

const defaultState = () => ({
  mode: "menu",
  world: {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    coordinateSystem: "origin=top-left; +x=right; +y=down",
  },
  player: {
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: 20,
    speed: 230,
  },
  score: 0,
  modeTimer: 0,
  cycleTimer: 0,
  spawnTimer: 0,
  actionCooldown: 0,
  petCooldown: 0,
  specialCooldown: 0,
  messageTimer: 0,
  message: "Press Enter to start",
  nearestStationId: null,
  stations: STATIONS.map((s) => ({ ...s })),
  collectibles: [],
  stats: {
    hunger: 78,
    happiness: 74,
    cleanliness: 72,
    energy: 70,
    health: 100,
  },
  keys: new Set(),
});

let state = defaultState();
let lastTs = performance.now();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function showMenu(isVisible) {
  menuPanel.classList.toggle("menu-hidden", !isVisible);
}

function resizeCanvasDisplay() {
  const viewportWidth = window.innerWidth * 0.96;
  const viewportHeight = window.innerHeight * 0.9;
  const targetAspect = WORLD_WIDTH / WORLD_HEIGHT;
  let drawWidth = viewportWidth;
  let drawHeight = drawWidth / targetAspect;
  if (drawHeight > viewportHeight) {
    drawHeight = viewportHeight;
    drawWidth = drawHeight * targetAspect;
  }
  canvas.style.width = `${Math.floor(drawWidth)}px`;
  canvas.style.height = `${Math.floor(drawHeight)}px`;
}

function setMessage(text, seconds = 1.2) {
  state.message = text;
  state.messageTimer = seconds;
}

function startGame() {
  state = defaultState();
  state.mode = "playing";
  state.message = "";
  showMenu(false);
}

function restartFromResult() {
  startGame();
  setMessage("New run started", 1.2);
}

function togglePause() {
  if (state.mode === "playing") {
    state.mode = "paused";
    setMessage("Paused", 0.8);
    return;
  }
  if (state.mode === "paused") {
    state.mode = "playing";
    setMessage("Back to play", 0.8);
  }
}

async function toggleFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement) {
    await root.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
  resizeCanvasDisplay();
}

function boostStat(statName, delta) {
  state.stats[statName] = clamp(state.stats[statName] + delta, 0, 100);
}

function nearestStation() {
  let winner = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const station of state.stations) {
    const dx = station.x - state.player.x;
    const dy = station.y - state.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < bestDistance) {
      bestDistance = dist;
      winner = { station, dist };
    }
  }
  if (winner && winner.dist <= winner.station.radius + 34) {
    return winner.station;
  }
  return null;
}

function interactStation() {
  if (state.mode !== "playing" || state.actionCooldown > 0) return;
  const station = nearestStation();
  if (!station) {
    setMessage("Move near a station first", 0.9);
    return;
  }
  if (station.id === "food") {
    boostStat("hunger", 30);
    boostStat("energy", 4);
    setMessage("Cat finished a meal");
  } else if (station.id === "toy") {
    boostStat("happiness", 24);
    boostStat("energy", -10);
    boostStat("cleanliness", -6);
    setMessage("Great playtime");
  } else if (station.id === "clean") {
    boostStat("cleanliness", 33);
    boostStat("happiness", 4);
    setMessage("Clean and comfy");
  } else if (station.id === "bed") {
    boostStat("energy", 36);
    boostStat("hunger", -6);
    setMessage("Nice cat nap");
  }
  state.score += 1;
  state.actionCooldown = 0.3;
}

function petCat() {
  if (state.mode !== "playing" || state.petCooldown > 0) return;
  boostStat("happiness", 12);
  boostStat("health", 5);
  state.petCooldown = 0.85;
  setMessage("Purr purr", 0.9);
}

function useTreatSkill() {
  if (state.mode !== "playing" || state.specialCooldown > 0) return;
  boostStat("hunger", 18);
  boostStat("happiness", 14);
  boostStat("energy", 5);
  state.specialCooldown = 6.5;
  state.score += 1;
  setMessage("Special treat used", 1.1);
}

function onKeyDown(event) {
  const key = event.key;
  const lower = key.toLowerCase();
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "f", "a", "b", "Enter"].includes(key) || ["f", "a", "b", "enter"].includes(lower)) {
    event.preventDefault();
  }

  state.keys.add(key);

  if (key === "f" || lower === "f") {
    toggleFullscreen().catch(() => {});
  }

  if ((key === "Enter" || lower === "enter") && state.mode === "menu") {
    startGame();
    return;
  }
  if ((key === "Enter" || lower === "enter") && (state.mode === "won" || state.mode === "lost")) {
    restartFromResult();
    return;
  }
  if ((key === "a" || lower === "a") && (state.mode === "playing" || state.mode === "paused")) {
    togglePause();
    return;
  }
  if ((key === "b" || lower === "b") && state.mode === "playing") {
    useTreatSkill();
    return;
  }
  if ((key === " " || key === "Spacebar" || event.code === "Space") && state.mode === "playing") {
    petCat();
    return;
  }
  if ((key === "Enter" || lower === "enter") && state.mode === "playing") {
    interactStation();
  }
}

function onKeyUp(event) {
  state.keys.delete(event.key);
}

function axis(negativeKey, positiveKey) {
  const neg = state.keys.has(negativeKey) ? 1 : 0;
  const pos = state.keys.has(positiveKey) ? 1 : 0;
  return pos - neg;
}

function spawnCollectible() {
  const margin = 100;
  state.collectibles.push({
    id: crypto.randomUUID(),
    x: margin + Math.random() * (WORLD_WIDTH - margin * 2),
    y: margin + Math.random() * (WORLD_HEIGHT - margin * 2),
    r: 10,
    ttl: 12,
    type: Math.random() > 0.5 ? "fish" : "ball",
  });
}

function updateStats(dt, moved) {
  boostStat("hunger", -2.5 * dt);
  boostStat("happiness", -1.8 * dt);
  boostStat("cleanliness", -1.6 * dt);
  boostStat("energy", -(moved ? 2.3 : 1.1) * dt);

  const minCare = Math.min(state.stats.hunger, state.stats.happiness, state.stats.cleanliness, state.stats.energy);
  if (minCare < 20) {
    boostStat("health", -6.3 * dt);
  } else {
    boostStat("health", 2.1 * dt);
  }

  state.cycleTimer += dt;
  if (state.cycleTimer >= 12) {
    state.cycleTimer = 0;
    if (minCare >= 60) {
      state.score += 2;
      setMessage("Great care cycle +2", 1.1);
    } else {
      boostStat("health", -7);
      setMessage("Care quality low", 1.1);
    }
  }
}

function updateCollectibles(dt) {
  state.spawnTimer += dt;
  if (state.spawnTimer >= 4.5) {
    state.spawnTimer = 0;
    if (state.collectibles.length < 3) {
      spawnCollectible();
    }
  }

  for (let i = state.collectibles.length - 1; i >= 0; i--) {
    const item = state.collectibles[i];
    item.ttl -= dt;
    const dx = item.x - state.player.x;
    const dy = item.y - state.player.y;
    if (Math.hypot(dx, dy) <= item.r + state.player.radius) {
      boostStat("happiness", 8);
      boostStat("energy", 4);
      state.score += 1;
      setMessage("Collected a bonus", 0.8);
      state.collectibles.splice(i, 1);
      continue;
    }
    if (item.ttl <= 0) {
      state.collectibles.splice(i, 1);
    }
  }
}

function update(dt) {
  state.modeTimer += dt;

  if (state.messageTimer > 0) {
    state.messageTimer = Math.max(0, state.messageTimer - dt);
  } else if (state.mode === "playing") {
    state.message = "";
  }

  state.actionCooldown = Math.max(0, state.actionCooldown - dt);
  state.petCooldown = Math.max(0, state.petCooldown - dt);
  state.specialCooldown = Math.max(0, state.specialCooldown - dt);

  if (state.mode !== "playing") {
    return;
  }

  const moveX = axis("ArrowLeft", "ArrowRight");
  const moveY = axis("ArrowUp", "ArrowDown");
  const moving = moveX !== 0 || moveY !== 0;
  const norm = moving ? 1 / Math.hypot(moveX, moveY) : 0;

  state.player.vx = moveX * state.player.speed * norm;
  state.player.vy = moveY * state.player.speed * norm;
  state.player.x = clamp(state.player.x + state.player.vx * dt, state.player.radius, WORLD_WIDTH - state.player.radius);
  state.player.y = clamp(state.player.y + state.player.vy * dt, state.player.radius, WORLD_HEIGHT - state.player.radius);

  const station = nearestStation();
  state.nearestStationId = station ? station.id : null;

  updateStats(dt, moving);
  updateCollectibles(dt);

  if (state.stats.health <= 0) {
    state.mode = "lost";
    showMenu(true);
    state.message = "Cat got sick. Press Enter to restart";
    return;
  }
  if (state.score >= 20) {
    state.mode = "won";
    showMenu(true);
    state.message = "Happy cat home achieved! Press Enter to play again";
  }
}

function drawBackdrop() {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  gradient.addColorStop(0, "#254f74");
  gradient.addColorStop(1, "#122a42");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  for (let i = 0; i < 16; i++) {
    const y = 70 + i * 30;
    ctx.fillRect(0, y, WORLD_WIDTH, 1);
  }
}

function drawStations() {
  for (const station of state.stations) {
    ctx.fillStyle = station.color;
    ctx.beginPath();
    ctx.arc(station.x, station.y, station.radius, 0, Math.PI * 2);
    ctx.fill();

    const isNear = state.nearestStationId === station.id;
    ctx.strokeStyle = isNear ? "#fff5cc" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = isNear ? 4 : 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(18, 30, 48, 0.85)";
    ctx.font = "600 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(station.label, station.x, station.y + 5);
  }
}

function drawCollectibles() {
  for (const item of state.collectibles) {
    ctx.fillStyle = item.type === "fish" ? "#ffd47d" : "#ffe8f7";
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(26, 30, 48, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawCat() {
  const { x, y, radius } = state.player;

  const bodyColor = "#eea062";
  const faceColor = "#f7c894";
  const accentColor = "#1d2a40";

  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + radius * 0.9, y + radius * 0.5);
  ctx.quadraticCurveTo(x + radius * 1.5, y + radius * 0.2, x + radius * 1.25, y - radius * 0.55);
  ctx.stroke();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.28, radius * 0.9, radius * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  const headY = y - radius * 0.35;
  ctx.beginPath();
  ctx.arc(x, headY, radius * 0.72, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - radius * 0.6, headY - radius * 0.2);
  ctx.lineTo(x - radius * 0.3, headY - radius * 0.95);
  ctx.lineTo(x - radius * 0.05, headY - radius * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + radius * 0.6, headY - radius * 0.2);
  ctx.lineTo(x + radius * 0.3, headY - radius * 0.95);
  ctx.lineTo(x + radius * 0.05, headY - radius * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = faceColor;
  ctx.beginPath();
  ctx.ellipse(x, headY + radius * 0.1, radius * 0.45, radius * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(x - radius * 0.22, headY - radius * 0.1, 2.1, 0, Math.PI * 2);
  ctx.arc(x + radius * 0.22, headY - radius * 0.1, 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d56e76";
  ctx.beginPath();
  ctx.moveTo(x, headY + radius * 0.08);
  ctx.lineTo(x - 3, headY + radius * 0.2);
  ctx.lineTo(x + 3, headY + radius * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 4, headY + radius * 0.23);
  ctx.lineTo(x - 9, headY + radius * 0.32);
  ctx.moveTo(x + 4, headY + radius * 0.23);
  ctx.lineTo(x + 9, headY + radius * 0.32);
  ctx.stroke();

  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.45, headY + radius * 0.14);
  ctx.lineTo(x - radius * 0.88, headY + radius * 0.08);
  ctx.moveTo(x - radius * 0.45, headY + radius * 0.28);
  ctx.lineTo(x - radius * 0.88, headY + radius * 0.36);
  ctx.moveTo(x + radius * 0.45, headY + radius * 0.14);
  ctx.lineTo(x + radius * 0.88, headY + radius * 0.08);
  ctx.moveTo(x + radius * 0.45, headY + radius * 0.28);
  ctx.lineTo(x + radius * 0.88, headY + radius * 0.36);
  ctx.stroke();
}

function drawStatBar(x, y, label, value, color) {
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x, y, 130, 14);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, (130 * value) / 100, 14);
  ctx.fillStyle = "#eef3ff";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${label}: ${Math.round(value)}`, x, y - 4);
}

function drawHud() {
  drawStatBar(20, 24, "Hunger", state.stats.hunger, "#f4b56f");
  drawStatBar(20, 56, "Happiness", state.stats.happiness, "#7bd67d");
  drawStatBar(20, 88, "Clean", state.stats.cleanliness, "#86ccf5");
  drawStatBar(20, 120, "Energy", state.stats.energy, "#b0a0f5");
  drawStatBar(20, 152, "Health", state.stats.health, "#ff7b7b");

  ctx.fillStyle = "#f6f4ec";
  ctx.font = "700 18px sans-serif";
  ctx.fillText(`Score: ${state.score}`, WORLD_WIDTH - 132, 34);

  if (state.message) {
    ctx.fillStyle = "rgba(12, 22, 34, 0.72)";
    ctx.fillRect(WORLD_WIDTH / 2 - 180, WORLD_HEIGHT - 58, 360, 34);
    ctx.fillStyle = "#f6f4ec";
    ctx.textAlign = "center";
    ctx.font = "600 15px sans-serif";
    ctx.fillText(state.message, WORLD_WIDTH / 2, WORLD_HEIGHT - 35);
  }

  if (state.mode === "paused") {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "700 32px sans-serif";
    ctx.fillText("Paused", WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }
}

function draw() {
  drawBackdrop();
  drawStations();
  drawCollectibles();
  drawCat();
  drawHud();
}

function tick(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTs) / 1000));
  lastTs = now;
  update(dt);
  draw();
  requestAnimationFrame(tick);
}

function advanceTime(ms) {
  const step = 1000 / 60;
  const count = Math.max(1, Math.round(ms / step));
  for (let i = 0; i < count; i++) {
    update(step / 1000);
  }
  draw();
}

function renderGameToText() {
  const payload = {
    mode: state.mode,
    coordinateSystem: state.world.coordinateSystem,
    world: { width: state.world.width, height: state.world.height },
    player: {
      x: Number(state.player.x.toFixed(1)),
      y: Number(state.player.y.toFixed(1)),
      vx: Number(state.player.vx.toFixed(2)),
      vy: Number(state.player.vy.toFixed(2)),
      radius: state.player.radius,
    },
    nearestStationId: state.nearestStationId,
    stations: state.stations.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      radius: s.radius,
    })),
    collectibles: state.collectibles.map((c) => ({
      type: c.type,
      x: Number(c.x.toFixed(1)),
      y: Number(c.y.toFixed(1)),
      ttl: Number(c.ttl.toFixed(2)),
    })),
    stats: {
      hunger: Number(state.stats.hunger.toFixed(1)),
      happiness: Number(state.stats.happiness.toFixed(1)),
      cleanliness: Number(state.stats.cleanliness.toFixed(1)),
      energy: Number(state.stats.energy.toFixed(1)),
      health: Number(state.stats.health.toFixed(1)),
    },
    score: state.score,
    timers: {
      cycle: Number(state.cycleTimer.toFixed(2)),
      message: Number(state.messageTimer.toFixed(2)),
      actionCooldown: Number(state.actionCooldown.toFixed(2)),
      petCooldown: Number(state.petCooldown.toFixed(2)),
      specialCooldown: Number(state.specialCooldown.toFixed(2)),
    },
    message: state.message,
  };
  return JSON.stringify(payload);
}

startBtn.addEventListener("click", startGame);
window.addEventListener("resize", resizeCanvasDisplay);
window.addEventListener("fullscreenchange", resizeCanvasDisplay);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);

window.render_game_to_text = renderGameToText;
window.advanceTime = advanceTime;

resizeCanvasDisplay();
draw();
requestAnimationFrame(tick);
