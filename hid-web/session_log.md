# 会话记录 - Electron 打包配置

**日期**: 2025-01-22
**项目**: hid-web (鼠标 HID 配置工具)

---

## 项目概述

这是一个基于 Vue 3 + Vite 的 HID 鼠标配置 Web 应用，需要支持打包成 Electron 桌面应用（exe）。

### 项目结构

```
hid-web/
├── src/                    # Vite 前端源码
│   ├── main/               # Electron 主进程
│   ├── preload/            # Electron preload
│   ├── pages/              # Vue 页面
│   ├── components/         # Vue 组件
│   └── ...
├── backend/                # Node.js 后端
│   ├── server.js           # Express 服务器
│   └── dist/               # 前端构建产物
├── vite.config.ts          # Vite 配置
├── electron.vite.config.ts # Electron 配置
└── electron-builder.yml    # 打包配置
```

---

## 核心需求

### 开发环境流程
1. `pnpm dev` → 启动 Vite 开发服务器（端口 3010）
2. `pnpm electron:dev` → 启动 Electron，加载 `http://localhost:3010`

### 打包流程
```bash
pnpm build:win
```

执行步骤：
1. `pnpm run build` → Vite 构建前端到 `backend/dist/`
2. `electron-vite build` → 编译 main/preload 到 `out/`
3. `electron-builder --win` → 打包成 exe

### 关键点
- **打包的 exe 不需要内置后端服务器**
- **后端服务地址通过 `VITE_SERVER_API` 环境变量配置**
- **生产环境连接远程服务器**（如 `https://scyrox2.shunyue.top`）

---

## 配置修改记录

### 1. `src/main/index.ts` - 主进程配置

**关键修改**:
- 开发环境加载 `http://localhost:3010`
- 生产环境加载 `join(__dirname, '../../backend/dist/index.html')`
- 从 `process.env.VITE_SERVER_API` 读取后端地址
- **启用 WebHID API**（新增）

```typescript
// 启用 WebHID API - 必须在 app.whenReady() 之前调用
app.commandLine.appendSwitch('enable-experimental-web-platform-features')
app.commandLine.appendSwitch('enable-features', 'WebHID')

app.whenReady().then(() => {
  // ...
  ipcMain.handle('get-api-config', () => {
    const apiBaseUrl = process.env.VITE_SERVER_API || 'http://localhost:3010'
    return { apiBaseUrl, isDev: is.dev, isElectron: true }
  })
})
```

### 2. `electron.vite.config.ts` - Electron 构建配置

**配置说明**:
- 只编译 `main` 和 `preload`
- **不编译 renderer**（由 Vite 单独构建）
- 将 `VITE_SERVER_API` 注入到主进程

```typescript
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      'process.env.VITE_SERVER_API': JSON.stringify(serverApi)
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  }
  // renderer 由 vite build 单独构建到 backend/dist
})
```

### 3. `package.json` - 构建脚本

```json
{
  "scripts": {
    "build": "vite build",
    "electron:dev": "cross-env ELECTRON_RENDERER_URL=http://localhost:3010 electron-vite dev",
    "electron:build": "electron-vite build",
    "build:win": "pnpm run build && cross-env VITE_SERVER_API=https://scyrox2.shunyue.top pnpm run electron:build && electron-builder --win"
  }
}
```

### 4. `electron-builder.yml` - 打包配置

```yaml
files:
  - out/**/*            # electron-vite 编译后的 main/preload
  - backend/dist/**/*   # vite 构建的前端产物
  - resources/**        # 资源文件
```

### 5. `src/composables/useApiConfig.ts` - API 配置

**功能**:
- 自动检测 Electron 环境
- 从主进程获取 API 配置
- 提供 `getApiUrl()` 辅助函数

---

## WebHID 支持

### 问题
前端代码使用 `window.navigator.hid` API，在 Electron 打包后需要特殊配置才能使用。

### 解决方案
添加 Chrome flags 启用 WebHID：

```typescript
app.commandLine.appendSwitch('enable-experimental-web-platform-features')
app.commandLine.appendSwitch('enable-features', 'WebHID')
```

### 兼容性
- Electron 35.1.2 使用 Chromium 134
- Chromium 89+ 完全支持 WebHID
- ✅ Electron 35 支持，但需要 flags 启用

### 注意事项
1. ⚠️ `navigator.hid.requestDevice()` 需要用户手势触发（点击等）
2. ⚠️ 用户首次连接设备需要授权
3. ⚠️ 实验性 API，未来可能有变化

---

## 打包后的文件结构

```
app.asar/
├── out/
│   ├── main/
│   │   └── index.js       # __dirname 在这里
│   └── preload/
│       └── index.js
└── backend/
    └── dist/
        └── index.html      # ../../backend/dist/index.html
        ├── assets/
        │   ├── index-xxx.js
        │   └── index-xxx.css
        └── ...
```

---

## 环境变量配置

### `.env` (开发环境)
```env
VITE_SERVER_API=http://localhost:3010
```

### `.env.production` (生产环境)
```env
VITE_SERVER_API=https://scyrox2.shunyue.top
```

### 打包时覆盖
```bash
# 在 package.json 的 build:win 中通过 cross-env 覆盖
cross-env VITE_SERVER_API=https://scyrox2.shunyue.top pnpm run electron:build
```

---

## 参考项目对比

### hid-electron (标准 electron-vite 项目)
```
src/
├── main/
├── preload/
└── renderer/
```
- 使用 `node-hid` 原生模块
- 在主进程中操作 HID 设备
- 通过 IPC 与渲染进程通信

### hid-web (web + electron 混合项目) - 本项目
```
src/              # Vite 前端源码
├── main/         # Electron 主进程
├── preload/      # Electron preload
└── ...           # 其他前端代码

backend/dist/     # Vite 构建产物 → 作为 renderer
```
- 使用 `navigator.hid` Web API
- 前端直接操作 HID 设备
- 需要启用 WebHID flags

---

## 后续任务

- [ ] 打包测试 WebHID 功能是否正常
- [ ] 如有问题，考虑改用 `node-hid` 方案
- [ ] 测试设备连接、数据收发等功能

---

## 相关命令速查

```bash
# 开发环境
pnpm dev              # 启动前端开发服务器 (3010)
pnpm electron:dev     # 启动 Electron

# 打包
pnpm build            # 构建前端到 backend/dist
pnpm electron:build   # 编译 Electron 代码
pnpm build:win        # 打包 Windows exe
pnpm build:mac        # 打包 macOS
pnpm build:linux      # 打包 Linux

# 代码检查
pnpm lint             # ESLint 检查
pnpm typecheck        # TypeScript 类型检查
```
