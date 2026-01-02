/**
 * Type-safe IPC Service for Renderer Process
 * 
 * This service provides a type-safe wrapper around Electron's IPC communication.
 * It ensures that all IPC calls are properly typed at compile time.
 */

// Import the electron types to ensure Window interface is extended
import '../types/electron.d';

import type {
  IPCChannels,
  IPCEventChannels,
  IPCArgs,
  IPCReturn,
  IPCEventData,
  FileFilter,
  MessageBoxOptions,
  OpenDialogOptions,
  SaveDialogOptions,
} from '../types/ipc';
import type { EditorConfig } from '../types/index';

/**
 * Type-safe IPC invoke function
 * Calls the main process and returns a typed result
 */
async function invoke<K extends keyof IPCChannels>(
  channel: K,
  ...args: IPCArgs<K>
): Promise<IPCReturn<K>> {
  if (typeof window === 'undefined' || !window.electronAPI) {
    throw new Error('Electron API not available. Are you running in Electron?');
  }

  // Map our type-safe channels to the actual IPC handlers (for reference)
  // Note: We use direct method calls below instead of this mapping
  const _channelMap: Record<string, string> = {
    'file:read': 'read-file',
    'file:write': 'write-file',
    'file:delete': 'delete-file',
    'file:select': 'select-file',
    'file:select-directory': 'select-directory',
    'file:create-backup': 'create-backup',
    'file:list-directory': 'list-directory',
    'file:exists': 'file-exists',
    'config:load': 'read-config',
    'config:save': 'write-config',
    'window:minimize': 'minimize-window',
    'window:maximize': 'maximize-window',
    'window:close': 'close-window',
    'app:get-info': 'get-app-info',
    'app:get-system-info': 'get-system-info',
    'app:reload': 'reload-page',
    'app:open-dev-tools': 'open-dev-tools',
    'app:process-argv': 'process-argv',
    'dialog:show-message': 'show-message-box',
    'dialog:show-open': 'show-open-dialog',
    'dialog:show-save': 'show-save-dialog',
    'workspace:pick': 'pick-workspace',
    'workspace:list-dts-files': 'list-dts-files',
    'update:check': 'update-check',
    'update:download': 'update-download',
    'update:install': 'update-install',
  };

  // Note: _channelMap is kept for documentation purposes
  void _channelMap; // Suppress unused variable warning

  // Call the appropriate method based on channel
  switch (channel) {
    case 'file:read':
      return window.electronAPI.readFile(args[0] as string) as Promise<IPCReturn<K>>;
    case 'file:write':
      return window.electronAPI.writeFile(args[0] as string, args[1] as string) as Promise<IPCReturn<K>>;
    case 'file:delete':
      return window.electronAPI.deleteFile(args[0] as string) as Promise<IPCReturn<K>>;
    case 'file:select':
      return window.electronAPI.selectFile() as Promise<IPCReturn<K>>;
    case 'file:select-directory':
      return window.electronAPI.selectDirectory() as Promise<IPCReturn<K>>;
    case 'file:create-backup':
      return window.electronAPI.createBackup(args[0] as string) as Promise<IPCReturn<K>>;
    case 'file:list-directory':
      return window.electronAPI.listDirectory(args[0] as string) as Promise<IPCReturn<K>>;
    case 'file:exists':
      return window.electronAPI.fileExists(args[0] as string) as Promise<IPCReturn<K>>;
    case 'file:read-image':
      return (window.electronAPI as any).readImageData(args[0] as string) as Promise<IPCReturn<K>>;
    case 'config:load':
      return window.electronAPI.readConfig() as Promise<IPCReturn<K>>;
    case 'config:save':
      return window.electronAPI.writeConfig(args[0] as EditorConfig) as Promise<IPCReturn<K>>;
    case 'window:minimize':
      return window.electronAPI.minimizeWindow() as Promise<IPCReturn<K>>;
    case 'window:maximize':
      return window.electronAPI.maximizeWindow() as Promise<IPCReturn<K>>;
    case 'window:close':
      return window.electronAPI.closeWindow() as Promise<IPCReturn<K>>;
    case 'app:get-info':
      return window.electronAPI.getAppInfo() as Promise<IPCReturn<K>>;
    case 'app:get-system-info':
      return window.electronAPI.getSystemInfo() as Promise<IPCReturn<K>>;
    case 'app:reload':
      return window.electronAPI.reloadPage() as Promise<IPCReturn<K>>;
    case 'app:open-dev-tools':
      return window.electronAPI.openDevTools() as Promise<IPCReturn<K>>;
    case 'app:process-argv':
      return window.electronAPI.processArgv() as Promise<IPCReturn<K>>;
    case 'dialog:show-message':
      return window.electronAPI.showMessageBox(args[0] as MessageBoxOptions) as Promise<IPCReturn<K>>;
    case 'dialog:show-open':
      return window.electronAPI.showOpenDialog(args[0] as OpenDialogOptions) as Promise<IPCReturn<K>>;
    case 'dialog:show-save':
      return window.electronAPI.showSaveDialog(args[0] as SaveDialogOptions) as Promise<IPCReturn<K>>;
    case 'workspace:pick':
      return window.electronAPI.pickWorkspace() as Promise<IPCReturn<K>>;
    case 'workspace:list-dts-files':
      return window.electronAPI.listDtsFiles(args[0] as string) as Promise<IPCReturn<K>>;
    default:
      throw new Error(`Unknown IPC channel: ${channel}`);
  }
}

