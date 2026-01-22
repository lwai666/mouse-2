import { join } from "path";
import { app, ipcMain, BrowserWindow, shell } from "electron";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { fileURLToPath } from "node:url";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const icon = join(__dirname, "../../resources/icon.png");
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = join(__filename$1, "..");
let mainWindow = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: join(__dirname$1, "../preload/index.js"),
      sandbox: false,
      webSecurity: false
      // 允许跨域请求，用于开发环境
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.webContents.on("before-input-event", (_event, input) => {
    if (input.type === "keyDown" && input.key === "F12") {
      mainWindow?.webContents.openDevTools({ mode: "detach" });
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    const htmlPath = join(__dirname$1, "../../backend/dist/index.html");
    console.log("加载前端文件:", htmlPath);
    mainWindow.loadFile(htmlPath);
  }
}
app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.mouse-hid");
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  ipcMain.handle("get-api-config", () => {
    const apiBaseUrl = "http://localhost:3010";
    console.log("获取 API 配置:", { isDev: is.dev, apiBaseUrl });
    return {
      apiBaseUrl,
      isDev: is.dev,
      isElectron: true
    };
  });
  ipcMain.handle("set-api-config", (_event, apiBaseUrl) => {
    process.env.API_BASE_URL = apiBaseUrl;
    return { success: true };
  });
  createWindow();
  app.on("activate", function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
