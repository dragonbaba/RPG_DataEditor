/**
 * IPC Listener Manager - IPC事件监听器管理器
 * Requirements: 4.1, 4.2, 4.4
 * 
 * 防止重复注册IPC监听器，提供批量清理功能
 * - 维护已注册监听器的缓存，避免重复注册
 * - 组件卸载时移除所有注册的监听器
 * - 页面刷新时清理所有旧的监听器后再注册新的
 */

import type { IPCEventChannels } from '../types/ipc';
import { logger } from './logger';

const log = logger.createChild('IPCListenerManager');

/**
 * 监听器信息
 */
interface ListenerInfo<K extends keyof IPCEventChannels = keyof IPCEventChannels> {
  channel: K;
  callback: (data: IPCEventChannels[K]) => void;
  registeredAt: number;
  source?: string;
}

/**
 * IPC监听器管理器 - 单例模式
 */
class IPCListenerManagerImpl {
  private static _instance: IPCListenerManagerImpl | null = null;
  
  // 使用Map存储每个channel的监听器信息
  private listeners: Map<keyof IPCEventChannels, ListenerInfo> = new Map();
  
  // 按来源分组的监听器，便于批量清理
  private listenersBySource: Map<string, Set<keyof IPCEventChannels>> = new Map();
  
  private isDisposed = false;
  
  private constructor() {
    log.debug('IPCListenerManager created');
  }
  
  /**
   * 获取单例实例
   */
  static getInstance(): IPCListenerManagerImpl {
    if (!IPCListenerManagerImpl._instance) {
      IPCListenerManagerImpl._instance = new IPCListenerManagerImpl();
    }
    return IPCListenerManagerImpl._instance;
  }
  
  /**
   * 重置单例（仅用于测试）
   */
  static resetInstance(): void {
    if (IPCListenerManagerImpl._instance) {
      IPCListenerManagerImpl._instance.dispose();
      IPCListenerManagerImpl._instance = null;
    }
  }
  
  /**
   * 检查监听器是否已注册
   */
  hasListener<K extends keyof IPCEventChannels>(channel: K): boolean {
    return this.listeners.has(channel);
  }
  
  /**
   * 注册IPC事件监听器
   * 如果已存在相同channel的监听器，会跳过注册并记录日志
   * 
   * @param channel - IPC事件通道
   * @param callback - 回调函数
   * @param source - 来源标识（用于批量清理）
   * @returns 是否成功注册（false表示已存在）
   */
  register<K extends keyof IPCEventChannels>(
    channel: K,
    callback: (data: IPCEventChannels[K]) => void,
    source?: string
  ): boolean {
    if (this.isDisposed) {
      log.warn(`Cannot register listener: manager is disposed`, { channel });
      return false;
    }
    
    // 检查是否已注册
    if (this.listeners.has(channel)) {
      const existing = this.listeners.get(channel);
      log.debug(`Listener already registered for channel, skipping`, {
        channel,
        existingSource: existing?.source,
        newSource: source,
      });
      return false;
    }
    
    // 检查IPC是否可用
    if (typeof window === 'undefined' || !window.ipcOn) {
      log.warn(`IPC not available, cannot register listener`, { channel });
      return false;
    }
    
    // 注册监听器
    const listenerInfo: ListenerInfo = {
      channel,
      callback: callback as (data: IPCEventChannels[keyof IPCEventChannels]) => void,
      registeredAt: Date.now(),
      source,
    };
    
    this.listeners.set(channel, listenerInfo);
    
    // 按来源分组
    if (source) {
      if (!this.listenersBySource.has(source)) {
        this.listenersBySource.set(source, new Set());
      }
      this.listenersBySource.get(source)!.add(channel);
    }
    
    // 实际注册到IPC
    window.ipcOn(channel, callback as (data: unknown) => void);
    
    log.debug(`Listener registered`, { channel, source });
    return true;
  }
  
