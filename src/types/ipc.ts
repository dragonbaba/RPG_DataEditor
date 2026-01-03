/**
 * Type-safe IPC Channel Definitions
 * 
 * This file defines all IPC channels with their argument and return types.
 * Both main process and renderer process should use these types for type safety.
 */

import type { EditorConfig } from './index';

// File filter type for dialog operations
export interface FileFilter {
  name: string;
  extensions: string[];
}

// Dialog options and return types
export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  buttons?: string[];
  defaultId?: number;
  title?: string;
  message: string;
  detail?: string;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
  cancelId?: number;
}

export interface MessageBoxReturnValue {
  response: number;
  checkboxChecked: boolean;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles'>;
}

export interface OpenDialogReturnValue {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
}

export interface SaveDialogReturnValue {
  canceled: boolean;
  filePath?: string;
}

// App info type
export interface AppInfo {
  version: string;
  platform: string;
  arch: string;
}

// System info type
export interface SystemInfo {
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

// Update info type
export interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
  downloadUrl: string;
}

/**
 * Type-safe IPC Channel Definitions
 * 
 * Each channel is defined with its argument types and return type.
 * Format: 'channel-name': { args: [...argTypes]; return: returnType }
 */
export interface IPCChannels {
  // File operations
  'file:read': { args: [path: string]; return: string };
  'file:write': { args: [path: string, content: string]; return: boolean };
  'file:delete': { args: [path: string]; return: boolean };
  'file:select': { args: [filters?: FileFilter[]]; return: string | null };
  'file:select-directory': { args: []; return: string | null };
  'file:create-backup': { args: [path: string]; return: string };
  'file:list-directory': { args: [path: string]; return: string[] };
  'file:exists': { args: [path: string]; return: boolean };
  'file:read-image': { args: [path: string]; return: string };

  // Config operations
  'config:load': { args: []; return: EditorConfig };
  'config:save': { args: [config: Partial<EditorConfig>]; return: boolean };

  // Window operations
  'window:minimize': { args: []; return: void };
  'window:maximize': { args: []; return: void };
  'window:close': { args: []; return: void };
  'window:setMinimumSize': { args: [width: number, height: number]; return: void };
  'window:setFullscreen': { args: [fullscreen: boolean]; return: void };
  'window:toggleFullscreen': { args: []; return: void };
  'window:isFullscreen': { args: []; return: boolean };

  // App operations
  'app:get-info': { args: []; return: AppInfo };
  'app:get-system-info': { args: []; return: SystemInfo };
  'app:reload': { args: []; return: void };
  'app:open-dev-tools': { args: []; return: void };
  'app:process-argv': { args: []; return: string };

  // Dialog operations
  'dialog:show-message': { args: [options: MessageBoxOptions]; return: MessageBoxReturnValue };
  'dialog:show-open': { args: [options: OpenDialogOptions]; return: OpenDialogReturnValue };
  'dialog:show-save': { args: [options: SaveDialogOptions]; return: SaveDialogReturnValue };

  // Workspace operations
  'workspace:pick': { args: []; return: string | null };
  'workspace:list-dts-files': { args: [workspaceRoot: string]; return: string[] };

  // Update operations
  'update:check': { args: []; return: UpdateInfo | null };
  'update:download': { args: []; return: void };
  'update:install': { args: []; return: void };
}

/**
 * IPC Event Channels (main -> renderer)
 * These are events sent from main process to renderer
 */
export interface IPCEventChannels {
  'file-loaded': { fileName: string; filePath: string; content: string };
  'set-data-path': string;
  'set-script-path': string;
  'set-workspace-path': string;
  'load-workspace': string;
  'save-settings': void;
  'switch-mode': 'script' | 'property' | 'note' | 'projectile' | 'quest';
  'show-history-files': void;
  'toggle-theme-settings': void;
  'toggle-sidebar': void;
  'fullscreen-changed': boolean;
  'update:progress': { percent: number; bytesPerSecond: number; transferred: number; total: number };
  'update:available': UpdateInfo;
  'update:downloaded': void;
  'update:error': string;
  'update:no-update-available': { currentVersion?: string };
  'open-path-settings': void;
}

/**
 * Helper type to extract argument types from a channel
 */
export type IPCArgs<K extends keyof IPCChannels> = IPCChannels[K]['args'];

/**
 * Helper type to extract return type from a channel
 */
export type IPCReturn<K extends keyof IPCChannels> = IPCChannels[K]['return'];

/**
 * Helper type to extract event data type
 */
export type IPCEventData<K extends keyof IPCEventChannels> = IPCEventChannels[K];
