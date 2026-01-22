import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getApiConfig: () => Promise<{ apiBaseUrl: string }>
      setApiConfig: (apiBaseUrl: string) => Promise<{ success: boolean }>
    }
  }
}

export {}
