import { ElectronAPI } from '@electron-toolkit/preload'
import { DeviceSendType } from '@renderer/type';

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      onInputreport: (callback: (path: string, dataArray: number[]) => void) => void;
      onDevices: (callback: (DeviceList: DeviceType[]) => void) => void;
      getDevices: () => Promise<DeviceType[]>;
      hidSend: (path: string, dataArray: number[]) => Promise<any[]>;
    }
  }
}
