import { join } from 'path'
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { fileURLToPath } from 'node:url'

import icon from '../../resources/icon.png?asset'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false // 允许跨域请求，用于开发环境
    }
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
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    // 生产环境：加载前端构建产物 (backend/dist/index.html)
    // __dirname 在打包后是 app.asar/out/main，需要回退到 backend/dist
    const htmlPath = join(__dirname, '../../backend/dist/index.html')
    console.log('加载前端文件:', htmlPath)
    mainWindow.loadFile(htmlPath)
  }
}

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
      isElectron: true
    }
  })

  ipcMain.handle('set-api-config', (_event, apiBaseUrl: string) => {
    // 可以将配置保存到本地文件
    process.env.API_BASE_URL = apiBaseUrl
    return { success: true }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
