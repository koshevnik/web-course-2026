(function () {
  'use strict';
const CONFIG = Object.freeze({
    cols: 20,
    rows: 20,
    cellSize: 20,
    initialLength: 3,
    moveInterval: 150, // мс между шагами змейки
    maxCatchUpSteps: 3,
    colors: Object.freeze({
      snakeBody: '#4cc46a',
      snakeHead: '#8ef0a5',
      apple: '#ff4d4d',
      grid: 'rgba(255, 255, 255, 0.04)'
    })
  });

  const DIRECTIONS = Object.freeze({
    ArrowUp: Object.freeze({ x: 0, y: -1 }),
    ArrowDown: Object.freeze({ x: 0, y: 1 }),
    ArrowLeft: Object.freeze({ x: -1, y: 0 }),
    ArrowRight: Object.freeze({ x: 1, y: 0 })
  });

  class GameModel {
    constructor(cols, rows, initialLength, random) {
      this.cols = cols;
      this.rows = rows;
      this.initialLength = initialLength;
      this.random = random;
      this.reset();
    }

    reset() {
      const startX = Math.floor(this.cols / 2);
      const startY = Math.floor(this.rows / 2);

      // Голова — первый элемент массива. Змейка движется вправо.
      this.snake = [];
      for (let i = 0; i < this.initialLength; i++) {
        this.snake.push({ x: startX - i, y: startY });
      }

      this.direction = DIRECTIONS.ArrowRight;
      this.directionQueue = [];
      this.score = 0;
      this.gameOver = false;
      this.apple = this.spawnApple();
    }

    /** Ставит направление в очередь. Разворот на 180° игнорируется. */
    setDirection(direction) {
      const last = this.directionQueue.length > 0
        ? this.directionQueue[this.directionQueue.length - 1]
        : this.direction;

      const isOpposite = last.x + direction.x === 0 && last.y + direction.y === 0;
      const isSame = last.x === direction.x && last.y === direction.y;

      if (isOpposite || isSame) return;
      if (this.directionQueue.length >= 2) return; // защита от «спама» клавишами

      this.directionQueue.push(direction);
    }

    /** Один шаг игры. */
    update() {
      if (this.gameOver) return;

      if (this.directionQueue.length > 0) {
        this.direction = this.directionQueue.shift();
      }

      const newHead = this.getNextHead();
      const willEat = this.isApple(newHead);

      if (this.checkCollision(newHead, willEat)) {
        this.gameOver = true;
        return;
      }

      this.moveSnake(newHead, willEat);

      if (willEat) {
        this.score += 1;
        this.apple = this.spawnApple();
        if (this.apple === null) {
          this.gameOver = true; // поле заполнено — победа
        }
      }
    }

    getNextHead() {
      const head = this.snake[0];
      return { x: head.x + this.direction.x, y: head.y + this.direction.y };
    }

    moveSnake(newHead, grow) {
      this.snake.unshift(newHead);
      if (!grow) {
        this.snake.pop();
      }
    }

    /** Стена или собственный хвост. Если хвост уходит с клетки в этом шаге — это не столкновение. */
    checkCollision(head, willGrow) {
      const outOfBounds =
        head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows;
      if (outOfBounds) return true;

      const body = willGrow ? this.snake : this.snake.slice(0, -1);
      return body.some((segment) => segment.x === head.x && segment.y === head.y);
    }

    isApple(cell) {
      return this.apple !== null && this.apple.x === cell.x && this.apple.y === cell.y;
    }

    /** Случайная свободная клетка (не на теле змейки). null, если свободных нет. */
    spawnApple() {
      const occupied = new Set(this.snake.map((s) => s.x + ',' + s.y));
      const free = [];

      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          if (!occupied.has(x + ',' + y)) {
            free.push({ x, y });
          }
        }
      }

      if (free.length === 0) return null;
      return free[Math.floor(this.random() * free.length)];
    }

    /** Копия состояния для View — чтобы отрисовка не могла его изменить. */
    getState() {
      return {
        snake: this.snake.map((s) => ({ x: s.x, y: s.y })),
        apple: this.apple ? { x: this.apple.x, y: this.apple.y } : null,
        score: this.score,
        gameOver: this.gameOver
      };
    }
  }
  class GameView {
    constructor(elements, config) {
      this.canvas = elements.canvas;
      this.ctx = elements.canvas.getContext('2d');
      this.scoreEl = elements.score;
      this.finalScoreEl = elements.finalScore;
      this.overlayEl = elements.overlay;
      this.restartBtn = elements.restartBtn;
      this.config = config;

      this.canvas.width = config.cols * config.cellSize;
      this.canvas.height = config.rows * config.cellSize;
    }

    /** Полная отрисовка кадра по состоянию. */
    draw(state) {
      this.clear();
      this.drawGrid();
      this.drawApple(state.apple);
      this.drawSnake(state.snake);
      this.drawScore(state.score);
      this.toggleGameOver(state.gameOver, state.score);
    }

    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid() {
      const { cols, rows, cellSize, colors } = this.config;
      this.ctx.strokeStyle = colors.grid;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      for (let x = 1; x < cols; x++) {
        this.ctx.moveTo(x * cellSize + 0.5, 0);
        this.ctx.lineTo(x * cellSize + 0.5, this.canvas.height);
      }
      for (let y = 1; y < rows; y++) {
        this.ctx.moveTo(0, y * cellSize + 0.5);
        this.ctx.lineTo(this.canvas.width, y * cellSize + 0.5);
      }
      this.ctx.stroke();
    }

    drawSnake(snake) {
      const { cellSize, colors } = this.config;
      snake.forEach((segment, index) => {
        this.ctx.fillStyle = index === 0 ? colors.snakeHead : colors.snakeBody;
        this.ctx.fillRect(
          segment.x * cellSize + 1,
          segment.y * cellSize + 1,
          cellSize - 2,
          cellSize - 2
        );
      });
    }

    drawApple(apple) {
      if (!apple) return;
      const { cellSize, colors } = this.config;
      this.ctx.fillStyle = colors.apple;
      this.ctx.beginPath();
      this.ctx.arc(
        apple.x * cellSize + cellSize / 2,
        apple.y * cellSize + cellSize / 2,
        cellSize / 2 - 2,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }

    drawScore(score) {
      this.scoreEl.textContent = String(score);
    }

    toggleGameOver(isGameOver, score) {
      this.finalScoreEl.textContent = String(score);
      this.overlayEl.classList.toggle('overlay--hidden', !isGameOver);
    }

    /** Подписка на кнопку «Начать заново» (View сообщает о событии наружу). */
    onRestart(handler) {
      this.restartBtn.addEventListener('click', handler);
    }
  }

  class GameController {
    constructor(model, view, config) {
      this.model = model;
      this.view = view;
      this.moveInterval = config.moveInterval;
      this.maxCatchUpSteps = config.maxCatchUpSteps;

      this.frameId = null;
      this.lastMoveTime = 0;

      this.tick = this.tick.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.restart = this.restart.bind(this);
    }

    init() {
      document.addEventListener('keydown', this.handleKeyDown);
      this.view.onRestart(this.restart);
      this.start();
    }

    start() {
      this.stopLoop();
      this.lastMoveTime = performance.now();
      this.draw();
      this.frameId = requestAnimationFrame(this.tick);
    }

    restart() {
      this.model.reset();
      this.start();
    }

    stopLoop() {
      if (this.frameId !== null) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
    }

    /** Игровой цикл: шаги по прошедшему времени, а не по числу кадров. */
    tick(currentTime) {
      let steps = 0;

      while (
        currentTime - this.lastMoveTime >= this.moveInterval &&
        steps < this.maxCatchUpSteps &&
        !this.model.gameOver
      ) {
        this.update();
        this.lastMoveTime += this.moveInterval;
        steps++;
      }

      // Если отстали слишком сильно (например, вкладка была в фоне) — не «догоняем».
      if (currentTime - this.lastMoveTime >= this.moveInterval) {
        this.lastMoveTime = currentTime;
      }

      this.draw();

      if (this.model.gameOver) {
        this.frameId = null; // цикл останавливается, пока не нажмут «Начать заново»
        return;
      }
      this.frameId = requestAnimationFrame(this.tick);
    }

    update() {
      this.model.update();
    }

    draw() {
      this.view.draw(this.model.getState());
    }

    handleKeyDown(event) {
      const direction = DIRECTIONS[event.key];
      if (!direction) return;

      event.preventDefault(); // чтобы стрелки не прокручивали страницу
      this.model.setDirection(direction);
    }
  }

  /* ==========================================================
   * Точка входа (композиция слоёв)
   * ========================================================== */
  function main() {
    const view = new GameView(
      {
        canvas: document.getElementById('canvas'),
        score: document.getElementById('score'),
        finalScore: document.getElementById('final-score'),
        overlay: document.getElementById('game-over'),
        restartBtn: document.getElementById('restart')
      },
      CONFIG
    );

    const model = new GameModel(
      CONFIG.cols,
      CONFIG.rows,
      CONFIG.initialLength,
      Math.random
    );

    const controller = new GameController(model, view, CONFIG);
    controller.init();
  }

  document.addEventListener('DOMContentLoaded', main);
})();
