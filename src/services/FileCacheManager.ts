/**
 * FileCacheManager - 文件缓存管理器
 * 使用 LRU (Least Recently Used) 算法管理文件缓存
 * 参考 oldCode/main.js 的 FileCacheManager 实现
 */

import { logger } from './logger';

// ============ 类型定义 ============

/** 缓存项接口 */
export interface CacheItem<T = unknown> {
  data: T;
  fileName: string;
  accessIndex: number;
  byteSize: number;
}

/** 缓存条目链表节点 */
interface CacheNode<T = unknown> {
  key: string;
  item: CacheItem<T>;
  prev: CacheNode<T> | null;
  next: CacheNode<T> | null;
}

// ============ 常量 ============

const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_CACHE_COUNT = 256;

// ============ FileCacheManager 类 ============

/**
 * 文件缓存管理器 - LRU 缓存实现
 * 使用双向链表实现最近最少使用算法
 */
class FileCacheManagerClass<T = unknown> {
  /** 缓存映射 */
  private cacheMap: Map<string, CacheNode<T>> = new Map();

  /** 链表头节点 (最新访问) */
  private head: CacheNode<T> | null = null;

  /** 链表尾节点 (最久未访问) */
  private tail: CacheNode<T> | null = null;

  /** 当前缓存大小 (字节) */
  private currentSize = 0;

  /** 访问索引计数器 */
  private accessIndex = 0;

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 初始化缓存管理器
   */
  initialize(): void {
    if (this.initialized) {
      logger.warn('FileCacheManager already initialized', undefined, 'FileCacheManager');
      return;
    }

    this.initialized = true;
    logger.info('FileCacheManager initialized', { maxSize: MAX_CACHE_SIZE, maxCount: MAX_CACHE_COUNT }, 'FileCacheManager');
  }

  /**
   * 获取缓存项
   * @param key 缓存键 (通常是文件路径)
   * @returns 缓存的数据，如果不存在返回 null
   */
  get(key: string): T | null {
    const node = this.cacheMap.get(key);
    if (!node) {
      return null;
    }

    this.accessIndex++;
    node.item.accessIndex = this.accessIndex;

    this.moveToHead(node);

    return node.item.data;
  }

  /**
   * 获取缓存项元数据
   * @param key 缓存键
   * @returns 缓存项元数据，如果不存在返回 null
   */
  getMeta(key: string): CacheItem<T> | null {
    const node = this.cacheMap.get(key);
    if (!node) {
      return null;
    }

    this.accessIndex++;
    node.item.accessIndex = this.accessIndex;

    this.moveToHead(node);

    return node.item;
  }

  /**
   * 缓存数据
   * @param key 缓存键 (通常是文件路径)
   * @param data 要缓存的数据
   * @param fileName 文件名
   * @returns 是否成功缓存
   */
  cache(key: string, data: T, fileName: string): boolean {
    if (!this.initialized) {
      this.initialize();
    }

    const existingNode = this.cacheMap.get(key);

    if (existingNode) {
      this.accessIndex++;
      existingNode.item.data = data;
      existingNode.item.fileName = fileName;
      existingNode.item.accessIndex = this.accessIndex;

      this.moveToHead(existingNode);
      return true;
    }

    const byteSize = this.calculateByteSize(data);
    const newItem: CacheItem<T> = {
      data,
      fileName,
      accessIndex: this.accessIndex++,
      byteSize,
    };

    const newNode: CacheNode<T> = {
      key,
      item: newItem,
      prev: null,
      next: null,
    };

    this.addToHead(newNode);
    this.cacheMap.set(key, newNode);
    this.currentSize += byteSize;

    while (this.currentSize > MAX_CACHE_SIZE || this.cacheMap.size > MAX_CACHE_COUNT) {
      this.removeTail();
    }

    logger.debug('File cached', { key, fileName, byteSize }, 'FileCacheManager');
    return true;
  }

  /**
   * 移除缓存项
   * @param key 缓存键
   * @returns 是否成功移除
   */
  remove(key: string): boolean {
    const node = this.cacheMap.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cacheMap.delete(key);
    this.currentSize -= node.item.byteSize;

    logger.debug('File cache removed', { key }, 'FileCacheManager');
    return true;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cacheMap.clear();
    this.head = null;
    this.tail = null;
    this.currentSize = 0;

    logger.info('File cache cleared', undefined, 'FileCacheManager');
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean {
    return this.cacheMap.has(key);
  }

  /**
   * 获取缓存数量
   * @returns 缓存项数量
   */
  size(): number {
    return this.cacheMap.size;
  }

  /**
   * 获取当前缓存大小 (字节)
   * @returns 缓存大小
   */
  byteSize(): number {
    return this.currentSize;
  }

  /**
   * 获取所有缓存键
   * @returns 缓存键数组
   */
  keys(): string[] {
    return Array.from(this.cacheMap.keys());
  }

  /**
   * 列出所有缓存项 (用于调试)
   * @returns 缓存项数组，按访问时间排序
   */
  list(): CacheItem<T>[] {
    const items: CacheItem<T>[] = [];

    let current = this.head;
    while (current) {
      items.push({ ...current.item });
      current = current.next;
    }

    return items;
  }

  /**
   * 获取缓存状态统计
   * @returns 缓存状态统计信息
   */
  getStats(): { count: number; size: number; maxSize: number; maxCount: number } {
    return {
      count: this.cacheMap.size,
      size: this.currentSize,
      maxSize: MAX_CACHE_SIZE,
      maxCount: MAX_CACHE_COUNT,
    };
  }

  // ============ 私有方法 ============

  /**
   * 计算数据的字节大小
   */
  private calculateByteSize(data: unknown): number {
    if (data === null || data === undefined) {
      return 0;
    }

    if (typeof data === 'string') {
      return data.length * 2; // UTF-16
    }

    if (typeof data === 'object') {
      try {
        return JSON.stringify(data).length * 2;
      } catch {
        return 0;
      }
    }

    return 0;
  }

  /**
   * 将节点添加到链表头部
   */
  private addToHead(node: CacheNode<T>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * 将节点移动到链表头部
   */
  private moveToHead(node: CacheNode<T>): void {
    if (node === this.head) {
      return;
    }

    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * 从链表中移除节点
   */
  private removeNode(node: CacheNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }

    if (node === this.head) {
      this.head = node.next;
    }
    if (node === this.tail) {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
  }

  /**
   * 移除链表尾部节点 (LRU)
   */
  private removeTail(): void {
    if (!this.tail) {
      return;
    }

    const tail = this.tail;
    this.removeNode(tail);
    this.cacheMap.delete(tail.key);
    this.currentSize -= tail.item.byteSize;

    logger.debug('LRU cache eviction', { key: tail.key, fileName: tail.item.fileName }, 'FileCacheManager');
  }
}

// ============ 导出单例 ============

/** 全局文件缓存管理器实例 */
export const FileCacheManager = new FileCacheManagerClass();

export default FileCacheManager;
