class Game {
  constructor() {
    this.canvas = document.getElementById("game");
    Renderer.init(this.canvas);

    this.images = {};
    this.imageStatus = {};

    this.player = null;
    this.walls = [];
    this.cloudPlatforms = [];
    this.flowers = [];
    this.scrolls = [];
    this.enemies = [];
    this.fireballs = [];
    this.spheres = [];
    this.shield = null;
    this.crown = null;

    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldCooldown = 0;

    this.enemyCooldown = 0;
    this.enemyShootCooldown = CONFIG.ENEMY_ATTACK_COOLDOWN_IN_FRAMES;

    this.score = 0;

    this.camera = { x: CONFIG.WINDOW_WIDTH / 2, y: CONFIG.WINDOW_HEIGHT / 2 };

    this.startTime = 0;
    this.currentTime = 0;
    this.gameOver = false;
    this.newRecord = false;
    this.recordTime = 0;

    this.deathTimer = 0;

    this.introMode = true;
    this.introPhase = "right";
    this.introSpeed = 5;
    this.introTargetX = CONFIG.LEVEL_WIDTH - CONFIG.WINDOW_WIDTH / 2;
    this.introStartX = CONFIG.WINDOW_WIDTH / 2;
    this.introPauseTimer = 0;
    this.introPauseDuration = 2.0;

    this.inMenu = true;
    this.paused = false;
    this.currentLevelId = 0;

    this.notifyUI = null;

    this.lastTime = 0;
    this.boundLoop = this.loop.bind(this);
  }

  async loadImages() {
    const names = [
      "background", "heart", "scroll_empty", "scroll", "scroll_pickup",
      "block_grass", "tox_flowers", "cloud",
      "player_walk_0", "player_walk_1", "player_walk_2",
      "player_idle", "player_jump",
      "enemy", "fireball", "shield", "orange_sphere", "crown"
    ];

    const promises = names.map(name => new Promise(resolve => {
      const img = new Image();
      img.onload = () => { this.images[name] = img; this.imageStatus[name] = "ok"; resolve(); };
      img.onerror = () => { this.images[name] = null; this.imageStatus[name] = "MISSING"; resolve(); };
      img.src = CONFIG.ASSETS_PATH + name + ".png";
    }));

    await Promise.all(promises);
  }

  async start() {
    await this.loadImages();
    this.lastTime = performance.now();
    requestAnimationFrame(this.boundLoop);
  }

  startFromMenu(levelId) {
    this.currentLevelId = levelId;
    this.inMenu = false;
    this.paused = false;
    this.setup(levelId, false);
    this.lastTime = performance.now();
    if (this.notifyUI) this.notifyUI();
  }

  retryLevel() {
    this.inMenu = false;
    this.paused = false;
    this.gameOver = false;
    this.setup(this.currentLevelId, true);
    this.lastTime = performance.now();
    if (this.notifyUI) this.notifyUI();
  }

  nextLevel() {
    this.currentLevelId = this.currentLevelId + 1;
    this.inMenu = false;
    this.paused = false;
    this.gameOver = false;
    this.setup(this.currentLevelId, true);
    this.lastTime = performance.now();
    if (this.notifyUI) this.notifyUI();
  }

  returnToMenu() {
    this.inMenu = true;
    this.paused = false;
    this.gameOver = false;
    this.lastTime = performance.now();
    if (this.notifyUI) this.notifyUI();
  }

  togglePause() {
    if (this.inMenu || this.gameOver || this.introMode) return;
    this.paused = !this.paused;
    InputHandler.clearOneShots();
    if (this.notifyUI) this.notifyUI();
  }

  unpause() {
    if (!this.paused) return;
    this.paused = false;
    InputHandler.clearOneShots();
    if (this.notifyUI) this.notifyUI();
  }

  pauseOnBlur() {
    if (this.inMenu || this.paused || this.gameOver || this.introMode) return;
    this.paused = true;
    InputHandler.clearOneShots();
    if (this.notifyUI) this.notifyUI();
  }

