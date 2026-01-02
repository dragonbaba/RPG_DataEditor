/**
 * EditorManager - Monaco 编辑器管理器
 * 参考 oldCode/main.js 的 createMonacoEditor 和 initializeCodeEditor
 * 实现编辑器创建、值设置、模型切换
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import type * as monacoType from 'monaco-editor';
import { loadMonaco, registerCustomThemes, configureTypeScriptDefaults } from '../services/MonacoLoader';
import { monacoEnhancements } from '../services/MonacoEnhancements';
import { DOM } from './DOMManager';
import { EventSystem } from './EventSystem';
import { logger } from '../services/logger';
import { themeManager } from '../theme/ThemeManager';
import { visualEffects } from '../theme/effects/VisualEffects';

// ============ 类型定义 ============

/** 编辑器选项 */
export interface EditorOptions {
  language?: string;
  theme?: string;
  readOnly?: boolean;
  minimap?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative';
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  fontSize?: number;
  fontFamily?: string;
}

/** 模型缓存条目 */
interface ModelCacheEntry {
  model: monacoType.editor.ITextModel;
  viewState: monacoType.editor.ICodeEditorViewState | null;
  filePath: string;
}

// ============ 默认配置 ============

const DEFAULT_OPTIONS: monacoType.editor.IStandaloneEditorConstructionOptions = {
  value: '',
  language: 'javascript',
  theme: 'monokai-pro',
  automaticLayout: true, // 关键：自动布局
  minimap: { enabled: true }, // 恢复小地图
  scrollBeyondLastLine: false,
  fontSize: 15,
  fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
  fontLigatures: false,
  tabSize: 4,
  insertSpaces: true,
  lineNumbers: 'on',
  wordWrap: 'on',
  contextmenu: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  fixedOverflowWidgets: false, // 修复悬浮信息位置问题
  'semanticHighlighting.enabled': true,
  // 移除所有可能导致固定尺寸的配置
  // dimension: undefined, // 删除这个配置
  overviewRulerLanes: 3,
  renderLineHighlight: 'all',
  selectOnLineNumbers: true,
  roundedSelection: false,
  readOnly: false,
  cursorStyle: 'line',
  mouseWheelZoom: false,
  folding: true,
  foldingStrategy: 'auto',
  showFoldingControls: 'mouseover',
  disableLayerHinting: false,
  enableSplitViewResizing: false,
  renderWhitespace: 'selection',
};

// ============ EditorManager 类 ============

/**
 * 编辑器管理器 - 单例模式
 * 管理 Monaco 编辑器实例和模型
 */
class EditorManagerClass {
  /** Monaco 实例 */
  private monaco: typeof monacoType | null = null;
  
  /** 编辑器实例 */
  private editor: monacoType.editor.IStandaloneCodeEditor | null = null;
  
  /** 模型缓存 - 用于保存每个文件的编辑状态 */
  private modelCache: Map<string, ModelCacheEntry> = new Map();
  
  /** 当前模型键 */
  private currentModelKey: string = '';
  
  /** 是否已初始化 */
  private initialized = false;
  
  /** 是否禁用 */
  private disabled = false;
  
  /** 内容变更监听器 */
  private contentChangeDisposable: monacoType.IDisposable | null = null;

  /**
   * 初始化编辑器
   * @param container 编辑器容器元素
   * @param options 编辑器选项
   */
  async initialize(container: HTMLElement, options: EditorOptions = {}): Promise<void> {
    if (this.initialized) {
      logger.warn('EditorManager already initialized', undefined, 'EditorManager');
      return;
    }

    try {
      // Apply sci-fi theme to editor container
      themeManager.createFuturisticPanel(container, {
        variant: 'accent',
        scanlines: true,
        cornerAccents: true,
      });

      // Add scanning line effect to editor container
      visualEffects.createScanningLine(container, {
        color: 'rgba(0, 255, 136, 0.2)',
        speed: 6000,
        opacity: 0.1,
      });

      // 加载 Monaco
      this.monaco = await loadMonaco();
      
      // 注册主题
      registerCustomThemes(this.monaco);
      
      // 配置 TypeScript
      configureTypeScriptDefaults(this.monaco);
      
      // 合并选项 - 默认使用 sci-fi 主题
      const editorOptions: monacoType.editor.IStandaloneEditorConstructionOptions = {
        ...DEFAULT_OPTIONS,
        theme: 'sci-fi-dark', // Use sci-fi theme by default
        ...this.convertOptions(options),
      };
      
      // 创建编辑器
      this.editor = this.monaco.editor.create(container, editorOptions);
      this.ensureDefaultModel();
      
      // 强制设置容器样式，确保填充所有可用空间
      container.style.width = '100%';
      container.style.height = '100%';
      
      // 强制设置Monaco编辑器DOM节点样式
      const editorDomNode = this.editor.getDomNode();
      if (editorDomNode) {
        editorDomNode.style.width = '100%';
        editorDomNode.style.height = '100%';
      }
      
      // Apply sci-fi styling to Monaco editor elements
      this.applySciFireEditorStyling();
      
      // 绑定快捷键
      this.bindShortcuts();
      
      // 监听内容变化
      this.setupContentChangeListener();
      
      // 监听窗口大小变化，确保编辑器布局正确
      this.setupResizeListener();
      
      // 注册代码增强功能
      monacoEnhancements.registerAll();
      monacoEnhancements.registerCodeActions(this.editor);
      
      this.initialized = true;
      logger.info('EditorManager initialized with sci-fi theme', undefined, 'EditorManager');
      
      // 触发就绪事件
      EventSystem.emit('editor:ready');
    } catch (error) {
      logger.error('Failed to initialize EditorManager', { error }, 'EditorManager');
      throw error;
    }
  }

