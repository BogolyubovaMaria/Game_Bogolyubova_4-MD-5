const InputHandler = (() => {
  const keys = { left: false, right: false };
  const oneShot = { jump: false, shield: false, shoot: false, restart: false };

  function init() {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  }

  function onKeyDown(e) {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
    }
    switch (e.code) {
      case "ArrowLeft":  case "KeyA": keys.left = true; break;
      case "ArrowRight": case "KeyD": keys.right = true; break;
      case "ArrowUp": case "KeyW": case "Space": oneShot.jump = true; break;
      case "KeyE": oneShot.shield = true; break;
      case "KeyQ": oneShot.shoot = true; break;
      case "Escape": oneShot.restart = true; break;
    }
  }

  function onKeyUp(e) {
    switch (e.code) {
      case "ArrowLeft":  case "KeyA": keys.left = false; break;
      case "ArrowRight": case "KeyD": keys.right = false; break;
    }
  }

  function consume(name) {
    if (oneShot[name]) { oneShot[name] = false; return true; }
    return false;
  }

  function clearOneShots() {
    oneShot.jump = false;
    oneShot.shield = false;
    oneShot.shoot = false;
    oneShot.restart = false;
  }

  return { init, keys, consume, clearOneShots };
})();