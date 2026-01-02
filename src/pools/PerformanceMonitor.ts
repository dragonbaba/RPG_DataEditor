/**
 * Performance Monitor - 性能监控器
 * 监控对象池使用情况、内存使用和渲染性能
 * 
 * 核心约束：
 * - 使用预创建的回调函数
 * - 定时更新使用 GlobalRunner
 */

import { getAllPoolStats } from './DOMPools';
import { getMarkerPoolStats, getCompletionItemPoolStats } from './EditorPools';
import { GlobalRunner, BaseRunner } from '../utils/runner';
import { performanceMonitor } from '../services/PerformanceMonitor';
import { logger } from '../services/logger';

export interface PerformanceStats {
  pools: ReturnType<typeof getAllPoolStats>;
  editorPools: {
    marker: ReturnType<typeof getMarkerPoolStats>;
    completionItem: ReturnType<typeof getCompletionItemPoolStats>;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  fps: number;
  frameTime: number;
}

export type PerformanceCallback = (stats: PerformanceStats) => void;

export class PerformanceMonitor {
  private static readonly UPDATE_INTERVAL_FRAMES = 30;
  private static readonly CLEANUP_INTERVAL_FRAMES = 1800; // 30 seconds at 60fps

  private readonly perfMonitorElement: HTMLElement;
  private readonly statsCallback: PerformanceCallback;

  private fps = 60;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private frameTime = 16.67;

  private updateRunner: BaseRunner | null = null;
  private fpsRunner: BaseRunner | null = null;
  private cleanupRunner: BaseRunner | null = null;

  private readonly boundUpdateStats: () => void;
  private readonly boundUpdateFPS: () => void;
  private readonly boundCleanupPools: () => void;

  constructor(container?: HTMLElement) {
    this.boundUpdateStats = this.updateStats.bind(this);
    this.boundUpdateFPS = this.updateFPS.bind(this);
    this.boundCleanupPools = this.cleanupPools.bind(this);

    this.statsCallback = this.renderStats.bind(this);

    this.perfMonitorElement = container || this.createPerfMonitor();
    this.perfMonitorElement.classList.add('perf-monitor', 'hidden');
    this.perfMonitorElement.innerHTML = `
      <div class="perf-monitor-row">
        <span class="perf-monitor-label">FPS</span>
        <span class="perf-monitor-value" id="perf-fps">60</span>
      </div>
      <div class="perf-monitor-row">
        <span class="perf-monitor-label">Frame</span>
        <span class="perf-monitor-value" id="perf-frame">16.7ms</span>
      </div>
      <div class="perf-monitor-row">
        <span class="perf-monitor-label">Memory</span>
        <span class="perf-monitor-value" id="perf-memory">0%</span>
      </div>
      <div class="perf-monitor-row">
        <span class="perf-monitor-label">Pools</span>
        <span class="perf-monitor-value" id="perf-pools">0</span>
      </div>
    `;

    if (!container) {
      document.body.appendChild(this.perfMonitorElement);
    }
  }

  private createPerfMonitor(): HTMLElement {
    const element = document.createElement('div');
    return element;
  }

  start(): void {
    if (this.updateRunner) return;

    this.updateRunner = GlobalRunner.on(
      this.boundUpdateStats,
      undefined,
      PerformanceMonitor.UPDATE_INTERVAL_FRAMES
    );

    this.fpsRunner = GlobalRunner.on(
      this.boundUpdateFPS,
      undefined,
      0,
      -1
    );

    this.cleanupRunner = GlobalRunner.on(
      this.boundCleanupPools,
      undefined,
      PerformanceMonitor.CLEANUP_INTERVAL_FRAMES
    );

    this.lastFpsUpdate = performance.now();
    this.perfMonitorElement.classList.remove('hidden');
    
    logger.info('Pool performance monitoring started', undefined, 'PoolPerformanceMonitor');
  }

  stop(): void {
    if (this.updateRunner) {
      GlobalRunner.off(this.updateRunner);
      this.updateRunner = null;
    }

    if (this.fpsRunner) {
      GlobalRunner.off(this.fpsRunner);
      this.fpsRunner = null;
    }

    if (this.cleanupRunner) {
      GlobalRunner.off(this.cleanupRunner);
      this.cleanupRunner = null;
    }

    this.perfMonitorElement.classList.add('hidden');
    
    logger.info('Pool performance monitoring stopped', undefined, 'PoolPerformanceMonitor');
  }

  private updateStats(): void {
    const poolStats = getAllPoolStats();
    const editorPools = {
      marker: getMarkerPoolStats(),
      completionItem: getCompletionItemPoolStats(),
    };

    let memoryUsed = 0;
    let memoryTotal = 0;

    if (performance.memory) {
      memoryUsed = performance.memory.usedJSHeapSize;
      memoryTotal = performance.memory.totalJSHeapSize;
    }

    const stats: PerformanceStats = {
      pools: poolStats,
      editorPools,
      memory: {
        used: memoryUsed,
        total: memoryTotal,
        percentage: memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0,
      },
      fps: this.fps,
      frameTime: this.frameTime,
    };

    this.statsCallback(stats);
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsUpdate;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    this.frameTime = 1000 / Math.max(this.fps, 1);
    
    // Record frame rate in main performance monitor
    performanceMonitor.recordFrame();
  }

