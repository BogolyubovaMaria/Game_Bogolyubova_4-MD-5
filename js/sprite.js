class Sprite {
  constructor(texture, x = 0, y = 0, scale = 1) {
    this.texture = texture || null;
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.w = this.texture ? this.texture.width  * scale : 32;
    this.h = this.texture ? this.texture.height * scale : 32;
  }
}

class Platform extends Sprite {
  constructor(texture, x, y, scale = 1) {
    super(texture, x, y, scale);
  }
}

class Monster extends Sprite {
  constructor(type, x, y, images) {
    const tex = Monster.getTexture(type, images);
    super(tex, x, y, 1);
    this.type = type || "goblin";
    this.shootTimer = 0;
  }

  static getTexture(type, images) {
    const def = MONSTER_TYPES[type] || MONSTER_TYPES.slime;
    if (def.useImage) {
      return images && images.enemy ? images.enemy : null;
    }
    return Monster._draw(type, def);
  }

  static _draw(type, def) {
    const S = 72;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const g = c.getContext("2d");
    const s = S;

    if (type === "slime") {
      g.fillStyle = def.color;
      g.beginPath();
      g.ellipse(s * 0.5, s * 0.65, s * 0.4, s * 0.35, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = def.accent;
      g.beginPath();
      g.ellipse(s * 0.5, s * 0.72, s * 0.28, s * 0.13, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = def.eyes;
      g.beginPath();
      g.arc(s * 0.38, s * 0.55, s * 0.06, 0, Math.PI * 2);
      g.arc(s * 0.62, s * 0.55, s * 0.06, 0, Math.PI * 2);
      g.fill();
    } else if (type === "demon") {
      g.fillStyle = def.accent;
      g.beginPath();
      g.moveTo(s * 0.35, s * 0.3); g.lineTo(s * 0.25, s * 0.08); g.lineTo(s * 0.44, s * 0.22); g.closePath();
      g.moveTo(s * 0.65, s * 0.3); g.lineTo(s * 0.75, s * 0.08); g.lineTo(s * 0.56, s * 0.22); g.closePath();
      g.fill();
      g.fillStyle = def.color;
      g.beginPath();
      g.moveTo(s * 0.5, s * 0.22); g.lineTo(s * 0.88, s * 0.82); g.lineTo(s * 0.12, s * 0.82); g.closePath();
      g.fill();
      g.fillStyle = def.eyes;
      g.beginPath();
      g.arc(s * 0.4, s * 0.52, s * 0.06, 0, Math.PI * 2);
      g.arc(s * 0.6, s * 0.52, s * 0.06, 0, Math.PI * 2);
      g.fill();
    } else if (type === "bat") {
      g.fillStyle = def.color;
      g.beginPath();
      g.moveTo(s * 0.5, s * 0.5);
      g.quadraticCurveTo(s * 0.05, s * 0.25, s * 0.12, s * 0.75);
      g.lineTo(s * 0.35, s * 0.6); g.closePath();
      g.moveTo(s * 0.5, s * 0.5);
      g.quadraticCurveTo(s * 0.95, s * 0.25, s * 0.88, s * 0.75);
      g.lineTo(s * 0.65, s * 0.6); g.closePath();
      g.fill();
      g.fillStyle = def.accent;
      g.beginPath();
      g.ellipse(s * 0.5, s * 0.55, s * 0.13, s * 0.2, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = def.eyes;
      g.beginPath();
      g.arc(s * 0.45, s * 0.5, s * 0.035, 0, Math.PI * 2);
      g.arc(s * 0.55, s * 0.5, s * 0.035, 0, Math.PI * 2);
      g.fill();
    } else if (type === "ghost") {
      g.fillStyle = def.color;
      g.beginPath();
      g.arc(s * 0.5, s * 0.42, s * 0.3, Math.PI, 0);
      g.lineTo(s * 0.8, s * 0.8);
      const waves = 4;
      for (let i = 0; i <= waves; i++) {
        const x = s * 0.8 - (s * 0.6 * i / waves);
        const y = s * 0.8 + (i % 2 === 0 ? -s * 0.1 : 0);
        g.lineTo(x, y);
      }
      g.closePath();
      g.fill();
      g.fillStyle = def.eyes;
      g.beginPath();
      g.ellipse(s * 0.42, s * 0.4, s * 0.05, s * 0.07, 0, 0, Math.PI * 2);
      g.ellipse(s * 0.58, s * 0.4, s * 0.05, s * 0.07, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = def.accent;
      g.beginPath();
      g.ellipse(s * 0.5, s * 0.56, s * 0.06, s * 0.04, 0, 0, Math.PI * 2);
      g.fill();
    }
    return c;
  }
}