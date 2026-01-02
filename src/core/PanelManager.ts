/**
 * PanelManager - 面板管理器
 * 参考 oldCode/main.js 的 hideAllModePanels 和 switchMode
 * 实现面板切换逻辑
 * 
 * Enhanced for editor-modernization:
 * - Fixed panel switching bug between Quest and Projectile editors
 * - Added proper state synchronization with PanelAnimator
 * - Improved resource cleanup and race condition prevention
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import type { EditorMode } from '../types';
import { DOM, setVisible } from './DOMManager';
import { StateManager } from './StateManager';
import { EventSystem } from './EventSystem';
import { logger } from '../services/logger';
import { waitMs, delayMs } from '../utils/delay';
import { EditorManager } from './EditorManager';
import { PanelAnimator } from './PanelAnimator';

// ============ 类型定义 ============

/** 面板配置 */
interface PanelConfig {
  /** 面板元素 ID */
  elementId: keyof typeof DOM;
  /** 是否需要脚本列表 */
  showScriptList: boolean;
  /** 是否需要元数据面板 */
  showMetaData: boolean;
  /** 是否需要代码编辑器 */
  showCodeEditor: boolean;
  /** 初始化函数 */
  onInit?: () => void;
  /** 显示时回调 */
  onShow?: () => void;
  /** 隐藏时回调 */
  onHide?: () => void;
}

// ============ 面板配置 ============

const PANEL_CONFIGS: Record<EditorMode, PanelConfig> = {
  script: {
    elementId: 'codeEditorContainer',
    showScriptList: true,
    showMetaData: false,  // 元数据面板只在需要时显示
    showCodeEditor: true,
  },
  property: {
    elementId: 'propertyModePanel',
    showScriptList: false,
    showMetaData: false,
    showCodeEditor: false,
  },
  note: {
    elementId: 'noteModePanel',
    showScriptList: false,
    showMetaData: false,
    showCodeEditor: false,
  },
  projectile: {
    elementId: 'projectileModePanel',
    showScriptList: false,
    showMetaData: false,
    showCodeEditor: false,
  },
  quest: {
    elementId: 'questModePanel',
    showScriptList: false,
    showMetaData: false,
    showCodeEditor: false,
  },
};

// ============ PanelManager 类 ============

/**
 * 面板管理器 - 单例模式
 * 管理面板切换和显示
 * 
 * Enhanced features:
 * - Race condition protection with switching locks
 * - Proper animator state synchronization
 * - Enhanced cleanup and validation
 */
class PanelManagerClass {
  /** 当前模式 - 默认为空，只有加载数据后才显示面板 */
  private currentMode: EditorMode | null = null;

  /** 面板初始化状态 */
  private initializedPanels: Set<EditorMode> = new Set();

  /** 面板状态缓存 */
  private panelStates: Map<EditorMode, unknown> = new Map();

  /** 动画控制器 */
  private readonly animator = new PanelAnimator();

  /** 切换锁 - 防止并发切换 */
  private switchingLock = false;

  /** 初始化状态 */
  private initialized = false;

  /**
   * 初始化面板管理器
   */
  init(): void {
    if (this.initialized) {
      logger.warn('PanelManager already initialized', undefined, 'PanelManager');
      return;
    }

    // 订阅状态变更
    StateManager.subscribe((state, changedKeys) => {
      if (changedKeys.includes('uiMode')) {
        void this.showPanel(state.uiMode);
      }
    });

    // 初始化时显示空状态面板，不显示任何编辑器面板
    this.showEmptyState();

    this.initialized = true;
    logger.info('PanelManager initialized', undefined, 'PanelManager');
  }

  /**
   * 显示空状态面板
   */
  private showEmptyState(): void {
    // 隐藏所有编辑器面板
    this.forceCleanupAllPanels(null);
    
    // 隐藏辅助面板
    setVisible(DOM.scriptPanel, false);
    setVisible(DOM.metaDataPanel, false);
    
    // 显示空状态面板
    setVisible(DOM.emptyStatePanel, true);
    
    this.currentMode = null;
    logger.debug('Empty state panel shown', undefined, 'PanelManager');
  }

  /**
   * 获取当前模式
   */
  getCurrentMode(): EditorMode | null {
    return this.currentMode;
  }

  /**
   * 隐藏所有面板
   */
  hideAllPanels(): void {
    // 动画器现在处理主内容面板的可见性。
    // 此方法现在只管理辅助面板和空状态。
    setVisible(DOM.scriptPanel, false);
    setVisible(DOM.metaDataPanel, false);
    setVisible(DOM.emptyStatePanel, true);
  }

