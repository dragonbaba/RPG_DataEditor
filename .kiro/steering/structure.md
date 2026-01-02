# Project Structure

## Directory Layout

```
src/
├── components/          # React components by feature
│   ├── editor/         # Monaco editor integration
│   ├── error/          # Error handling, toasts, boundaries
│   ├── file/           # File operations, drag-drop, history
│   ├── layout/         # Sidebar, StatusBar, ResizablePanel
│   ├── note/           # Note editor
│   ├── projectile/     # Projectile/trajectory editor with PixiJS
│   ├── property/       # Property grid editor
│   ├── quest/          # Quest system editor
│   ├── script/         # Script mode panel
│   ├── ui/             # Reusable UI primitives (Button, Input, Dialog, etc.)
│   ├── update/         # Auto-update UI
│   └── virtualization/ # Virtual list for large datasets
├── hooks/              # Custom React hooks (useDebounce, useUndoRedo, usePersistence)
├── pools/              # Object pooling for performance (DOM, Editor instances)
├── services/           # Business logic and external integrations
│   ├── plugins/        # Plugin system
│   └── serialization/  # JSON serialization with error handling
├── stores/             # Zustand state management
├── theme/              # Theme system with sci-fi effects
├── types/              # TypeScript type definitions
└── utils/              # Utility functions (animation, math, easing, color)

electron/
├── main.ts             # Electron main process
├── preload.ts          # Context bridge (IPC whitelist)
└── autoUpdater.ts      # Auto-update service
```

## Component Patterns

### Feature Components
Each feature folder typically contains:
- `FeatureEditor.tsx` - Main component
- `types.ts` - Feature-specific types
- `index.ts` - Barrel export

### State Management
- Global state in `src/stores/appStore.ts` using Zustand
- Selector hooks for optimized re-renders (`useFileState`, `useEditState`, etc.)
- Action hooks separated from state hooks

### IPC Communication
- Whitelist-based channel validation in `preload.ts`
- `IPCListenerManager` service prevents duplicate listeners
- Main process sends events via `webContents.send()`
- Renderer registers via `window.ipcOn(channel, callback)`

### Lazy Loading
Editor components are lazy-loaded via `React.lazy()` for code splitting:
- ScriptModePanel, PropertyEditor, NoteEditor, ProjectileEditor, QuestEditor

## Naming Conventions
- Components: PascalCase (`PropertyEditor.tsx`)
- Hooks: camelCase with `use` prefix (`useDebounce.ts`)
- Services: PascalCase class + camelCase instance (`FileSystemService.ts`)
- Types: PascalCase interfaces, camelCase type aliases
- Test files: `*.test.ts` or `*.property.ts` (property-based tests)