  skipIntro() {
    if (!this.introMode) return;
    this.introMode = false;
    let camX = Math.max(CONFIG.WINDOW_WIDTH / 2, this.player.x);
    const maxX = CONFIG.LEVEL_WIDTH - CONFIG.WINDOW_WIDTH / 2;
    if (camX > maxX) camX = maxX;
    this.camera.x = camX;
    this.camera.y = CONFIG.WINDOW_HEIGHT / 2;
    this.startTime = performance.now() / 1000;
    InputHandler.clearOneShots();
    if (this.notifyUI) this.notifyUI();
  }

  setup(levelId = this.currentLevelId, skipIntro = false) {
    this.currentLevelId = levelId;
    const level = getLevel(levelId);

    CONFIG.LEVEL_WIDTH = level.levelWidth;
    this.enemyShootCooldown = level.enemyShootCooldown || CONFIG.ENEMY_ATTACK_COOLDOWN_IN_FRAMES;

    this.camera = { x: CONFIG.WINDOW_WIDTH / 2, y: CONFIG.WINDOW_HEIGHT / 2 };
    this.gameOver = false;
    this.newRecord = false;
    this.recordTime = 0;
    this.currentTime = 0;
    this.deathTimer = 0;
    this.score = 0;

    // Земля
    this.walls = [];
    for (let x = 0; x < level.groundEnd; x += 64) {
      let inGap = false;
      for (const [gFrom, gTo] of level.groundGaps) {
        if (x >= gFrom && x < gTo) { inGap = true; break; }
      }
      if (inGap) continue;
      this.walls.push(new Platform(this.images.block_grass, x, 32, 0.5));
    }

    // Облака
    this.cloudPlatforms = [];
    for (const [x, y] of level.clouds) {
      const p = new Platform(this.images.cloud, x, y, 1.0);
      this.walls.push(p);
      this.cloudPlatforms.push(p);
    }

    // Верх земли — из реального спрайта
    let groundTop = 48;
    for (const w of this.walls) {
      if (w.texture === this.images.block_grass) {
        groundTop = w.y + w.h / 2;
        break;
      }
    }

    // Цветы — сажаем на землю
    this.flowers = [];
    for (const [x, y] of level.flowers) {
      const f = new Sprite(this.images.tox_flowers, x, y, 0.5);
      f.y = groundTop + f.h / 2 + (CONFIG.FLOWER_OFFSET_ABOVE_GROUND || 5);
      this.flowers.push(f);
    }

    // Убираем цветы, перекрывающиеся с облаками
    this.flowers = this.flowers.filter(flower => {
      for (const cloud of this.cloudPlatforms) {
        const dx = Math.abs(flower.x - cloud.x);
        const dy = Math.abs(flower.y - cloud.y);
        const overlapX = (flower.w + cloud.w) / 2;
        const overlapY = (flower.h + cloud.h) / 2;
        if (dx < overlapX - 40 && dy < overlapY - 40) return false;
      }
      return true;
    });

    // НОВОЕ: не больше 3 цветов на уровне, равномерно по ширине
    if (this.flowers.length > 3) {
      this.flowers.sort((a, b) => a.x - b.x);
      const step = this.flowers.length / 3;
      const picked = [];
      for (let i = 0; i < 3; i++) {
        picked.push(this.flowers[Math.floor(i * step)]);
      }
      this.flowers = picked;
    }

    // Игрок
    const textures = {
      idle:  this.images.player_idle,
      jump:  this.images.player_jump,
      walk0: this.images.player_walk_0,
      walk1: this.images.player_walk_1,
      walk2: this.images.player_walk_2,
    };
    this.player = new Player(textures, level.playerStart[0], level.playerStart[1],
      CONFIG.PLAYER_START_HEALTH, CONFIG.PLAYER_START_SCROLLS, CONFIG.PLAYER_MAX_SCROLLS);

    // Монстры
    this.enemies = [];
    for (const [cx, cy, type] of level.enemies) {
      const m = new Monster(type || "goblin", cx, cy, this.images);
      m.y = cy + CONFIG.ENEMY_OFFSET_ABOVE_CLOUD;
      this.enemies.push(m);
    }
    for (const e of this.enemies) {
      e.shootTimer = Math.floor(Math.random() * this.enemyShootCooldown);
    }
    this.enemyCooldown = 0;

    this.scrolls = this.generateScrolls(level);
    this.fireballs = [];
    this.spheres = [];

    this.shield = new Sprite(this.images.shield, 0, 0, 1);
    this.shieldActive = false;
    this.shieldCooldown = 0;
    this.shieldTimer = 0;

    this.crown = new Sprite(this.images.crown, level.crown[0], level.crown[1], 1);

    if (skipIntro) {
      this.introMode = false;
      this.startTime = performance.now() / 1000;
      let camX = Math.max(CONFIG.WINDOW_WIDTH / 2, level.playerStart[0]);
      const maxX = CONFIG.LEVEL_WIDTH - CONFIG.WINDOW_WIDTH / 2;
      if (camX > maxX) camX = maxX;
      this.camera.x = camX;
      this.camera.y = CONFIG.WINDOW_HEIGHT / 2;
    } else {
      this.introMode = true;
      this.introPhase = "right";
      this.introSpeed = 5;
      this.introTargetX = CONFIG.LEVEL_WIDTH - CONFIG.WINDOW_WIDTH / 2;
      this.introStartX = CONFIG.WINDOW_WIDTH / 2;
      this.introPauseTimer = 0;
      this.introPauseDuration = 2.0;
      this.camera.x = this.introStartX;
      this.camera.y = CONFIG.WINDOW_HEIGHT / 2;
    }

    InputHandler.clearOneShots();
  }

