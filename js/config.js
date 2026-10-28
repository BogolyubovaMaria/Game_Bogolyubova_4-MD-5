const CONFIG = {
  WINDOW_WIDTH: 1280,
  WINDOW_HEIGHT: 720,
  LEVEL_WIDTH: 2560,

  GRAVITY: -4,
  PLAYER_MOVEMENT_SPEED: 5,
  PLAYER_JUMP_SPEED: 75,
  PLAYER_START_X: 64,
  PLAYER_START_Y: 115,

  PLAYER_START_HEALTH: 2,
  PLAYER_START_SCROLLS: 1,
  PLAYER_MAX_SCROLLS: 2,

  SHIELD_DURATION: 10,
  SHIELD_COOLDOWN_TIME: 1.0,

  ORANGE_SPHERE_SPEED: 9,
  FIREBALL_SPEED: 5,

  ENEMY_ATTACK_COOLDOWN_IN_FRAMES: 280,
  ENEMY_OFFSET_ABOVE_CLOUD: 90,
  FLOWER_OFFSET_ABOVE_GROUND: 5,

  ASSETS_PATH: "img/",
  RECORD_KEY: "flowalive_record",
};

const MONSTER_TYPES = {
  goblin: { useImage: true },
  slime:  { color: "#4CAF50", accent: "#2E7D32", eyes: "#1B5E20" },
  demon:  { color: "#D32F2F", accent: "#7B1010", eyes: "#FFEB3B" },
  bat:    { color: "#7B1FA2", accent: "#4A148C", eyes: "#FF5252" },
  ghost:  { color: "#B0BEC5", accent: "#78909C", eyes: "#212121" },
};

// ------------------------------------------------------------
// Генерация облаков с гарантией достижимости.
// Физика: прыжок с земли поднимает на ~170 px, покрывает ~300 px по горизонтали.
// Максимальный подъём между соседями — 25 px, шаг — 180 px.
// Первое облако — не выше 150, чтобы легко достать с земли.
// ------------------------------------------------------------
function buildLevel(cfg) {
  const id = cfg.id;
  const name = cfg.name;
  const levelWidth = cfg.levelWidth;
  const gapStarts = cfg.gapStarts || [];
  const cloudBase = cfg.cloudBase || 150;
  const cloudPattern = cfg.cloudPattern || 0;

  const clouds = [];
  const startX = 250;                         // ближе к старту игрока (x=64)
  const endX = levelWidth - 250;
  const numClouds = Math.max(3, Math.floor((endX - startX) / 180) + 1);
  const step = numClouds > 1 ? (endX - startX) / (numClouds - 1) : 180;

  const baseY = Math.min(160, Math.max(130, cloudBase));

  for (let i = 0; i < numClouds; i++) {
    const x = Math.round(startX + i * step);
    const yRaw = baseY + Math.sin(i * 0.5 + cloudPattern) * 25;
    let y = Math.max(130, Math.min(200, Math.round(yRaw)));
    if (i === 0) y = Math.min(y, 150);        // первое облако — достижимо с земли
    clouds.push([x, y]);
  }

  const groundGaps = gapStarts.map(x => [x, x + 130]);

  // Цветы — на земле, не в пропастях и не под облаками
  const flowers = [];
  const flowerStarts = cfg.flowerStarts || [];
  for (const x of flowerStarts) {
    let ok = true;
    for (const [g1, g2] of groundGaps) {
      if (x >= g1 && x < g2) { ok = false; break; }
    }
    if (ok) {
      for (const [cx] of clouds) {
        if (Math.abs(cx - x) < 40) { ok = false; break; }
      }
    }
    if (ok) flowers.push([x, 96]);
  }

  // Враги — на облаках
  const enemies = [];
  const enemySpecs = cfg.enemySpecs || [];
  for (const [cloudIdx, type] of enemySpecs) {
    if (cloudIdx < clouds.length) {
      const [cx, cy] = clouds[cloudIdx];
      enemies.push([cx, cy, type]);
    }
  }

  return {
    id, name, levelWidth,
    groundEnd: levelWidth + 200,
    groundGaps, clouds, flowers, enemies,
    enemyShootCooldown: cfg.enemyShootCooldown || 300,
    scrollsRequired: 3,
    crown: [levelWidth - 180, 100],
    playerStart: [64, 115],
  };
}

