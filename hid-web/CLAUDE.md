# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a HID (Human Interface Device) mouse configuration web application with dual deployment modes:
- **Web app**: Uses WebHID API for browser-based device communication
- **Electron desktop app**: Packaged desktop version

The application allows users to configure custom mouse buttons, macros, and settings for various mouse versions (v8, v9, v10, v11).

## Common Commands

### Development
```bash
pnpm dev          # Start dev server on port 3010
pnpm build        # Build for production
pnpm preview      # Preview built app
pnpm start        # Start Node.js backend server
```

### Code Quality
```bash
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
```

### Testing
```bash
pnpm test         # Run Vitest tests
pnpm test:unit    # Unit tests only
pnpm test:e2e     # Cypress E2E tests
```

### Electron Desktop App
```bash
pnpm electron:dev    # Electron dev mode
pnpm electron:build  # Build Electron app
pnpm build:win       # Build for Windows
pnpm build:mac       # Build for macOS
pnpm build:linux     # Build for Linux
```

## Tech Stack

- **Vue 3** with Composition API and `<script setup>` syntax
- **Vite** for builds and dev server
- **TypeScript** with strict mode
- **Element Plus** for UI components
- **Pinia** for state management
- **Vue Router** with file-based routing in `src/pages/`
- **UnoCSS** for atomic CSS
- **Express** backend with SQLite3

## Architecture

### Frontend Structure
```
src/
├── components/      # Reusable Vue components
├── composables/     # Reusable composition functions
│   ├── hid.js              # WebHID API communication
│   └── hidDataConverter.js # Data protocol conversion
├── pages/           # File-based routing (v8.vue, v9.vue, v10.vue, v11.vue)
├── layouts/         # Vue layouts
├── stores/          # Pinia stores
├── utils/           # Utilities
│   ├── hidHandle.ts       # HID device handling
│   ├── hidKey.ts          # Key mapping
│   └── batteryHandle.js   # Battery management
└── backend/         # Node.js Express server
```

### HID Communication Architecture

The core HID functionality is split across several key files:

1. **`src/composables/hid.js`**: Main WebHID API interface
   - Device connection/disconnection
   - Feature report communication
   - Device enumeration and filtering

2. **`src/utils/hidHandle.ts`**: High-level device operations
   - Packet construction and parsing
   - Command execution with retry logic
   - Device state management

3. **`src/utils/hidDataConverter.js`**: Data protocol layer
   - Binary data encoding/decoding
   - Protocol-specific transformations

4. **`src/pages/hid/*.vue`**: Version-specific implementations
   - Each mouse version (v8-v11) has its own page
   - May have different protocols or features

### Backend Server

The Node.js backend (`backend/server.js`) handles:
- Firmware file uploads via `multer`
- CORS-enabled API endpoints
- SQLite3 database for persistence

## Key Patterns

### Auto-imports
Vue, Vue Router, VueUse, and Composition API functions are auto-imported. No need to manually import:
- `ref`, `reactive`, `computed`, `watch`, etc.
- `router`, `route`
- VueUse functions

### Path Aliases
- `~/` resolves to `src/`

### Internationalization
The app uses Vue I18n with multiple languages. Always use `$t('key')` for user-facing strings.

### Device Version Handling
Different mouse versions may have different protocols. When adding features, check if version-specific handling is needed in the respective `v*.vue` pages.

## Important Notes

- **pnpm is required**: The project has a preinstall hook that enforces pnpm usage
- **WebHID API**: Only works in Chrome-based browsers and requires HTTPS (or localhost)
- **Firmware updates**: Handled via backend upload endpoint
- **Battery monitoring**: `src/utils/batteryHandle.js` manages battery status polling
