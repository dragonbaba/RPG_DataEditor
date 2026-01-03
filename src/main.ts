/**
 * Application Entry Point - 应用入口
 * 原生 TypeScript 初始化，不使用 React
 * 
 * Requirements: 1.1, 1.5, 1.6
 */

import { logger } from './services/logger';
import { globalLoop } from './utils/globalLoop';
import { showInfoToast } from './services/ToastManager';
import { initErrorOverlay, showErrorOverlay } from './services/ErrorOverlay';
import { DOM } from './core/DOMManager';
import { StateManager, FileType } from './core/StateManager';
import { EventSystem } from './core/EventSystem';
import { PanelManager } from './core/PanelManager';
import { themeSystem } from './core/ThemeSystem';
import { themeManager } from './theme/ThemeManager';
import { visualEffects } from './theme/effects/VisualEffects';
import { SidebarAnimator } from './core/SidebarAnimator';
import { BaseRunner, repeat } from './utils/runner';
import { initDynamicBackground } from './core/DynamicBackground';
import { initItemList, displayItemList, selectItem } from './panels/ItemList';
import { performanceIntegration } from './services/PerformanceIntegration';
import { initScriptPanel, displayScriptList, selectScript } from './panels/ScriptPanel';
import { initPropertyPanel, renderPropertyPanel } from './panels/PropertyPanel';
import { initNotePanel, renderNotePanel } from './panels/NotePanel';
import { initMetaDataPanel, renderMetaDataPanel } from './panels/MetaDataPanel';
import { initQuestPanel, renderQuestPanel } from './panels/QuestPanel';
import { initProjectilePanel, renderProjectilePanel } from './panels/ProjectilePanel';
import { EditorManager } from './core/EditorManager';
import { settingsDialog } from './components/ui/SettingsDialog';
import { updateProgressDialog } from './components/update/UpdateProgressDialog';
import { applyWorkspaceSettings } from './services/MonacoLoader';
import { showInputDialog } from './services/InputDialog';
import { getScriptCache, setScriptCache, removeScriptCache } from './services/ScriptCacheManager';
import { resolveScriptFilePath, formatStoredScriptPath, normalizeItemScriptPaths } from './services/ScriptPathCompat';
import { performanceMonitor } from './services/PerformanceMonitor';
import { SCRIPT_TIMESTAMP_REGEXP, extractScriptCode, buildTimestampLine } from './services/ScriptContentUtils';
import { delayMs } from './utils/delay';
import type { EditorMode } from './types';
import './index.css';

const BACKSLASH_REGEXP = /\\/g;
const TRAILING_SLASH_REGEXP = /[\\/]+$/;
const PATH_SEP_REGEX = /[\\/]/;
const HTTP_PROTOCOL_REGEXP = /^(https?:)?\/\//i;
const EMPTY_SCRIPTS: Record<string, string> = Object.create(null);
const EMPTY_STRING = '';
const EMPTY_STRING_ARRAY: string[] = [];
const MISSING_CONFIG_FIELDS: Array<'dataPath' | 'scriptPath' | 'imagePath' | 'workspacePath'> = [
  'dataPath',
  'scriptPath',
  'imagePath',
  'workspacePath',
];
const missingConfigList: string[] = [];
const ELECTRON_READY_FRAMES = 300;
const ELECTRON_MISSING_MESSAGE =
  '未检测到 Electron 预加载接口（window.electronAPI）。请确认使用 electron:dev 启动并检查 preload 是否正确注入。';
let electronInitRunner: BaseRunner | null = null;
let electronInitComplete = false;
let electronInitLoadBound = false;
let sidebarAnimator: SidebarAnimator;
const NOOP_UNDO = (): null => null;
const TIMESTAMP_EDITS: Array<{ range: import('monaco-editor').Range; text: string }> = [];

function handleScriptDeleteEvent(...args: unknown[]): void {
  const key = args.length > 0 ? (args[0] as string | undefined) : undefined;
  void handleDeleteScriptRequest(key);
}

function handleWorkspacePathEvent(...args: unknown[]): void {
  const workspaceRoot = args.length > 0 ? (args[0] as string | undefined) : undefined;
  if (!workspaceRoot) return;
  logger.info('Setting workspace path', { workspaceRoot }, 'Main');
  StateManager.updateConfig({ workspaceRoot });
  showInfoToast(`TS 工作区已设置: ${workspaceRoot}`);
  void applyWorkspaceRoot(workspaceRoot);
  updateEditorAccess();
}

function handleErrorEvent(...args: unknown[]): void {
  const message = args.length > 0 ? (args[0] as string | undefined) : undefined;
  if (!message) return;
  showError(message);
}

function handleCodeEditorContainerClick(e: Event): void {
  if (!DOM.codeEditorContainer || StateManager.getState().uiMode !== 'script') {
    return;
  }

  if (!isConfigComplete()) {
    e.preventDefault();
    e.stopPropagation();
    showError('请先在菜单中设置数据路径、脚本路径和 TS 工作区');
  }
}

// ============ 配置日志 ============

if (import.meta.env.DEV) {
  logger.configure({ minLevel: 'debug' });
}

// ============ 应用初始化 ============

/**
 * 初始化应用
 */
