/**
 * Monaco Instance Manager - Monaco编辑器实例管理器
 * Requirements: 3.1, 3.2, 3.3
 * 
 * 单例模式管理Monaco Editor实例，避免重复创建和内存泄漏
 * - 复用编辑器实例而不是每次切换都创建新实例
 * - 正确销毁不再使用的实例
 * - 清理所有Monaco相关的订阅和监听器
 */

import * as monaco from 'monaco-editor';
import { logger } from './logger';

const log = logger.createChild('MonacoInstanceManager');

/**
 * Monaco编辑器配置选项
 */
export interface MonacoEditorOptions {
  language?: string;
  theme?: string;
  readOnly?: boolean;
  lineNumbers?: monaco.editor.LineNumbersType;
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap?: boolean;
  fontSize?: number;
  tabSize?: number;
  formatOnPaste?: boolean;
  formatOnType?: boolean;
  scrollBeyondLastLine?: boolean;
  automaticLayout?: boolean;
}

/**
 * 默认编辑器配置
 * 🔥 注意：automaticLayout 设置为 false，避免 ResizeObserver 导致的无限布局循环
 * 布局更新由组件通过 ResizeObserver + debounce 手动控制
 */
const DEFAULT_OPTIONS: MonacoEditorOptions = {
  language: 'javascript',
  theme: 'vs-dark',
  readOnly: false,
  lineNumbers: 'on',
  wordWrap: 'on',
  minimap: true,
  fontSize: 14,
  tabSize: 2,
  formatOnPaste: true,
  formatOnType: false,
  scrollBeyondLastLine: false,
  automaticLayout: false, // 🔥 禁用自动布局，避免无限循环
};

/**
 * 订阅管理器 - 管理编辑器的所有订阅
 */
interface SubscriptionManager {
  subscriptions: monaco.IDisposable[];
  add(subscription: monaco.IDisposable): void;
  disposeAll(): void;
}

function createSubscriptionManager(): SubscriptionManager {
  const subscriptions: monaco.IDisposable[] = [];
  
  return {
    subscriptions,
    add(subscription: monaco.IDisposable) {
      subscriptions.push(subscription);
    },
    disposeAll() {
      for (let i = subscriptions.length - 1; i >= 0; i--) {
        try {
          subscriptions[i].dispose();
        } catch (e) {
          log.warn('Failed to dispose subscription', e);
        }
      }
      subscriptions.length = 0;
    }
  };
}

/**
 * Monaco实例管理器 - 单例模式
 */
class MonacoInstanceManagerImpl {
  private static _instance: MonacoInstanceManagerImpl | null = null;
  
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private container: HTMLElement | null = null;
  private subscriptionManager: SubscriptionManager = createSubscriptionManager();
  private isDisposed = false;
  private currentOptions: MonacoEditorOptions = { ...DEFAULT_OPTIONS };
  
  private constructor() {
    log.debug('MonacoInstanceManager created');
  }
  
  /**
   * 获取单例实例
   */
  static getInstance(): MonacoInstanceManagerImpl {
    if (!MonacoInstanceManagerImpl._instance) {
      MonacoInstanceManagerImpl._instance = new MonacoInstanceManagerImpl();
    }
    return MonacoInstanceManagerImpl._instance;
  }
  
  /**
   * 重置单例（仅用于测试）
   */
  static resetInstance(): void {
    if (MonacoInstanceManagerImpl._instance) {
      MonacoInstanceManagerImpl._instance.dispose();
      MonacoInstanceManagerImpl._instance = null;
    }
  }
  
  /**
   * 获取当前编辑器实例
   */
  getEditor(): monaco.editor.IStandaloneCodeEditor | null {
    return this.editor;
  }
  
  /**
   * 检查是否已有编辑器实例
   */
  hasInstance(): boolean {
    return this.editor !== null && !this.isDisposed;
  }
  
  /**
   * 创建或复用编辑器实例
   */
  createOrReuse(
    container: HTMLElement,
    options?: Partial<MonacoEditorOptions>
  ): monaco.editor.IStandaloneCodeEditor {
    // 如果容器相同且编辑器存在，直接复用
    if (this.editor && this.container === container && !this.isDisposed) {
      log.debug('Reusing existing Monaco editor instance');
      if (options) {
        this.updateOptions(options);
      }
      return this.editor;
    }
    
    // 如果容器不同，需要先销毁旧实例
    if (this.editor && this.container !== container) {
      log.debug('Container changed, disposing old instance');
      this.disposeEditor();
    }
    
    // 创建新实例
    return this.createEditor(container, options);
  }
  
  /**
   * 创建新的编辑器实例
   */
  private createEditor(
    container: HTMLElement,
    options?: Partial<MonacoEditorOptions>
  ): monaco.editor.IStandaloneCodeEditor {
    this.isDisposed = false;
    this.container = container;
    this.currentOptions = { ...DEFAULT_OPTIONS, ...options };
    
    log.debug('Creating new Monaco editor instance');
    
    const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
      value: '',
      language: this.currentOptions.language,
      theme: this.currentOptions.theme,
      readOnly: this.currentOptions.readOnly,
      lineNumbers: this.currentOptions.lineNumbers,
      wordWrap: this.currentOptions.wordWrap,
      minimap: { enabled: this.currentOptions.minimap ?? true },
      fontSize: this.currentOptions.fontSize,
      tabSize: this.currentOptions.tabSize,
      formatOnPaste: this.currentOptions.formatOnPaste,
      formatOnType: this.currentOptions.formatOnType,
      scrollBeyondLastLine: this.currentOptions.scrollBeyondLastLine,
      automaticLayout: this.currentOptions.automaticLayout,
      // 额外的默认选项
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      renderLineHighlight: 'all',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      padding: { top: 8, bottom: 8 },
    };
    
