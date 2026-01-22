import { resolve } from 'path'
import { readFileSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// 读取 VITE_SERVER_API 环境变量
const serverApi = process.env.VITE_SERVER_API || 'http://localhost:3010'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      // 将 VITE_SERVER_API 注入到主进程代码中
      'process.env.VITE_SERVER_API': JSON.stringify(serverApi)
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  }
  // renderer 由 vite build 单独构建到 backend/dist
  // electron-vite 只处理 main 和 preload
})
