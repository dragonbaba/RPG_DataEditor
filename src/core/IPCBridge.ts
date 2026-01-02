/**
 * IPCBridge - IPC 通信桥接
 * 封装所有 Electron IPC 调用
 * 实现错误处理和用户反馈
 * 实现配置缓存
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { StateManager } from './StateManager';
import { EventSystem } from './EventSystem';
import { logger } from '../services/logger';
import type { EditorConfig } from '../types';

// ============ 类型定义 ============

/** 文件历史记录项 */
interface FileHistoryItem {
  path: string;
  name: string;
  timestamp: number;
}

// ============ 配置缓存 ============

/** 配置缓存 */
let configCache: EditorConfig | null = null;

/** 配置是否已加载 */
let configLoaded = false;

// ============ 文件历史 ============
const PATH_SEP_REGEX = /[\\/]/;

/** 文件历史记录 */
const fileHistory: FileHistoryItem[] = [];
const MAX_HISTORY = 10;

// ============ 辅助函数 ============

/**
 * 检查 electronAPI 是否可用
 */
function isElectronAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
}

/**
 * 显示错误
 */
function showError(message: string): void {
  EventSystem.emit('error:show', message);
  logger.error(message, undefined, 'IPCBridge');
}

/**
 * 显示状态
 */
function showStatus(message: string): void {
  EventSystem.emit('status:update', message);
}

// ============ 配置操作 ============

/**
 * 读取配置
 */
export async function readConfig(): Promise<EditorConfig> {
  if (configCache && configLoaded) {
    return configCache;
  }

  if (!isElectronAvailable()) {
    logger.warn('electronAPI not available, using default config', undefined, 'IPCBridge');
    return getDefaultConfig();
  }

  try {
    const config = await window.electronAPI.readConfig();
    // 合并默认配置以确保所有字段都存在
    const fullConfig: EditorConfig = { ...getDefaultConfig(), ...config } as unknown as EditorConfig;

    configCache = fullConfig;
    configLoaded = true;

    // 更新状态
    StateManager.updateConfig(fullConfig as Partial<import('../types').EditorConfig>);

    logger.debug('Config loaded', { config: fullConfig }, 'IPCBridge');
    return fullConfig;
  } catch (error) {
    logger.error('Failed to read config', { error }, 'IPCBridge');
    return getDefaultConfig();
  }
}

/**
 * 写入配置
 */
export async function writeConfig(config: Partial<EditorConfig>): Promise<boolean> {
  if (!isElectronAvailable()) {
    logger.warn('electronAPI not available, cannot write config', undefined, 'IPCBridge');
    return false;
  }

  try {
    // 合并配置，确保有基础值
    const currentConfig = configCache || getDefaultConfig();
    const mergedConfig: EditorConfig = { ...currentConfig, ...config };

    const success = await window.electronAPI.writeConfig(mergedConfig as any);

    if (success) {
      configCache = mergedConfig;
      StateManager.updateConfig(mergedConfig as Partial<import('../types').EditorConfig>);
      logger.debug('Config saved', { config: mergedConfig }, 'IPCBridge');
    }

    return success;
  } catch (error) {
    logger.error('Failed to write config', { error }, 'IPCBridge');
    return false;
  }
}

/**
 * 获取默认配置
 */
function getDefaultConfig(): EditorConfig {
  return {
    dataPath: '',
    scriptSavePath: '',
    scriptPath: '',
    imagePath: '',
    workspacePath: '',
    workspaceRoot: '',
    recentFiles: [],
    theme: 'dark',
    accentColor: 'cyan',
    animationsEnabled: true,
    themePreset: 'cyberpunk',
    fontSize: 'medium',
    compactMode: false,
    updateCheckFrequency: 'startup',
  } as unknown as EditorConfig;
}

// ============ 文件操作 ============

/**
 * 读取文件
 */