async function initializeApp(): Promise<void> {
  logger.info('Initializing application...', undefined, 'Main');

  try {
    // 1. 初始化 DOM 缓存
    DOM.init();
    initErrorOverlay();
    logger.info('DOM Manager initialized', undefined, 'Main');

    // 2. 加载配置（在主题初始化之前）

    // 3. 初始化主题系统
    await themeSystem.init();
    logger.info('ThemeSystem initialized', undefined, 'Main');

    // 4. 初始化动态背景
    initDynamicBackground();
    logger.info('DynamicBackground initialized', undefined, 'Main');

    // 5. 启动全局动画循环
    globalLoop.start();
    logger.info('Global animation loop started', undefined, 'Main');

    // 6. 初始化性能优化系统
    performanceIntegration.initialize();
    logger.info('Performance integration initialized', undefined, 'Main');

    // 7. 设置全局错误处理
    setupGlobalErrorHandlers();
    EventSystem.on('error:show', handleErrorEvent);
    setupWindowResizeHandler();
    startElectronInitPolling();

    // 8. 初始化 IPC 监听器

    // 9. 初始化面板管理器
    PanelManager.init();
    sidebarAnimator = new SidebarAnimator();
    logger.info('PanelManager initialized', undefined, 'Main');


    // 10. 初始化项目列表
    initItemList();
    logger.info('ItemList initialized', undefined, 'Main');

    // 11. 初始化各个面板
    initScriptPanel();
    initPropertyPanel();
    initNotePanel();
    initMetaDataPanel();
    initQuestPanel();
    initProjectilePanel();
    settingsDialog.bindEvents(); // Ensure events are bound after IPC is ready
    logger.info('All panels initialized', undefined, 'Main');

    // 12. 初始化更新进度对话框
    // UpdateProgressDialog is automatically initialized as a singleton
    logger.info('UpdateProgressDialog initialized', undefined, 'Main');

    // 12. 设置 item:selected 事件处理
    setupItemSelectedHandler();
    setupThemeSettingsDialog();

    // 12. 设置历史文件对话框事件
    setupHistoryFilesDialog();
    setupScriptHandlers();
    setupItemActions();

    // 13. 更新状态栏
    updateStatus('就绪');

    // 14. 应用状态栏主题
    const statusBar = document.querySelector('.status-bar') as HTMLElement;
    if (statusBar) {
      themeManager.applySciFiEffects(statusBar, {
        variant: 'primary',
        glow: false,
        scanlines: false,
      });
    }

    // 15. 应用侧边栏现代化效果
    const leftPanel = DOM.leftPanel;
    if (leftPanel) {
      themeManager.createFuturisticPanel(leftPanel, {
        variant: 'secondary',
        scanlines: true,
        cornerAccents: true,
      });

      // Add particle field background to sidebar
      visualEffects.createParticleField(leftPanel, {
        particleCount: 15,
        colors: ['rgba(0, 240, 255, 0.1)', 'rgba(0, 255, 136, 0.08)'],
        speed: 35000,
        size: 1,
      });

      // Add energy wave effect on hover
      leftPanel.addEventListener('mouseenter', () => {
        visualEffects.createEnergyWave(leftPanel, {
          color: 'rgba(0, 240, 255, 0.2)',
          duration: 1200,
          direction: 'vertical',
        });
      });
    }

    // 16. 应用项目列表现代化效果
    const itemList = DOM.itemList;
    if (itemList) {
      themeManager.applySciFiEffects(itemList, {
        variant: 'accent',
        glow: true,
        scanlines: false,
      });

      // Add holographic flicker effect
      visualEffects.createHolographicFlicker(itemList, {
        intensity: 0.02,
        frequency: 0.04,
        duration: 100,
      });
    }

    // 17. 应用脚本列表现代化效果
    const scriptList = DOM.scriptList;
    if (scriptList) {
      themeManager.applySciFiEffects(scriptList, {
        variant: 'secondary',
        glow: true,
        scanlines: false,
      });

      // Add scanning line effect
      visualEffects.createScanningLine(scriptList, {
        color: 'rgba(0, 240, 255, 0.15)',
        speed: 4000,
        opacity: 0.1,
      });
    }

    // 18. 应用项目操作按钮现代化效果
    const projectActions = DOM.projectActions;
    if (projectActions) {
      themeManager.applySciFiEffects(projectActions, {
        variant: 'primary',
        glow: true,
        scanlines: false,
      });

      // Apply effects to individual action buttons
      const actionButtons = [
        DOM.itemNewBtn,
        DOM.itemCopyBtn,
        DOM.itemDeleteBtn,
        DOM.itemSaveBtn,
      ];

      actionButtons.forEach((btn, index) => {
        if (btn) {
          const variants = ['accent', 'secondary', 'secondary', 'primary'] as const;
          themeManager.createFuturisticButton(btn, variants[index]);

          // Add energy wave effect on click
          btn.addEventListener('click', () => {
            visualEffects.createEnergyWave(btn, {
              color: 'rgba(255, 255, 255, 0.4)',
              duration: 500,
              direction: 'horizontal',
            });
          });

          // Add hover effects
          btn.addEventListener('mouseenter', () => {
            visualEffects.createPulsingGlow(btn, {
              color: 'rgba(0, 240, 255, 0.3)',
              intensity: 0.5,
              duration: 300,
              infinite: false,
            });
          });

          // Special effects for new item button
          if (btn === DOM.itemNewBtn) {
            visualEffects.createPulsingGlow(btn, {
              color: 'rgba(0, 255, 136, 0.3)',
              intensity: 0.4,
              duration: 3000,
              infinite: true,
            });
          }
        }
      });
    }

    // 19. 应用代码编辑器容器现代化效果
    const codeEditorContainer = DOM.codeEditorContainer;
    if (codeEditorContainer) {
      themeManager.createFuturisticPanel(codeEditorContainer, {
        variant: 'primary',
        scanlines: true,
        cornerAccents: true,
      });

      // Add digital rain effect for code editor
      visualEffects.createDigitalRain(codeEditorContainer, {
        characters: '01{}();[]<>=+-*/&|!?',
        columns: 15,
        speed: 120,
        color: 'rgba(0, 240, 255, 0.1)',
      });

      // Add energy wave effect on focus
      codeEditorContainer.addEventListener('focusin', () => {
        visualEffects.createEnergyWave(codeEditorContainer, {
          color: 'rgba(0, 240, 255, 0.2)',
          duration: 1000,
          direction: 'horizontal',
        });
      });
    }

    // 20. 标记容器已加载（显示内容）
    const container = document.querySelector('.app-container');
    if (container) {
      container.classList.add('loaded');
    }

    // Add debug key for performance monitor
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        const metrics = performanceMonitor.getMetrics();
        console.log('Performance Metrics:', metrics);
        console.log('Performance Good:', performanceMonitor.isPerformanceGood());
      }
    });

    logger.info('Application initialized successfully', undefined, 'Main');
  } catch (error) {
    logger.error('Failed to initialize application', { error }, 'Main');
    showError('应用初始化失败: ' + (error as Error).message);

    // 即使出错也显示内容
    const container = document.querySelector('.app-container');
    if (container) {
      container.classList.add('loaded');
    }
  }
}

