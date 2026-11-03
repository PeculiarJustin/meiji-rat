/* =========================================================
   美叽与大鼠 · 桌宠 v0.1
   JS 负责：行为。位置、拖动、点击反应、眨眼、说话。

   阅读顺序建议：
   1. 变量和台词
   2. 摆放位置
   3. 拖动
   4. 点击后的反应
   5. 自动眨眼
   6. 启动
   ========================================================= */

// ---------- 1. 找到页面上的元素 ----------
const pet = document.getElementById("pet");           // 整个宠物（拖动对象）
const petInner = document.getElementById("petInner"); // 用来做“跳一下”的动画
const bubble = document.getElementById("bubble");     // 说话气泡

// 在 Electron 里，preload.js 会注入 window.petAPI；
// 在普通浏览器里它是 undefined。用它来判断自己跑在哪。
const isDesktop = Boolean(window.petAPI);

// 随机台词。想加新台词，直接往数组里加一行就行。
const LINES = [
  "今天也要写点代码呀！",
  "叽！摸鱼不如摸我。",
  "喝水时间到啦～",
  "这个 bug 会过去的。",
  "Git commit 了吗？",
  "先跑起来，再跑得快。",
  "你负责敲键盘，我负责可爱。",
  "大鼠说：休息五分钟吧。",
  "头顶这位，是我的充电宝。",
  "阿一古，有点劳累啊"
];

// 记录被点了几次，可以用来解锁彩蛋
let pokeCount = 0;
let bubbleTimer = null;

// ---------- 2. 摆放位置 ----------

/**
 * 把宠物放到指定坐标（左上角）。
 * 会做边界限制，保证它不会跑出窗口。
 */
function setPosition(x, y) {
  const w = pet.offsetWidth;
  const h = pet.offsetHeight;
  const maxX = Math.max(0, window.innerWidth - w);
  const maxY = Math.max(0, window.innerHeight - h);

  x = Math.min(Math.max(x, 0), maxX);
  y = Math.min(Math.max(y, 0), maxY);

  pet.style.left = `${Math.round(x)}px`;
  pet.style.top = `${Math.round(y)}px`;
}

/** 第一次出现的位置 */
function placeAtStart() {
  const x = (window.innerWidth - pet.offsetWidth) / 2;

  // 桌面模式下窗口比较矮，让宠物贴着底部站，给头顶的气泡留出空间
  const y = isDesktop
    ? window.innerHeight - pet.offsetHeight - 16
    : Math.max(40, window.innerHeight * 0.42);

  setPosition(x, y);
}

// ---------- 3. 拖动 ----------

const drag = {
  active: false,  // 手指/鼠标是否按着
  moved: false,   // 这次按下后有没有真的移动过（用来区分“拖动”和“点击”）
  startX: 0,
  startY: 0,
  originLeft: 0,
  originTop: 0,
};

pet.addEventListener("pointerdown", (event) => {
  // 只响应鼠标左键（触屏和笔的 button 也是 0）
  if (event.button !== 0) return;

  drag.active = true;
  drag.moved = false;
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  drag.originLeft = parseFloat(pet.style.left) || 0;
  drag.originTop = parseFloat(pet.style.top) || 0;

  // 捕获指针：即使鼠标移出宠物，也能继续收到移动事件
  pet.setPointerCapture(event.pointerId);
  pet.classList.add("is-dragging");

  // 桌面模式：告诉主进程“开始拖窗口了”
  if (isDesktop) {
    window.petAPI.startDrag(event.screenX, event.screenY);
  }
});

pet.addEventListener("pointermove", (event) => {
  if (!drag.active) return;

  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;

  // 移动超过 6 像素，就认为用户是在拖动，而不是点击
  if (Math.hypot(dx, dy) > 6) drag.moved = true;

  if (isDesktop) {
    // 桌面模式：宠物在窗口里不动，移动的是整个窗口
    if (drag.moved) {
      window.petAPI.dragTo(event.screenX, event.screenY);
    }
  } else {
    // 网页模式：宠物在页面里移动
    setPosition(drag.originLeft + dx, drag.originTop + dy);
  }
});

pet.addEventListener("pointerup", (event) => {
  if (!drag.active) return;

  drag.active = false;
  pet.releasePointerCapture(event.pointerId);
  pet.classList.remove("is-dragging");

  if (isDesktop) {
    window.petAPI.endDrag();
  }

  // 手指没怎么动 = 点击
  if (!drag.moved) poke();
});

// 指针被系统抢走时（比如切窗口），结束拖动状态
pet.addEventListener("pointercancel", () => {
  drag.active = false;
  pet.classList.remove("is-dragging");
});

// 键盘也能互动：Tab 选中它，按回车或空格
pet.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    poke();
  }
});

// 右键菜单：桌面模式下由主进程弹出（里面是“退出桌宠”）
pet.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  if (isDesktop) window.petAPI.showMenu();
});

// ---------- 4. 点击后的反应 ----------

/** 跳一下。先移除 class 再强制重排，这样连续点击也能重新播放动画。 */
function jump() {
  petInner.classList.remove("jump");
  void petInner.offsetWidth; // 读一次布局，让浏览器“忘记”上一个动画
  petInner.classList.add("jump");
  petInner.addEventListener(
    "animationend",
    () => petInner.classList.remove("jump"),
    { once: true }
  );
}

/** 说一句话。2.6 秒后自动收起。 */
function say(text) {
  bubble.textContent = text;
  bubble.classList.add("show");

  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove("show"), 2600);
}

/** 在宠物身边飘出几颗小心心 */
function burstHearts() {
  const rect = pet.getBoundingClientRect();

  for (let i = 0; i < 4; i++) {
    const heart = document.createElement("span");
    heart.className = "heart";
    heart.textContent = "♥";

    heart.style.left = `${rect.left + rect.width / 2 + (Math.random() * 150 - 75)}px`;
    heart.style.top = `${rect.top + rect.height * 0.35 + (Math.random() * 50 - 25)}px`;
    heart.style.setProperty("--drift", `${Math.random() * 50 - 25}px`);

    document.body.appendChild(heart);
    heart.addEventListener("animationend", () => heart.remove(), { once: true });
  }
}

/** 一次完整的“被戳”反应 */
function poke() {
  pokeCount++;
  jump();
  burstHearts();
  say(LINES[Math.floor(Math.random() * LINES.length)]);

  // 小彩蛋：戳够 15 次
  if (pokeCount === 15) {
    say("再摸……就要收费啦！");
  }
}

// ---------- 5. 自动眨眼 ----------

function blinkLoop() {
  const wait = 2200 + Math.random() * 4000;

  setTimeout(() => {
    pet.classList.add("blink");
    setTimeout(() => pet.classList.remove("blink"), 170);
    blinkLoop(); // 递归安排下一次
  }, wait);
}

// ---------- 6. 启动 ----------

placeAtStart();
blinkLoop();
window.addEventListener("resize", () => {
  setPosition(parseFloat(pet.style.left) || 0, parseFloat(pet.style.top) || 0);
});

// 打开页面 1 秒后先打个招呼
setTimeout(() => say("嗨，我是大鼠，头顶那位是美叽。"), 900);

// 加上 ?transparent=1 打开透明模式，为以后装进 Electron 做准备
if (new URLSearchParams(location.search).has("transparent")) {
  document.body.classList.add("is-transparent");
}
