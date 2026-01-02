/**
 * Resource Cleanup System - Automatic resource management and leak prevention
 * 
 * Provides:
 * - Automatic event listener cleanup during panel transitions
 * - Memory monitoring with threshold-based cleanup
 * - Resource leak detection and prevention
 * - Comprehensive resource tracking
 * 
 * Requirements: 4.3, 4.5
 */

import { logger } from './logger';
import { repeatFrames } from '../utils/delay';
import { performanceMonitor } from './PerformanceMonitor';

// Resource tracking interfaces
export interface ResourceTracker {
  id: string;
  type: 'event-listener' | 'timer' | 'observer' | 'animation' | 'dom-element' | 'memory-cache';
  element?: HTMLElement | Window | Document;
  cleanup: () => void;
  createdAt: number;
  lastUsed: number;
  size?: number; // Memory size estimate
}

export interface CleanupStats {
  totalResources: number;
  cleanedResources: number;
  memoryFreed: number;
  leaksDetected: number;
  cleanupTime: number;
}

export interface MemoryThresholds {
  warning: number;    // 70% - start gentle cleanup
  critical: number;   // 85% - aggressive cleanup
  emergency: number;  // 95% - emergency cleanup
}

/**
 * Resource Cleanup System
 */
export class ResourceCleanupSystem {
  private resources = new Map<string, ResourceTracker>();
  private cleanupCallbacks = new Map<string, Set<() => void>>();
  private memoryThresholds: MemoryThresholds = {
    warning: 70,
    critical: 85,
    emergency: 95,
  };
  
  private cleanupTimer: number | null = null;
  private memoryCheckTimer: number | null = null;
  private cleanupStopFunction: (() => void) | null = null;
  private memoryCheckStopFunction: (() => void) | null = null;
  private isMonitoring = false;
  
  // Cleanup statistics
  private stats: CleanupStats = {
    totalResources: 0,
    cleanedResources: 0,
    memoryFreed: 0,
    leaksDetected: 0,
    cleanupTime: 0,
  };
  
  // Resource limits
  private readonly MAX_RESOURCES = 1000;
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly MEMORY_CHECK_INTERVAL = 10000; // 10 seconds
  private readonly RESOURCE_MAX_AGE = 300000; // 5 minutes

  /**
   * Initialize the resource cleanup system
   */
  initialize(): void {
    if (this.isMonitoring) {
      logger.warn('ResourceCleanupSystem already initialized', undefined, 'ResourceCleanupSystem');
      return;
    }

    this.isMonitoring = true;
    this.startPeriodicCleanup();
    this.startMemoryMonitoring();
    
    // Register global cleanup handlers
    this.registerGlobalCleanupHandlers();
    
    logger.info('ResourceCleanupSystem initialized', undefined, 'ResourceCleanupSystem');
  }