    this.editor = monaco.editor.create(container, editorOptions);
    
    log.info('Monaco editor instance created');
    
    return this.editor;
  }
  
  /**
   * 更新编辑器选项
   */
  updateOptions(options: Partial<MonacoEditorOptions>): void {
    if (!this.editor || this.isDisposed) {
      log.warn('Cannot update options: no editor instance');
      return;
    }
    
    this.currentOptions = { ...this.currentOptions, ...options };
    
    this.editor.updateOptions({
      readOnly: options.readOnly,
      lineNumbers: options.lineNumbers,
      wordWrap: options.wordWrap,
      minimap: options.minimap !== undefined ? { enabled: options.minimap } : undefined,
      fontSize: options.fontSize,
      tabSize: options.tabSize,
      formatOnPaste: options.formatOnPaste,
      formatOnType: options.formatOnType,
      scrollBeyondLastLine: options.scrollBeyondLastLine,
    });
    
    // 更新语言
    if (options.language) {
      const model = this.editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, options.language);
      }
    }
    
    // 更新主题
    if (options.theme) {
      monaco.editor.setTheme(options.theme);
    }
  }
  
  /**
   * 设置编辑器值（复用实例，不重新创建）
   */
  setValue(value: string): void {
    if (!this.editor || this.isDisposed) {
      log.warn('Cannot set value: no editor instance');
      return;
    }
    
    const currentValue = this.editor.getValue();
    if (currentValue !== value) {
      this.editor.setValue(value);
    }
  }
  
  /**
   * 获取编辑器值
   */
  getValue(): string {
    if (!this.editor || this.isDisposed) {
      return '';
    }
    return this.editor.getValue();
  }
  
  /**
   * 添加内容变化监听器
   * 🔥 注意：返回的 IDisposable 由调用方管理，不会添加到内部 subscriptionManager
   * 这避免了组件卸载时的重复清理问题
   */
  onDidChangeContent(callback: (value: string) => void): monaco.IDisposable {
    if (!this.editor || this.isDisposed) {
      log.warn('Cannot add listener: no editor instance');
      return { dispose: () => {} };
    }
    
    const subscription = this.editor.onDidChangeModelContent(() => {
      const value = this.editor?.getValue() ?? '';
      callback(value);
    });
    
    // 🔥 不再添加到 subscriptionManager，由调用方管理
    // this.subscriptionManager.add(subscription);
    return subscription;
  }
  
  /**
   * 添加验证监听器
   * 🔥 注意：返回的 IDisposable 由调用方管理，不会添加到内部 subscriptionManager
   * 这避免了组件卸载时的重复清理问题
   */
  onDidChangeMarkers(callback: (markers: monaco.editor.IMarker[]) => void): monaco.IDisposable {
    if (!this.editor || this.isDisposed) {
      log.warn('Cannot add marker listener: no editor instance');
      return { dispose: () => {} };
    }
    
    const model = this.editor.getModel();
    if (!model) {
      return { dispose: () => {} };
    }
    
    const subscription = monaco.editor.onDidChangeMarkers((uris) => {
      const modelUri = model.uri;
      if (uris.some(uri => uri.toString() === modelUri.toString())) {
        const markers = monaco.editor.getModelMarkers({ resource: modelUri });
        callback(markers);
      }
    });
    
    // 🔥 不再添加到 subscriptionManager，由调用方管理
    // this.subscriptionManager.add(subscription);
    return subscription;
  }
  
  /**
   * 清理所有订阅
   */
  clearSubscriptions(): void {
    log.debug('Clearing all subscriptions');
    this.subscriptionManager.disposeAll();
  }
  
  /**
   * 销毁编辑器实例
   */
  private disposeEditor(): void {
    if (this.editor) {
      log.debug('Disposing Monaco editor instance');
      
      // 先清理订阅
      this.clearSubscriptions();
      
      // 销毁编辑器
      try {
        this.editor.dispose();
      } catch (e) {
        log.warn('Error disposing editor', e);
      }
      
      this.editor = null;
      this.container = null;
    }
  }
  
  /**
   * 完全销毁管理器（释放所有资源）
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    
    log.info('Disposing MonacoInstanceManager');
    
    this.disposeEditor();
    this.isDisposed = true;
  }
  
  /**
   * 获取当前配置
   */
  getOptions(): MonacoEditorOptions {
    return { ...this.currentOptions };
  }
  
  /**
   * 聚焦编辑器
   */
  focus(): void {
    if (this.editor && !this.isDisposed) {
      this.editor.focus();
    }
  }
  
  /**
   * 布局更新（当容器大小变化时调用）
   */
  layout(): void {
    if (this.editor && !this.isDisposed) {
      this.editor.layout();
    }
  }
}

// 导出单例获取函数
export const monacoInstanceManager = MonacoInstanceManagerImpl.getInstance();

// 导出类型和重置函数（用于测试）
export { MonacoInstanceManagerImpl };
export const resetMonacoInstanceManager = MonacoInstanceManagerImpl.resetInstance.bind(MonacoInstanceManagerImpl);