  generateScrolls(level) {
    const result = [];
    const n = level.scrollsRequired || 3;
    for (let i = 0; i < n; i++) {
      const targetX = (level.levelWidth / (n + 1)) * (i + 1);
      let best = null, bestDist = Infinity;
      for (const [cx, cy] of level.clouds) {
        const d = Math.abs(cx - targetX);
        if (d < bestDist) { bestDist = d; best = [cx, cy]; }
      }
      if (best) result.push([best[0], best[1] + 55]);
      else result.push([targetX, 100]);
    }
    return result.map(([x, y]) => new Sprite(this.images.scroll_pickup, x, y, 1));
  }

  isOnGround() {
    for (const w of this.walls) {
      if (Collision.check(this.player, w, 0, -5)) return true;
    }
    return false;
  }

  handleGameplayInput() {
    if (this.gameOver || this.introMode || this.deathTimer > 0) return;

    if (InputHandler.consume("jump") && this.isOnGround()) {
      this.player.velocityY = CONFIG.PLAYER_JUMP_SPEED;
    }
    if (InputHandler.consume("shield")) {
      if (!this.shieldActive && this.shieldCooldown <= 0) {
        this.shieldActive = true;
        this.shieldTimer = 0;
      }
    }
    if (InputHandler.consume("shoot")) {
      if (this.player.useScroll()) {
        this.spheres.push(new Sprite(this.images.orange_sphere, this.player.x + 60, this.player.y, 1));
      }
    }
  }

  playerMovement() {
    let dx = 0;
    if (InputHandler.keys.left)  dx = -CONFIG.PLAYER_MOVEMENT_SPEED;
    if (InputHandler.keys.right) dx =  CONFIG.PLAYER_MOVEMENT_SPEED;

    this.player.velocityY += CONFIG.GRAVITY;
    if (this.player.velocityY < CONFIG.GRAVITY) this.player.velocityY = CONFIG.GRAVITY;

    let dy = this.player.velocityY;
    if (dy > 10) dy = 10;

    let collideX = false, collideY = false;
    for (const w of this.walls) {
      const [cx, cy] = Collision.calculate(this.player, w, dx, dy);
      collideX = collideX || cx;
      collideY = collideY || cy;
    }

    const off = 30;
    if (dx < 0) collideX = collideX || (this.player.x - off <= 0);
    if (dx > 0) collideX = collideX || (this.player.x + off >= CONFIG.LEVEL_WIDTH);

    if (!collideX) this.player.x += dx;
    if (!collideY) this.player.y += dy;
  }

