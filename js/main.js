window.addEventListener("load", async () => {
  InputHandler.init();

  const game = new Game();
  await game.start();

  const menuOverlay     = document.getElementById("menu-overlay");
  const pauseOverlay    = document.getElementById("pause-overlay");
  const gameOverButtons = document.getElementById("game-over-buttons");
  const pauseBtn        = document.getElementById("pause-btn");
  const startBtn        = document.getElementById("start-btn");
  const retryBtn        = document.getElementById("retry-btn");
  const nextBtn         = document.getElementById("next-btn");
  const menuBtn         = document.getElementById("menu-btn");
  const levelButtons    = document.querySelectorAll(".level-btn");

  const pauseContinueBtn = document.getElementById("pause-continue-btn");
  const pauseRestartBtn  = document.getElementById("pause-restart-btn");
  const pauseMenuBtn     = document.getElementById("pause-menu-btn");

  let selectedLevel = 0;

  function selectLevel(idx) {
    selectedLevel = idx;
    levelButtons.forEach(b => {
      b.classList.toggle("selected", parseInt(b.dataset.level) === idx);
    });
  }
  selectLevel(0);

  levelButtons.forEach(btn => {
    btn.addEventListener("click", () => selectLevel(parseInt(btn.dataset.level)));
  });

  game.notifyUI = () => {
    if (menuOverlay)     menuOverlay.classList.toggle("hidden", !game.inMenu);
    if (pauseOverlay)    pauseOverlay.classList.toggle("hidden", !game.paused);
    if (gameOverButtons) gameOverButtons.classList.toggle("hidden", !(game.gameOver && !game.inMenu));
    if (pauseBtn)        pauseBtn.classList.toggle("hidden", game.inMenu || game.introMode || game.paused || game.gameOver);
  };

  // Все обработчики — с проверкой на null, чтобы отсутствие одного
  // элемента не блокировало привязку остальных.
  if (startBtn) startBtn.addEventListener("click", () => game.startFromMenu(selectedLevel));
  if (retryBtn) retryBtn.addEventListener("click", () => game.retryLevel());
  if (nextBtn)  nextBtn.addEventListener("click", () => game.nextLevel());
  if (menuBtn)  menuBtn.addEventListener("click", () => {
    game.returnToMenu();
    selectLevel(game.currentLevelId);
  });

  if (pauseContinueBtn) pauseContinueBtn.addEventListener("click", () => game.unpause());
  if (pauseRestartBtn)  pauseRestartBtn.addEventListener("click", () => game.retryLevel());
  if (pauseMenuBtn)     pauseMenuBtn.addEventListener("click", () => {
    game.returnToMenu();
    selectLevel(game.currentLevelId);
  });

  if (pauseBtn) pauseBtn.addEventListener("click", () => game.togglePause());

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) game.pauseOnBlur();
  });
  window.addEventListener("blur", () => game.pauseOnBlur());

  game.notifyUI();
});