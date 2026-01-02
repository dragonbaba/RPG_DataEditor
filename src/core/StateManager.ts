/**
 * StateManager - 应用状态管理器
 * 参考 oldCode/main.js 的 AppState 类
 * 实现状态存储、订阅、通知机制
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import type { EditorMode, RPGItem, RPGQuest, ProjectileTemplate, EditorConfig } from '../types';

const PATH_SEP_REGEX = /[\\/]/;

// ============ 类型定义 ============

/** 数据项类型 - 可以是普通项目、任务或弹道模板 */
export type DataItem = RPGItem | RPGQuest | ProjectileTemplate | null;

/** 文件类型 */
export type FileType = 'data' | 'quest' | 'projectile';

/** 应用状态接口 */
export interface AppState {
  // 文件相关
  currentData: DataItem[] | null;
  currentFile: string;
  currentFilePath: string;
  currentFileType: FileType;

  // 项目相关
  currentItemIndex: number;
  currentItem: DataItem | null;

  // 脚本相关
  currentScriptKey: string;

  // 配置
  config: EditorConfig;
  configDirty: boolean;

  // UI 模式
  uiMode: EditorMode;

  // 工作区
  workspaceRoot: string;

  // 弹道相关
  projectileTemplates: ProjectileTemplate[];
  projectileFilePath: string;
  projectileSelectedTemplateIndex: number;
  projectileDataPaths: Record<string, string>;
  projectileCustomFiles: Record<string, { path: string; label: string }>;

  // 任务相关
  quests: RPGQuest[];
  currentQuestIndex: number;
  questFilePath: string;
  questDataPaths: Record<string, string>;
  questSystem: {
    switches: Array<{ id: number; name: string }>;
    variables: Array<{ id: number; name: string }>;
    items: DataItem[];
    weapons: DataItem[];
    armors: DataItem[];
    enemies: DataItem[];
    actors: DataItem[];
  };
}

/** 状态监听器类型 */
export type StateListener = (state: AppState, changedKeys: (keyof AppState)[]) => void;

/** 状态变更部分类型 */
export type PartialState = Partial<AppState>;

// ============ 默认配置 ============

const DEFAULT_CONFIG: EditorConfig = {
  dataPath: '',
  scriptSavePath: '',
  workspaceRoot: '',
  recentFiles: [],
  theme: 'dark',
  accentColor: 'cyan',
  animationsEnabled: true,
  themePreset: 'cyberpunk',
  fontSize: 'medium',
  compactMode: false,
  updateCheckFrequency: 'startup',
};

const DEFAULT_STATE: AppState = {
  currentData: null,
  currentFile: '',
  currentFilePath: '',
  currentFileType: 'data',
  currentItemIndex: 0,
  currentItem: null,
  currentScriptKey: '',
  config: { ...DEFAULT_CONFIG },
  configDirty: false,
  uiMode: 'script',
  workspaceRoot: '',
  projectileTemplates: [],
  projectileFilePath: '',
  projectileSelectedTemplateIndex: 1,
  projectileDataPaths: {},
  projectileCustomFiles: {},
  quests: [],
  currentQuestIndex: -1,
  questFilePath: '',
  questDataPaths: {},
  questSystem: {
    switches: [],
    variables: [],
    items: [],
    weapons: [],
    armors: [],
    enemies: [],
    actors: [],
  },
};

// ============ 本地存储键 ============

// Reserved for future state persistence
// const STORAGE_KEY = 'rpg-editor-state';
const CONFIG_STORAGE_KEY = 'rpg-editor-config';

// ============ StateManager 类 ============

/**
 * 状态管理器 - 单例模式
 * 管理应用全局状态，支持订阅和持久化
 */
class StateManagerClass {
  /** 当前状态 */
  private state: AppState;

  /** 订阅者列表 - 使用数组而非 Set，避免迭代器分配 */
  private listeners: StateListener[] = [];
  private listenerCount = 0;

  /** 变更键缓存 - 复用数组避免每次通知时创建新数组 */
  private changedKeysCache: (keyof AppState)[] = [];

  /** 是否正在批量更新 */
  private isBatching = false;

  /** 批量更新期间的变更键 */
  private batchChangedKeys: Set<keyof AppState> = new Set();

  constructor() {
    this.state = this.loadPersistedState();
  }

  /**
   * 从本地存储加载持久化状态
   */
  private loadPersistedState(): AppState {
    try {
      const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
      const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG;

      return {
        ...DEFAULT_STATE,
        config: { ...DEFAULT_CONFIG, ...config },
      };
    } catch (error) {
      console.warn('[StateManager] Failed to load persisted state:', error);
      return { ...DEFAULT_STATE };
    }
  }