// ============ 全局错误处理 ============

/**
 * 设置全局错误处理器
 */
async function initializeCodeEditor(): Promise<void> {
  const editorElement = document.getElementById('codeEditor');
  if (!editorElement) {
    logger.warn('Code editor container not found', undefined, 'Main');
    return;
  }

  if (!isConfigComplete()) {
    await EditorManager.initialize(editorElement, { language: 'javascript' });
    updateEditorAccess();
    return;
  }

  await EditorManager.initialize(editorElement, { language: 'javascript' });
  updateEditorAccess();
  await applyWorkspaceRoot(StateManager.getState().config.workspaceRoot);
}

function setupGlobalErrorHandlers(): void {
  // 未捕获的错误
  window.onerror = (message, source, lineno, colno, error) => {
    logger.error('Uncaught error', { message, source, lineno, colno, error }, 'Global');
    const stack = error instanceof Error ? error.stack : undefined;
    showFatalError(`错误: ${message}`, stack);
    return true;
  };

  // 未处理的 Promise 拒绝
  window.onunhandledrejection = (event) => {
    logger.error('Unhandled promise rejection', { reason: event.reason }, 'Global');
    const reason = event.reason;
    const stack = reason instanceof Error ? reason.stack : undefined;
    showFatalError(`未处理的错误: ${reason}`, stack);
  };
}

function startElectronInitPolling(): void {
  if (electronInitRunner || electronInitComplete) return;
  electronInitRunner = repeat(checkElectronReady, ELECTRON_READY_FRAMES, 1);
  electronInitRunner.onComplete(handleElectronInitTimeout);
  bindElectronReadyOnLoad();
}

function handleElectronInitTimeout(): void {
  electronInitRunner = null;
  if (!electronInitComplete) {
    showFatalError(ELECTRON_MISSING_MESSAGE);
  }
}

function bindElectronReadyOnLoad(): void {
  if (electronInitLoadBound) return;
  electronInitLoadBound = true;
  window.addEventListener('load', handleElectronReadyOnLoad);
}

function handleElectronReadyOnLoad(): void {
  checkElectronReady();
}

function stopElectronInitRunner(): void {
  if (!electronInitRunner) return;
  electronInitRunner.off();
  electronInitRunner = null;
}

function checkElectronReady(_loopTime?: number): void {
  if (electronInitComplete) {
    stopElectronInitRunner();
    return;
  }

  if (typeof window.electronAPI === 'undefined') {
    return;
  }

  electronInitComplete = true;
  stopElectronInitRunner();
  void onElectronReady();
}

async function onElectronReady(): Promise<void> {
  setupIPCListeners();
  await loadConfig();
  await initializeCodeEditor();
  updateEditorAccess();
}

function setupWindowResizeHandler(): void {
  // 使用防抖处理窗口大小改变，避免频繁触发
  window.addEventListener('resize', () => {
    // 如果有正在等待的resize处理，不需要取消，让它自然完成
    // 只是重新设置一个新的延迟
    delayMs(() => {
      handleWindowResize();
    }, 150); // 150ms防抖
  });
}

function handleWindowResize(): void {
  // 处理Monaco编辑器布局
  if (EditorManager.isInitialized()) {
    EditorManager.layout();
    
    // 对于窗口大小变化，使用强制布局刷新
    EditorManager.forceLayout();
  }

  // 处理其他可能需要重新布局的组件
  // 触发全局resize事件，让各个面板自行处理
  EventSystem.emit('window:resize', {
    width: window.innerWidth,
    height: window.innerHeight
  });
}

// ============ IPC 监听器 ============

/**
 * 设置 IPC 监听器
 */
function setupIPCListeners(): void {
  // 检查 electronAPI 是否可用
  if (typeof window.electronAPI === 'undefined') {
    logger.warn('electronAPI not available, running in browser mode', undefined, 'Main');
    return;
  }

  // 监听菜单事件
  if (window.ipcOn) {
    window.ipcOn('file-loaded', handleFileLoaded);
    // Path setting events handled by SettingsDialog
    window.ipcOn('switch-mode', handleSwitchMode);
    window.ipcOn('toggle-sidebar', handleToggleSidebar);
    window.ipcOn('toggle-theme-settings', handleToggleThemeSettings);
    window.ipcOn('show-history-files', handleShowHistoryFiles);

    logger.info('IPC listeners registered', undefined, 'Main');
  }

  EventSystem.on('config:set-workspace-path', handleWorkspacePathEvent);
}

// ============ IPC 处理函数 ============

/**
 * 处理文件加载完成
 */
function handleFileLoaded(data: { fileName: string; filePath: string; content: string }): void {
  logger.info('File loaded', { fileName: data.fileName, filePath: data.filePath }, 'Main');

  try {
    // 解析 JSON 内容
    const parsedData = JSON.parse(data.content);

    if (!Array.isArray(parsedData)) {
      showError('文件格式错误：数据必须是数组');
      return;
    }

    // 检测文件类型
    const fileType = detectFileType(data.fileName, parsedData);
    normalizeScriptPaths(parsedData);

    // 根据文件类型和内容设置 UI 模式
    let uiMode: EditorMode = 'property'; // 默认使用属性模式而不是脚本模式
    if (fileType === 'quest') {
      uiMode = 'quest';
    } else if (fileType === 'projectile') {
      uiMode = 'projectile';
    } else {
      // 对于普通数据文件，检查是否有脚本
      const hasScripts = parsedData.some((item: unknown, index: number) => {
        if (index === 0 || !item || typeof item !== 'object') return false;
        return 'scripts' in item && item.scripts && Object.keys(item.scripts as Record<string, unknown>).length > 0;
      });

      if (hasScripts) {
        uiMode = 'script';
      }
    }

    // 加载数据到状态管理器
    StateManager.loadData(parsedData, data.filePath, fileType);
    StateManager.setMode(uiMode);

    // 显示项目列表
    displayItemList();

    // 切换到对应面板
    PanelManager.showPanel(uiMode);

    // 自动选择第一个项目
    if (parsedData.length > 1) {
      selectItem(1);
    }

    // 更新状态栏
    updateStatus(`已加载 ${data.fileName}，共 ${parsedData.length - 1} 个项目`);

    // 触发事件
    EventSystem.emit('file:loaded', data);

  } catch (error) {
    logger.error('Failed to parse file', { error }, 'Main');
    showError('文件解析失败: ' + (error as Error).message);
  }
}

