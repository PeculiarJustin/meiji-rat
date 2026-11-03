/**
 * 预加载脚本：网页和主进程之间的“安全通道”。
 *
 * 网页不能直接调用 Node.js / Electron 的 API（那样不安全），
 * 所以这里只开放三个小函数给网页用。
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petAPI", {
  startDrag: (x, y) => ipcRenderer.send("drag:start", x, y),
  dragTo: (x, y) => ipcRenderer.send("drag:move", x, y),
  endDrag: () => ipcRenderer.send("drag:end"),
  showMenu: () => ipcRenderer.send("menu:show")
});
