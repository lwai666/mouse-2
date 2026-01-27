import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getApiConfig: () => Promise<{
        apiBaseUrl: string
        isDev: boolean
        isElectron: boolean
      }>
      setApiConfig: (apiBaseUrl: string) => Promise<{ success: boolean }>
      onHIDDeviceList: (callback: (deviceList: any[]) => void) => () => void
      selectHIDDevice: (deviceId: string) => void
      cancelHIDDeviceSelection: () => void
    }
  }
}

export {}
