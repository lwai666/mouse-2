# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 HID（人机接口设备）鼠标配置 Web 应用，支持两种部署模式：
- **Web 应用**：使用 WebHID API 进行浏览器端设备通信
- **Electron 桌面应用**：打包的桌面版本

应用允许用户为不同版本的鼠标（v8、v9、v10、v11）配置自定义按键、宏和各种设置。

## 常用命令

### 开发
```bash
pnpm dev          # 启动开发服务器（端口 9000）
pnpm build        # 生产构建到 backend/dist
pnpm preview      # 预览构建后的应用
pnpm start        # 启动 Node.js 后端服务器
```

### 代码质量
```bash
pnpm lint         # 运行 ESLint
pnpm typecheck    # TypeScript 类型检查
```

### 测试
```bash
pnpm test         # 运行 Vitest 测试
pnpm test:unit    # 仅单元测试
pnpm test:e2e     # Cypress E2E 测试
```

### Electron 桌面应用
```bash
pnpm electron:dev    # Electron 开发模式
pnpm electron:build  # 构建 Electron 应用
pnpm build:win       # 构建 Windows 版本
pnpm build:mac       # 构建 macOS 版本
pnpm build:linux     # 构建 Linux 版本
```

### 后端（独立工作区）
```bash
cd backend && pnpm start    # 启动后端服务器
```

## 技术栈

- **Vue 3** 使用 Composition API 和 `<script setup>` 语法
- **Vite** 用于构建和开发服务器
- **TypeScript** 严格模式
- **Element Plus** UI 组件库
- **Pinia** 状态管理
- **Vue Router** 基于文件的路由（`src/pages/`）
- **UnoCSS** 原子化 CSS
- **Express** 后端服务器，使用 SQLite3
- **Electron** 桌面应用打包

## 架构

### 项目结构

```
├── src/                    # 前端源码
│   ├── components/         # 可复用 Vue 组件
│   ├── composables/        # 可复用组合式函数
│   │   ├── hid.js              # WebHID API 通信
│   │   └── hidDataConverter.js # 数据协议转换
│   ├── pages/              # 基于文件的路由
│   │   └── hid/                # 版本特定页面 (v8.vue, v9.vue, v10.vue, v11.vue)
│   ├── layouts/            # Vue 布局
│   ├── stores/             # Pinia 状态存储
│   ├── utils/              # 工具函数
│   │   ├── hidHandle.ts        # HID 设备处理
│   │   ├── hidKey.ts           # 按键映射
│   │   └── batteryHandle.js    # 电池管理
│   ├── main/               # Electron 主进程
│   └── preload/            # Electron 预加载脚本
├── backend/                # Node.js Express 服务器（独立工作区）
│   ├── server.js           # Express 服务器
│   ├── database.js         # SQLite3 数据库
│   └── uploads/            # 固件文件上传目录
├── locales/                # i18n 翻译文件
├── electron.vite.config.ts # Electron Vite 配置
└── vite.config.ts          # Web Vite 配置
```

### HID 通信架构

核心 HID 功能分布在多个关键文件中：

1. **`src/composables/hid.js`**：WebHID API 主接口
   - 设备连接/断开
   - Feature Report 通信
   - 设备枚举和过滤
   - 设备在线状态、电量检测、配对等功能

2. **`src/utils/hidHandle.ts`**：高级设备操作
   - 按键映射定义（`keyMap`）
   - 数据包构造和解析
   - 命令执行（带重试逻辑）
   - 设备状态管理

3. **`src/composables/hidDataConverter.js`**：数据协议层
   - 二进制数据编码/解码
   - 协议特定的数据转换

4. **`src/pages/hid/[name].vue`**：版本特定实现
   - 每个鼠标版本（v8-v11）有独立页面
   - 可能使用不同的协议或功能

5. **`src/utils/batteryHandle.js`**：电池管理
   - 电池状态轮询
   - 电量显示

### 后端服务器

Node.js 后端（`backend/server.js`）处理：
- 通过 `multer` 处理固件文件上传
- CORS 启用的 API 端点
- SQLite3 数据库持久化
- 固件版本管理和更新

### Electron 架构

- **主进程** (`src/main/index.ts`)：Electron 主进程入口
- **预加载脚本** (`src/preload/index.ts`)：预加载 API 注入
- **渲染进程**：Web 应用代码，通过 `electron-vite` 单独构建

## 关键模式

### 自动导入

Vue、Vue Router、VueUse 和 Composition API 函数都自动导入，无需手动导入：
- `ref`、`reactive`、`computed`、`watch` 等
- `router`、`route`
- VueUse 函数
- `src/composables/` 和 `src/stores/` 中的导出也会自动导入

### 路径别名
- `~/` 解析为 `src/`

### 国际化

应用使用 Vue I18n 支持多种语言（中文、英文、日文、韩文、德文）。用户界面字符串始终使用 `$t('key')`。

### 设备版本处理

不同鼠标版本可能使用不同的协议。添加功能时，请检查是否需要在相应的 `v*.vue` 页面中进行版本特定处理。

### Monorepo 结构

项目使用 pnpm workspace：
- 根目录：Web 应用和 Electron 配置
- `backend/`：独立的 Express 服务器工作区

## 重要注意事项

- **必须使用 pnpm**：项目有 preinstall hook 强制使用 pnpm
- **WebHID API**：仅适用于基于 Chrome 的浏览器，需要 HTTPS（或 localhost）
- **固件更新**：通过后端上传端点处理
- **电池监控**：`src/utils/batteryHandle.js` 管理电池状态轮询
- **开发服务器端口**：默认运行在 9000 端口（见 `vite.config.ts`）
- **构建输出**：前端构建到 `backend/dist` 目录

## HID 命令常量

在 `src/composables/hid.js` 中定义的核心命令：

```javascript
const Command = {
  EncryptionData: 1,        // 下传加密数据
  BatteryLevel: 4,          // 获取电池电量
  DongleEnterPair: 5,       // 进入配对模式
  WriteFlashData: 7,        // 写入 EEPROM
  ReadFlashData: 8,         // 读取 EEPROM
  ClearSetting: 9,          // 恢复出厂设置
  SetCurrentConfig: 0x0F,   // 设置当前配置
  GetCurrentConfig: 0x0E,   // 获取当前配置
  // ... 更多命令
}
```

## EEPROM 地址映射

在 `src/composables/hid.js` 中定义的鼠标 EEPROM 地址：

```javascript
let MouseEepromAddr = {
  ReportRate: 0x00,    // 报告率
  MaxDPI: 0x02,        // 最大 DPI
  CurrentDPI: 0x04,    // 当前 DPI
  DPIValue: 0x0C,      // DPI 值
  DPIColor: 0x2C,      // DPI 颜色
  DPILight: 0x4C,      // DPI 灯光
  Light: 0xA0,         // 灯光设置
  KeyFunction: 0x60,   // 按键功能
  Macro: 0x0300,       // 宏
  // ... 更多地址
}
```