  private cleanupPools(): void {
    try {
      const stats = this.getStats();
      
      // Check if cleanup is needed based on memory usage or pool sizes
      const needsCleanup = stats.memory.percentage > 70 || this.shouldCleanupPools(stats);
      
      if (needsCleanup) {
        // Import and call cleanup functions
        import('./DOMPools').then(({ clearAllPools }) => {
          clearAllPools();
        });
        
        import('./EditorPools').then(({ clearMarkerPool, clearCompletionItemPool }) => {
          clearMarkerPool();
          clearCompletionItemPool();
        });
        
        logger.info('Pool cleanup performed', { 
          memoryPercentage: stats.memory.percentage,
          poolCount: this.getTotalPoolUsage(stats)
        }, 'PoolPerformanceMonitor');
      }
    } catch (error) {
      logger.error('Error during pool cleanup', error, 'PoolPerformanceMonitor');
    }
  }

  private shouldCleanupPools(stats: PerformanceStats): boolean {
    const totalUsage = this.getTotalPoolUsage(stats);
    const totalCapacity = this.getTotalPoolCapacity(stats);
    
    // Cleanup if pools are more than 80% full
    return totalCapacity > 0 && (totalUsage / totalCapacity) > 0.8;
  }

  private getTotalPoolUsage(stats: PerformanceStats): number {
    let total = 0;
    
    // DOM pools
    for (const poolName in stats.pools) {
      const pool = stats.pools[poolName];
      total += pool.currentUsage;
    }
    
    // Editor pools
    total += stats.editorPools.marker.currentUsage;
    total += stats.editorPools.completionItem.currentUsage;
    
    return total;
  }

  private getTotalPoolCapacity(stats: PerformanceStats): number {
    let total = 0;
    
    // DOM pools
    for (const poolName in stats.pools) {
      const pool = stats.pools[poolName];
      total += pool.size;
    }
    
    // Editor pools
    total += stats.editorPools.marker.size;
    total += stats.editorPools.completionItem.size;
    
    return total;
  }

  private renderStats(stats: PerformanceStats): void {
    const fpsElement = this.perfMonitorElement.querySelector('#perf-fps');
    const frameElement = this.perfMonitorElement.querySelector('#perf-frame');
    const memoryElement = this.perfMonitorElement.querySelector('#perf-memory');
    const poolsElement = this.perfMonitorElement.querySelector('#perf-pools');

    if (fpsElement) {
      fpsElement.textContent = String(stats.fps);
      fpsElement.classList.remove('warning', 'danger');
      if (stats.fps < 30) {
        fpsElement.classList.add('danger');
      } else if (stats.fps < 50) {
        fpsElement.classList.add('warning');
      }
    }

    if (frameElement) {
      frameElement.textContent = `${stats.frameTime.toFixed(1)}ms`;
    }

    if (memoryElement) {
      const memPercent = stats.memory.percentage.toFixed(1);
      memoryElement.textContent = `${memPercent}%`;
      memoryElement.classList.remove('warning', 'danger');
      if (stats.memory.percentage > 80) {
        memoryElement.classList.add('danger');
      } else if (stats.memory.percentage > 60) {
        memoryElement.classList.add('warning');
      }
    }

    if (poolsElement) {
      const totalActive = this.getTotalPoolUsage(stats);
      poolsElement.textContent = String(totalActive);
    }
  }

  getStats(): PerformanceStats {
    const poolStats = getAllPoolStats();
    const editorPools = {
      marker: getMarkerPoolStats(),
      completionItem: getCompletionItemPoolStats(),
    };

    let memoryUsed = 0;
    let memoryTotal = 0;

    if (performance.memory) {
      memoryUsed = performance.memory.usedJSHeapSize;
      memoryTotal = performance.memory.totalJSHeapSize;
    }

    return {
      pools: poolStats,
      editorPools,
      memory: {
        used: memoryUsed,
        total: memoryTotal,
        percentage: memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0,
      },
      fps: this.fps,
      frameTime: this.frameTime,
    };
  }

  isRunning(): boolean {
    return this.updateRunner !== null;
  }

  destroy(): void {
    this.stop();
    if (this.perfMonitorElement.parentNode) {
      this.perfMonitorElement.parentNode.removeChild(this.perfMonitorElement);
    }
  }
}

// Global pool monitoring functions
let globalMonitor: PerformanceMonitor | null = null;

export function getAllPoolsStats(): PerformanceStats {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor.getStats();
}

export function printPoolStats(): void {
  const stats = getAllPoolsStats();
  
  console.group('🏊‍♂️ Object Pool Statistics');
  
  console.group('DOM Pools');
  for (const [name, pool] of Object.entries(stats.pools)) {
    console.log(`${name}: ${pool.currentUsage}/${pool.size} (${pool.available} available)`);
  }
  console.groupEnd();
  
  console.group('Editor Pools');
  console.log(`Marker: ${stats.editorPools.marker.currentUsage}/${stats.editorPools.marker.size}`);
  console.log(`CompletionItem: ${stats.editorPools.completionItem.currentUsage}/${stats.editorPools.completionItem.size}`);
  console.groupEnd();
  
  console.log(`Memory: ${stats.memory.percentage.toFixed(1)}% (${(stats.memory.used / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`FPS: ${stats.fps} (${stats.frameTime.toFixed(1)}ms)`);
  
  console.groupEnd();
}

export function startMonitoring(): void {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  globalMonitor.start();
}

export function stopMonitoring(): void {
  if (globalMonitor) {
    globalMonitor.stop();
  }
}

export function isMonitoringActive(): boolean {
  return globalMonitor ? globalMonitor.isRunning() : false;
}

export function clearAllEditorPools(): void {
  import('./EditorPools').then(({ clearMarkerPool, clearCompletionItemPool }) => {
    clearMarkerPool();
    clearCompletionItemPool();
    logger.info('All editor pools cleared', undefined, 'PoolPerformanceMonitor');
  });
}

export const poolPerformanceMonitor = new PerformanceMonitor();
export default poolPerformanceMonitor;