export async function readFile(filePath: string): Promise<string | null> {
  if (!isElectronAvailable()) {
    showError('无法读取文件：Electron API 不可用');
    return null;
  }

  try {
    showStatus(`读取文件: ${filePath}`);
    const content = await window.electronAPI.readFile(filePath);

    // 添加到历史记录
    addToHistory(filePath);

    logger.debug('File read', { path: filePath, length: content.length }, 'IPCBridge');
    return content;
  } catch (error) {
    showError(`读取文件失败: ${(error as Error).message}`);
    return null;
  }
}

/**
 * 写入文件
 */
export async function writeFile(filePath: string, content: string): Promise<boolean> {
  if (!isElectronAvailable()) {
    showError('无法写入文件：Electron API 不可用');
    return false;
  }

  try {
    showStatus(`保存文件: ${filePath}`);
    const success = await window.electronAPI.writeFile(filePath, content);

    if (success) {
      showStatus('✅ 文件已保存');
      logger.debug('File written', { path: filePath, length: content.length }, 'IPCBridge');
    }

    return success;
  } catch (error) {
    showError(`保存文件失败: ${(error as Error).message}`);
    return false;
  }
}

/**
 * 选择文件
 */
export async function selectFile(): Promise<string | null> {
  if (!isElectronAvailable()) {
    showError('无法选择文件：Electron API 不可用');
    return null;
  }

  try {
    const filePath = await window.electronAPI.selectFile();

    if (filePath) {
      logger.debug('File selected', { path: filePath }, 'IPCBridge');
    }

    return filePath;
  } catch (error) {
    showError(`选择文件失败: ${(error as Error).message}`);
    return null;
  }
}

/**
 * 选择目录
 */
export async function selectDirectory(): Promise<string | null> {
  if (!isElectronAvailable()) {
    showError('无法选择目录：Electron API 不可用');
    return null;
  }

  try {
    const dirPath = await window.electronAPI.selectDirectory();

    if (dirPath) {
      logger.debug('Directory selected', { path: dirPath }, 'IPCBridge');
    }

    return dirPath;
  } catch (error) {
    showError(`选择目录失败: ${(error as Error).message}`);
    return null;
  }
}

/**
 * 检查文件是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  if (!isElectronAvailable()) {
    return false;
  }

  try {
    return await window.electronAPI.fileExists(filePath);
  } catch (error) {
    logger.error('Failed to check file exists', { path: filePath, error }, 'IPCBridge');
    return false;
  }
}

/**
 * 列出目录内容
 */
export async function listDirectory(dirPath: string): Promise<string[]> {
  if (!isElectronAvailable()) {
    return [];
  }

  try {
    return await window.electronAPI.listDirectory(dirPath);
  } catch (error) {
    logger.error('Failed to list directory', { path: dirPath, error }, 'IPCBridge');
    return [];
  }
}

/**
 * 创建备份
 */
export async function createBackup(filePath: string): Promise<string | null> {
  if (!isElectronAvailable()) {
    return null;
  }

  try {
    const backupPath = await window.electronAPI.createBackup(filePath);
    logger.debug('Backup created', { original: filePath, backup: backupPath }, 'IPCBridge');
    return backupPath;
  } catch (error) {
    logger.error('Failed to create backup', { path: filePath, error }, 'IPCBridge');
    return null;
  }
}

// ============ 对话框 ============

/**
 * 显示消息框
 */
export async function showMessageBox(
  message: string,
  type: 'info' | 'warning' | 'error' | 'question' = 'info',
  buttons: string[] = ['确定']
): Promise<number> {
  if (!isElectronAvailable()) {
    alert(message);
    return 0;
  }

  try {
    const result = await window.electronAPI.showMessageBox({
      type,
      message,
      buttons,
    });
    return result.response;
  } catch (error) {
    logger.error('Failed to show message box', { error }, 'IPCBridge');
    return 0;
  }
}

/**
 * 确认对话框
 */
export async function confirmAction(message: string): Promise<boolean> {
  const response = await showMessageBox(message, 'question', ['确定', '取消']);
  return response === 0;
}

// ============ 文件历史 ============

/**
 * 添加到历史记录
 */