/**
 * 检测文件类型
 */
function detectFileType(fileName: string, data: unknown[]): FileType {
  const lowerName = fileName.toLowerCase();

  // 检测任务文件
  if (lowerName.includes('quest') || lowerName === 'quests.json') {
    return 'quest';
  }

  // 检测弹道文件
  if (lowerName.includes('projectile') || lowerName === 'projectiles.json') {
    return 'projectile';
  }

  // 检查数据结构来判断类型
  if (data.length > 1 && data[1]) {
    const firstItem = data[1] as Record<string, unknown>;

    // 任务文件通常有 title, objectives 等字段
    if ('title' in firstItem && ('objectives' in firstItem || 'rewards' in firstItem)) {
      return 'quest';
    }

    // 弹道文件通常有 segments, trajectory 等字段
    if ('segments' in firstItem || 'trajectory' in firstItem) {
      return 'projectile';
    }
  }

  return 'data';
}

function normalizeScriptPaths(data: unknown[]): void {
  const list = Array.isArray(data) ? data : [];
  for (let i = 1; i < list.length; i++) {
    const item = list[i] as Record<string, unknown> | null;
    if (item && typeof item === 'object' && 'scripts' in item) {
      normalizeItemScriptPaths(item);
    }
  }
}



function collectMissingConfig(): string[] {
  const state = StateManager.getState();
  missingConfigList.length = 0;

  for (let i = 0; i < MISSING_CONFIG_FIELDS.length; i++) {
    const key = MISSING_CONFIG_FIELDS[i];
    if (!state.config[key]) {
      missingConfigList.push(key);
    }
  }

  return missingConfigList;
}

function isConfigComplete(): boolean {
  return collectMissingConfig().length === 0;
}

async function applyWorkspaceRoot(workspaceRoot: string): Promise<void> {
  if (typeof window.electronAPI === 'undefined') {
    logger.warn('electronAPI not available, skipping workspace settings', undefined, 'Main');
    return;
  }

  if (!workspaceRoot) return;

  await applyWorkspaceSettings(
    workspaceRoot,
    readFileForWorkspace,
    listDtsFilesForWorkspace
  );
}

function updateEditorAccess(): void {
  if (!EditorManager.isInitialized()) return;
  const shouldDisable = !isConfigComplete();
  EditorManager.setDisabled(shouldDisable);

  const container = DOM.codeEditorContainer;
  if (container && !(container as unknown as { __clickListenerAdded?: boolean }).__clickListenerAdded) {
    container.addEventListener('click', handleCodeEditorContainerClick);
    (container as unknown as { __clickListenerAdded?: boolean }).__clickListenerAdded = true;
  }
}

async function readFileForWorkspace(path: string, _encoding: string): Promise<string> {
  if (typeof window.electronAPI === 'undefined') {
    return EMPTY_STRING;
  }
  return window.electronAPI.readFile(path);
}

async function listDtsFilesForWorkspace(workspaceRoot: string): Promise<string[]> {
  if (typeof window.electronAPI === 'undefined') {
    return EMPTY_STRING_ARRAY;
  }
  return window.electronAPI.listDtsFiles(workspaceRoot);
}

/**
 * 处理切换模式
 */
function handleSwitchMode(mode: 'script' | 'property' | 'note' | 'projectile' | 'quest'): void {
  logger.info('Switching mode', { mode }, 'Main');

  // 检查是否有文件加载
  const state = StateManager.getState();
  if (!state.currentData || state.currentData.length === 0) {
    logger.warn('No file loaded, cannot switch mode', undefined, 'Main');
    return;
  }

  // 更新状态
  StateManager.setMode(mode);

  // 切换面板
  PanelManager.showPanel(mode);

  // 触发事件
  EventSystem.emit('mode:changed', mode);
}

/**
 * 处理切换侧边栏
 */
function handleToggleSidebar(): void {
  logger.info('Toggling sidebar', undefined, 'Main');
  sidebarAnimator.toggle();
  // 触发事件
  EventSystem.emit('sidebar:toggled');
}

/**
 * 处理切换主题设置
 */
function handleToggleThemeSettings(): void {
  logger.info('Toggling theme settings', undefined, 'Main');

  // 触发事件，让 ThemeSystem 处理
  EventSystem.emit('theme:toggle-settings');
}

/**
 * 处理显示历史文件
 */
function handleShowHistoryFiles(): void {
  logger.info('Showing history files', undefined, 'Main');

  const dialog = DOM.historyFilesDialog;
  if (dialog) {
    dialog.classList.remove('hidden');

    // 渲染历史文件列表
    renderHistoryFilesList();
  }

  // 触发事件
  EventSystem.emit('history:show');
}

/**
 * 隐藏历史文件对话框
 */
function hideHistoryFilesDialog(): void {
  const dialog = DOM.historyFilesDialog;
  if (dialog) {
    dialog.classList.add('hidden');
  }
}

/**
 * 渲染历史文件列表
 */