  /**
   * 显示指定面板
   * Enhanced with race condition protection and proper state management
   */
  async showPanel(mode: EditorMode | null): Promise<void> {
    // 如果模式为 null，显示空状态面板
    if (mode === null) {
      this.showEmptyState();
      return;
    }
    // 防止并发切换
    if (this.switchingLock) {
      logger.debug('Panel switch already in progress, waiting...', { mode }, 'PanelManager');
      // 等待当前切换完成，然后重试
      while (this.switchingLock) {
        await waitMs(10); // Use unified delay utility
      }
      // 重新检查是否还需要切换
      if (this.currentMode === mode) {
        return;
      }
    }

    const config = PANEL_CONFIGS[mode];
    if (!config) {
      logger.warn('Unknown panel mode', { mode }, 'PanelManager');
      return;
    }

    // 如果已经是当前面板，直接返回
    if (this.currentMode === mode && this.animator.getCurrentPanel()) {
      logger.debug('Panel already active', { mode }, 'PanelManager');
      return;
    }

    this.switchingLock = true;

    try {
      // 确保动画器状态同步
      this.syncAnimatorWithCurrentPanel();

      // 强制隐藏所有其他面板（防止重叠）
      this.forceCleanupAllPanels(mode);

      const panelElement = DOM[config.elementId] as HTMLElement | null;
      if (!panelElement) {
        logger.warn(`Panel element with ID ${config.elementId} not found in DOM.`, { mode }, 'PanelManager');
        return;
      }

      // 保存当前面板状态（如果有当前面板）
      if (this.currentMode !== null) {
        this.savePanelState(this.currentMode);
      }

      // 触发当前面板的隐藏回调（如果有当前面板）
      if (this.currentMode !== null) {
        const currentConfig = PANEL_CONFIGS[this.currentMode];
        if (currentConfig?.onHide) {
          try {
            currentConfig.onHide();
          } catch (error) {
            logger.error('Error in panel hide callback', { mode: this.currentMode, error }, 'PanelManager');
          }
        }
      }

      // 隐藏空状态
      setVisible(DOM.emptyStatePanel, false);

      // 使用动画器切换主面板
      await this.animator.switchPanel(panelElement);

      // Apply theme to the panel after switching
      this.applyThemeToPanel(panelElement, mode);

      // 确保面板确实可见（动画器可能没有正确设置）
      panelElement.classList.remove('hidden');
      panelElement.style.display = '';
      panelElement.style.opacity = '1';
      panelElement.style.visibility = 'visible';
      panelElement.style.pointerEvents = '';

      // 显示辅助面板
      setVisible(DOM.scriptPanel, config.showScriptList);
      setVisible(DOM.metaDataPanel, config.showMetaData);

      // 懒加载初始化
      if (!this.initializedPanels.has(mode)) {
        this.initPanel(mode);
        this.initializedPanels.add(mode);
      }

      // 恢复面板状态
      this.restorePanelState(mode);

      // 触发显示回调
      if (config.onShow) {
        try {
          config.onShow();
        } catch (error) {
          logger.error('Error in panel show callback', { mode, error }, 'PanelManager');
        }
      }

      // 更新当前模式
      this.currentMode = mode;

      // 触发事件
      if (config.showCodeEditor && EditorManager.isInitialized()) {
        // 立即布局
        EditorManager.layout();
        
        // 延迟布局，确保DOM完全渲染 - 使用统一延迟系统
        delayMs(() => {
          if (EditorManager.isInitialized()) {
            EditorManager.layout();
            
            // 额外的布局刷新，确保Monaco编辑器正确填充容器
            delayMs(() => {
              if (EditorManager.isInitialized()) {
                EditorManager.layout();
              }
            }, 200);
            
            // 最大化窗口时需要更长的延迟
            delayMs(() => {
              if (EditorManager.isInitialized()) {
                EditorManager.layout();
              }
            }, 500);
            
            // 最后一次强制刷新
            delayMs(() => {
              if (EditorManager.isInitialized()) {
                EditorManager.layout();
              }
            }, 1000);
          }
        }, 100);
      }
      EventSystem.emit('panel:shown', mode);

      // 最终验证状态
      if (!this.validatePanelState()) {
        logger.warn('Panel state validation failed after switch', { mode }, 'PanelManager');
      }

      logger.debug('Panel shown successfully', { mode }, 'PanelManager');
    } catch (error) {
      logger.error('Failed to show panel', { mode, error }, 'PanelManager');
      // 尝试恢复到安全状态
      this.recoverToSafeState();
    } finally {
      this.switchingLock = false;
    }
  }

