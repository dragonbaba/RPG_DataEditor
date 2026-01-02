/**
 * Object Pool System
 * 
 * Based on Zaun_Core.Pool pattern for high-performance object reuse.
 * Uses index-based tracking for O(1) acquire/release operations.
 */

export { ObjectPool, FactoryPool } from './ObjectPool';
export type { Poolable, PoolStats } from './ObjectPool';

export {
  getPoolRegistry,
  resetPoolRegistry,
  clearAllPools,
  getAllPoolStats,
  createPool,
  acquireListItem,
  releaseListItem,
  acquireSelectOption,
  releaseSelectOption,
  acquireCard,
  releaseCard,
  POOL_CLASSES,
} from './DOMPools';
export type { PoolRegistry } from './DOMPools';

export {
  getMarkerPool,
  getCompletionItemPool,
  getMarkerPoolStats,
  getCompletionItemPoolStats,
  preAllocateMarkerPool,
  preAllocateCompletionItemPool,
  clearMarkerPool,
  clearCompletionItemPool,
} from './EditorPools';

export {
  getAllPoolsStats,
  printPoolStats,
  startMonitoring,
  stopMonitoring,
  isMonitoringActive,
  clearAllEditorPools,
} from './PerformanceMonitor';
