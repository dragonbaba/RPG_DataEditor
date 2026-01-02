# Tech Stack

## Core Technologies
- **Runtime**: Electron 33.x (desktop app framework)
- **Frontend**: React 18.x with TypeScript 5.7
- **Build Tool**: Vite 6.x
- **State Management**: Zustand 5.x with persist middleware
- **Code Editor**: Monaco Editor 0.52
- **Graphics**: PixiJS 7.x (projectile preview)
- **Styling**: Tailwind CSS 3.x with custom sci-fi theme

## Project Structure
- `electron/` - Main process (Electron)
- `src/` - Renderer process (React)
- `dist/` - Vite build output
- `dist-electron/` - Compiled Electron files
- `release/` - Packaged application output

## Build Commands

```bash
# Development
npm run dev              # Start Vite dev server only
npm run electron:dev     # Start full Electron dev environment

# Production Build
npm run build            # Build Vite (renderer)
npm run electron:build   # Full production build
npm run electron:build:win   # Windows build
npm run electron:build:mac   # macOS build
npm run electron:build:linux # Linux build

# Testing
npm run test             # Run tests once (vitest --run)
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage

# Other
npm run typecheck        # TypeScript check
npm run lint             # ESLint
npm run clean            # Remove dist folders
```

## TypeScript Configuration
- `tsconfig.json` - Root config with project references
- `tsconfig.app.json` - React/Vite app config
- `tsconfig.electron.json` - Electron main process
- `tsconfig.preload.json` - Preload script (outputs CommonJS)
- `tsconfig.node.json` - Node/Vite config files

## Key Dependencies
- `electron-updater` - Auto-update functionality
- `electron-builder` - App packaging
- `vitest` - Testing framework
- `fast-check` - Property-based testing

## Path Aliases
Configured in `vite.config.ts`:
- `@/` → `src/`
- `@components/` → `src/components/`
- `@hooks/` → `src/hooks/`
- `@stores/` → `src/stores/`
- `@utils/` → `src/utils/`
- `@types/` → `src/types/`
- `@services/` → `src/services/`
- `@theme/` → `src/theme/`
- `@pools/` → `src/pools/`