  /**
   * 初始化面板（懒加载）
   */
  initPanel(mode: EditorMode): void {
    const config = PANEL_CONFIGS[mode];
    if (config?.onInit) {
      config.onInit();
    }

    logger.debug('Panel initialized', { mode }, 'PanelManager');
  }

  /**
   * 注册面板回调
   */
  registerPanelCallbacks(
    mode: EditorMode,
    callbacks: {
      onInit?: () => void;
      onShow?: () => void;
      onHide?: () => void;
    }
  ): void {
    const config = PANEL_CONFIGS[mode];
    if (config) {
      if (callbacks.onInit) config.onInit = callbacks.onInit;
      if (callbacks.onShow) config.onShow = callbacks.onShow;
      if (callbacks.onHide) config.onHide = callbacks.onHide;
    }
  }

  /**
   * 保存面板状态
   */
  private savePanelState(_mode: EditorMode): void {
    // 子类可以覆盖此方法保存特定状态
    // 例如滚动位置、选中项等
  }

  /**
   * 恢复面板状态
   */
  private restorePanelState(_mode: EditorMode): void {
    // 子类可以覆盖此方法恢复特定状态
  }

  /**
   * 设置面板状态
   */
  setPanelState(mode: EditorMode, state: unknown): void {
    this.panelStates.set(mode, state);
  }

  /**
   * 获取面板状态
   */
  getPanelState<T>(mode: EditorMode): T | undefined {
    return this.panelStates.get(mode) as T | undefined;
  }

  /**
   * 检查面板是否已初始化
   */
  isPanelInitialized(mode: EditorMode): boolean {
    return this.initializedPanels.has(mode);
  }

  /**
   * 强制隐藏除目标外的所有其他面板
   * 防止因 CSS 或状态不同步导致的面板重叠
   * Enhanced with more thorough cleanup
   */
  private forceCleanupAllPanels(targetMode: EditorMode | null): void {
    Object.keys(PANEL_CONFIGS).forEach((key) => {
      const mode = key as EditorMode;
      // Skip target mode (it will be shown by animator), unless targetMode is null (hide all)
      if (targetMode !== null && mode === targetMode) return;

      const config = PANEL_CONFIGS[mode];
      // Try DOM cache first, then fallback to document query to ensure we find the element
      let el = DOM[config.elementId] as HTMLElement | null;
      if (!el) {
        el = document.getElementById(config.elementId as string);
      }

      if (el) {
        // Comprehensive hide: Class + Inline Style + Opacity + Display
        el.classList.add('hidden');
        el.style.display = 'none';
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
      }
    });
  }

  /**
   * 同步动画器状态与当前面板
   * 修复初始面板状态不同步的问题
   */
  private syncAnimatorWithCurrentPanel(): void {
    if (!this.animator.getCurrentPanel() && this.currentMode) {
      const currentConfig = PANEL_CONFIGS[this.currentMode];
      const currentEl = currentConfig ? DOM[currentConfig.elementId] : null;
      if (currentEl) {
        this.animator.forceSetCurrentPanel(currentEl as HTMLElement);
        logger.debug('Synced animator with current panel', { mode: this.currentMode }, 'PanelManager');
      }
    }
  }

  /**
   * 验证面板状态
   * 确保只有一个面板可见
   * Simplified validation logic for better reliability
   */
  validatePanelState(): boolean {
    let visiblePanels = 0;
    let currentPanelVisible = false;
    const visibleModes: EditorMode[] = [];

    Object.keys(PANEL_CONFIGS).forEach((key) => {
      const mode = key as EditorMode;
      const config = PANEL_CONFIGS[mode];
      const el = DOM[config.elementId] as HTMLElement | null;
      
      if (el) {
        // Simplified visibility check: element is visible if it doesn't have 'hidden' class AND display is not 'none'
        const hasHiddenClass = el.classList.contains('hidden');
        const hasDisplayNone = el.style.display === 'none';
        
        const isVisible = !hasHiddenClass && !hasDisplayNone;
        
        if (isVisible) {
          visiblePanels++;
          visibleModes.push(mode);
          if (mode === this.currentMode) {
            currentPanelVisible = true;
          }
        }
      }
    });

    // Valid states:
    // 1. Exactly 1 panel visible and it's the current mode
    // 2. No panels visible (empty state)
    const isValid = (visiblePanels === 1 && currentPanelVisible) || (visiblePanels === 0);
    
    if (!isValid) {
      logger.warn('Panel state validation failed', { 
        visiblePanels, 
        visibleModes,
        currentPanelVisible, 
        currentMode: this.currentMode
      }, 'PanelManager');
    }

    return isValid;
  }

