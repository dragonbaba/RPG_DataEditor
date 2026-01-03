import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for the Electron API exposed to renderer
export interface ElectronAPI {
  // Window control APIs
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  openDevTools: () => Promise<void>;

  // Fullscreen APIs
  isFullscreen: () => Promise<boolean>;
  setFullscreen: (fullscreen: boolean) => Promise<void>;
  toggleFullscreen: () => Promise<void>;
  setMinimumSize: (width: number, height: number) => Promise<void>;

  // App info API
  getAppInfo: () => Promise<{ version: string; platform: string; arch: string }>;

  // File system APIs
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  deleteFile: (filePath: string) => Promise<boolean>;
  selectFile: () => Promise<string | null>;
  selectDirectory: () => Promise<string | null>;
  createBackup: (filePath: string) => Promise<string>;
  listDirectory: (dirPath: string) => Promise<string[]>;
  fileExists: (filePath: string) => Promise<boolean>;

  readImageData: (filePath: string) => Promise<string>;

  // Dialog APIs
  showMessageBox: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>;
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;

  // System info APIs
  getSystemInfo: () => Promise<SystemInfo>;
  getPlatform: () => string;
  getArch: () => string;
  reloadPage: () => Promise<void>;
  processArgv: () => Promise<string>;

  // Config APIs
  readConfig: () => Promise<EditorConfig>;
  writeConfig: (config: EditorConfig) => Promise<boolean>;

  // Workspace APIs
  pickWorkspace: () => Promise<string | null>;
  listDtsFiles: (workspaceRoot: string) => Promise<string[]>;

  // Auto-updater APIs
  checkForUpdates: () => Promise<UpdateInfo | null>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  getUpdateFrequency: () => Promise<UpdateCheckFrequency>;
  setUpdateFrequency: (frequency: UpdateCheckFrequency) => Promise<void>;
  getUpdateInfo: () => Promise<UpdateInfo | null>;
  isUpdateDownloaded: () => Promise<boolean>;
  isUpdateAvailable: () => Promise<boolean>;

  // Version info
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

interface SystemInfo {
  platform: string;
  arch: string;
  release: string;
  hostname: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  userInfo: {
    username: string;
    uid: number;
    gid: number;
    shell: string | null;
    homedir: string;
  };
}

interface EditorConfig {
  dataPath?: string;
  scriptSavePath?: string;
  scriptPath?: string;
  imagePath?: string;
  workspacePath?: string;
  workspaceRoot?: string;
  recentFiles?: string[];
  theme?: 'dark' | 'light';
  accentColor?: string;
  animationsEnabled?: boolean;
  themePreset?: 'cyberpunk' | 'minimal' | 'high-contrast';
  fontSize?: 'small' | 'medium' | 'large';
  compactMode?: boolean;
  updateCheckFrequency?: 'startup' | 'daily' | 'weekly' | 'manual';
}

interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
  downloadUrl: string;
}

type UpdateCheckFrequency = 'startup' | 'daily' | 'weekly' | 'manual';

const versions = process.versions;

// Define the API that will be exposed to the renderer process
const electronAPI: ElectronAPI = {
  // Window control APIs
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),

  // Fullscreen APIs
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
  setFullscreen: (fullscreen: boolean) => ipcRenderer.invoke('set-fullscreen', fullscreen),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  setMinimumSize: (width: number, height: number) => ipcRenderer.invoke('set-minimum-size', width, height),

  // App info API
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // File system APIs
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),
  deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  createBackup: (filePath: string) => ipcRenderer.invoke('create-backup', filePath),
  listDirectory: (dirPath: string) => ipcRenderer.invoke('list-directory', dirPath),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
  readImageData: (filePath: string) => ipcRenderer.invoke('read-image-data', filePath),

  // Dialog APIs
  showMessageBox: (options: Electron.MessageBoxOptions) => ipcRenderer.invoke('show-message-box', options),
  showOpenDialog: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('show-save-dialog', options),

  // System info APIs
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getPlatform: () => process.platform,
  getArch: () => process.arch,
  reloadPage: () => ipcRenderer.invoke('reload-page'),
  processArgv: () => ipcRenderer.invoke('process-argv'),

  // Config APIs
  readConfig: () => ipcRenderer.invoke('read-config'),
  writeConfig: (config: EditorConfig) => ipcRenderer.invoke('write-config', config),

  // Workspace APIs
  pickWorkspace: () => ipcRenderer.invoke('pick-workspace'),
  listDtsFiles: (workspaceRoot: string) => ipcRenderer.invoke('list-dts-files', workspaceRoot),

  // Auto-updater APIs
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getUpdateFrequency: () => ipcRenderer.invoke('update:get-frequency'),
  setUpdateFrequency: (frequency: UpdateCheckFrequency) => ipcRenderer.invoke('update:set-frequency', frequency),
  getUpdateInfo: () => ipcRenderer.invoke('update:get-info'),
  isUpdateDownloaded: () => ipcRenderer.invoke('update:is-downloaded'),
  isUpdateAvailable: () => ipcRenderer.invoke('update:is-available'),

  // Version info
  versions: {
    node: versions.node,
    chrome: versions.chrome,
    electron: versions.electron,
  },
};

