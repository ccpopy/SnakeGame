let gameModule;

async function loadGameModule () {
  const module = await createGameModule();
  gameModule = module;
};

const SnakeGame = (() => {
  // 游戏配置
  const config = {
    baseSpeed: 300, // 基础移动间隔（毫秒）
    speedStep: 20, // 每次加速幅度
    minSpeed: 60, // 最低速度
    speedInterval: 50, // 加速分数间隔
    initialLength: 3, // 初始蛇长度
    gridSize: 15, // 网格尺寸（像素）
    tileCount: 20, // 网格数量（画布大小 = gridSize * tileCount）
    colors: {
      snake: "#75B94E",
      snakeBorder: "#4A752D",
      food: "#DC3F3F",
      foodBorder: "#8B2E2E",
      background: "#8AB8A5",
    },
  };

  // 游戏状态
  let state = {
    snake: [],
    food: { x: 0, y: 0 },
    direction: { dx: 1, dy: 0 },
    score: 0,
    running: false,
    paused: false,
    lastRender: 0,
    accumulator: 0,
    animationId: null,
    inputQueue: []
  };

  const elements = {
    canvas: null,
    ctx: null,
    score: null,
    startBtn: null,
    modal: null,
    finalScore: null,
    rankingInfo: null,
    submitSection: null,
    playerNameInput: null,
    submitScoreBtn: null,
    submitError: null,
    rankingList: null,
  };

  // 初始化游戏
  async function init () {
    await loadGameModule();
    console.log("游戏初始化成功！");
    // 获取DOM元素
    elements.canvas = document.getElementById("gameCanvas");
    elements.ctx = elements.canvas.getContext("2d");
    elements.score = document.getElementById("score");
    elements.startBtn = document.getElementById("startBtn");
    elements.modal = document.getElementById("minecraftAlert");
    elements.finalScore = document.getElementById("finalScore");
    elements.rankingInfo = document.getElementById("rankingInfo");
    elements.submitSection = document.getElementById("submitSection");
    elements.playerNameInput = document.getElementById("playerName");
    elements.submitScoreBtn = document.getElementById("submitScore");
    elements.rankingList = document.getElementById("rankingList");
    elements.submitError = document.querySelector(".submit-error");

    // 设置画布
    resizeCanvas();
    setupEventListeners();
    resetGame();
  }

  // 事件监听设置
  function setupEventListeners () {
    // 窗口大小调整
    window.addEventListener("resize", debounce(resizeCanvas, 100));

    // 键盘输入
    document.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      // 处理箭头键直接更新方向
      const directionMap = {
        ArrowUp: { dx: 0, dy: -1 },
        ArrowDown: { dx: 0, dy: 1 },
        ArrowLeft: { dx: -1, dy: 0 },
        ArrowRight: { dx: 1, dy: 0 },
      };

      if (directionMap[e.key]) {
        const newDir = directionMap[e.key];
        // 如果输入队列不为空，则以队列最后一个方向为参照
        const currentDir = state.inputQueue.length > 0 ? state.inputQueue[state.inputQueue.length - 1] : state.direction;
        if (!(currentDir.dx + newDir.dx === 0 && currentDir.dy + newDir.dy === 0)) {
          state.inputQueue.push(newDir);
          vibrate(50);
        }
      }
      // 空格键用于暂停/继续游戏
      if (e.code === "Space") {
        togglePause();
      }
    });

    // 游戏控制按钮（绑定点击事件）
    document.querySelector(".controls").addEventListener("click", (e) => {
      if (e.target.matches(".control-btn")) {
        handleButtonInput(e.target.id);
      }
    });

    // 开始按钮
    elements.startBtn.addEventListener("click", startGame);

    // 提交成绩按钮
    elements.submitScoreBtn.addEventListener("click", submitScore);
  }

  // 游戏主循环
  function gameLoop (timestamp) {
    if (!state.running || state.paused) return;

    const deltaTime = timestamp - state.lastRender;
    state.lastRender = timestamp;
    state.accumulator += deltaTime;

    // 使用固定时间步长更新游戏状态
    while (state.accumulator >= config.baseSpeed) {
      updateGame();
      state.accumulator -= config.baseSpeed;
    }

    drawGame();
    state.animationId = requestAnimationFrame(gameLoop);
  }

  // 游戏逻辑更新
  function updateGame () {
    if (state.inputQueue.length > 0) {
      state.direction = state.inputQueue.shift();
    }
    moveSnake();
    checkCollision();
  }

  // 处理页面按钮输入
  function handleButtonInput (direction) {
    const directionMap = {
      up: { dx: 0, dy: -1 },
      down: { dx: 0, dy: 1 },
      left: { dx: -1, dy: 0 },
      right: { dx: 1, dy: 0 },
    };

    const newDir = directionMap[direction];
    const currentDir = state.inputQueue.length > 0 ? state.inputQueue[state.inputQueue.length - 1] : state.direction;
    if (!(currentDir.dx + newDir.dx === 0 && currentDir.dy + newDir.dy === 0)) {
      state.inputQueue.push(newDir);
      vibrate(50);
    }
  }

  // 蛇移动
  function moveSnake () {
    const head = {
      x: state.snake[0].x + state.direction.dx,
      y: state.snake[0].y + state.direction.dy,
    };

    state.snake.unshift(head);

    if (head.x === state.food.x && head.y === state.food.y) {
      handleFoodEaten();
    } else {
      state.snake.pop();
    }
  }

  // 处理吃到食物
  function handleFoodEaten () {
    state.score += 10;
    if (typeof gameModule._recordFood === "function") {
      gameModule._recordFood();
    }
    if (typeof gameModule._setScore === "function") {
      gameModule._setScore(state.score);
    }
    updateScoreDisplay();
    generateFood();
    // 双振动反馈
    vibrate([50, 50]);
    adjustSpeed();
  }

  // 调整游戏速度
  function adjustSpeed () {
    const speedReduction = Math.floor(state.score / config.speedInterval) * config.speedStep;
    config.baseSpeed = Math.max(config.minSpeed, 300 - speedReduction);
  }

  // 碰撞检测
  function checkCollision () {
    const head = state.snake[0];

    // 边界检测
    if (head.x < 0 || head.x >= config.tileCount || head.y < 0 || head.y >= config.tileCount) {
      gameOver();
      return;
    }

    // 身体碰撞检测
    for (let i = 1; i < state.snake.length; i++) {
      if (state.snake[i].x === head.x && state.snake[i].y === head.y) {
        gameOver();
        return;
      }
    }
  }

  // 游戏结束处理
  function gameOver () {
    state.running = false;
    cancelAnimationFrame(state.animationId);
    elements.startBtn.textContent = "重新开始";
    elements.startBtn.style.display = "block";
    showGameOverModal();
    // 长振动反馈
    vibrate([200, 100, 200]);
  }

  // 绘制游戏
  function drawGame () {
    clearCanvas();
    drawSnake();
    drawFood();
  }

  // 绘制蛇
  function drawSnake () {
    state.snake.forEach((seg, index) => {
      // 蛇身
      drawBlock(seg.x * config.gridSize, seg.y * config.gridSize, config.colors.snake, config.colors.snakeBorder);

      // 蛇头眼睛（这里保持固定，也可以根据方向调整）
      if (index === 0) {
        const eyePositions = [
          [3, 3],
          [10, 3],
          [3, 10],
          [10, 10],
        ];
        eyePositions.forEach(([x, y]) => {
          elements.ctx.fillStyle = "#fff";
          elements.ctx.fillRect(seg.x * config.gridSize + x, seg.y * config.gridSize + y, 2, 2);
        });
      }
    });
  }

  // 绘制食物
  function drawFood () {
    drawBlock(state.food.x * config.gridSize, state.food.y * config.gridSize, config.colors.food, config.colors.foodBorder);

    // 食物装饰点
    for (let i = 0; i < 4; i++) {
      elements.ctx.fillStyle = config.colors.foodBorder;
      elements.ctx.fillRect(state.food.x * config.gridSize + (i % 2) * 8 + 2, state.food.y * config.gridSize + Math.floor(i / 2) * 8 + 2, 2, 2);
    }
  }

  // 通用方块绘制方法
  function drawBlock (x, y, fill, border) {
    elements.ctx.fillStyle = fill;
    elements.ctx.fillRect(x, y, config.gridSize, config.gridSize);
    elements.ctx.strokeStyle = border;
    elements.ctx.lineWidth = 2;
    elements.ctx.strokeRect(x + 1, y + 1, config.gridSize - 2, config.gridSize - 2);
  }

  // 重置游戏
  function resetGame () {
    state.snake = [];
    const startX = Math.floor(config.tileCount / 2);
    const startY = Math.floor(config.tileCount / 2);

    for (let i = 0; i < config.initialLength; i++) {
      state.snake.push({ x: startX - i, y: startY });
    }

    state.direction = { dx: 1, dy: 0 };
    state.score = 0;
    config.baseSpeed = 300;
    generateFood();
    updateScoreDisplay();
  }

  // 生成食物
  function generateFood () {
    let attempts = 0;
    const maxAttempts = config.tileCount ** 2;

    do {
      state.food.x = Math.floor(Math.random() * config.tileCount);
      state.food.y = Math.floor(Math.random() * config.tileCount);
      attempts++;
    } while (isPositionOccupied(state.food) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      gameOver();
    }
  }

  // 位置占用检查
  function isPositionOccupied (pos) {
    return state.snake.some((seg) => seg.x === pos.x && seg.y === pos.y);
  }

  // 响应式画布
  function resizeCanvas () {
    const maxSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.7, 500);

    config.tileCount = Math.floor(maxSize / config.gridSize);
    elements.canvas.width = config.tileCount * config.gridSize;
    elements.canvas.height = elements.canvas.width;
  }

  // 清除画布
  function clearCanvas () {
    elements.ctx.fillStyle = config.colors.background;
    elements.ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
  }

  // 更新分数显示
  function updateScoreDisplay () {
    elements.score.textContent = `得分: ${state.score}`;
  }

  // 显示游戏结束提示框
  function showGameOverModal () {
    elements.finalScore.textContent = `得分: ${state.score}`;
    queryRanking(state.score);
    getScoreRankings();
    // 读取本地存储中的名字
    const storedName = localStorage.getItem("snake_playerName") || "";
    elements.playerNameInput.value = storedName;
    // 显示提交区域
    elements.submitSection.style.display = "block";
    elements.submitScoreBtn.disabled = false;
    elements.submitScoreBtn.style.display = "block";
    elements.submitError.style.display = "none";
    // 显示弹窗
    elements.modal.style.display = "block";
  }

  // 提交成绩
  function submitScore () {
    const playerName = elements.playerNameInput.value.trim();
    // 验证名字只包含英文字母
    if (!/^[A-Za-z]+$/.test(playerName)) {
      alert("请输入有效的英文名字！");
      return;
    }
    // 保存名字到 localStorage
    localStorage.setItem("snake_playerName", playerName);
    // 禁用提交按钮防止重复提交
    elements.submitScoreBtn.disabled = true;
    let signature = null;
    const currentTime = Date.now();
    if (typeof gameModule._generateSignature === "function") {
      signature = gameModule._generateSignature(currentTime);
      signature = (signature >>> 0).toString(16).padStart(8, '0');
    }
    // 提交成绩到后端（接口 URL 可根据实际情况调整）
    fetch("/snake/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: playerName, score: state.score, signature: signature, timestamp: currentTime }),
    })
      .then((response) => response.json())
      .then((data) => {
        elements.submitSection.style.display = "none";
        elements.submitScoreBtn.style.display = "none";
        getScoreRankings();
      })
      .catch((err) => {
        console.error("提交成绩出错:", err);
        elements.submitError.style.display = "block";
        elements.submitScoreBtn.disabled = false;
      });
  }

  // 获取排名
  function getScoreRankings () {
    fetch("/snake/rankings")
      .then((response) => response.json())
      .then((data) => {
        elements.rankingList.innerHTML = "";
        data.rankings.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = `第${item.rank}名: ${item.username} - 得分: ${item.score}`;
          elements.rankingList.appendChild(li);
        });
      })
      .catch((err) => {
        console.error("查询成绩出错:", err);
      });
  }

  // 根据当前分数查询排名接口
  function queryRanking (score) {
    fetch(`/snake/rankings/rank?score=${score}`)
      .then((response) => response.json())
      .then((data) => {
        elements.rankingInfo.textContent = "";
        elements.rankingInfo.textContent = `你的排名: ${data.rank}`;
      })
      .catch((err) => {
        console.error("查询排名出错:", err);
      });
  }

  // 暂停和继续游戏
  function togglePause () {
    if (!state.running) return;

    state.paused = !state.paused;
    const pauseModal = document.getElementById("game-paused");

    if (state.paused) {
      // 显示暂停弹窗
      pauseModal.style.display = "block";
      // 停止游戏循环
      cancelAnimationFrame(state.animationId);
    } else {
      // 隐藏暂停弹窗
      pauseModal.style.display = "none";
      state.lastRender = performance.now();
      gameLoop(state.lastRender);
    }
  }

  // 触觉反馈
  function vibrate (pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  // 防抖函数
  function debounce (fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // 开始游戏
  function startGame () {
    resetGame();
    if (typeof gameModule._startSession === "function") {
      gameModule._startSession();
    }
    state.running = true;
    state.paused = false;
    elements.startBtn.style.display = "none";
    elements.modal.style.display = "none";
    state.lastRender = performance.now();
    gameLoop(state.lastRender);
  }

  // 隐藏游戏结束提示框
  function hideAlert () {
    elements.alert.style.display = "none";
  }

  // 重新开始游戏
  function restartGame () {
    // 重置提交按钮状态
    elements.submitScoreBtn.disabled = false;
    // 隐藏弹窗
    elements.modal.style.display = "none";
    // 开始新游戏
    startGame();
  }

  // 公开方法
  return {
    init,
    startGame: startGame,
    hideAlert: hideAlert,
    handleButtonInput: handleButtonInput,
    restartGame: restartGame,
  };
})();

// 初始化游戏
document.addEventListener("DOMContentLoaded", function () {
  SnakeGame.init();
});
