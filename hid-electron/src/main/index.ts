import { usb } from 'usb'
import { join } from 'path'
import HID from "node-hid";
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null

// Fn + F12 打开控制台
function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 760,
    height: 700,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.auto-cs')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
});



const devices = [
  // usagePage: 12, usage: 1
  // usagePage: 1, usage: 128
  // usagePage: 65280, usage: 2
  { vendorId: 0x2FE3, productId: 0x0007, name: "鼠标", usagePage: 65280, usage: 2, sendData: 0x0F },
  { vendorId: 0x2FE5, productId: 0x0005, name: "接收器", usagePage: 65280, usage: 2, sendData: 0x18 },
]
const connectedDevices = new Map();

// 监听插入
usb.on('attach', (device) => {
  const desc = device.deviceDescriptor;
  const _device = devices.find(d => d.vendorId === desc.idVendor && d.productId === desc.idProduct)
  if (_device) {
    console.log('🎯 检测到目标设备插入，尝试连接');
    connectMatchingDevices();
  }
})
// 监听拔出
usb.on('detach', (device) => {
  const desc = device.deviceDescriptor;
  console.log('❌ USB 拔出:', desc);
  for (const [path, dev] of connectedDevices.entries()) {
    const devInfo = dev._deviceInfo;
    if (
      devInfo.vendorId === desc.idVendor &&
      devInfo.productId === desc.idProduct
    ) {
      console.log(`🧹 关闭并移除设备: ${path}`);
      dev.close();
      connectedDevices.delete(path);
      onDevices()
    }
  }
});


function connectMatchingDevices() {
  const _devices = HID.devices();
  console.log("_devices===========", _devices)
  _devices.forEach(deviceInfo => {
    const _device = devices.find(d =>
      d.vendorId === deviceInfo.vendorId &&
      d.productId === deviceInfo.productId &&
      d.usagePage === deviceInfo.usagePage &&
      d.usage === deviceInfo.usage
    )
    if (!_device || !deviceInfo.path) {
      return;
    }

    console.log("deviceInfo===========", deviceInfo);

    if (!connectedDevices.has(deviceInfo.path)) {
      try {
        const dev = new HID.HID(deviceInfo.path);
        // @ts-ignore
        dev._deviceInfo = deviceInfo;
        dev.on('data', data => {
          console.log(`📥 来自 [${deviceInfo.path}] 的数据:`, data);
          mainWindow?.webContents.send('onInputreport', deviceInfo.path, [...data]);
        });
        dev.on('error', err => {
          console.error(`❗ 设备 [${deviceInfo.path}] 出错:`, err);
          dev.close();
          connectedDevices.delete(deviceInfo.path);
          onDevices()
        });

        connectedDevices.set(deviceInfo.path, dev);
        console.log(`✅ 已连接设备: ${deviceInfo.path}`);
        onDevices()
      } catch (e) {
        console.error('连接设备失败:', e);
      }
    }
  });
}

setTimeout(() => {
  connectMatchingDevices()
}, 1000)

function onDevices() {
  const devicesInfo = Array.from(connectedDevices.values()).map(dev => {
    const info = dev._deviceInfo;
    return {
      path: info.path,
      vendorId: info.vendorId,
      productId: info.productId,
      usagePage: info.usagePage,
      usage: info.usage,
      product: info.product,
      serialNumber: info.serialNumber,
    };
  });
  mainWindow?.webContents.send('onDevices', devicesInfo);
}

// 向指定设备发送数据
function sendToDeviceByPath(path, dataArray) {
  const dev = connectedDevices.get(path);
  if (!dev) {
    console.error(`🚫 没有连接的设备: ${path}`);
    return;
  }

  try {
    dev.write([...dataArray]);
    console.log(`📤 已向设备 [${path}] 发送:`, dataArray);
  } catch (err) {
    console.error(`❌ 写入失败: ${path}`, err);
  }
}

ipcMain.handle('hid-send', (_event, path: string, dataArray: number[]) => {
  return sendToDeviceByPath(path, dataArray)
});



// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // 关闭所有连接的设备
  for (const [path, dev] of connectedDevices.entries()) {
    console.log(`🧹 关闭设备连接: ${path}`);
    dev.close();
    connectedDevices.delete(path);
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用即将退出时也关闭所有设备
app.on('before-quit', () => {
  for (const [path, dev] of connectedDevices.entries()) {
    console.log(`🧹 应用退出前关闭设备: ${path}`);
    dev.close();
    connectedDevices.delete(path);
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
