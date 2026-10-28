const Renderer = (() => {
  let canvas = null;
  let ctx = null;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
  }

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function worldToScreen(x, y, camera) {
    return {
      x: x - camera.x + CONFIG.WINDOW_WIDTH / 2,
      y: camera.y - y + CONFIG.WINDOW_HEIGHT / 2,
    };
  }

  function drawSprite(sprite, camera) {
    if (!sprite) return;
    const p = worldToScreen(sprite.x, sprite.y, camera);

    if (sprite.texture) {
      ctx.drawImage(
        sprite.texture,
        p.x - sprite.w / 2,
        p.y - sprite.h / 2,
        sprite.w,
        sprite.h
      );
    } else {
      ctx.fillStyle = "#FF00FF";
      ctx.fillRect(p.x - sprite.w / 2, p.y - sprite.h / 2, sprite.w, sprite.h);
    }
  }

  function drawBackground(img, camera) {
    if (!img) {
      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(0, 0, CONFIG.WINDOW_WIDTH, CONFIG.WINDOW_HEIGHT);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      for (let x = 0; x < CONFIG.WINDOW_WIDTH; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CONFIG.WINDOW_HEIGHT); ctx.stroke();
      }
      for (let y = 0; y < CONFIG.WINDOW_HEIGHT; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.WINDOW_WIDTH, y); ctx.stroke();
      }
      return;
    }
    const camLeft = camera.x - CONFIG.WINDOW_WIDTH / 2;
    const scaleX = CONFIG.LEVEL_WIDTH / img.width;
    ctx.drawImage(
      img,
      camLeft / scaleX, 0,
      CONFIG.WINDOW_WIDTH / scaleX, img.height,
      0, 0, CONFIG.WINDOW_WIDTH, CONFIG.WINDOW_HEIGHT
    );
  }

  return {
    init, clear, drawSprite, drawBackground,
    get ctx() { return ctx; },
    get canvas() { return canvas; },
  };
})();