  /**
   * 恢复到安全状态
   * 在面板切换失败时调用
   */
  private recoverToSafeState(): void {
    logger.info('Recovering to safe state', undefined, 'PanelManager');
    
    // 隐藏所有面板
    Object.keys(PANEL_CONFIGS).forEach((key) => {
      const mode = key as EditorMode;
      const config = PANEL_CONFIGS[mode];
      const el = DOM[config.elementId] as HTMLElement | null;
      if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
        el.style.opacity = '0';
      }
    });

    // 显示空状态
    setVisible(DOM.emptyStatePanel, true);
    
    // 重置动画器状态
    this.animator.forceSetCurrentPanel(null as any);
  }

  /**
   * 强制清理面板资源
   * 新增方法用于彻底清理面板
   */
  forceCleanupPanel(mode: EditorMode): void {
    const config = PANEL_CONFIGS[mode];
    if (!config) return;

    // 触发隐藏回调
    if (config.onHide) {
      try {
        config.onHide();
      } catch (error) {
        logger.error('Error in force cleanup callback', { mode, error }, 'PanelManager');
      }
    }

    // 清理DOM状态
    const el = DOM[config.elementId] as HTMLElement | null;
    if (el) {
      el.classList.add('hidden');
      el.style.display = 'none';
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.style.pointerEvents = 'none';
    }

    // 清理面板状态
    this.panelStates.delete(mode);
    this.initializedPanels.delete(mode);

    logger.debug('Force cleaned up panel', { mode }, 'PanelManager');
  }

  /**
   * 显示项目操作按钮
   */
  showProjectActions(show: boolean): void {
    setVisible(DOM.projectActions, show);
  }

  /**
   * 更新项目操作按钮可见性
   * 根据当前文件类型决定显示哪些按钮
   */
  updateProjectActionsVisibility(): void {
    const state = StateManager.getState();
    const fileType = state.currentFileType;

    // 任务和弹道模式显示项目操作按钮
    const showActions = fileType === 'quest' || fileType === 'projectile';
    this.showProjectActions(showActions);
  }

  /**
   * 清理
   * Enhanced with proper resource cleanup
   */
  clear(): void {
    // 清理所有面板
    Object.keys(PANEL_CONFIGS).forEach((key) => {
      const mode = key as EditorMode;
      this.forceCleanupPanel(mode);
    });

    this.initializedPanels.clear();
    this.panelStates.clear();
    this.currentMode = 'script';
    this.switchingLock = false;
    this.initialized = false;

    // 重置动画器
    this.animator.forceSetCurrentPanel(null as any);

    logger.info('PanelManager cleared', undefined, 'PanelManager');
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 检查是否正在切换
   */
  isSwitching(): boolean {
    return this.switchingLock;
  }

  /**
   * 应用主题到面板
   * Enhanced with sci-fi theme integration
   */
  applyThemeToPanel(panel: HTMLElement, mode: EditorMode): void {
    try {
      // Import theme system dynamically to avoid circular dependencies
      import('../theme/SciFiThemeSystem').then(({ sciFiThemeSystem }) => {
        // Apply theme variant based on panel mode
        const variant = this.getThemeVariantForMode(mode);
        sciFiThemeSystem.applyThemeToElement(panel, variant);
        
        // Add mode-specific effects
        if (mode === 'projectile') {
          sciFiThemeSystem.addGlowEffect(panel, '#00ff88'); // Green for projectile
        } else if (mode === 'quest') {
          sciFiThemeSystem.addGlowEffect(panel, '#7000ff'); // Purple for quest
        } else if (mode === 'script') {
          sciFiThemeSystem.addScanlineEffect(panel);
        }
        
        logger.debug('Applied sci-fi theme to panel', { mode, variant }, 'PanelManager');
      }).catch((error) => {
        logger.warn('Failed to apply theme to panel', { mode, error }, 'PanelManager');
      });
    } catch (error) {
      logger.error('Error applying theme to panel', { mode, error }, 'PanelManager');
    }
  }

  /**
   * Get theme variant for panel mode
   */
  private getThemeVariantForMode(mode: EditorMode): 'primary' | 'secondary' | 'accent' | 'warning' | 'success' | 'error' {
    switch (mode) {
      case 'script': return 'primary';
      case 'property': return 'secondary';
      case 'note': return 'accent';
      case 'projectile': return 'success';
      case 'quest': return 'warning';
      default: return 'primary';
    }
  }
}

// ============ 导出单例 ============

/** 全局面板管理器实例 */
export const PanelManager = new PanelManagerClass();

export default PanelManager;
