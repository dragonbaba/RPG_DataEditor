/**
 * ScriptCacheManager - 脚本内容缓存管理
 *
 * 使用对象池优化缓存项的创建和回收
 * 参考 oldCode/main.js 的 ScriptCacheItem 和 ScriptCacheManager
 */

import { FactoryPool, type PoolStats } from '../pools/ObjectPool';

/** 缓存项类型 */
export interface ScriptCacheEntry {
  path: string;
  content: string;
  timestamp: number;
}

/** 缓存项池对象 */
interface ScriptCacheItem {
  path: string | null;
  content: string | null;
  timestamp: number;
}

/** 对象池实例 */
let cachePool: FactoryPool<ScriptCacheItem> | null = null;

/** 缓存 Map */
const cache: Map<string, ScriptCacheItem> = new Map();

/**
 * 创建缓存项
 */
function createCacheItem(): ScriptCacheItem {
  return {
    path: null,
    content: null,
    timestamp: 0
  };
}

/**
 * 重置缓存项
 */
function resetCacheItem(item: ScriptCacheItem): void {
  item.path = null;
  item.content = null;
  item.timestamp = 0;
}

/**
 * 获取缓存项池
 */
function getPool(): FactoryPool<ScriptCacheItem> {
  if (!cachePool) {
    cachePool = new FactoryPool<ScriptCacheItem>(
      'ScriptCacheItemPool',
      createCacheItem,
      resetCacheItem,
      undefined,
      20
    );
  }
  return cachePool;
}

/**
 * 获取缓存的脚本内容
 */
export function getScriptCache(path: string): string | null {
  if (!path) return null;
  const item = cache.get(path);
  return item && item.content ? item.content : null;
}

/**
 * 设置脚本缓存
 */
export function setScriptCache(path: string, content: string): void {
  if (!path) return;

  let item = cache.get(path);
  if (!item) {
    item = getPool().get();
    cache.set(path, item);
  }
  item.path = path;
  item.content = content;
  item.timestamp = Date.now();
}

/**
 * 移除脚本缓存
 */
export function removeScriptCache(path: string): void {
  if (!path) return;

  const item = cache.get(path);
  if (item) {
    getPool().return(item);
    cache.delete(path);
  }
}

/**
 * 清空所有脚本缓存
 */
export function clearScriptCache(): void {
  const pool = getPool();
  cache.forEach((item) => {
    pool.return(item);
  });
  cache.clear();
}

/**
 * 获取缓存项数量
 */
export function scriptCacheSize(): number {
  return cache.size;
}

/**
 * 检查路径是否在缓存中
 */
export function hasScriptCache(path: string): boolean {
  return path ? cache.has(path) : false;
}

/**
 * 获取缓存项（包含元数据）
 */
export function getScriptCacheEntry(path: string): ScriptCacheEntry | null {
  if (!path) return null;
  const item = cache.get(path);
  if (!item || !item.path || !item.content) return null;

  return {
    path: item.path,
    content: item.content,
    timestamp: item.timestamp
  };
}

/**
 * 获取所有缓存路径
 */
export function getScriptCacheKeys(): string[] {
  return Array.from(cache.keys());
}

/**
 * 获取缓存统计信息
 */
export function getScriptCacheStats(): { size: number; poolStats: PoolStats } {
  return {
    size: cache.size,
    poolStats: cachePool ? cachePool.getStats() : {
      name: 'ScriptCacheItemPool',
      size: 0,
      available: 0,
      totalCreated: 0,
      totalReturned: 0,
      currentUsage: 0
    }
  };
}

export default {
  get: getScriptCache,
  set: setScriptCache,
  remove: removeScriptCache,
  clear: clearScriptCache,
  size: scriptCacheSize,
  has: hasScriptCache,
  getEntry: getScriptCacheEntry,
  keys: getScriptCacheKeys,
  stats: getScriptCacheStats
};