/**
 * Subscribe to IPC events from main process
 */
function on<K extends keyof IPCEventChannels>(
  channel: K,
  callback: (data: IPCEventData<K>) => void
): void {
  if (typeof window === 'undefined' || !window.ipcOn) {
    console.warn('IPC event listener not available');
    return;
  }
  window.ipcOn(channel, callback as (data: unknown) => void);
}

/**
 * Unsubscribe from IPC events
 */
function off<K extends keyof IPCEventChannels>(channel: K): void {
  if (typeof window === 'undefined' || !window.ipcOff) {
    console.warn('IPC event listener not available');
    return;
  }
  window.ipcOff(channel);
}

/**
 * Type-safe IPC Service
 * Provides organized access to all IPC operations
 */
export const ipc = {
  invoke,
  on,
  off,

  // Convenience methods for common operations
  file: {
    read: (path: string) => invoke('file:read', path),
    write: (path: string, content: string) => invoke('file:write', path, content),
    delete: (path: string) => invoke('file:delete', path),
    select: (filters?: FileFilter[]) => invoke('file:select', filters),
    selectDirectory: () => invoke('file:select-directory'),
    createBackup: (path: string) => invoke('file:create-backup', path),
    listDirectory: (path: string) => invoke('file:list-directory', path),
    exists: (path: string) => invoke('file:exists', path),
    readImage: (path: string) => invoke('file:read-image', path),
  },

  config: {
    load: () => invoke('config:load'),
    save: (config: Partial<EditorConfig>) => invoke('config:save', config),
  },

  window: {
    minimize: () => invoke('window:minimize'),
    maximize: () => invoke('window:maximize'),
    close: () => invoke('window:close'),
  },

  app: {
    getInfo: () => invoke('app:get-info'),
    getSystemInfo: () => invoke('app:get-system-info'),
    reload: () => invoke('app:reload'),
    openDevTools: () => invoke('app:open-dev-tools'),
    processArgv: () => invoke('app:process-argv'),
  },

  dialog: {
    showMessage: (options: MessageBoxOptions) => invoke('dialog:show-message', options),
    showOpen: (options: OpenDialogOptions) => invoke('dialog:show-open', options),
    showSave: (options: SaveDialogOptions) => invoke('dialog:show-save', options),
  },

  workspace: {
    pick: () => invoke('workspace:pick'),
    listDtsFiles: (workspaceRoot: string) => invoke('workspace:list-dts-files', workspaceRoot),
  },

  update: {
    check: () => invoke('update:check'),
    download: () => invoke('update:download'),
    install: () => invoke('update:install'),
  },
};

export default ipc;
