/**
 * Auto Updater Service for Electron Main Process
 * Requirements: 13.1, 13.8, 14.1, 14.2, 14.6
 * 
 * Handles automatic update checking, downloading, and installation
 * using electron-updater with GitHub Releases as the primary source.
 */
import pkg from "electron-updater";
const { autoUpdater } = pkg;
import type { UpdateInfo as ElectronUpdateInfo, ProgressInfo } from 'electron-updater';

import { BrowserWindow, ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Update check frequency options
export type UpdateCheckFrequency = 'startup' | 'daily' | 'weekly' | 'manual';

// Update info interface matching our IPC types
export interface UpdateInfo {
  version: string;
  releaseNotes: string;
  releaseDate: string;
  downloadUrl: string;
}

// Config interface for update settings
interface UpdateConfig {
  updateCheckFrequency: UpdateCheckFrequency;
  lastUpdateCheck?: number;
}

// Config storage path
const configDir = path.join(app.getPath('userData'), 'editorSave');
const updateConfigPath = path.join(configDir, 'update-config.json');

/**
 * AutoUpdaterService - Manages application updates
 */
class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private isCheckingForUpdate = false;
  private updateAvailable = false;
  private downloadedUpdate = false;
  private currentUpdateInfo: UpdateInfo | null = null;
  private config: UpdateConfig = { updateCheckFrequency: 'startup' };

  constructor() {
    this.setupAutoUpdater();
    this.loadConfig();
  }

  /**
   * Configure electron-updater settings
   */
  private setupAutoUpdater(): void {
    // Configure auto-updater
    autoUpdater.autoDownload = false; // Don't auto-download, let user decide
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;

    // Set up logging - more verbose for debugging
    autoUpdater.logger = {
      info: (message: string) => console.log('[AutoUpdater INFO]', message),
      warn: (message: string) => console.warn('[AutoUpdater WARN]', message),
      error: (message: string) => console.error('[AutoUpdater ERROR]', message),
      debug: (message: string) => console.log('[AutoUpdater DEBUG]', message),
    };

    // Log current configuration
    console.log('[AutoUpdater] Configuration:');
    console.log('[AutoUpdater]   autoDownload:', autoUpdater.autoDownload);
    console.log('[AutoUpdater]   autoInstallOnAppQuit:', autoUpdater.autoInstallOnAppQuit);
    console.log('[AutoUpdater]   allowDowngrade:', autoUpdater.allowDowngrade);

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for updates...');
      this.isCheckingForUpdate = true;
    });

    autoUpdater.on('update-available', (info: ElectronUpdateInfo) => {
      console.log('[AutoUpdater] Event: update-available');
      console.log('[AutoUpdater] Update version:', info.version);
      console.log('[AutoUpdater] Release date:', info.releaseDate);
      this.isCheckingForUpdate = false;
      this.updateAvailable = true;
      this.currentUpdateInfo = this.convertUpdateInfo(info);
      this.sendToRenderer('update:available', this.currentUpdateInfo);
    });

    autoUpdater.on('update-not-available', (info: ElectronUpdateInfo) => {
      console.log('[AutoUpdater] Event: update-not-available');
      console.log('[AutoUpdater] Current version is up to date:', info.version);
      this.isCheckingForUpdate = false;
      this.updateAvailable = false;
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      console.log(`[AutoUpdater] Download progress: ${progress.percent.toFixed(2)}%`);
      this.sendToRenderer('update:progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
    });

    autoUpdater.on('update-downloaded', (info: ElectronUpdateInfo) => {
      console.log('[AutoUpdater] Update downloaded:', info.version);
      this.downloadedUpdate = true;
      this.sendToRenderer('update:downloaded', undefined);
    });

    autoUpdater.on('error', (error: Error) => {
      console.error('[AutoUpdater] Event: error');
      console.error('[AutoUpdater] Error message:', error.message);
      console.error('[AutoUpdater] Error stack:', error.stack);
      this.isCheckingForUpdate = false;
      this.sendToRenderer('update:error', error.message);
    });
  }

  /**
   * Convert electron-updater UpdateInfo to our format
   */
  private convertUpdateInfo(info: ElectronUpdateInfo): UpdateInfo {
    let releaseNotes = '';

    if (typeof info.releaseNotes === 'string') {
      releaseNotes = info.releaseNotes;
    } else if (Array.isArray(info.releaseNotes)) {
      releaseNotes = info.releaseNotes.map(note =>
        typeof note === 'string' ? note : note.note || ''
      ).join('\n');
    }

    return {
      version: info.version,
      releaseNotes,
      releaseDate: info.releaseDate || new Date().toISOString(),
      downloadUrl: '', // electron-updater handles the URL internally
    };
  }

  /**
   * Load update configuration from disk
   */
  private async loadConfig(): Promise<void> {
    try {
      if (fs.existsSync(updateConfigPath)) {
        const content = await fs.promises.readFile(updateConfigPath, 'utf-8');
        this.config = { ...this.config, ...JSON.parse(content) };
      }
    } catch (error) {
      console.error('[AutoUpdater] Failed to load config:', error);
    }
  }

  /**
   * Save update configuration to disk
   */
  private async saveConfig(): Promise<void> {
    try {
      if (!fs.existsSync(configDir)) {
        await fs.promises.mkdir(configDir, { recursive: true });
      }
      await fs.promises.writeFile(updateConfigPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('[AutoUpdater] Failed to save config:', error);
    }
  }

  /**
   * Send message to renderer process
   */
  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * Set the main window reference
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Check if update should be performed based on frequency setting
   */
  private shouldCheckForUpdate(): boolean {
    if (this.config.updateCheckFrequency === 'manual') {
      return false;
    }

    if (this.config.updateCheckFrequency === 'startup') {
      return true;
    }

    const lastCheck = this.config.lastUpdateCheck || 0;
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    switch (this.config.updateCheckFrequency) {
      case 'daily':
        return now - lastCheck > dayInMs;
      case 'weekly':
        return now - lastCheck > dayInMs * 7;
      default:
        return true;
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(force = false): Promise<UpdateInfo | null> {
    console.log('[AutoUpdater] checkForUpdates called, force:', force);
    console.log('[AutoUpdater] Current app version:', app.getVersion());
    
    if (this.isCheckingForUpdate) {
      console.log('[AutoUpdater] Already checking for updates, skipping');
      return null;
    }

    if (!force && !this.shouldCheckForUpdate()) {
      console.log('[AutoUpdater] Skipping update check based on frequency setting');
      return null;
    }

    try {
      this.isCheckingForUpdate = true;
      console.log('[AutoUpdater] Starting update check...');
      
      const result = await autoUpdater.checkForUpdates();
      console.log('[AutoUpdater] Check result:', result ? 'received' : 'null');

      // Update last check time
      this.config.lastUpdateCheck = Date.now();
      await this.saveConfig();

      // 重置检查状态
      this.isCheckingForUpdate = false;

      if (result && result.updateInfo) {
        const currentVersion = app.getVersion();
        const latestVersion = result.updateInfo.version;
        console.log('[AutoUpdater] Current version:', currentVersion);
        console.log('[AutoUpdater] Latest version:', latestVersion);
        
        // 比较版本号
        if (latestVersion !== currentVersion) {
          console.log('[AutoUpdater] Update available!');
          this.updateAvailable = true;
          this.currentUpdateInfo = this.convertUpdateInfo(result.updateInfo);
          return this.currentUpdateInfo;
        } else {
          console.log('[AutoUpdater] Already on latest version');
          this.updateAvailable = false;
          return null;
        }
      }
      
      console.log('[AutoUpdater] No update info in result');
      return null;
    } catch (error) {
      console.error('[AutoUpdater] Check for updates failed:', error);
      this.isCheckingForUpdate = false;
      throw error;
    }
  }

  /**
   * Download the available update
   */
  async downloadUpdate(): Promise<void> {
    if (!this.updateAvailable) {
      throw new Error('No update available to download');
    }

    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('[AutoUpdater] Download failed:', error);
      throw error;
    }
  }

  /**
   * Install the downloaded update and restart
   */
  installAndRestart(): void {
    if (!this.downloadedUpdate) {
      throw new Error('No update downloaded to install');
    }

    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * Set update check frequency
   */
  async setUpdateCheckFrequency(frequency: UpdateCheckFrequency): Promise<void> {
    this.config.updateCheckFrequency = frequency;
    await this.saveConfig();
  }

  /**
   * Get current update check frequency
   */
  getUpdateCheckFrequency(): UpdateCheckFrequency {
    return this.config.updateCheckFrequency;
  }

  /**
   * Get current update info if available
   */
  getCurrentUpdateInfo(): UpdateInfo | null {
    return this.currentUpdateInfo;
  }

  /**
   * Check if an update has been downloaded
   */
  isUpdateDownloaded(): boolean {
    return this.downloadedUpdate;
  }

  /**
   * Check if an update is available
   */
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }
}

// Singleton instance
export const autoUpdaterService = new AutoUpdaterService();

/**
 * Register IPC handlers for auto-updater
 */
export function registerAutoUpdaterIPC(): void {
  // Check for updates
  ipcMain.handle('update:check', async () => {
    try {
      return await autoUpdaterService.checkForUpdates(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to check for updates: ${message}`);
    }
  });

  // Download update
  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdaterService.downloadUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to download update: ${message}`);
    }
  });

  // Install update and restart
  ipcMain.handle('update:install', () => {
    try {
      autoUpdaterService.installAndRestart();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to install update: ${message}`);
    }
  });

  // Get update check frequency
  ipcMain.handle('update:get-frequency', () => {
    return autoUpdaterService.getUpdateCheckFrequency();
  });

  // Set update check frequency
  ipcMain.handle('update:set-frequency', async (_event, frequency: UpdateCheckFrequency) => {
    await autoUpdaterService.setUpdateCheckFrequency(frequency);
  });

  // Get current update info
  ipcMain.handle('update:get-info', () => {
    return autoUpdaterService.getCurrentUpdateInfo();
  });

  // Check if update is downloaded
  ipcMain.handle('update:is-downloaded', () => {
    return autoUpdaterService.isUpdateDownloaded();
  });

  // Check if update is available
  ipcMain.handle('update:is-available', () => {
    return autoUpdaterService.isUpdateAvailable();
  });
}

export default autoUpdaterService;