function renderHistoryFilesList(): void {
  const listContainer = DOM.historyFilesList;
  if (!listContainer) return;

  const state = StateManager.getState();
  const recentFiles = state.config.recentFiles || [];

  if (recentFiles.length === 0) {
    listContainer.innerHTML = '<div class="p-4 text-gray-500 text-center text-sm">暂无历史文件</div>';
    return;
  }

  listContainer.innerHTML = '';

  for (const filePath of recentFiles) {
    const fileName = filePath.split(PATH_SEP_REGEX).pop() || filePath;
    const item = document.createElement('div');
    item.className = 'history-file-item px-4 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 text-sm text-gray-300';
    item.textContent = fileName;
    item.title = filePath;
    item.dataset.path = filePath;
    item.onclick = () => handleHistoryFileClick(filePath);
    listContainer.appendChild(item);
  }
}

/**
 * 处理历史文件点击
 */
async function handleHistoryFileClick(filePath: string): Promise<void> {
  logger.info('Opening history file', { filePath }, 'Main');

  // 隐藏对话框
  hideHistoryFilesDialog();

  // 检查文件是否存在
  if (typeof window.electronAPI !== 'undefined') {
    try {
      const exists = await window.electronAPI.fileExists(filePath);
      if (!exists) {
        showError('文件不存在: ' + filePath);
        return;
      }

      // 读取文件
      const content = await window.electronAPI.readFile(filePath);
      const fileName = filePath.split(PATH_SEP_REGEX).pop() || filePath;

      // 触发文件加载
      handleFileLoaded({ fileName, filePath, content });
    } catch (error) {
      logger.error('Failed to open history file', { filePath, error }, 'Main');
      showError('打开文件失败: ' + (error as Error).message);
    }
  }
}

/**
 * 设置历史文件对话框事件
 */
function setupHistoryFilesDialog(): void {
  // 关闭按钮
  const closeBtn = DOM.historyFilesDialogClose;
  if (closeBtn) {
    closeBtn.onclick = hideHistoryFilesDialog;
  }

  // 点击背景关闭
  const dialog = DOM.historyFilesDialog;
  if (dialog) {
    dialog.onclick = (e: MouseEvent) => {
      if (e.target === dialog) {
        hideHistoryFilesDialog();
      }
    };
  }
}

/**
 * 处理保存设置
 */


// ============ 脚本处理 ============

let scriptHandlersBound = false;

function setupScriptHandlers(): void {
  if (scriptHandlersBound) return;
  scriptHandlersBound = true;

  EventSystem.on('script:create', handleCreateScriptRequest);
  EventSystem.on('script:delete', handleScriptDeleteEvent);
  EventSystem.on('editor:save', handleSaveScriptRequest);
  EventSystem.on('editor:clear', handleClearScriptsRequest);
  EventSystem.on('editor:delete-script', handleDeleteScriptFromEditor);

  if (DOM.saveCodeBtn) {
    DOM.saveCodeBtn.addEventListener('click', handleSaveScriptRequest);
  }
  if (DOM.clearCodeBtn) {
    DOM.clearCodeBtn.addEventListener('click', handleClearScriptsRequest);
  }
}

/**
 * 设置项目操作按钮事件
 */
function setupItemActions(): void {
  if (DOM.itemNewBtn) {
    DOM.itemNewBtn.onclick = handleCreateItem;
  }
  if (DOM.itemDeleteBtn) {
    DOM.itemDeleteBtn.onclick = handleDeleteItem;
  }
  if (DOM.itemSaveBtn) {
    DOM.itemSaveBtn.onclick = handleSaveItem;
  }
  if (DOM.itemCopyBtn) {
    DOM.itemCopyBtn.onclick = handleCopyItem;
  }
}

async function handleCreateItem(): Promise<void> {
  const state = StateManager.getState();
  if (!state.currentData || !state.currentFilePath) {
    showError('请先打开一个数据文件');
    return;
  }

  const fileType = state.currentFileType;
  EventSystem.emit('item:create', { fileType });
  logger.info('Create item requested', { fileType }, 'Main');
}

async function handleDeleteItem(): Promise<void> {
  const state = StateManager.getState();
  if (!state.currentItem || !state.currentItemIndex) {
    showError('请先选择一个项目');
    return;
  }

  if (!state.currentData || state.currentItemIndex >= state.currentData.length) {
    showError('无效的项目索引');
    return;
  }

  const confirmResult = window.confirm(`确认删除当前项目吗？此操作不可恢复！`);
  if (!confirmResult) {
    return;
  }

  showLoading(true, '删除项目中...');

  try {
    state.currentData.splice(state.currentItemIndex, 1);
    const jsonContent = JSON.stringify(state.currentData, null, 2);
    await window.electronAPI.writeFile(state.currentFilePath, jsonContent);

    StateManager.selectItem(0);
    displayItemList();
    updateStatus('项目已删除');
  } catch (error) {
    showError('删除项目失败: ' + (error as Error).message);
  } finally {
    showLoading(false);
  }
}

async function handleSaveItem(): Promise<void> {
  const state = StateManager.getState();
  if (!state.currentItem || !state.currentFilePath) {
    showError('请先选择一个项目');
    return;
  }

  if (!isConfigComplete()) {
    showError('请先完成路径配置');
    settingsDialog.show();
    return;
  }

  showLoading(true, '保存项目中...');

  try {
    const jsonContent = JSON.stringify(state.currentData, null, 2);
    await window.electronAPI.writeFile(state.currentFilePath, jsonContent);
    updateStatus('项目已保存');
  } catch (error) {
    showError('保存项目失败: ' + (error as Error).message);
  } finally {
    showLoading(false);
  }
}

function handleCopyItem(): void {
  const state = StateManager.getState();
  if (!state.currentItem || !state.currentData) {
    showError('请先选择一个项目');
    return;
  }

  const newIndex = state.currentData.length;
  const clonedItem = JSON.parse(JSON.stringify(state.currentItem));
  (clonedItem as Record<string, unknown>).id = newIndex;
  (clonedItem as Record<string, unknown>).name = `${(clonedItem as Record<string, unknown>).name || '未命名'}_复制`;
  state.currentData.push(clonedItem as never);

  StateManager.selectItem(newIndex);
  displayItemList();
  updateStatus(`已复制项目到 #${newIndex}`);
}