  /**
   * Track a resource for automatic cleanup
   */
  trackResource(resource: Omit<ResourceTracker, 'id' | 'createdAt' | 'lastUsed'>): string {
    const id = this.generateResourceId();
    const tracker: ResourceTracker = {
      ...resource,
      id,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
    
    this.resources.set(id, tracker);
    this.stats.totalResources++;
    
    // Check if we're approaching resource limits
    if (this.resources.size > this.MAX_RESOURCES * 0.8) {
      logger.warn('Approaching resource limit, triggering cleanup', {
        current: this.resources.size,
        limit: this.MAX_RESOURCES,
      }, 'ResourceCleanupSystem');
      this.performCleanup(false);
    }
    
    logger.debug('Resource tracked', { id, type: resource.type }, 'ResourceCleanupSystem');
    return id;
  }

  /**
   * Track event listener for automatic cleanup
   */
  trackEventListener(
    element: HTMLElement | Window | Document,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): string {
    element.addEventListener(event, listener, options);
    
    return this.trackResource({
      type: 'event-listener',
      element,
      cleanup: () => {
        element.removeEventListener(event, listener, options);
      },
      size: 100, // Estimated memory size
    });
  }

  /**
   * Track timer for automatic cleanup
   */
  trackTimer(timerId: number | NodeJS.Timeout, type: 'timeout' | 'interval' = 'timeout'): string {
    return this.trackResource({
      type: 'timer',
      cleanup: () => {
        if (type === 'timeout') {
          clearTimeout(timerId as any);
        } else {
          clearInterval(timerId as any);
        }
      },
      size: 50,
    });
  }

  /**
   * Track DOM observer for automatic cleanup
   */
  trackObserver(observer: MutationObserver | ResizeObserver | IntersectionObserver): string {
    return this.trackResource({
      type: 'observer',
      cleanup: () => {
        observer.disconnect();
      },
      size: 200,
    });
  }

  /**
   * Track animation for automatic cleanup
   */
  trackAnimation(animation: Animation | { stop: () => void }): string {
    return this.trackResource({
      type: 'animation',
      cleanup: () => {
        if ('cancel' in animation) {
          animation.cancel();
        } else if ('stop' in animation) {
          animation.stop();
        }
      },
      size: 150,
    });
  }

  /**
   * Track DOM element for automatic cleanup
   */
  trackDOMElement(element: HTMLElement, parent?: HTMLElement): string {
    return this.trackResource({
      type: 'dom-element',
      element,
      cleanup: () => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        } else if (parent && parent.contains(element)) {
          parent.removeChild(element);
        }
      },
      size: 300,
    });
  }

  /**
   * Track memory cache entry for automatic cleanup
   */
  trackMemoryCache(key: string, cache: Map<string, any> | WeakMap<object, any>): string {
    return this.trackResource({
      type: 'memory-cache',
      cleanup: () => {
        if (cache instanceof Map) {
          cache.delete(key);
        }
        // WeakMap entries are automatically cleaned up by GC
      },
      size: 500, // Estimated cache entry size
    });
  }

  /**
   * Register cleanup callback for a specific context
   */
  registerCleanupCallback(context: string, callback: () => void): void {
    if (!this.cleanupCallbacks.has(context)) {
      this.cleanupCallbacks.set(context, new Set());
    }
    this.cleanupCallbacks.get(context)!.add(callback);
  }

  /**
   * Unregister cleanup callback
   */
  unregisterCleanupCallback(context: string, callback: () => void): void {
    const callbacks = this.cleanupCallbacks.get(context);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.cleanupCallbacks.delete(context);
      }
    }
  }

  /**
   * Clean up resources for a specific context
   */
  cleanupContext(context: string): void {
    const callbacks = this.cleanupCallbacks.get(context);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          logger.error('Error in cleanup callback', { context, error }, 'ResourceCleanupSystem');
        }
      });
      this.cleanupCallbacks.delete(context);
    }
    
    // Clean up resources associated with context
    const contextResources = Array.from(this.resources.values()).filter(
      resource => resource.id.startsWith(context)
    );
    
    contextResources.forEach(resource => {
      this.cleanupResource(resource.id);
    });
    
    logger.debug('Context cleaned up', { context, resourceCount: contextResources.length }, 'ResourceCleanupSystem');
  }

  /**
   * Clean up a specific resource
   */
  cleanupResource(resourceId: string): boolean {
    const resource = this.resources.get(resourceId);
    if (!resource) return false;
    
    try {
      resource.cleanup();
      this.resources.delete(resourceId);
      this.stats.cleanedResources++;
      this.stats.memoryFreed += resource.size || 0;
      
      logger.debug('Resource cleaned up', { id: resourceId, type: resource.type }, 'ResourceCleanupSystem');
      return true;
    } catch (error) {
      logger.error('Failed to cleanup resource', { id: resourceId, error }, 'ResourceCleanupSystem');
      return false;
    }
  }

  /**
   * Update resource last used timestamp
   */
  touchResource(resourceId: string): void {
    const resource = this.resources.get(resourceId);
    if (resource) {
      resource.lastUsed = Date.now();
    }
  }

  /**
   * Perform cleanup based on memory usage and age
   */
  performCleanup(aggressive = false): CleanupStats {
    const startTime = performance.now();
    const initialResourceCount = this.resources.size;
    const initialMemory = this.estimateMemoryUsage();
    
    const now = Date.now();
    const maxAge = aggressive ? this.RESOURCE_MAX_AGE * 0.5 : this.RESOURCE_MAX_AGE;
    
    // Find resources to clean up
    const resourcesToCleanup: string[] = [];
    
    this.resources.forEach((resource, id) => {
      const age = now - resource.lastUsed;
      const shouldCleanup = age > maxAge || 
                           (aggressive && age > maxAge * 0.3) ||
                           this.resources.size > this.MAX_RESOURCES;
      
      if (shouldCleanup) {
        resourcesToCleanup.push(id);
      }
    });
    
    // Clean up resources
    let cleanedCount = 0;
    let memoryFreed = 0;
    
    resourcesToCleanup.forEach(id => {
      const resource = this.resources.get(id);
      if (resource && this.cleanupResource(id)) {
        cleanedCount++;
        memoryFreed += resource.size || 0;
      }
    });
    
    // Detect potential leaks
    const leaksDetected = this.detectResourceLeaks();
    
    const cleanupTime = performance.now() - startTime;
    
    const cleanupStats: CleanupStats = {
      totalResources: initialResourceCount,
      cleanedResources: cleanedCount,
      memoryFreed,
      leaksDetected,
      cleanupTime,
    };
    
    // Update global stats
    this.stats.cleanedResources += cleanedCount;
    this.stats.memoryFreed += memoryFreed;
    this.stats.leaksDetected += leaksDetected;
    this.stats.cleanupTime += cleanupTime;
    
    logger.info('Cleanup completed', {
      ...cleanupStats,
      aggressive,
      remainingResources: this.resources.size,
    }, 'ResourceCleanupSystem');
    
    return cleanupStats;
  }

  /**
   * Detect potential resource leaks
   */
  private detectResourceLeaks(): number {
    const now = Date.now();
    let leaksDetected = 0;
    
    this.resources.forEach((resource) => {
      const age = now - resource.createdAt;
      const unusedTime = now - resource.lastUsed;
      
      // Potential leak indicators
      const isOld = age > this.RESOURCE_MAX_AGE * 2;
      const isUnused = unusedTime > this.RESOURCE_MAX_AGE;
      const isStaleEventListener = resource.type === 'event-listener' && 
                                  resource.element && 
                                  resource.element instanceof Node &&
                                  !document.contains(resource.element);
      
      if (isOld || isUnused || isStaleEventListener) {
        leaksDetected++;
        logger.warn('Potential resource leak detected', {
          id: resource.id,
          type: resource.type,
          age,
          unusedTime,
          isStaleEventListener,
        }, 'ResourceCleanupSystem');
      }
    });
    
    return leaksDetected;
  }

  /**
   * Get current memory usage estimate
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    this.resources.forEach(resource => {
      totalSize += resource.size || 0;
    });
    return totalSize;
  }

  /**
   * Check memory thresholds and trigger cleanup if needed
   */
  private checkMemoryThresholds(): void {
    const metrics = performanceMonitor.getMetrics();
    const memoryPercentage = metrics.memoryUsage.percentage;
    
    if (memoryPercentage >= this.memoryThresholds.emergency) {
      logger.warn('Emergency memory threshold reached, performing aggressive cleanup', {
        memoryPercentage,
        threshold: this.memoryThresholds.emergency,
      }, 'ResourceCleanupSystem');
      this.performCleanup(true);
    } else if (memoryPercentage >= this.memoryThresholds.critical) {
      logger.warn('Critical memory threshold reached, performing cleanup', {
        memoryPercentage,
        threshold: this.memoryThresholds.critical,
      }, 'ResourceCleanupSystem');
      this.performCleanup(true);
    } else if (memoryPercentage >= this.memoryThresholds.warning) {
      logger.info('Memory warning threshold reached, performing gentle cleanup', {
        memoryPercentage,
        threshold: this.memoryThresholds.warning,
      }, 'ResourceCleanupSystem');
      this.performCleanup(false);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Use global runner system instead of setInterval
    this.cleanupStopFunction = repeatFrames(() => {
      this.performCleanup(false);
    }, -1, 1800); // Infinite repetition, every 1800 frames (30 seconds at 60fps)
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
    }
    
    // Use global runner system instead of setInterval
    this.memoryCheckStopFunction = repeatFrames(() => {
      this.checkMemoryThresholds();
    }, -1, 600); // Infinite repetition, every 600 frames (10 seconds at 60fps)
  }

  /**
   * Register global cleanup handlers
   */
  private registerGlobalCleanupHandlers(): void {
    // Page unload cleanup
    const unloadHandler = () => {
      this.performCleanup(true);
    };
    
    window.addEventListener('beforeunload', unloadHandler);
    this.trackEventListener(window, 'beforeunload', unloadHandler);
    
    // Visibility change cleanup (when tab becomes hidden)
    const visibilityHandler = () => {
      if (document.hidden) {
        this.performCleanup(false);
      }
    };
    
    document.addEventListener('visibilitychange', visibilityHandler);
    this.trackEventListener(document, 'visibilitychange', visibilityHandler);
  }

  /**
   * Generate unique resource ID
   */
  private generateResourceId(): string {
    return `resource_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Set memory thresholds
   */
  setMemoryThresholds(thresholds: Partial<MemoryThresholds>): void {
    this.memoryThresholds = { ...this.memoryThresholds, ...thresholds };
    logger.info('Memory thresholds updated', { thresholds: this.memoryThresholds }, 'ResourceCleanupSystem');
  }

  /**
   * Get cleanup statistics
   */
  getStats(): CleanupStats & { currentResources: number; memoryUsage: number } {
    return {
      ...this.stats,
      currentResources: this.resources.size,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Get resource breakdown by type
   */
  getResourceBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    this.resources.forEach(resource => {
      breakdown[resource.type] = (breakdown[resource.type] || 0) + 1;
    });
    
    return breakdown;
  }

  /**
   * Force cleanup all resources
   */
  forceCleanupAll(): CleanupStats {
    const resourceIds = Array.from(this.resources.keys());
    const startTime = performance.now();
    let cleanedCount = 0;
    let memoryFreed = 0;
    
    resourceIds.forEach(id => {
      const resource = this.resources.get(id);
      if (resource && this.cleanupResource(id)) {
        cleanedCount++;
        memoryFreed += resource.size || 0;
      }
    });
    
    // Clean up all contexts
    this.cleanupCallbacks.clear();
    
    const cleanupTime = performance.now() - startTime;
    
    logger.info('Force cleanup completed', {
      cleanedResources: cleanedCount,
      memoryFreed,
      cleanupTime,
    }, 'ResourceCleanupSystem');
    
    return {
      totalResources: resourceIds.length,
      cleanedResources: cleanedCount,
      memoryFreed,
      leaksDetected: 0,
      cleanupTime,
    };
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.isMonitoring = false;
    
    // Clear timers
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.memoryCheckTimer) {
      clearInterval(this.memoryCheckTimer);
      this.memoryCheckTimer = null;
    }
    
    // Stop runner-based functions
    if (this.cleanupStopFunction) {
      this.cleanupStopFunction();
      this.cleanupStopFunction = null;
    }
    
    if (this.memoryCheckStopFunction) {
      this.memoryCheckStopFunction();
      this.memoryCheckStopFunction = null;
    }
    
    // Force cleanup all resources
    this.forceCleanupAll();
    
    logger.info('ResourceCleanupSystem disposed', undefined, 'ResourceCleanupSystem');
  }
}

// Export singleton instance
export const resourceCleanupSystem = new ResourceCleanupSystem();