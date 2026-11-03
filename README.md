# 美叽与大鼠 · 桌面宠物

> A cute scientific desktop companion inspired by Meiji and Rat, designed for researchers and AI-assisted workflows.

一个用来**边做边学前端与桌面开发**的小项目：让「美叽」和「大鼠」住进一个可以拖动、会眨眼、会说话的桌面窗口里。

- **v0.1**：网页原型（HTML / CSS / JS）
- **v0.2**：装进 Electron，透明、置顶、无边框
- **v0.3**：托盘、记住位置、开机自启、自定义图标、单实例

> 角色形象目前是 SVG 画的占位版，之后可以替换成你自己的立绘或序列帧。

![网页版预览](preview.png)

## 现在能做什么

- 透明、无边框、始终置顶、不占任务栏的桌面窗口
- 按住角色拖动，移动的是整个窗口
- 单击 / 按回车：跳一下、飘心心、随机说一句话
- 自动眨眼、呼吸、美叽轻轻摇晃
- **托盘图标**：左键显示/隐藏，右键菜单可退出
- **记住上次的位置**，下次启动回到原处（换了显示器也不会跑丢）
- **单实例**：重复双击图标不会开出第二只
- **开机自启**（打包版可用）
- 右键 → 退出桌宠
- 同一份页面在浏览器里也能玩（`index.html`）

## 怎么运行

### 网页版

双击 `index.html`，或在本文件夹运行：

```powershell
python -m http.server 5173
```

然后访问 <http://localhost:5173>。

### 桌面版

```powershell
npm install
npm start
```

> **本机备注**：这台机器上 Electron 对安装路径比较敏感，直接 `npm start` 会启动失败，请双击 `启动桌宠.cmd`。它会把 `D:\electron-runtime` 里的 Electron 运行时拉起来；换一台电脑则直接用 `npm start`。

## 文件地图

| 文件 | 作用 |
| --- | --- |
| `index.html` | 页面结构：角色、气泡、背景 |
| `style.css` | 外观和动画：颜色、位置、呼吸、眨眼 |
| `pet.js` | 网页行为：拖动、点击、说话、眨眼 |
| `electron/main.js` | **主进程**：窗口、托盘、位置记忆、开机自启、IPC |
| `electron/preload.js` | **安全桥**：只暴露 `startDrag / dragTo / endDrag / showMenu` |
| `assets/icon.ico` | 应用图标（打包和快捷方式用） |
| `assets/tray.png` | 托盘图标 |
| `scripts/make-icon.py` | 从截图生成图标的小脚本 |
| `launch.ps1` | 本机启动脚本：用 `Start-Process` 传递带空格的路径 |
| `启动桌宠.cmd` | 双击入口，调用 `launch.ps1` |
| `package.json` | 项目清单、依赖、打包配置 |

## Electron 是怎么工作的

一个 Electron 应用里有两种进程：

```
┌──────────────── Electron 应用 ────────────────┐
│                                               │
│  主进程 main.js（Node.js 环境）                │
│  ├─ 创建窗口 BrowserWindow                    │
│  ├─ 设置透明 / 置顶 / 无边框                   │
│  ├─ 托盘、开机自启、记住位置                    │
│  ├─ 收到 IPC：移动窗口、弹右键菜单              │
│  └─ 退出应用                                   │
│              ▲                                │
│              │ IPC（进程间通信，像对讲机）       │
│              ▼                                │
│  渲染进程（Chromium 环境）                     │
│  └─ index.html + style.css + pet.js           │
│     通过 preload.js 暴露的 window.petAPI 发消息 │
└───────────────────────────────────────────────┘
```

- **主进程**负责“操作系统层面”的事：开窗口、设属性、移动窗口、托盘、退出。
- **渲染进程**负责“界面层面”的事：画角色、跑动画、处理点击。
- **preload.js** 是两者之间的一道窄门：网页不能直接碰 Node / Electron，只能调用这里明确开放的几个函数。
- 拖动就是一次完整的 IPC 往返：`pointerdown → startDrag → 主进程记下窗口位置`，`pointermove → dragTo → 主进程 setPosition`。

这样设计是为了安全：网页代码（尤其是以后加载的网络内容）不能直接读写你的文件系统。

## 学习路线

- [x] **阶段 0 · 网页原型**：HTML / CSS / JS 三件套
- [x] **阶段 1 · Git 与 GitHub**：提交、远程仓库、合并、README
- [x] **阶段 2 · Electron**：透明、置顶、无边框窗口 + IPC
- [x] **阶段 3 · 打包与桌面化**：NSIS 安装包、图标、托盘、开机自启
- [ ] **阶段 4 · 更像宠物**：真实素材、状态机（走路 / 睡觉 / 饿）、存档

## 这一版用到的概念

- **DOM**：JS 用 `document.getElementById` 找到页面元素
- **绝对定位**：`position: fixed` + `left/top`
- **transform 动画**：`scale`（呼吸）、`translateY`（跳）、`scaleY`（眨眼）
- **指针事件**：`pointerdown / pointermove / pointerup`
- **窗口属性**：`transparent`、`frame: false`、`alwaysOnTop`、`skipTaskbar`
- **preload + contextBridge**：安全地把少量能力暴露给网页
- **IPC**：`ipcRenderer.send` / `ipcMain.on` 传消息
- **Tray**：`new Tray(icon)` + 右键菜单
- **userData**：每个应用自己的配置目录，位置记忆存在这里
- **单实例锁**：`app.requestSingleInstanceLock()`

## 打包成 exe

```powershell
npm run dist
```

产物在 `dist/`：

- `MeijiRatPet-Setup-0.3.0.exe`：安装包，约 83 MB
- `win-unpacked/`：解压后的程序，可以直接运行调试

几点说明：

- 安装包**没有代码签名**，Windows 可能弹“未知发布者”，点“更多信息 → 仍要运行”即可
- 安装后从桌面快捷方式启动，不需要 Node，也不需要终端
- 如果这台机器上安装器写不进去，可以直接把 `win-unpacked` 整个文件夹复制到目标目录，再给里面的 `MeijiRatPet.exe` 建一个快捷方式（绿色版）
- `dist/` 已被 `.gitignore` 忽略，安装包不进 Git；以后可以发到 GitHub Releases

## 小练习

1. 在 `pet.js` 的 `LINES` 里加一句你自己的台词。
2. 在 `main.js` 里改 `defaultPosition()`，让宠物默认出现在屏幕左下角。
3. 在 `main.js` 的托盘菜单里加一项“关于”，弹出版本信息。
4. 把 `alwaysOnTop` 改成 `false`，体验一下“不置顶”的区别。