  /**
   * 移除指定channel的监听器
   */
  unregister<K extends keyof IPCEventChannels>(channel: K): boolean {
    const listenerInfo = this.listeners.get(channel);
    if (!listenerInfo) {
      log.debug(`No listener found for channel`, { channel });
      return false;
    }
    
    // 从IPC移除
    if (typeof window !== 'undefined' && window.ipcOff) {
      try {
        window.ipcOff(channel);
      } catch (e) {
        log.warn(`Error removing IPC listener`, { channel, error: e });
      }
    }
    
    // 从来源分组中移除
    if (listenerInfo.source) {
      const sourceSet = this.listenersBySource.get(listenerInfo.source);
      if (sourceSet) {
        sourceSet.delete(channel);
        if (sourceSet.size === 0) {
          this.listenersBySource.delete(listenerInfo.source);
        }
      }
    }
    
    // 从主Map中移除
    this.listeners.delete(channel);
    
    log.debug(`Listener unregistered`, { channel, source: listenerInfo.source });
    return true;
  }
  
  /**
   * 移除指定来源的所有监听器
   */
  unregisterBySource(source: string): number {
    const channels = this.listenersBySource.get(source);
    if (!channels || channels.size === 0) {
      log.debug(`No listeners found for source`, { source });
      return 0;
    }
    
    let count = 0;
    const channelsToRemove = [...channels]; // 复制以避免迭代时修改
    
    for (const channel of channelsToRemove) {
      if (this.unregister(channel)) {
        count++;
      }
    }
    
    log.info(`Unregistered listeners by source`, { source, count });
    return count;
  }
  
  /**
   * 清理所有监听器
   */
  clearAll(): number {
    const count = this.listeners.size;
    
    if (count === 0) {
      return 0;
    }
    
    log.info(`Clearing all listeners`, { count });
    
    // 获取所有channel并移除
    const channels = [...this.listeners.keys()];
    for (const channel of channels) {
      this.unregister(channel);
    }
    
    // 清空分组
    this.listenersBySource.clear();
    
    return count;
  }
  
  /**
   * 获取已注册的监听器数量
   */
  getListenerCount(): number {
    return this.listeners.size;
  }
  
  /**
   * 获取指定来源的监听器数量
   */
  getListenerCountBySource(source: string): number {
    return this.listenersBySource.get(source)?.size ?? 0;
  }
  
  /**
   * 获取所有已注册的channel列表
   */
  getRegisteredChannels(): (keyof IPCEventChannels)[] {
    return [...this.listeners.keys()];
  }
  
  /**
   * 获取监听器信息（用于调试）
   */
  getListenerInfo<K extends keyof IPCEventChannels>(channel: K): ListenerInfo<K> | undefined {
    return this.listeners.get(channel) as ListenerInfo<K> | undefined;
  }
  
  /**
   * 获取所有来源列表
   */
  getSources(): string[] {
    return [...this.listenersBySource.keys()];
  }
  
  /**
   * 替换监听器（先移除旧的，再注册新的）
   * 用于需要更新回调函数的场景
   */
  replace<K extends keyof IPCEventChannels>(
    channel: K,
    callback: (data: IPCEventChannels[K]) => void,
    source?: string
  ): boolean {
    // 先移除旧的
    this.unregister(channel);
    // 注册新的
    return this.register(channel, callback, source);
  }
  
  /**
   * 销毁管理器（释放所有资源）
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    
    log.info('Disposing IPCListenerManager');
    
    this.clearAll();
    this.isDisposed = true;
  }
  
  /**
   * 检查管理器是否已销毁
   */
  isManagerDisposed(): boolean {
    return this.isDisposed;
  }
}

// 导出单例获取函数
export const ipcListenerManager = IPCListenerManagerImpl.getInstance();

// 导出类型和重置函数（用于测试）
export { IPCListenerManagerImpl };
export const resetIPCListenerManager = IPCListenerManagerImpl.resetInstance.bind(IPCListenerManagerImpl);
