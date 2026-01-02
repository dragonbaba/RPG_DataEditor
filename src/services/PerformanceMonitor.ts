/**
 * Performance Monitor System - Resource tracking and performance optimization
 * 
 * Tracks and optimizes resource usage including:
 * - Regex patterns with caching
 * - Callback function reuse
 * - Array and object pooling
 * - Performance metrics collection
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9
 */

import { logger } from './logger';
import { repeatFrames } from '../utils/delay';
import { globalLoop } from '../utils/globalLoop';

// Performance metrics interface
export interface PerformanceMetrics {
  startupTime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  frameRate: {
    current: number;
    average: number;
    min: number;
    max: number;
  };
  resourceCounts: {
    regexPatterns: number;
    callbacks: number;
    arrays: number;
    objects: number;
  };
  cacheHitRates: {
    regex: number;
    callbacks: number;
    arrays: number;
  };
}

// Resource reuse managers
interface RegexCacheEntry {
  pattern: RegExp;
  lastUsed: number;
  hitCount: number;
}

interface CallbackCacheEntry {
  callback: Function;
  lastUsed: number;
  hitCount: number;
}

interface ArrayPoolEntry {
  array: any[];
  lastUsed: number;
  hitCount: number;
}

/**
 * Performance Monitor System
 */
export class PerformanceMonitor {
  private startTime = Date.now();
  private frameRateHistory: number[] = [];
  private lastFrameTime = performance.now();
  private frameCount = 0;
  
  // Resource caches
  private regexCache = new Map<string, RegexCacheEntry>();
  private callbackCache = new Map<string, CallbackCacheEntry>();
  private arrayPool = new Map<string, ArrayPoolEntry[]>();
  
  // Cache statistics
  private regexHits = 0;
  private regexMisses = 0;
  private callbackHits = 0;
  private callbackMisses = 0;
  private arrayHits = 0;
  private arrayMisses = 0;
  
  // Performance thresholds
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly FRAME_RATE_HISTORY_SIZE = 60; // 1 second at 60fps
  
  private cleanupTimer: number | null = null;
  private cleanupStopFunction: (() => void) | null = null;
  private frameMonitorRunner: any = null;
  private isMonitoring = false;

  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    if (this.isMonitoring) {
      logger.warn('PerformanceMonitor already initialized', undefined, 'PerformanceMonitor');
      return;
    }

    this.startTime = Date.now();
    this.isMonitoring = true;
    
    // Start periodic cleanup
    this.scheduleCleanup();
    
    // Start frame rate monitoring
    this.startFrameRateMonitoring();
    
