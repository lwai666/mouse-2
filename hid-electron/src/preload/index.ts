import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  onInputreport: (callback) => ipcRenderer.on('onInputreport', (_, path, dataArray) => callback(path, dataArray)),
  onDevices: (callback) => ipcRenderer.on('onDevices', (_, deviceList) => callback(deviceList)),
  getDevices: async () => await ipcRenderer.invoke('get-devices'),
  hidSend: async (path: string, dataArray: number[]) => await ipcRenderer.invoke('hid-send', path, dataArray)
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
