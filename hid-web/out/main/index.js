import { join as join$1 } from "node:path";
import { fileURLToPath } from "node:url";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { app, ipcMain, session, BrowserWindow, shell } from "electron";
import { join } from "path";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const icon = join(__dirname, "../../resources/icon.png");
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = join$1(__filename$1, "..");
let mainWindow = null;
let hidDeviceCallback = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: join$1(__dirname$1, "../preload/index.mjs"),
      sandbox: false,
      webSecurity: false
      // 允许跨域请求，用于开发环境
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.webContents.session.on("select-hid-device", (event, details, callback) => {
    event.preventDefault();
    hidDeviceCallback = callback;
    mainWindow?.webContents.send("show-hid-device-selector", details.deviceList);
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
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    const htmlPath = join$1(__dirname$1, "../../backend/dist/index.html");
    console.log("加载前端文件:", htmlPath);
    mainWindow.loadFile(htmlPath);
  }
}
app.commandLine.appendSwitch("enable-experimental-web-platform-features");
app.commandLine.appendSwitch("enable-features", "WebHID");
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
  ipcMain.on("select-hid-device", (_event, deviceId) => {
    if (hidDeviceCallback) {
      hidDeviceCallback(deviceId);
      hidDeviceCallback = null;
    }
  });
  ipcMain.on("cancel-hid-device-selection", () => {
    if (hidDeviceCallback) {
      hidDeviceCallback("");
      hidDeviceCallback = null;
    }
  });
  createWindow();
  session.defaultSession.setDevicePermissionHandler((details) => {
    console.log("请求设备权限:", details);
    if (details.deviceType === "hid" && details.device.vendorId == 12259) {
      return true;
    }
    return false;
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
