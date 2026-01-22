import { ref, watch } from 'vue'

// 默认 API 地址
const DEFAULT_API_URL = 'http://localhost:3010'

// API 配置状态
const apiBaseUrl = ref(DEFAULT_API_URL)
const isElectron = ref(false)

// 检测是否在 Electron 环境中
function checkElectronEnvironment() {
  return !!(window && window.electron)
}

// 初始化 API 配置
export async function initApiConfig() {
  isElectron.value = checkElectronEnvironment()

  if (isElectron.value && window.api) {
    try {
      const config = await window.api.getApiConfig()
      apiBaseUrl.value = config.apiBaseUrl
      console.log('Electron API 配置已加载:', apiBaseUrl.value)
    }
    catch (error) {
      console.error('加载 Electron API 配置失败:', error)
      apiBaseUrl.value = DEFAULT_API_URL
    }
  }
  else {
    // Web 环境使用环境变量
    apiBaseUrl.value = import.meta.env.VITE_SERVER_API || DEFAULT_API_URL
  }

  return apiBaseUrl.value
}

// 获取当前 API 地址
export function getApiBaseUrl() {
  return apiBaseUrl.value
}

// 设置 API 地址（仅在 Electron 环境下可持久化）
export async function setApiBaseUrl(url: string) {
  if (isElectron.value && window.api) {
    try {
      await window.api.setApiConfig(url)
      apiBaseUrl.value = url
      return true
    }
    catch (error) {
      console.error('设置 API 配置失败:', error)
      return false
    }
  }
  else {
    // Web 环境只更新内存中的值
    apiBaseUrl.value = url
    return true
  }
}

// 获取完整的 API URL
export function getApiUrl(path: string) {
  const baseUrl = getApiBaseUrl()
  // 移除路径前导斜杠并拼接
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${baseUrl}/${cleanPath}`
}

// Composable
export function useApiConfig() {
  return {
    apiBaseUrl,
    isElectron,
    initApiConfig,
    getApiBaseUrl,
    setApiBaseUrl,
    getApiUrl,
  }
}