const LEVELS = [
  buildLevel({
    id: 0, name: "Луга",
    levelWidth: 2400, gapStarts: [],
    cloudBase: 150, cloudPattern: 0,
    flowerStarts: [300, 500, 700, 900, 1300, 1700, 1900],
    enemySpecs: [[5, "goblin"]],
    enemyShootCooldown: 320,
  }),
  buildLevel({
    id: 1, name: "Небеса",
    levelWidth: 2700, gapStarts: [],
    cloudBase: 160, cloudPattern: 1.5,
    flowerStarts: [300, 500, 700, 1100, 1500, 2000, 2300],
    enemySpecs: [[4, "goblin"], [8, "bat"]],
    enemyShootCooldown: 300,
  }),
];

const _levelCache = {};

function getLevel(id) {
  if (id < LEVELS.length) return LEVELS[id];
  if (!_levelCache[id]) _levelCache[id] = generateEndlessLevel(id);
  return _levelCache[id];
}

function generateEndlessLevel(id) {
  const difficulty = id - LEVELS.length + 1;
  const name = "Бесконечность " + difficulty;
  const levelWidth = 2600 + difficulty * 300;
  const numEnemies = Math.min(12, 2 + Math.floor(difficulty * 0.8));
  const numFlowers = Math.min(20, 5 + difficulty);
  const enemyShootCooldown = Math.max(180, 280 - difficulty * 12);

  // Облака — гарантированно достижимые: шаг ≤ 180, разброс высот ±25
  const clouds = [];
  const startX = 250;
  const endX = levelWidth - 250;
  const numClouds = Math.max(3, Math.floor((endX - startX) / 180) + 1);
  const step = (endX - startX) / (numClouds - 1);

  const baseY = Math.min(180, 155 + Math.min(30, difficulty * 3));
  for (let i = 0; i < numClouds; i++) {
    const x = Math.round(startX + i * step);
    const yRaw = baseY + Math.sin(i * 0.5 + difficulty) * 25;
    let y = Math.max(130, Math.min(200, Math.round(yRaw)));
    if (i === 0) y = Math.min(y, 150);
    clouds.push([x, y]);
  }

  // Пропасти — не более 130 px
  const groundGaps = [];
  if (difficulty >= 2) {
    const numGaps = Math.min(5, Math.floor(difficulty * 0.7));
    for (let i = 0; i < numGaps; i++) {
      const gx = 800 + Math.floor((levelWidth - 1600) * i / Math.max(1, numGaps));
      const gw = 110 + Math.floor(Math.random() * 20);
      groundGaps.push([gx, gx + gw]);
    }
  }

  // Цветы — не в пропастях и не под облаками
  const flowers = [];
  for (let i = 0; i < numFlowers; i++) {
    const x = 300 + Math.floor(Math.random() * (levelWidth - 600));
    let ok = true;
    for (const [g1, g2] of groundGaps) {
      if (x >= g1 && x < g2) { ok = false; break; }
    }
    if (ok) {
      for (const [cx] of clouds) {
        if (Math.abs(cx - x) < 40) { ok = false; break; }
      }
    }
    if (ok) flowers.push([x, 96]);
  }

  // Враги — на облаках, первый всегда гоблин
  const enemies = [];
  const stepE = Math.max(1, Math.floor(clouds.length / numEnemies));
  const otherTypes = ["slime", "demon", "bat", "ghost"];

  for (let i = 0; i < numEnemies; i++) {
    const idx = Math.min(clouds.length - 1, i * stepE + 1);
    const [cx, cy] = clouds[idx];
    const type = (i === 0) ? "goblin" : otherTypes[Math.floor(Math.random() * otherTypes.length)];
    enemies.push([cx, cy, type]);
  }

  return {
    id, name, levelWidth,
    groundEnd: levelWidth + 200,
    groundGaps, clouds, flowers, enemies,
    enemyShootCooldown, scrollsRequired: 3,
    crown: [levelWidth - 180, 100],
    playerStart: [64, 115],
  };
}