class Player extends Sprite {
  constructor(textures, startX, startY, health, scrolls, maxScrolls) {
    super(textures.idle, startX, startY, 1);
    this.textures = textures;
    this.health = health;
    this.current_scrolls = scrolls;
    this.maximum_scrolls = maxScrolls;
    this.velocityY = 0;
    this.animTimer = 0;
    this.animFrame = 0;
  }
  takeDamage(a) { this.health = Math.max(0, this.health - a); }
  addScroll(c)  { if (this.current_scrolls < this.maximum_scrolls) this.current_scrolls += c; }
  isDead()      { return this.health <= 0; }
  canCastSpell(){ return this.current_scrolls > 0; }
  useScroll() {
    if (!this.canCastSpell()) return false;
    this.current_scrolls -= 1;
    return true;
  }
  updateAnimation(dt, isMoving, onGround) {
    if (!onGround) {
      if (this.textures.jump) this.texture = this.textures.jump;
      return;
    }
    if (isMoving) {
      this.animTimer += dt;
      if (this.animTimer > 0.15) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 3;
      }
      const frames = [this.textures.walk0, this.textures.walk1, this.textures.walk2];
      this.texture = frames[this.animFrame] || this.textures.idle;
    } else {
      this.texture = this.textures.idle;
      this.animFrame = 0;
      this.animTimer = 0;
    }
  }
}