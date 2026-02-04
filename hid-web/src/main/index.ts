import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, session, shell } from 'electron'

import icon from '../../resources/icon.png?asset'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

let mainWindow: BrowserWindow | null = null
let serverProcess: ReturnType<typeof spawn> | null = null

/**
 * 启动后端 Express 服务器
 * 在生产环境，Electron 应用也会启动 Express 服务器
 * 这样可以保持 Web 模式和 Electron 模式的一致性
 */
function startBackendServer() {
  // 在开发环境使用当前工作目录，生产环境使用打包后的路径
  const backendPath = is.dev
    ? join(process.cwd(), 'backend/server.js')
    : join(__dirname, '../../backend/server.js')

  console.log('启动后端服务器:', backendPath)

  serverProcess = spawn(process.execPath, [backendPath], {
    env: { ...process.env, PORT: '3010' },
    stdio: 'inherit',
  })

  serverProcess.on('error', (err) => {
    console.error('启动后端服务器失败:', err)
  })

  serverProcess.on('exit', (code) => {
    console.log('后端服务器退出，代码:', code)
  })
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: false, // 禁用上下文隔离，使 WebHID API 可用
      webSecurity: false, // 允许跨域请求，用于开发环境
      nodeIntegration: true, // 启用 Node.js 集成
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 监听 F12 快捷键打开 DevTools
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发环境：加载 Vite 开发服务器
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  }
  else {
    // 生产环境：先启动后端 Express 服务器，然后加载 http://localhost:3010
    // 这样可以保持 Web 模式和 Electron 模式的一致性
    startBackendServer()

    // 等待服务器启动后加载 URL
    setTimeout(() => {
      mainWindow?.loadURL('http://localhost:3010')
    }, 1000)
  }
}

// 启用 WebHID API - 必须在 app.whenReady() 之前调用
app.commandLine.appendSwitch('enable-experimental-web-platform-features')
app.commandLine.appendSwitch('enable-features', 'WebHID')
// 禁用 Web 安全策略，允许跨域请求和 WebHID API 访问
app.commandLine.appendSwitch('disable-web-security')
// 允许访问文件:// URLs
app.commandLine.appendSwitch('allow-file-access-from-files')

// This method will be called when Electron has finished
// initialization and ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.mouse-hid')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers for API configuration
  ipcMain.handle('get-api-config', () => {
    // 从环境变量读取后端服务地址，如果没有则使用默认值
    const apiBaseUrl = process.env.VITE_SERVER_API || 'http://localhost:3010'

    console.log('获取 API 配置:', { isDev: is.dev, apiBaseUrl })

    return {
      apiBaseUrl,
      isDev: is.dev,
      isElectron: true,
    }
  })

  ipcMain.handle('set-api-config', (_event, apiBaseUrl: string) => {
    // 可以将配置保存到本地文件
    process.env.API_BASE_URL = apiBaseUrl
    return { success: true }
  })

  // 设置权限处理器 - 必须在 app.whenReady() 之后设置
  // 设置设备权限处理器（用于处理已授权设备的访问）
  session.defaultSession.setDevicePermissionHandler((details) => {
    console.log('设备权限检查:', details)
    // 允许所有 HID 设备访问并记住权限
    if (details.deviceType === 'hid') {
      return true
    }
    return false
  })

  // 设置权限检查处理器（用于处理权限请求，如 requestDevice）
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    console.log('权限检查:', { permission, requestingOrigin, details })
    // 允许 HID 权限请求
    if (permission === 'hid') {
      return true
    }
    // 也允许其他权限
    return true
  })

  createWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0)
      createWindow()
  })
})

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 退出前清理后端服务器进程
app.on('before-quit', () => {
  if (serverProcess) {
    console.log('关闭后端服务器')
    serverProcess.kill()
  }
})