    logger.info('PerformanceMonitor initialized', undefined, 'PerformanceMonitor');
  }

  /**
   * Get or create cached regex pattern
   */
  getRegex(pattern: string, flags?: string): RegExp {
    const key = `${pattern}:${flags || ''}`;
    const cached = this.regexCache.get(key);
    
    if (cached) {
      cached.lastUsed = Date.now();
      cached.hitCount++;
      this.regexHits++;
      return cached.pattern;
    }
    
    // Create new regex
    const regex = new RegExp(pattern, flags);
    
    // Add to cache if not full
    if (this.regexCache.size < this.MAX_CACHE_SIZE) {
      this.regexCache.set(key, {
        pattern: regex,
        lastUsed: Date.now(),
        hitCount: 1,
      });
    }
    
    this.regexMisses++;
    return regex;
  }

  /**
   * Get or create cached callback function
   */
  getCallback<T extends Function>(key: string, factory: () => T): T {
    const cached = this.callbackCache.get(key);
    
    if (cached) {
      cached.lastUsed = Date.now();
      cached.hitCount++;
      this.callbackHits++;
      return cached.callback as T;
    }
    
    // Create new callback
    const callback = factory();
    
    // Add to cache if not full
    if (this.callbackCache.size < this.MAX_CACHE_SIZE) {
      this.callbackCache.set(key, {
        callback,
        lastUsed: Date.now(),
        hitCount: 1,
      });
    }
    
    this.callbackMisses++;
    return callback;
  }

  /**
   * Get reusable array from pool
   */
  getArray<T>(type: string, initialSize = 0): T[] {
    const pool = this.arrayPool.get(type) || [];
    
    // Try to reuse existing array
    for (let i = 0; i < pool.length; i++) {
      const entry = pool[i];
      if (entry.array.length >= initialSize) {
        // Remove from pool and return
        pool.splice(i, 1);
        entry.lastUsed = Date.now();
        entry.hitCount++;
        this.arrayHits++;
        
        // Clear and resize array
        entry.array.length = initialSize;
        return entry.array as T[];
      }
    }
    
    // Create new array
    this.arrayMisses++;
    return new Array<T>(initialSize);
  }

  /**
   * Return array to pool for reuse
   */
  returnArray<T>(type: string, array: T[]): void {
    if (!array || array.length === 0) return;
    
    const pool = this.arrayPool.get(type) || [];
    
    // Don't pool too many arrays
    if (pool.length >= 10) return;
    
    // Clear array contents but keep capacity
    array.length = 0;
    
    pool.push({
      array: array as any[],
      lastUsed: Date.now(),
      hitCount: 0,
    });
    
    this.arrayPool.set(type, pool);
  }

  /**
   * Record frame for frame rate calculation
   */
  recordFrame(): void {
    if (!this.isMonitoring) return;
    
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      this.frameRateHistory.push(fps);
      
      // Keep history size manageable
      if (this.frameRateHistory.length > this.FRAME_RATE_HISTORY_SIZE) {
        this.frameRateHistory.shift();
      }
    }
    
    this.lastFrameTime = now;
    this.frameCount++;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const memoryInfo = this.getMemoryInfo();
    const frameRateInfo = this.getFrameRateInfo();
    
    return {
      startupTime: Date.now() - this.startTime,
      memoryUsage: memoryInfo,
      frameRate: frameRateInfo,
      resourceCounts: {
        regexPatterns: this.regexCache.size,
        callbacks: this.callbackCache.size,
        arrays: Array.from(this.arrayPool.values()).reduce((sum, pool) => sum + pool.length, 0),
        objects: 0, // Will be implemented with object pooling
      },
      cacheHitRates: {
        regex: this.regexHits / Math.max(1, this.regexHits + this.regexMisses),
        callbacks: this.callbackHits / Math.max(1, this.callbackHits + this.callbackMisses),
        arrays: this.arrayHits / Math.max(1, this.arrayHits + this.arrayMisses),
      },
    };
  }

  /**
   * Check if performance is within acceptable thresholds
   */
  isPerformanceGood(): boolean {
    const metrics = this.getMetrics();
    
    // Check frame rate (should be above 30fps)
    if (metrics.frameRate.average < 30) return false;
    
    // Check memory usage (should be below 80%)
    if (metrics.memoryUsage.percentage > 80) return false;
    
    // Check cache hit rates (should be above 50%)
    if (metrics.cacheHitRates.regex < 0.5) return false;
    if (metrics.cacheHitRates.callbacks < 0.5) return false;
    
    return true;
  }

  /**
   * Optimize performance based on current metrics
   */
  optimize(): void {
    const metrics = this.getMetrics();
    
    // Clean up caches if memory usage is high
    if (metrics.memoryUsage.percentage > 70) {
      this.cleanupCaches(true);
    }
    
    // Reduce cache sizes if hit rates are low
    if (metrics.cacheHitRates.regex < 0.3) {
      this.cleanupRegexCache(0.5);
    }
    
    if (metrics.cacheHitRates.callbacks < 0.3) {
      this.cleanupCallbackCache(0.5);
    }
    
    // Only log in production or when there are actual optimizations
    if (process.env.NODE_ENV !== 'development' || this.hasOptimizationWork(metrics)) {
      logger.info('Performance optimization completed', { metrics }, 'PerformanceMonitor');
    }
  }

  /**
   * Check if optimization actually did work
   */
  private hasOptimizationWork(metrics: PerformanceMetrics): boolean {
    return metrics.memoryUsage.percentage > 70 || 
           metrics.cacheHitRates.regex < 0.3 || 
           metrics.cacheHitRates.callbacks < 0.3;
  }

  /**
   * Get memory information
   */
  private getMemoryInfo(): PerformanceMetrics['memoryUsage'] {
    // Use performance.memory if available (Chrome/Edge)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      };
    }
    
    // Fallback estimation
    const estimatedUsage = (
      this.regexCache.size * 100 +
      this.callbackCache.size * 200 +
      Array.from(this.arrayPool.values()).reduce((sum, pool) => sum + pool.length * 50, 0)
    );
    
    return {
      used: estimatedUsage,
      total: estimatedUsage * 2, // Rough estimate
      percentage: 50, // Conservative estimate
    };
  }

  /**
   * Get frame rate information
   */
  private getFrameRateInfo(): PerformanceMetrics['frameRate'] {
    if (this.frameRateHistory.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0 };
    }
    
    const current = this.frameRateHistory[this.frameRateHistory.length - 1] || 0;
    const average = this.frameRateHistory.reduce((sum, fps) => sum + fps, 0) / this.frameRateHistory.length;
    const min = Math.min(...this.frameRateHistory);
    const max = Math.max(...this.frameRateHistory);
    
    return { current, average, min, max };
  }

  /**
   * Start frame rate monitoring using global runner system
   */
  private startFrameRateMonitoring(): void {
    // Use global runner system instead of separate RAF
    if (!globalLoop.getIsRunning()) {
      globalLoop.start();
    }
    
    // Monitor every frame using global runner
    this.frameMonitorRunner = globalLoop.everyFrame(() => {
      if (this.isMonitoring) {
        this.recordFrame();
      }
    });
  }

  /**
   * Schedule periodic cleanup using global runner system
   */
  private scheduleCleanup(): void {
    // Use global runner system instead of setInterval
    this.cleanupStopFunction = repeatFrames(() => {
      if (this.isMonitoring) {
        this.cleanupCaches(false);
      }
    }, -1, 1800); // Infinite repetition, every 1800 frames (30 seconds at 60fps)
  }

  /**
   * Clean up caches
   */
  private cleanupCaches(aggressive = false): void {
    const maxAge = aggressive ? 10000 : 60000; // 10s or 60s
    
    this.cleanupRegexCache(aggressive ? 0.3 : 0.7, maxAge);
    this.cleanupCallbackCache(aggressive ? 0.3 : 0.7, maxAge);
    this.cleanupArrayPool(maxAge);
    
    // Only log in production or when cleanup actually removed items
    if (process.env.NODE_ENV !== 'development' || aggressive) {
      logger.debug('Cache cleanup completed', { 
        aggressive,
        regexCount: this.regexCache.size,
        callbackCount: this.callbackCache.size,
      }, 'PerformanceMonitor');
    }
  }

  /**
   * Clean up regex cache
   */
  private cleanupRegexCache(keepRatio = 0.7, maxAge = 60000): void {
    const entries = Array.from(this.regexCache.entries());
    const now = Date.now();
    
    // Remove old entries
    entries.forEach(([key, entry]) => {
      if (now - entry.lastUsed > maxAge) {
        this.regexCache.delete(key);
      }
    });
    
    // If still too many, remove least used
    if (this.regexCache.size > this.MAX_CACHE_SIZE * keepRatio) {
      const sortedEntries = entries
        .filter(([key]) => this.regexCache.has(key))
        .sort((a, b) => a[1].hitCount - b[1].hitCount);
      
      const toRemove = this.regexCache.size - Math.floor(this.MAX_CACHE_SIZE * keepRatio);
      for (let i = 0; i < toRemove && i < sortedEntries.length; i++) {
        this.regexCache.delete(sortedEntries[i][0]);
      }
    }
  }

  /**
   * Clean up callback cache
   */
  private cleanupCallbackCache(keepRatio = 0.7, maxAge = 60000): void {
    const entries = Array.from(this.callbackCache.entries());
    const now = Date.now();
    
    // Remove old entries
    entries.forEach(([key, entry]) => {
      if (now - entry.lastUsed > maxAge) {
        this.callbackCache.delete(key);
      }
    });
    
    // If still too many, remove least used
    if (this.callbackCache.size > this.MAX_CACHE_SIZE * keepRatio) {
      const sortedEntries = entries
        .filter(([key]) => this.callbackCache.has(key))
        .sort((a, b) => a[1].hitCount - b[1].hitCount);
      
      const toRemove = this.callbackCache.size - Math.floor(this.MAX_CACHE_SIZE * keepRatio);
      for (let i = 0; i < toRemove && i < sortedEntries.length; i++) {
        this.callbackCache.delete(sortedEntries[i][0]);
      }
    }
  }

  /**
   * Clean up array pool
   */
  private cleanupArrayPool(maxAge = 60000): void {
    const now = Date.now();
    
    this.arrayPool.forEach((pool, type) => {
      const filtered = pool.filter(entry => now - entry.lastUsed <= maxAge);
      if (filtered.length !== pool.length) {
        this.arrayPool.set(type, filtered);
      }
    });
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.regexHits = 0;
    this.regexMisses = 0;
    this.callbackHits = 0;
    this.callbackMisses = 0;
    this.arrayHits = 0;
    this.arrayMisses = 0;
    this.frameRateHistory.length = 0;
    this.frameCount = 0;
    this.startTime = Date.now();
    
    // Clear all caches to ensure clean state for tests
    this.regexCache.clear();
    this.callbackCache.clear();
    this.arrayPool.clear();
    
    logger.info('Performance statistics reset', undefined, 'PerformanceMonitor');
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.isMonitoring = false;
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.cleanupStopFunction) {
      this.cleanupStopFunction();
      this.cleanupStopFunction = null;
    }
    
    if (this.frameMonitorRunner) {
      this.frameMonitorRunner.off();
      this.frameMonitorRunner = null;
    }
    
    this.regexCache.clear();
    this.callbackCache.clear();
    this.arrayPool.clear();
    
    logger.info('PerformanceMonitor disposed', undefined, 'PerformanceMonitor');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();