  /**
   * 转换选项格式
   */
  private convertOptions(options: EditorOptions): Partial<monacoType.editor.IStandaloneEditorConstructionOptions> {
    const result: Partial<monacoType.editor.IStandaloneEditorConstructionOptions> = {};
    
    if (options.language) result.language = options.language;
    if (options.theme) result.theme = options.theme;
    if (options.readOnly !== undefined) result.readOnly = options.readOnly;
    if (options.minimap !== undefined) result.minimap = { enabled: options.minimap };
    if (options.lineNumbers) result.lineNumbers = options.lineNumbers;
    if (options.wordWrap) result.wordWrap = options.wordWrap;
    if (options.fontSize) result.fontSize = options.fontSize;
    if (options.fontFamily) result.fontFamily = options.fontFamily;
    
    return result;
  }

  /**
   * 绑定快捷键
   */
  private bindShortcuts(): void {
    if (!this.editor || !this.monaco) return;
    
    const monaco = this.monaco;
    
    // Ctrl+S 保存
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      EventSystem.emit('editor:save');
    });
    
    // Ctrl+Delete 清空
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Delete, () => {
      EventSystem.emit('editor:clear');
    });
    
    // Ctrl+D 删除当前脚本
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      EventSystem.emit('editor:delete-script');
    });
    
    logger.debug('Editor shortcuts bound', undefined, 'EditorManager');
  }

  /**
   * Apply sci-fi styling to Monaco editor elements
   * Enhanced Monaco editor theme integration
   */
  private applySciFireEditorStyling(): void {
    if (!this.editor) return;

    const editorDomNode = this.editor.getDomNode();
    if (!editorDomNode) return;

    // Apply sci-fi effects to editor DOM node
    themeManager.applySciFiEffects(editorDomNode, {
      variant: 'accent',
      glow: true,
      scanlines: false,
    });

    // Add holographic flicker to editor on focus
    const textArea = editorDomNode.querySelector('textarea');
    if (textArea) {
      textArea.addEventListener('focus', () => {
        visualEffects.createHolographicFlicker(editorDomNode, {
          intensity: 0.02,
          frequency: 0.1,
          duration: 150,
        });
      });
    }

    // Apply glow to line numbers
    const lineNumbers = editorDomNode.querySelector('.margin');
    if (lineNumbers) {
      themeManager.applySciFiEffects(lineNumbers as HTMLElement, {
        variant: 'primary',
        glow: false,
        scanlines: true,
      });
    }

    // Apply effects to minimap
    const minimap = editorDomNode.querySelector('.minimap');
    if (minimap) {
      themeManager.applySciFiEffects(minimap as HTMLElement, {
        variant: 'secondary',
        glow: false,
        scanlines: false,
      });

      // Add scanning line to minimap
      visualEffects.createScanningLine(minimap as HTMLElement, {
        color: 'rgba(112, 0, 255, 0.2)',
        speed: 8000,
        opacity: 0.1,
      });
    }

    // Apply glow to scrollbars
    const scrollbars = editorDomNode.querySelectorAll('.scrollbar');
    scrollbars.forEach(scrollbar => {
      themeManager.applySciFiEffects(scrollbar as HTMLElement, {
        variant: 'accent',
        glow: false,
      });
    });

    logger.debug('Sci-fi styling applied to Monaco editor', undefined, 'EditorManager');
  }

  /**
   * 设置内容变更监听器
   */
  private setupContentChangeListener(): void {
    if (!this.editor) return;
    
    // 清理旧的监听器
    if (this.contentChangeDisposable) {
      this.contentChangeDisposable.dispose();
    }
    
    // 监听内容变化
    this.contentChangeDisposable = this.editor.onDidChangeModelContent(() => {
      this.updateStats();
      EventSystem.emit('editor:content-changed');
    });
  }

  /**
   * 设置窗口大小变化监听器
   */
  private setupResizeListener(): void {
    if (!this.editor) return;
    
    const handleResize = () => {
      if (this.editor && this.initialized) {
        // 立即布局刷新
        this.editor.layout();
        
        // 延迟布局刷新，确保DOM更新完成
        setTimeout(() => {
          if (this.editor) {
            this.editor.layout();
          }
        }, 50);
        
        // 再次延迟布局刷新，处理复杂的布局变化
        setTimeout(() => {
          if (this.editor) {
            this.editor.layout();
          }
        }, 200);
        
        // 最大化时需要额外的延迟刷新
        setTimeout(() => {
          if (this.editor) {
            this.editor.layout();
          }
        }, 500);
      }
    };
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
    
    // 专门监听窗口最大化/还原事件
    if (window.electronAPI) {
      // 监听窗口状态变化
      window.electronAPI.onWindowStateChanged?.((state: string) => {
        if (state === 'maximize' || state === 'unmaximize') {
          // 窗口最大化/还原时强制刷新布局
          setTimeout(() => {
            if (this.editor) {
              this.editor.layout();
            }
          }, 100);
          
          setTimeout(() => {
            if (this.editor) {
              this.editor.layout();
            }
          }, 300);
          
          setTimeout(() => {
            if (this.editor) {
              this.editor.layout();
            }
          }, 600);
        }
      });
    }
    
    // 监听容器大小变化（如果支持ResizeObserver）
    if (window.ResizeObserver && this.editor.getContainerDomNode()) {
      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(this.editor.getContainerDomNode()!);
      
      // 也监听父容器的变化
      const container = this.editor.getContainerDomNode()!.parentElement;
      if (container) {
        resizeObserver.observe(container);
      }
      
      // 监听主内容区域的变化
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        resizeObserver.observe(mainContent as Element);
      }
    }
    
    // 添加全局的强制刷新机制
    const forceRefresh = () => {
      if (this.editor && this.initialized) {
        this.editor.layout();
      }
    };
    
    // 监听面板显示事件
    EventSystem.on('panel:shown', () => {
      setTimeout(forceRefresh, 100);
      setTimeout(forceRefresh, 300);
    });
    
    // 监听编辑器就绪事件
    EventSystem.on('editor:ready', () => {
      setTimeout(forceRefresh, 100);
      setTimeout(forceRefresh, 300);
    });
  }

  /**
   * 获取编辑器实例
   */
  getEditor(): monacoType.editor.IStandaloneCodeEditor | null {
    return this.editor;
  }

  /**
   * 获取 Monaco 实例
   */
  getMonaco(): typeof monacoType | null {
    return this.monaco;
  }

  /**
   * 设置编辑器内容
   */
  setValue(content: string): void {
    if (!this.editor) return;
    
    const model = this.editor.getModel();
    if (model) {
      model.setValue(content);
    }
  }

  /**
   * 获取编辑器内容
   */
  getValue(): string {
    if (!this.editor) return '';
    return this.editor.getValue();
  }

  /**
   * 设置或切换模型
   * 保存当前模型的视图状态，加载新模型
   * @param content 内容
   * @param filePath 文件路径（用作模型键）
   * @param language 语言
   */
  setModel(content: string, filePath: string, language = 'javascript'): void {
    if (!this.editor || !this.monaco) return;
    
    // 保存当前模型的视图状态
    if (this.currentModelKey) {
      const currentEntry = this.modelCache.get(this.currentModelKey);
      if (currentEntry) {
        currentEntry.viewState = this.editor.saveViewState();
      }
    }
    
    // 检查是否已有缓存的模型
    let entry = this.modelCache.get(filePath);
    
    if (entry) {
      // 使用缓存的模型
      this.editor.setModel(entry.model);
      
      // 恢复视图状态
      if (entry.viewState) {
        this.editor.restoreViewState(entry.viewState);
      }
      
      // 更新内容（如果不同）
      if (entry.model.getValue() !== content) {
        entry.model.setValue(content);
      }
    } else {
      // 创建新模型
      const uri = this.monaco.Uri.file(filePath);
      const model = this.monaco.editor.createModel(content, language, uri);
      
      entry = {
        model,
        viewState: null,
        filePath,
      };
      
      this.modelCache.set(filePath, entry);
      this.editor.setModel(model);
    }
    
    this.currentModelKey = filePath;
    this.updateStats();
    
    logger.debug('Model set', { filePath }, 'EditorManager');
  }

  /**
   * 更新编辑器选项
   */
  updateOptions(options: monacoType.editor.IEditorOptions): void {
    if (!this.editor) return;
    this.editor.updateOptions(options);
  }

  /**
   * 设置禁用状态
   */
  setDisabled(disabled: boolean): void {
    if (!this.editor) return;
    
    this.disabled = disabled;
    this.editor.updateOptions({ readOnly: disabled });
    
    // 更新容器样式
    const container = this.editor.getContainerDomNode();
    if (container) {
      container.classList.toggle('disabled', disabled);
      container.style.opacity = disabled ? '0.5' : '1';
    }
  }

  /**
   * 检查是否禁用
   */
  isDisabled(): boolean {
    return this.disabled;
  }

  /**
   * 更新状态栏统计信息
   */
  updateStats(): void {
    if (!this.editor) return;
    
    const model = this.editor.getModel();
    if (!model) return;
    
    const content = model.getValue();
    const lines = model.getLineCount();
    const chars = content.length;
    
    // 更新 DOM
    if (DOM.characterCount) {
      DOM.characterCount.textContent = String(chars);
    }
    if (DOM.lineCount) {
      DOM.lineCount.textContent = String(lines);
    }
  }

  private ensureDefaultModel(): void {
    if (!this.editor || !this.monaco) return;

    const model = this.editor.getModel();
    const uriPath = model?.uri?.path || '';
    const hasExtension = uriPath.endsWith('.js') || uriPath.endsWith('.ts');
    if (model && hasExtension) return;

    if (model) {
      model.dispose();
    }

    const uri = this.monaco.Uri.parse('inmemory://model/main.js');
    const defaultModel = this.monaco.editor.createModel('', 'javascript', uri);
    this.editor.setModel(defaultModel);
  }

  /**
   * 更新错误标记
   * @param markers 错误标记数组
   */
  updateErrorMarkers(markers: Array<{ message: string; severity: 'error' | 'warning' | 'info'; startLine: number; startColumn: number; endLine: number; endColumn: number }>): void {
    if (!this.editor) return;
    monacoEnhancements.updateMarkers(this.editor, markers);
  }

  /**
   * 清除所有错误标记
   */
  clearErrorMarkers(): void {
    if (!this.editor) return;
    monacoEnhancements.clearMarkers(this.editor);
  }

  /**
   * 聚焦编辑器
   */
  focus(): void {
    if (this.editor) {
      this.editor.focus();
    }
  }

  /**
   * 清除模型缓存
   */
  clearModelCache(): void {
    for (const entry of this.modelCache.values()) {
      entry.model.dispose();
    }
    this.modelCache.clear();
    this.currentModelKey = '';
    
    logger.debug('Model cache cleared', undefined, 'EditorManager');
  }

  /**
   * 移除特定模型
   */
  removeModel(filePath: string): void {
    const entry = this.modelCache.get(filePath);
    if (entry) {
      entry.model.dispose();
      this.modelCache.delete(filePath);
      
      if (this.currentModelKey === filePath) {
        this.currentModelKey = '';
      }
    }
  }

  /**
   * 设置主题
   */
  setTheme(theme: string): void {
    if (!this.monaco) return;
    this.monaco.editor.setTheme(theme);
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 强制刷新编辑器布局（用于处理窗口最大化等特殊情况）
   */
  forceLayout(): void {
    if (!this.editor || !this.initialized) return;
    
    // 强制设置容器和编辑器的宽度
    const container = this.editor.getContainerDomNode();
    const editorDomNode = this.editor.getDomNode();
    
    if (container) {
      container.style.width = '100%';
      container.style.height = '100%';
    }
    
    if (editorDomNode) {
      editorDomNode.style.width = '100%';
      editorDomNode.style.height = '100%';
    }
    
    // 连续多次刷新，确保在各种情况下都能正确布局
    const refreshTimes = [0, 50, 100, 200, 300, 500, 800, 1000];
    
    refreshTimes.forEach(delay => {
      setTimeout(() => {
        if (this.editor && this.initialized) {
          this.editor.layout();
        }
      }, delay);
    });
  }

  /**
   * 布局更新（手动触发）
   */
  layout(): void {
    if (this.editor) {
      // Force Monaco editor to recalculate its dimensions
      this.editor.layout();
      
      // Additional layout refresh after a short delay to ensure proper sizing
      setTimeout(() => {
        if (this.editor) {
          this.editor.layout();
        }
      }, 100);
    }
  }

  /**
   * 销毁编辑器
   */
  dispose(): void {
    // 清理内容变更监听器
    if (this.contentChangeDisposable) {
      this.contentChangeDisposable.dispose();
      this.contentChangeDisposable = null;
    }
    
    // 清理模型缓存
    this.clearModelCache();
    
    // 销毁编辑器
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
    
    this.monaco = null;
    this.initialized = false;
    this.disabled = false;
    
    logger.info('EditorManager disposed', undefined, 'EditorManager');
  }
}

// ============ 导出单例 ============

/** 全局编辑器管理器实例 */
export const EditorManager = new EditorManagerClass();

export default EditorManager;
