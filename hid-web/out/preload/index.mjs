import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
const api = {
  getApiConfig: () => ipcRenderer.invoke("get-api-config"),
  setApiConfig: (apiBaseUrl) => ipcRenderer.invoke("set-api-config", apiBaseUrl)
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