/**
 * Valid IPC channels whitelist for receiving messages from main process
 * Requirements: 6.1, 6.3
 * 
 * This whitelist ensures security by only allowing predefined channels.
 * Any attempt to register a listener for a channel not in this list will be rejected.
 * 
 * Channels are organized by feature:
 * - File operations: file-loaded, set-data-path, set-script-path, set-workspace-path, save-settings
 * - Mode switching: switch-mode
 * - UI controls: show-history-files, toggle-sidebar, toggle-theme-settings
 * - Window state: fullscreen-changed
 * - Auto-updater: update:available, update:progress, update:downloaded, update:error
 */
const validChannels: readonly string[] = [
  // File menu operations (Requirements: 2.1-2.6)
  'file-loaded',
  'set-data-path',
  'set-script-path',
  'set-workspace-path',
  'load-workspace',
  'save-settings',
  'show-history-files',
  'open-path-settings',

  // Mode switching (Requirements: 3.1-3.6)
  'switch-mode',

  // View menu operations (Requirements: 4.1-4.2)
  'toggle-sidebar',
  'toggle-theme-settings',

  // Window state changes
  'fullscreen-changed',

  // Auto-updater notifications
  'update:available',
  'update:progress',
  'update:downloaded',
  'update:error',
  'update:no-update-available',
] as const;

// Cache registered listeners to avoid duplicate registration
const registeredListeners = new Map<string, (event: Electron.IpcRendererEvent, data: unknown) => void>();

/**
 * Expose IPC listener registration method (for receiving main process messages)
 * Requirements: 5.1-5.8, 6.2
 * 
 * This method allows the renderer process to register callbacks for IPC events.
 * Only channels in the validChannels whitelist are allowed.
 */
contextBridge.exposeInMainWorld('ipcOn', (channel: string, callback: (data: unknown) => void) => {
  if (validChannels.includes(channel)) {
    // Check if listener already registered for this channel
    if (registeredListeners.has(channel)) {
      console.log('[Preload] Listener already exists, skipping duplicate registration:', channel);
      return;
    }
    console.log('[Preload] Registering listener:', channel);

    // Define listener handler function
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => {
      console.log('[Preload] Received IPC message:', channel);
      callback(data);
    };

    // Cache listener function for later removal
    registeredListeners.set(channel, listener);

    // Register only once
    ipcRenderer.on(channel, listener);
  } else {
    console.warn('[Preload] Invalid channel rejected:', channel, '- Channel not in whitelist');
  }
});

/**
 * Expose method to remove IPC listeners
 * Requirements: 6.2
 * 
 * This method allows the renderer process to unregister IPC event listeners.
 * Used for cleanup when components unmount to prevent memory leaks.
 * 
 * @param channel - The IPC channel to stop listening to
 */
contextBridge.exposeInMainWorld('ipcOff', (channel: string) => {
  if (validChannels.includes(channel)) {
    const listener = registeredListeners.get(channel);
    if (listener) {
      ipcRenderer.removeListener(channel, listener);
      registeredListeners.delete(channel);
      console.log('[Preload] Removed listener:', channel);
    } else {
      console.log('[Preload] No listener found to remove for channel:', channel);
    }
  } else {
    console.warn('[Preload] Invalid channel for removal:', channel, '- Channel not in whitelist');
  }
});

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
