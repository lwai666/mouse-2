import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getApiConfig: () => ipcRenderer.invoke('get-api-config'),
  setApiConfig: (apiBaseUrl: string) => ipcRenderer.invoke('set-api-config', apiBaseUrl),

  // HID 设备选择
  onHIDDeviceList: (callback: (deviceList: any[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, deviceList: any[]) => callback(deviceList)
    ipcRenderer.on('show-hid-device-selector', listener)
    return () => ipcRenderer.removeListener('show-hid-device-selector', listener)
  },
  selectHIDDevice: (deviceId: string) => {
    ipcRenderer.send('select-hid-device', deviceId)
  },
  cancelHIDDeviceSelection: () => {
    ipcRenderer.send('cancel-hid-device-selection')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