function addToHistory(filePath: string): void {
  const name = filePath.split(PATH_SEP_REGEX).pop() || filePath;
  const timestamp = Date.now();

  // 移除已存在的相同路径
  const existingIndex = fileHistory.findIndex(item => item.path === filePath);
  if (existingIndex >= 0) {
    fileHistory.splice(existingIndex, 1);
  }

  // 添加到开头
  fileHistory.unshift({ path: filePath, name, timestamp });

  // 限制数量
  if (fileHistory.length > MAX_HISTORY) {
    fileHistory.pop();
  }

  // 更新配置
  updateRecentFiles();
}

/**
 * 更新最近文件配置
 */
async function updateRecentFiles(): Promise<void> {
  const recentFiles = fileHistory.map(item => item.path);
  await writeConfig({ recentFiles });
}

/**
 * 获取文件历史
 */
export function getFileHistory(): FileHistoryItem[] {
  return [...fileHistory];
}

/**
 * 从历史记录加载
 */
export async function loadFromHistory(filePath: string): Promise<string | null> {
  return readFile(filePath);
}

// ============ IPC 事件监听 ============

/**
 * 注册 IPC 事件监听器
 */
export function registerIPCListeners(): void {
  if (!isElectronAvailable() || typeof window.ipcOn !== 'function') {
    logger.warn('IPC listeners not available', undefined, 'IPCBridge');
    return;
  }

  // 监听文件加载事件
  window.ipcOn('file-loaded', (data) => {
    EventSystem.emit('file:loaded', data);
  });

  // 监听模式切换事件
  window.ipcOn('switch-mode', (mode) => {
    EventSystem.emit('mode:switch', mode);
  });

  // 监听历史文件显示事件
  window.ipcOn('show-history-files', () => {
    EventSystem.emit('history:show');
  });

  // 监听侧边栏切换事件
  window.ipcOn('toggle-sidebar', () => {
    EventSystem.emit('sidebar:toggle');
  });

  // 监听主题设置切换事件
  window.ipcOn('toggle-theme-settings', () => {
    EventSystem.emit('theme:toggle-settings');
  });

  // 监听数据路径设置事件
  window.ipcOn('set-data-path', (dataPath) => {
    EventSystem.emit('config:set-data-path', dataPath);
  });

  // 监听脚本路径设置事件
  window.ipcOn('set-script-path', (scriptPath) => {
    EventSystem.emit('config:set-script-path', scriptPath);
  });

  // 监听工作区路径设置事件
  window.ipcOn('set-workspace-path', (workspacePath) => {
    EventSystem.emit('config:set-workspace-path', workspacePath);
  });

  // 监听保存设置事件
  window.ipcOn('save-settings', () => {
    EventSystem.emit('config:save');
  });

  // 监听更新事件
  window.ipcOn('update:available', (info) => {
    EventSystem.emit('update:available', info);
  });

  window.ipcOn('update:downloaded', () => {
    EventSystem.emit('update:downloaded');
  });

  window.ipcOn('update:error', (error) => {
    EventSystem.emit('update:error', error);
  });

  logger.info('IPC listeners registered', undefined, 'IPCBridge');
}

// ============ 初始化 ============

/**
 * 初始化 IPC Bridge
 */
export async function initIPCBridge(): Promise<void> {
  // 加载配置
  await readConfig();

  // 从配置恢复历史记录
  if (configCache?.recentFiles) {
    for (const path of configCache.recentFiles) {
      const name = path.split(PATH_SEP_REGEX).pop() || path;
      fileHistory.push({ path, name, timestamp: 0 });
    }
  }

  // 注册 IPC 监听器
  registerIPCListeners();

  logger.info('IPCBridge initialized', undefined, 'IPCBridge');
}

export default {
  init: initIPCBridge,
  readConfig,
  writeConfig,
  readFile,
  writeFile,
  selectFile,
  selectDirectory,
  fileExists,
  listDirectory,
  createBackup,
  showMessageBox,
  confirmAction,
  getFileHistory,
  loadFromHistory,
};
