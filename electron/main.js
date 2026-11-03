/**
 * Electron 主进程。
 *
 * 它跑在 Node.js 环境里，负责“操作系统层面”的事：
 * 开窗口、托盘、记住位置、开机自启、右键菜单、退出。
 *
 * 网页（index.html / style.css / pet.js）跑在窗口里，负责“界面层面”的事。
 * 两边通过 IPC（进程间通信）说话，就像对讲机。
 */

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  nativeImage,
  screen
} = require("electron");
const path = require("path");
const fs = require("fs");

const WIDTH = 420;
const HEIGHT = 480;

let mainWindow = null;
let tray = null;
let dragState = null;
let saveTimer = null;

// 只允许开一个实例：重复双击图标时，把已有窗口叫到前面，而不是再开一只
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showWindow();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId("com.peculiarjustin.meiji-rat");
    createWindow();
    createTray();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------- 窗口位置记忆 ----------

function statePath() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(statePath(), "utf8"));
  } catch {
    return null;
  }
}

function saveState() {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  try {
    fs.writeFileSync(statePath(), JSON.stringify({ x, y }));
  } catch {
    // 写不进去就算了，不影响使用
  }
}

/** 默认位置：主屏幕水平居中，靠近底部 */
function defaultPosition() {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: Math.round(workArea.x + (workArea.width - WIDTH) / 2),
    y: Math.round(workArea.y + workArea.height - HEIGHT - 48)
  };
}

/** 检查这个位置是否还落在某个显示器里，并尽量把它挪回可见区域 */
function clampToVisible(x, y) {
  const displays = screen.getAllDisplays();
  let bestArea = null;
  let bestWorkArea = 0;

  for (const display of displays) {
    const area = display.workArea;
    const overlapX = Math.max(
      0,
      Math.min(x + WIDTH, area.x + area.width) - Math.max(x, area.x)
    );
    const overlapY = Math.max(
      0,
      Math.min(y + HEIGHT, area.y + area.height) - Math.max(y, area.y)
    );
    const overlap = overlapX * overlapY;
    if (overlap > bestWorkArea) {
      bestWorkArea = overlap;
      bestArea = area;
    }
  }

  // 几乎完全在屏幕外，就当作没有可用的旧位置
  if (!bestArea || bestWorkArea < 100 * 100) return null;

  return {
    x: Math.min(Math.max(x, bestArea.x), bestArea.x + bestArea.width - WIDTH),
    y: Math.min(Math.max(y, bestArea.y), bestArea.y + bestArea.height - HEIGHT)
  };
}

function initialPosition() {
  const saved = loadState();
  if (
    saved &&
    Number.isFinite(saved.x) &&
    Number.isFinite(saved.y)
  ) {
    const clamped = clampToVisible(saved.x, saved.y);
    if (clamped) return clamped;
  }

  const fallback = defaultPosition();
  return clampToVisible(fallback.x, fallback.y) || fallback;
}

// ---------- 窗口 ----------

function createWindow() {
  const position = initialPosition();

  mainWindow = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: position.x,
    y: position.y,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "index.html"), {
    query: { transparent: "1" }
  });

  // 拖动时 move 会连续触发，等停下来再写文件
  mainWindow.on("move", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 500);
  });

  mainWindow.on("close", saveState);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function showWindow() {
  if (!mainWindow) return;
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
  refreshTrayMenu();
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
  refreshTrayMenu();
}

// ---------- 托盘 ----------

function createTray() {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, "..", "assets", "tray.png")
  );
  tray = new Tray(icon);
  tray.setToolTip("美叽与大鼠");
  tray.setContextMenu(buildMenu());
  tray.on("click", toggleWindow);
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: mainWindow && mainWindow.isVisible() ? "隐藏桌宠" : "显示桌宠",
      click: toggleWindow
    },
    { type: "separator" },
    {
      label: "开机自启",
      type: "checkbox",
      checked: app.getLoginItemSettings().openAtLogin,
      enabled: app.isPackaged,
      click: (item) => setAutoStart(item.checked)
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => app.quit()
    }
  ]);
}

function refreshTrayMenu() {
  if (tray) tray.setContextMenu(buildMenu());
}

function setAutoStart(enabled) {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
    args: []
  });
  refreshTrayMenu();
}

// ---------- 拖动窗口 ----------
// 网页里按下鼠标时，把“屏幕坐标”发过来；
// 主进程算出窗口应该移动多少，再真正移动窗口。

ipcMain.on("drag:start", (event, x, y) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const [winX, winY] = win.getPosition();
  dragState = { win, startX: x, startY: y, winX, winY };
});

ipcMain.on("drag:move", (event, x, y) => {
  if (!dragState) return;
  const nextX = dragState.winX + Math.round(x - dragState.startX);
  const nextY = dragState.winY + Math.round(y - dragState.startY);
  dragState.win.setPosition(nextX, nextY);
});

ipcMain.on("drag:end", () => {
  dragState = null;
  saveState();
});

// ---------- 右键菜单 ----------
ipcMain.on("menu:show", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  buildMenu().popup({ window: win });
});
