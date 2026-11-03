/**
 * Electron 主进程。
 *
 * 它跑在 Node.js 环境里，负责“操作系统层面”的事：
 * 开窗口、设置窗口属性、移动窗口、弹出菜单、退出应用。
 *
 * 网页（index.html / style.css / pet.js）跑在窗口里，负责“界面层面”的事。
 * 两边通过 IPC（进程间通信）说话，就像对讲机。
 */

const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;

// 拖动时记录：从哪开始、窗口原来在哪
let dragState = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 480,
    transparent: true,   // 窗口背景透明
    frame: false,        // 去掉标题栏和边框
    resizable: false,
    alwaysOnTop: true,   // 始终置顶
    skipTaskbar: true,   // 不占任务栏
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // ?transparent=1 会让网页隐藏壁纸和任务栏，只留下宠物
  mainWindow.loadFile(path.join(__dirname, "..", "index.html"), {
    query: { transparent: "1" }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

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
});

// ---------- 右键菜单 ----------
ipcMain.on("menu:show", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const menu = Menu.buildFromTemplate([
    { label: "退出桌宠", click: () => app.quit() }
  ]);
  menu.popup({ window: win });
});
