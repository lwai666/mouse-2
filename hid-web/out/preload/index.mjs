import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
const api = {
  getApiConfig: () => ipcRenderer.invoke("get-api-config"),
  setApiConfig: (apiBaseUrl) => ipcRenderer.invoke("set-api-config", apiBaseUrl),
  // HID 设备选择
  onHIDDeviceList: (callback) => {
    const listener = (_event, deviceList) => callback(deviceList);
    ipcRenderer.on("show-hid-device-selector", listener);
    return () => ipcRenderer.removeListener("show-hid-device-selector", listener);
  },
  selectHIDDevice: (deviceId) => {
    ipcRenderer.send("select-hid-device", deviceId);
  },
  cancelHIDDeviceSelection: () => {
    ipcRenderer.send("cancel-hid-device-selection");
  }
};
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