async function handleCreateScriptRequest(): Promise<void> {
  const state = StateManager.getState();
  if (!state.currentFilePath || !state.currentItem) {
    showError('请先选择文件和项目');
    return;
  }
  if (typeof window.electronAPI === 'undefined') {
    showError('electronAPI 不可用，无法创建脚本');
    return;
  }

  StateManager.resetScript();

  const scriptKey = await showInputDialog(
    '新建脚本',
    '请输入脚本的键名 (例如: onLoad, onUpdate):'
  );
  if (!scriptKey) {
    updateStatus('新建脚本已取消');
    return;
  }

  const currentItem = state.currentItem as unknown as Record<string, unknown>;
  const scripts = (currentItem.scripts as Record<string, string>) || EMPTY_SCRIPTS;
  if (scripts[scriptKey]) {
    showError(`脚本键名 "${scriptKey}" 已存在，请使用不同的键名`);
    updateStatus(`脚本键名 "${scriptKey}" 重复，新建失败`);
    return;
  }

  showLoading(true, '创建脚本中...');

  try {
    const itemId = (currentItem.id as number) || state.currentItemIndex;
    const scriptDir = getScriptDirectory();
    if (!scriptDir) {
      showError('请先设置脚本保存目录');
      showLoading(false);
      return;
    }

    const jsFileName = `${itemId}_${scriptKey}_${Date.now()}.js`;
    const filePath = `${scriptDir}/${jsFileName}`;
    const timestampLine = buildTimestampLine(new Date());

    await window.electronAPI.writeFile(filePath, timestampLine);

    if (!currentItem.scripts) {
      currentItem.scripts = {};
    }
    const storedPath = formatStoredScriptPath(filePath);
    (currentItem.scripts as Record<string, string>)[scriptKey] = storedPath;
    normalizeItemScriptPaths(currentItem);
    setScriptCache(filePath, timestampLine);

    if (!state.currentData) {
      showError('未选择文件或项目');
      showLoading(false);
      return;
    }
    state.currentData[state.currentItemIndex] = currentItem as never;
    const jsonContent = JSON.stringify(state.currentData, null, 2);
    await window.electronAPI.writeFile(state.currentFilePath, jsonContent);

    displayScriptList();
    if (state.currentScriptKey !== scriptKey) {
      selectScript(scriptKey);
    }

    updateStatus(`脚本已创建: ${scriptKey}`);
  } catch (error) {
    showError('创建脚本失败: ' + (error as Error).message);
  } finally {
    showLoading(false);
  }
}

function handleDeleteScriptFromEditor(): void {
  handleDeleteScriptRequest();
}

async function handleDeleteScriptRequest(key?: string): Promise<void> {
  const state = StateManager.getState();
  const currentItem = state.currentItem as unknown as Record<string, unknown> | null;
  const currentKey = key || state.currentScriptKey;

  if (!currentItem || !currentKey) {
    showError('未选择脚本');
    return;
  }
  if (typeof window.electronAPI === 'undefined') {
    showError('electronAPI 不可用，无法删除脚本');
    return;
  }

  const scripts = currentItem.scripts as Record<string, string> | undefined;
  if (!scripts || !scripts[currentKey]) {
    showError('脚本不存在');
    return;
  }

  const confirmResult = window.confirm(`确认删除脚本 ${currentKey} 及其文件？此操作不可恢复！`);
  if (!confirmResult) {
    return;
  }

  showLoading(true, '删除脚本中...');

  const storedPath = scripts[currentKey];
  const scriptPath = resolveScriptFilePath(storedPath);
  try {
    if (scriptPath && !isHttpProtocol(scriptPath)) {
      await window.electronAPI.deleteFile(scriptPath);
      removeScriptCache(scriptPath);
    }
  } catch (error) {
    logger.warn('Failed to delete script file', { scriptPath, error }, 'Main');
  }

  delete scripts[currentKey];
  if (!state.currentData) {
    showError('未选择文件或项目');
    showLoading(false);
    return;
  }
  state.currentData[state.currentItemIndex] = currentItem as never;
  const data = state.currentData;

  try {
    const jsonContent = JSON.stringify(data, null, 2);
    await window.electronAPI.writeFile(state.currentFilePath, jsonContent);
  } catch (error) {
    showError('脚本删除同步失败: ' + (error as Error).message);
  }

  StateManager.resetScript();
  EditorManager.setValue('');
  displayScriptList();
  renderPropertyPanel();
  updateStatus(`脚本已删除: ${currentKey}`);
  showLoading(false);
}

async function handleSaveScriptRequest(): Promise<void> {
  try {
    const state = StateManager.getState();
    if (!state.currentScriptKey) {
      showError('未选择脚本');
      return;
    }
    if (!state.currentItem || !state.currentFilePath) {
      showError('未选择文件或项目');
      return;
    }
    if (typeof window.electronAPI === 'undefined') {
      showError('electronAPI 不可用，无法保存脚本');
      return;
    }

    if (!isConfigComplete()) {
      showError('请先完成路径配置');
      settingsDialog.show();
      return;
    }
    const code = EditorManager.getValue();
    if (!code.trim()) {
      showError('代码为空');
      return;
    }

    showLoading(true, '保存中...');

    const currentItem = state.currentItem as unknown as Record<string, unknown>;
    const scripts = currentItem.scripts as Record<string, string> | undefined;
    const storedPath = scripts ? scripts[state.currentScriptKey] : '';
    const filePath = resolveScriptFilePath(storedPath);
    if (!filePath) {
      showError('无法解析脚本路径');
      showLoading(false);
      return;
    }

    const codeToSave = extractScriptCode(code).trim();
    const cachedContent = getScriptCache(filePath);
    if (cachedContent !== null) {
      const previousCode = extractScriptCode(cachedContent).trim();
      if (previousCode === codeToSave) {
        updateStatus('代码未变更，无需保存');
        showLoading(false);
        return;
      }
    }

    const timestampLine = buildTimestampLine(new Date());
    const newFileContent = `${timestampLine}\n${codeToSave}`;
    await window.electronAPI.writeFile(filePath, newFileContent);
    setScriptCache(filePath, newFileContent);

    const newStoredPath = formatStoredScriptPath(filePath);
    if (newStoredPath && scripts) {
      scripts[state.currentScriptKey] = newStoredPath;
    }

    applyTimestampToActiveEditor(timestampLine);
    updateStatus(`已保存脚本: ${state.currentScriptKey}`);
    showLoading(false);
  } catch (error) {
    showError('保存失败: ' + (error as Error).message);
    showLoading(false);
  }
}

