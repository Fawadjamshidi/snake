"use strict";

(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("bestScore");
  const btnStart = document.getElementById("btnStart");
  const btnPause = document.getElementById("btnPause");
  const btnRestart = document.getElementById("btnRestart");
  const speedSelect = document.getElementById("speed");

  const gridSize = 24; // number of cells per row/col
  const cellSize = Math.floor(canvas.width / gridSize);
  const boardPx = cellSize * gridSize;
  canvas.width = boardPx;
  canvas.height = boardPx;

  /** @typedef {{x:number,y:number}} Point */

  /** @type {Point[]} */
  let snake = [];
  /** @type {Point} */
  let food = { x: 10, y: 10 };
  /** @type {Point} */
  let dir = { x: 1, y: 0 };
  /** @type {Point} */
  let nextDir = { x: 1, y: 0 };
  let score = 0;
  let bestScore = Number(localStorage.getItem("snake_best") || 0);
  let running = false;
  let paused = false;
  let tickMs = Number(speedSelect.value);
  let tickHandle = 0;

  bestScoreEl.textContent = String(bestScore);

  function resetGame() {
    snake = [
      { x: 8, y: 12 },
      { x: 7, y: 12 },
      { x: 6, y: 12 }
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    scoreEl.textContent = "0";
    placeFood();
    render();
  }

  function placeFood() {
    while (true) {
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      const onSnake = snake.some(p => p.x === x && p.y === y);
      if (!onSnake) {
        food = { x, y };
        return;
      }
    }
  }

  function start() {
    if (running) return;
    running = true;
    paused = false;
    btnStart.disabled = true;
    btnPause.disabled = false;
    btnRestart.disabled = false;
    loop();
  }

  function pause() {
    if (!running) return;
    paused = !paused;
    btnPause.textContent = paused ? "Resume" : "Pause";
  }

  function restart() {
    running = false;
    paused = false;
    btnStart.disabled = false;
    btnPause.disabled = false;
    btnPause.textContent = "Pause";
    clearTimeout(tickHandle);
    resetGame();
  }

  function setSpeed(ms) {
    tickMs = ms;
  }

  function loop() {
    if (!running) return;
    if (!paused) {
      step();
      render();
    }
    tickHandle = setTimeout(loop, tickMs);
  }

  function step() {
    // update direction safely (prevent reversing directly)
    if ((dir.x === 0 && nextDir.x !== 0) || (dir.y === 0 && nextDir.y !== 0)) {
      // ensure not reversing onto itself
      if (dir.x + nextDir.x !== 0 || dir.y + nextDir.y !== 0) {
        dir = nextDir;
      }
    }

    const head = snake[0];
    const newHead = { x: head.x + dir.x, y: head.y + dir.y };

    // wrap around edges
    if (newHead.x < 0) newHead.x = gridSize - 1;
    if (newHead.y < 0) newHead.y = gridSize - 1;
    if (newHead.x >= gridSize) newHead.x = 0;
    if (newHead.y >= gridSize) newHead.y = 0;

    // self collision
    const hitSelf = snake.some((p, i) => i !== 0 && p.x === newHead.x && p.y === newHead.y);
    if (hitSelf) {
      gameOver();
      return;
    }

    const ateFood = newHead.x === food.x && newHead.y === food.y;
    snake.unshift(newHead);
    if (ateFood) {
      score += 1;
      scoreEl.textContent = String(score);
      if (score > bestScore) {
        bestScore = score;
        bestScoreEl.textContent = String(bestScore);
        localStorage.setItem("snake_best", String(bestScore));
      }
      placeFood();
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    running = false;
    btnStart.disabled = false;
    btnPause.disabled = true;
    btnRestart.disabled = false;
  }

  function render() {
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw grid subtle
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#ffffff";
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize + .5, 0);
      ctx.lineTo(i * cellSize + .5, boardPx);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize + .5);
      ctx.lineTo(boardPx, i * cellSize + .5);
      ctx.stroke();
    }
    ctx.restore();

    // draw food
    drawCell(food.x, food.y, "#00d4aa");

    // draw snake
    for (let i = 0; i < snake.length; i++) {
      const p = snake[i];
      const t = i / Math.max(1, snake.length - 1);
      const color = i === 0 ? "#4f8cff" : lerpColor("#2c3b91", "#6ea3ff", t);
      drawCell(p.x, p.y, color, i === 0);
    }

    if (!running) {
      overlayText("Game Over", "Press Start or R to play again");
    } else if (paused) {
      overlayText("Paused", "Press P to resume");
    }
  }

  function overlayText(title, subtitle) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, boardPx, boardPx);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 32px Nunito, system-ui, sans-serif";
    ctx.fillText(title, boardPx / 2, boardPx / 2 - 8);
    ctx.font = "16px Nunito, system-ui, sans-serif";
    ctx.fillText(subtitle, boardPx / 2, boardPx / 2 + 18);
    ctx.restore();
  }

  function drawCell(x, y, color, isHead = false) {
    const px = x * cellSize;
    const py = y * cellSize;
    const r = Math.floor(cellSize * 0.22);
    const pad = Math.floor(cellSize * 0.08);
    const w = cellSize - pad * 2;
    const h = cellSize - pad * 2;
    roundRect(ctx, px + pad, py + pad, w, h, r, color);
    if (isHead) {
      // small glossy eye dots
      const eye = Math.max(2, Math.floor(cellSize * 0.08));
      ctx.fillStyle = "#e9f0ff";
      const ox = dir.x !== 0 ? (dir.x > 0 ? 1 : -1) : 0;
      const oy = dir.y !== 0 ? (dir.y > 0 ? 1 : -1) : 0;
      ctx.beginPath();
      ctx.arc(px + cellSize / 2 + ox * (cellSize * 0.18), py + cellSize / 2 + oy * (cellSize * 0.18), eye, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function roundRect(ctx2d, x, y, w, h, r, fill) {
    ctx2d.beginPath();
    ctx2d.moveTo(x + r, y);
    ctx2d.arcTo(x + w, y, x + w, y + h, r);
    ctx2d.arcTo(x + w, y + h, x, y + h, r);
    ctx2d.arcTo(x, y + h, x, y, r);
    ctx2d.arcTo(x, y, x + w, y, r);
    ctx2d.closePath();
    ctx2d.fillStyle = fill;
    ctx2d.fill();
  }

  function hexToRgb(hex) {
    const v = hex.replace("#", "");
    const bigint = parseInt(v.length === 3 ? v.split("").map(c => c + c).join("") : v, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
  }

  function lerpColor(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const bl = Math.round(ca.b + (cb.b - ca.b) * t);
    return rgbToHex(r, g, bl);
  }

  // input
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        nextDir = { x: 0, y: -1 }; break;
      case "ArrowDown":
      case "s":
      case "S":
        nextDir = { x: 0, y: 1 }; break;
      case "ArrowLeft":
      case "a":
      case "A":
        nextDir = { x: -1, y: 0 }; break;
      case "ArrowRight":
      case "d":
      case "D":
        nextDir = { x: 1, y: 0 }; break;
      case "p":
      case "P":
        pause(); break;
      case "r":
      case "R":
        restart(); break;
    }
  });

  btnStart.addEventListener("click", start);
  btnPause.addEventListener("click", pause);
  btnRestart.addEventListener("click", restart);
  speedSelect.addEventListener("change", (e) => {
    const ms = Number(e.target.value);
    setSpeed(ms);
  });

  // initial state
  resetGame();
})();