  updatePlayerAnimation(dt) {
    const moving = InputHandler.keys.left || InputHandler.keys.right;
    this.player.updateAnimation(dt, moving, this.isOnGround());
  }

  updateShield(dt) {
    if (this.shieldActive) {
      this.shield.x = this.player.x + 60;
      this.shield.y = this.player.y;
      this.shieldTimer += dt;
      if (this.shieldTimer >= CONFIG.SHIELD_DURATION) {
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldCooldown = CONFIG.SHIELD_COOLDOWN_TIME;
      }
    } else if (this.shieldCooldown > 0) {
      this.shieldCooldown -= dt;
    }
  }

  enemyLogic() {
    for (const enemy of this.enemies) {
      enemy.shootTimer++;
      if (enemy.shootTimer >= this.enemyShootCooldown) {
        enemy.shootTimer = 0;
        this.fireballs.push(new Sprite(this.images.fireball, enemy.x, enemy.y, 1));
      }
    }
  }

  fireballLogic() {
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      let dx = this.player.x - fb.x;
      let dy = this.player.y - fb.y;
      const d = Math.hypot(dx, dy);
      if (d > 0) { dx /= d; dy /= d; }
      fb.x += dx * CONFIG.FIREBALL_SPEED;
      fb.y += dy * CONFIG.FIREBALL_SPEED;

      if (this.shieldActive && Collision.isCollide(this.shield, fb)) {
        this.fireballs.splice(i, 1); continue;
      }
      if (Collision.isCollide(this.player, fb)) {
        this.player.takeDamage(1);
        this.fireballs.splice(i, 1);
      }
    }
  }

  orangeSphereLogic() {
    for (let i = this.spheres.length - 1; i >= 0; i--) {
      const sp = this.spheres[i];
      sp.x += CONFIG.ORANGE_SPHERE_SPEED;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (Collision.isCollide(this.enemies[j], sp)) {
          this.spheres.splice(i, 1);
          this.enemies.splice(j, 1);
          break;
        }
      }
    }
  }

  scrollPickupLogic() {
    for (let i = this.scrolls.length - 1; i >= 0; i--) {
      if (Collision.isCollide(this.player, this.scrolls[i])) {
        this.scrolls.splice(i, 1);
        this.player.addScroll(1);
        this.score += 10;
      }
    }
  }

  poisonFlowerLogic() {
    for (const f of this.flowers) {
      if (Collision.isCollide(this.player, f)) { this.deathTimer = 0.4; return; }
    }
  }

  crownPickupLogic() {
    if (!this.crown) return;
    if (Collision.isCollide(this.player, this.crown)) {
      this.crown = null;
      if (!this.gameOver) {
        this.gameOver = true;
        this.paused = false;
        this.score += 100;
        this.saveRecord();
        if (this.notifyUI) this.notifyUI();
      }
    }
  }

  saveRecord() {
    const key = CONFIG.RECORD_KEY + "_lvl" + this.currentLevelId;
    const t = Math.round(this.currentTime * 100) / 100;
    let prev = 0;
    try {
      const v = localStorage.getItem(key);
      if (v !== null) prev = parseFloat(v) || 0;
    } catch (e) { prev = 0; }

    if (prev === 0 || t < prev) {
      try { localStorage.setItem(key, String(t)); } catch (e) {}
      this.newRecord = true;
      this.recordTime = t;
    } else {
      this.newRecord = false;
      this.recordTime = prev;
    }
  }

  centerCameraToPlayer() {
    let x = this.player.x;
    if (x < CONFIG.WINDOW_WIDTH / 2) x = CONFIG.WINDOW_WIDTH / 2;
    const maxX = CONFIG.LEVEL_WIDTH - CONFIG.WINDOW_WIDTH / 2;
    if (x > maxX) x = maxX;
    this.camera.x = x;
    this.camera.y = CONFIG.WINDOW_HEIGHT / 2;
  }

  updateIntroCamera(dt) {
    if (this.introPhase === "right") {
      this.camera.x += this.introSpeed;
      if (this.camera.x >= this.introTargetX) {
        this.camera.x = this.introTargetX;
        this.introPhase = "pause";
        this.introPauseTimer = 0;
      }
    } else if (this.introPhase === "pause") {
      this.introPauseTimer += dt;
      if (this.introPauseTimer >= this.introPauseDuration) this.introPhase = "left";
    } else if (this.introPhase === "left") {
      this.camera.x -= this.introSpeed;
      if (this.camera.x <= this.introStartX) {
        this.camera.x = this.introStartX;
        this.introMode = false;
        this.startTime = performance.now() / 1000;
        InputHandler.clearOneShots();
        if (this.notifyUI) this.notifyUI();
      }
    }
  }

  update(dt) {
    if (this.gameOver) return;
    if (this.introMode) { this.updateIntroCamera(dt); return; }

    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.setup(this.currentLevelId, true);
      return;
    }

    this.currentTime = performance.now() / 1000 - this.startTime;

    if (this.player.y < -100) { this.deathTimer = 0.4; return; }

    this.handleGameplayInput();
    this.centerCameraToPlayer();
    this.playerMovement();
    this.updatePlayerAnimation(dt);
    this.updateShield(dt);
    this.enemyLogic();
    this.fireballLogic();
    this.orangeSphereLogic();
    this.scrollPickupLogic();
    this.crownPickupLogic();
    this.poisonFlowerLogic();

    if (this.player.isDead()) this.deathTimer = 0.4;
  }

  draw() {
    Renderer.clear();
    Renderer.drawBackground(this.images.background, this.camera);

    for (const w of this.walls)   Renderer.drawSprite(w, this.camera);
    for (const f of this.flowers) Renderer.drawSprite(f, this.camera);
    for (const e of this.enemies) Renderer.drawSprite(e, this.camera);

    if (this.shieldActive) Renderer.drawSprite(this.shield, this.camera);
    Renderer.drawSprite(this.player, this.camera);

    for (const s of this.scrolls)    Renderer.drawSprite(s, this.camera);
    for (const fb of this.fireballs) Renderer.drawSprite(fb, this.camera);
    for (const sp of this.spheres)   Renderer.drawSprite(sp, this.camera);

    if (this.crown) Renderer.drawSprite(this.crown, this.camera);

    this.renderUI();
  }

  drawScrollIcon(ctx, x, y, w, h, filled) {
    ctx.fillStyle = filled ? "#E8D8A8" : "#BDBDBD";
    ctx.fillRect(x + 3, y + h * 0.15, w - 6, h * 0.7);
    ctx.fillStyle = filled ? "#8B6F47" : "#777";
    ctx.fillRect(x, y, w, h * 0.18);
    ctx.fillRect(x, y + h * 0.82, w, h * 0.18);
    if (filled) {
      ctx.fillStyle = "#C0392B";
      ctx.fillRect(x + 3, y + h * 0.44, w - 6, h * 0.12);
      ctx.fillStyle = "#E74C3C";
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.5, h * 0.09, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 10, y + h * (0.32 + i * 0.15));
        ctx.lineTo(x + w - 10, y + h * (0.32 + i * 0.15));
        ctx.stroke();
      }
    }
  }

  renderUI() {
    const ctx = Renderer.ctx;

    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(`Время: ${this.currentTime.toFixed(1)} сек.`, CONFIG.WINDOW_WIDTH / 2 + 1, 21);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`Время: ${this.currentTime.toFixed(1)} сек.`, CONFIG.WINDOW_WIDTH / 2, 20);

    ctx.font = "bold 22px Arial";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(`Очки: ${this.score}`, CONFIG.WINDOW_WIDTH / 2 + 1, 46);
    ctx.fillStyle = "#FFD75A";
    ctx.fillText(`Очки: ${this.score}`, CONFIG.WINDOW_WIDTH / 2, 45);

    const lvl = getLevel(this.currentLevelId);
    ctx.font = "16px Arial";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText(lvl.name, CONFIG.WINDOW_WIDTH / 2 + 1, 73);
    ctx.fillStyle = "#A9C9FF";
    ctx.fillText(lvl.name, CONFIG.WINDOW_WIDTH / 2, 72);

    for (let i = 0; i < this.player.health; i++) {
      if (this.images.heart) {
        ctx.drawImage(this.images.heart, 20 + 64 * i, 60, 64, 64);
      } else {
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(20 + 64 * i, 60, 64, 64);
      }
    }

    for (let i = 0; i < this.player.maximum_scrolls; i++) {
      const x = CONFIG.WINDOW_WIDTH - 84 - 64 * i;
      const y = 60;
      const filled = i < this.player.current_scrolls;
      this.drawScrollIcon(ctx, x, y, 64, 64, filled);
    }

    if (this.shieldActive) {
      ctx.fillStyle = "#66E0FF";
      ctx.font = "18px Arial";
      ctx.textAlign = "left";
      ctx.fillText("ЩИТ АКТИВЕН", 20, 140);
    } else if (this.shieldCooldown > 0) {
      ctx.fillStyle = "#888";
      ctx.font = "18px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`Перезарядка: ${this.shieldCooldown.toFixed(1)}`, 20, 140);
    }

    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, CONFIG.WINDOW_WIDTH, CONFIG.WINDOW_HEIGHT);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFD75A";
      ctx.font = "bold 52px Arial";
      ctx.fillText("Победа!", CONFIG.WINDOW_WIDTH / 2, CONFIG.WINDOW_HEIGHT / 2 - 140);
      ctx.font = "bold 40px Arial";
      ctx.fillText(`Очки: ${this.score}`, CONFIG.WINDOW_WIDTH / 2, CONFIG.WINDOW_HEIGHT / 2 - 70);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "28px Arial";
      ctx.fillText(`Время: ${this.currentTime.toFixed(2)} сек.`, CONFIG.WINDOW_WIDTH / 2, CONFIG.WINDOW_HEIGHT / 2 - 5);
      ctx.fillText(`Рекорд: ${this.recordTime.toFixed(2)} сек.`, CONFIG.WINDOW_WIDTH / 2, CONFIG.WINDOW_HEIGHT / 2 + 40);
      if (this.newRecord) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 32px Arial";
        ctx.fillText("НОВЫЙ РЕКОРД!", CONFIG.WINDOW_WIDTH / 2, CONFIG.WINDOW_HEIGHT / 2 + 105);
      }
      ctx.fillStyle = "#CCC";
      ctx.font = "16px Arial";
      ctx.fillText("Esc — сразу в меню", CONFIG.WINDOW_WIDTH / 2, CONFIG.WINDOW_HEIGHT / 2 + 165);
    }

    if (this.deathTimer > 0 && !this.gameOver) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, (0.4 - this.deathTimer) / 0.4) * 0.7})`;
      ctx.fillRect(0, 0, CONFIG.WINDOW_WIDTH, CONFIG.WINDOW_HEIGHT);
    }
  }

  loop(now) {
    const dt = this.lastTime ? Math.min(0.05, (now - this.lastTime) / 1000) : 0;
    this.lastTime = now;

    if (this.inMenu) {
      Renderer.clear();
      Renderer.ctx.fillStyle = "#141a2e";
      Renderer.ctx.fillRect(0, 0, CONFIG.WINDOW_WIDTH, CONFIG.WINDOW_HEIGHT);
      requestAnimationFrame(this.boundLoop);
      return;
    }

    if (InputHandler.consume("restart")) {
      if (this.gameOver) this.returnToMenu();
      else if (this.introMode) this.skipIntro();
      else this.togglePause();
      requestAnimationFrame(this.boundLoop);
      return;
    }

    if (this.paused) {
      requestAnimationFrame(this.boundLoop);
      return;
    }

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.boundLoop);
  }
}