async function handleClearScriptsRequest(): Promise<void> {
  const state = StateManager.getState();
  const currentItem = state.currentItem as unknown as Record<string, unknown> | null;
  if (!currentItem || !currentItem.scripts) {
    showError('没有脚本要清除');
    return;
  }
  if (typeof window.electronAPI === 'undefined') {
    showError('electronAPI 不可用，无法清除脚本');
    return;
  }

  const scripts = currentItem.scripts as Record<string, string>;
  const scriptCount = Object.keys(scripts).length;
  if (scriptCount === 0) {
    showError('没有脚本要清除');
    return;
  }

  const confirmResult = window.confirm(`确认要删除该项目下的所有 ${scriptCount} 个脚本吗？此操作不可恢复！`);
  if (!confirmResult) {
    return;
  }

  showLoading(true, '删除脚本中...');

  try {
    for (const key in scripts) {
      const storedPath = scripts[key];
      const filePath = resolveScriptFilePath(storedPath);
      if (!filePath || isHttpProtocol(filePath)) {
        continue;
      }
      try {
        await window.electronAPI.deleteFile(filePath);
        removeScriptCache(filePath);
      } catch (error) {
        logger.warn('Failed to delete script file', { filePath, error }, 'Main');
      }
    }

    currentItem.scripts = null;
    if (!state.currentData) {
      showError('未选择文件或项目');
      showLoading(false);
      return;
    }
    state.currentData[state.currentItemIndex] = currentItem as never;
    const jsonContent = JSON.stringify(state.currentData, null, 2);
    await window.electronAPI.writeFile(state.currentFilePath, jsonContent);

    StateManager.resetScript();
    EditorManager.setValue('');
    displayScriptList();
    updateStatus('已删除所有脚本');
  } catch (error) {
    showError('删除脚本失败: ' + (error as Error).message);
  } finally {
    showLoading(false);
  }
}

function applyTimestampToActiveEditor(timestampLine: string): void {
  if (!timestampLine) return;
  const editor = EditorManager.getEditor();
  const monaco = EditorManager.getMonaco();
  if (!editor || !monaco) return;
  const model = editor.getModel();
  if (!model) return;
  const firstLine = model.getLineContent(1);
  if (firstLine === timestampLine) {
    return;
  }
  TIMESTAMP_EDITS.length = 0;
  if (SCRIPT_TIMESTAMP_REGEXP.test(firstLine)) {
    TIMESTAMP_EDITS.push({
      range: new monaco.Range(1, 1, 1, firstLine.length + 1),
      text: timestampLine,
    });
  } else {
    TIMESTAMP_EDITS.push({
      range: new monaco.Range(1, 1, 1, 1),
      text: `${timestampLine}\n`,
    });
  }
  editor.pushUndoStop();
  model.pushEditOperations([], TIMESTAMP_EDITS, NOOP_UNDO);
  editor.pushUndoStop();
}

function getScriptDirectory(): string {
  const state = StateManager.getState();
  const scriptPath = state.config.scriptSavePath || '';
  return scriptPath.replace(TRAILING_SLASH_REGEXP, '').replace(BACKSLASH_REGEXP, '/');
}

function isHttpProtocol(value: string): boolean {
  return HTTP_PROTOCOL_REGEXP.test(value);
}

// ============ 项目选择处理 ============

/**
 * 设置项目选择事件处理
 */
function setupItemSelectedHandler(): void {
  EventSystem.on('item:selected', (...args: unknown[]) => {
    const index = args[0] as number;
    handleItemSelected(index);
  });
}

/**
 * 处理项目选择
 * 参考 oldCode/main.js 的 selectItem 函数
 */
function handleItemSelected(index: number): void {
  const state = StateManager.getState();
  const currentItem = state.currentItem;
  const uiMode = state.uiMode;

  if (!currentItem) {
    logger.warn('No current item after selection', { index }, 'Main');
    return;
  }

  // 更新路径和状态
  const itemData = currentItem as unknown as Record<string, unknown>;
  const itemName = (itemData.name as string) || (itemData.title as string) || '未命名';
  const itemId = (itemData.id as number) || index;

  if (DOM.codeFilePath) {
    DOM.codeFilePath.textContent = `项目: ${itemName} (ID: ${itemId})`;
  }
  updateStatus(`选中项目 #${itemId}`);

  // 根据当前模式更新对应面板
  switch (uiMode) {
    case 'script':
      displayScriptList();
      break;
    case 'property':
      renderPropertyPanel();
      break;
    case 'note':
      renderNotePanel();
      renderMetaDataPanel();
      break;
    case 'quest':
      renderQuestPanel();
      break;
    case 'projectile':
      renderProjectilePanel();
      break;
  }

  logger.debug('Item selected handler completed', { index, uiMode }, 'Main');
}

// ============ 配置加载 ============

/**
 * 加载配置
 */
