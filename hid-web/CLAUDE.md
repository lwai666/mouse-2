# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **HID (Human Interface Device) firmware management web application** for mouse devices. It's a pnpm monorepo with a Vue 3 frontend (root) and Express.js backend (`backend/` directory). The app uses the Web HID API to communicate directly with mouse devices for firmware updates and configuration.

## Commands

```bash
# Install dependencies (must run from root)
pnpm install

# Development (both frontend and backend)
pnpm dev          # Frontend dev server on http://localhost:3010
pnpm start        # Backend on http://localhost:3010

# Build and production
pnpm build        # Build frontend to backend/dist directory
pnpm start        # Serve built frontend + backend API

# Code quality
pnpm lint         # ESLint
pnpm typecheck    # TypeScript checking
```

## Architecture

### Monorepo Structure

- **Root directory**: Vue 3 frontend application
- **`backend/`**: Express.js API server (workspace package)
- **`pnpm-workspace.yaml`**: Defines backend as workspace package

### Build Flow

The frontend builds directly into the backend's static directory:
- `vite.config.ts` sets `outDir: 'backend/dist'`
- Backend serves static files from `backend/dist`
- After `pnpm build`, run `pnpm start` to serve the full stack

### Frontend Architecture

- **Framework**: Vue 3 with Composition API and `<script setup>`
- **Routing**: File-based routing via `unplugin-vue-router` (routes auto-generated from `src/pages/`)
- **State**: Pinia stores in `src/stores/` (auto-imported)
- **Components**: Auto-registered via `unplugin-vue-components` (no manual imports needed)
- **Composables**: Auto-imported from `src/composables/`
- **Styling**: UnoCSS + SCSS with `@use` for Element Plus
- **i18n**: Vue I18n with locales in `locales/` (en, zh, ko, ja, de)

**Auto-imports** (configured in `vite.config.ts`):
- Vue, VueRouter, VueUse, Vue I18n APIs
- All exports from `src/composables/` and `src/stores/`
- Components from `src/components/` are auto-registered

### HID Device Communication

The core feature uses the **Web HID API** for direct device communication:

- Device IDs: Mouse (`0x2FE3:0x0007`), Receiver (`0x2FE5:0x0005`)
- HID utilities in `src/utils/hidHandle.ts`, `src/utils/hidKey.ts`
- Supports multiple mouse versions (v8, v9, v10, v11) with version-specific handling
- Custom protocol for firmware updates and key mapping configuration

**Important**: Web HID API requires:
- Secure context (HTTPS in production, localhost in dev)
- User gesture/permission for device access
- Chromium-based browsers (Chrome, Edge, Opera)

### Backend API

Express server on port 3010 with:

- **`GET /api/latest-version`**: Fetch latest firmware version from SQLite
- **`POST /api/upload-update-package`**: Upload firmware packages (SPI + USB files via multer)
- **`/uploads`**: Static file serving for firmware packages
- **`/`**: Serves built Vue app with caching (1 year for assets, no-cache for HTML)

Firmware uploads stored in `backend/uploads/` with metadata in SQLite (`firmware.db`).

## Configuration Details

### Environment Variables

- `VITE_SERVER_API`: Backend API base URL
- `VITE_ADMIN_PASSWORD_HASH`: Admin authentication hash

### Key Files

- `vite.config.ts`: Build output, plugins, auto-imports, aliases
- `pnpm-workspace.yaml`: Monorepo workspace definition (backend package)
- `backend/server.js`: Express server with SQLite, multer, CORS
- `backend/database.js`: SQLite setup for firmware version tracking

### Port Configuration

- Frontend dev: `3010` (configured in `pnpm dev`)
- Backend: `3010` (or `PORT` env var)

## Special Considerations

1. **Workspace dependency**: Backend depends on `pnpm-workspace.yaml` existing. If you see "Cannot find module" errors in backend, ensure this file exists and run `pnpm install` from root.

2. **Build order**: Always build frontend (`pnpm build`) before starting production server, as backend serves the static files.

3. **HID API limitations**: Device communication only works in secure contexts. For local development, `localhost:` works; for production, HTTPS is required.

4. **Firmware dual-package**: The system handles two separate firmware files (SPI and USB) that must be uploaded together as a versioned package.