  /**
   * 持久化配置到本地存储
   */
  private persistConfig(): void {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.state.config));
    } catch (error) {
      console.warn('[StateManager] Failed to persist config:', error);
    }
  }

  /**
   * 获取当前状态（只读）
   */
  getState(): Readonly<AppState> {
    return this.state;
  }

  /**
   * 获取特定状态值
   */
  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.state[key];
  }

  /**
   * 更新状态
   * @param partial 部分状态更新
   */
  setState(partial: PartialState): void {
    // 收集变更的键
    const changedKeys = this.changedKeysCache;
    changedKeys.length = 0;

    const keys = Object.keys(partial) as (keyof AppState)[];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const newValue = partial[key];
      if (this.state[key] !== newValue) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.state as any)[key] = newValue;
        changedKeys.push(key);
      }
    }

    // 如果没有实际变更，不通知
    if (changedKeys.length === 0) return;

    // 如果正在批量更新，收集变更键
    if (this.isBatching) {
      for (let i = 0; i < changedKeys.length; i++) {
        this.batchChangedKeys.add(changedKeys[i]);
      }
      return;
    }

    // 如果配置变更，持久化
    if (changedKeys.includes('config')) {
      this.persistConfig();
    }

    // 通知订阅者
    this.notifyListeners(changedKeys);
  }

  /**
   * 批量更新状态
   * @param updater 更新函数
   */
  batch(updater: () => void): void {
    this.isBatching = true;
    this.batchChangedKeys.clear();

    try {
      updater();
    } finally {
      this.isBatching = false;

      if (this.batchChangedKeys.size > 0) {
        const changedKeys = Array.from(this.batchChangedKeys);

        // 如果配置变更，持久化
        if (this.batchChangedKeys.has('config')) {
          this.persistConfig();
        }

        this.notifyListeners(changedKeys);
        this.batchChangedKeys.clear();
      }
    }
  }

  /**
   * 订阅状态变更
   * @param listener 监听器函数
   * @returns 取消订阅函数
   */
  subscribe(listener: StateListener): () => void {
    this.listeners[this.listenerCount++] = listener;

    // 返回取消订阅函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
        this.listenerCount--;
      }
    };
  }

  /**
   * 通知所有订阅者
   */
  private notifyListeners(changedKeys: (keyof AppState)[]): void {
    const count = this.listenerCount;
    const listeners = this.listeners;
    const state = this.state;

    for (let i = 0; i < count; i++) {
      const listener = listeners[i];
      if (listener) {
        try {
          listener(state, changedKeys);
        } catch (error) {
          console.error('[StateManager] Listener error:', error);
        }
      }
    }
  }

  /**
   * 重置数据状态
   */
  resetData(): void {
    this.setState({
      currentData: null,
      currentFile: '',
      currentFilePath: '',
      currentFileType: 'data',
      currentItemIndex: 0,
      currentItem: null,
      currentScriptKey: '',
    });
  }

  /**
   * 重置脚本状态
   */
  resetScript(): void {
    this.setState({
      currentScriptKey: '',
    });
  }

  /**
   * 设置 UI 模式
   */
  setMode(mode: EditorMode): void {
    if (this.state.uiMode !== mode) {
      this.setState({ uiMode: mode });
    }
  }

  /**
   * 更新配置
   */
  updateConfig(partial: Partial<EditorConfig>): void {
    const newConfig = { ...this.state.config, ...partial };
    this.setState({
      config: newConfig,
      configDirty: true,
    });
  }

  /**
   * 标记配置已保存
   */
  markConfigSaved(): void {
    this.setState({ configDirty: false });
  }

  /**
   * 选择项目
   */
  selectItem(index: number): void {
    const data = this.state.currentData;
    if (!data || index < 0 || index >= data.length) {
      return;
    }

    this.setState({
      currentItemIndex: index,
      currentItem: data[index],
      currentScriptKey: '',
    });
  }

  /**
   * 选择脚本
   */
  selectScript(key: string): void {
    this.setState({ currentScriptKey: key });
  }

  /**
   * 加载数据文件
   */
  loadData(data: DataItem[], filePath: string, fileType: FileType = 'data'): void {
    const fileName = filePath.split(PATH_SEP_REGEX).pop() || '';
    const nextQuestList = fileType === 'quest' ? (data as RPGQuest[]) : this.state.quests;
    const nextProjectileTemplates = fileType === 'projectile' ? (data as ProjectileTemplate[]) : this.state.projectileTemplates;

    this.batch(() => {
      this.setState({
        currentData: data,
        currentFile: fileName,
        currentFilePath: filePath,
        currentFileType: fileType,
        currentItemIndex: 0,
        currentItem: data.length > 1 ? data[1] : null,
        currentScriptKey: '',
        quests: nextQuestList,
        projectileTemplates: nextProjectileTemplates,
      });
    });
  }

  /**
   * 清理所有状态
   */
  clear(): void {
    this.listeners.length = 0;
    this.listenerCount = 0;
    this.state = { ...DEFAULT_STATE };
  }
}

// ============ 导出单例 ============

/** 全局状态管理器实例 */
export const StateManager = new StateManagerClass();

export default StateManager;