async function loadConfig(): Promise<void> {
  if (typeof window.electronAPI === 'undefined') {
    logger.warn('electronAPI not available, skipping config load', undefined, 'Main');
    return;
  }

  try {
    const config = await window.electronAPI.readConfig() as any;
    if (config) {
      // 只更新有效的配置字段
      const validConfig: Partial<import('./types').EditorConfig> = {};
      if (config.dataPath) validConfig.dataPath = config.dataPath;

      // Handle script path (supporting both field names for compatibility)
      const scriptPath = config.scriptPath || config.scriptSavePath;
      if (scriptPath) {
        validConfig.scriptPath = scriptPath;
        validConfig.scriptSavePath = scriptPath;
      }

      // Handle workspace path
      const workspacePath = config.workspacePath || config.workspaceRoot;
      if (workspacePath) {
        validConfig.workspacePath = workspacePath;
        validConfig.workspaceRoot = workspacePath;
      }

      // CRITICAL: Load image path which was previously missing
      if (config.imagePath) {
        validConfig.imagePath = config.imagePath;
        logger.info('Image path configured', { imagePath: config.imagePath }, 'Main');
      }

      if (config.recentFiles) validConfig.recentFiles = config.recentFiles;
      if (config.theme === 'dark' || config.theme === 'light') validConfig.theme = config.theme;
      if (config.accentColor === 'cyan' || config.accentColor === 'magenta' ||
        config.accentColor === 'green' || config.accentColor === 'orange') {
        validConfig.accentColor = config.accentColor;
      }
      if (typeof config.animationsEnabled === 'boolean') validConfig.animationsEnabled = config.animationsEnabled;

      StateManager.updateConfig(validConfig);
      updateEditorAccess();
      StateManager.markConfigSaved();
      logger.info('Config loaded successfully', { config: validConfig }, 'Main');
    }
  } catch (error) {
    logger.error('Failed to load config', { error }, 'Main');
  }
}

// ============ UI 工具函数 ============

function setupThemeSettingsDialog(): void {
  const {
    themeSettingsDialog,
    themeSettingsClose,
    presetCyberpunkBtn,
    presetMinimalBtn,
    presetHighContrastBtn,
    themeDarkBtn,
    themeLightBtn,
    accentCyanBtn,
    accentMagentaBtn,
    accentGreenBtn,
    accentOrangeBtn,
    animationsToggle,
    fontSizeSelect,
    compactModeToggle,
  } = DOM;

  if (!themeSettingsDialog) {
    logger.warn('Theme settings dialog not found in DOM', undefined, 'Theme');
    return;
  }

  const showDialog = () => {
    updateDialogUI();
    themeSettingsDialog.classList.remove('hidden');
  };

  const hideDialog = () => {
    themeSettingsDialog.classList.add('hidden');
  };

  const updateDialogUI = () => {
    const settings = themeSystem.getSettings();

    // Update preset buttons
    presetCyberpunkBtn?.classList.toggle('active', settings.preset === 'cyberpunk');
    presetMinimalBtn?.classList.toggle('active', settings.preset === 'minimal');
    presetHighContrastBtn?.classList.toggle('active', settings.preset === 'high-contrast');

    // Update theme buttons
    themeDarkBtn?.classList.toggle('active', settings.theme === 'dark');
    themeLightBtn?.classList.toggle('active', settings.theme === 'light');

    // Update accent buttons
    accentCyanBtn?.classList.toggle('active', settings.accent === 'cyan');
    accentMagentaBtn?.classList.toggle('active', settings.accent === 'magenta');
    accentGreenBtn?.classList.toggle('active', settings.accent === 'green');
    accentOrangeBtn?.classList.toggle('active', settings.accent === 'orange');

    // Update toggles and selects
    if (animationsToggle) animationsToggle.checked = settings.animations;
    if (fontSizeSelect) fontSizeSelect.value = settings.fontSize;
    if (compactModeToggle) compactModeToggle.checked = settings.compactMode;
  };

  // Event Listeners
  EventSystem.on('theme:toggle-settings', showDialog);
  themeSettingsClose?.addEventListener('click', hideDialog);
  themeSettingsDialog.addEventListener('click', (e) => {
    if (e.target === themeSettingsDialog) {
      hideDialog();
    }
  });

  // Preset buttons
  presetCyberpunkBtn?.addEventListener('click', () => themeSystem.setPreset('cyberpunk').then(updateDialogUI));
  presetMinimalBtn?.addEventListener('click', () => themeSystem.setPreset('minimal').then(updateDialogUI));
  presetHighContrastBtn?.addEventListener('click', () => themeSystem.setPreset('high-contrast').then(updateDialogUI));

  // Theme buttons
  themeDarkBtn?.addEventListener('click', () => themeSystem.setTheme('dark').then(updateDialogUI));
  themeLightBtn?.addEventListener('click', () => themeSystem.setTheme('light').then(updateDialogUI));

  // Accent buttons
  accentCyanBtn?.addEventListener('click', () => themeSystem.setAccent('cyan').then(updateDialogUI));
  accentMagentaBtn?.addEventListener('click', () => themeSystem.setAccent('magenta').then(updateDialogUI));
  accentGreenBtn?.addEventListener('click', () => themeSystem.setAccent('green').then(updateDialogUI));
  accentOrangeBtn?.addEventListener('click', () => themeSystem.setAccent('orange').then(updateDialogUI));

  // Toggles and Selects
  animationsToggle?.addEventListener('change', () => themeSystem.setAnimations(animationsToggle.checked));
  if (fontSizeSelect) {
    fontSizeSelect.addEventListener('change', () => themeSystem.setFontSize(fontSizeSelect.value as 'small' | 'medium' | 'large'));
  }
  if (compactModeToggle) {
    compactModeToggle.addEventListener('change', () => themeSystem.setCompactMode(compactModeToggle.checked));
  }

  logger.info('Theme settings dialog initialized', undefined, 'Theme');
}

/**
 * 更新状态栏文本
 */
function updateStatus(text: string): void {
  if (DOM.statusText) {
    DOM.statusText.textContent = text;
  }
}

/**
 * 显示错误消息
 */
function showError(message: string): void {
  logger.error(message, undefined, 'Main');
  showErrorOverlay(message, undefined);
}

function showFatalError(message: string, stack?: string): void {
  logger.error(message, { stack }, 'Main');
  showErrorOverlay(message, stack);
}

/**
 * 显示加载指示器
 */
function showLoading(show: boolean, text = '加载中...'): void {
  if (DOM.loadingIndicator) {
    DOM.loadingIndicator.classList.toggle('hidden', !show);
  }
  if (DOM.loadingText) {
    DOM.loadingText.textContent = text;
  }
}

// ============ 导出工具函数 ============

export { updateStatus, showError, showLoading };

// 等待 DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
