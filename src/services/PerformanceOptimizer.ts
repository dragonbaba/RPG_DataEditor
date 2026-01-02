/**
 * Performance Optimizer - Integrates performance monitoring with existing systems
 * 
 * Features:
 * - Performance-based feature toggling
 * - Automatic optimization triggers
 * - Integration with global animation system
 * - Resource usage monitoring
 * 
 * Requirements: 3.1, 3.6, 3.7, 3.9
 */

import { performanceMonitor, type PerformanceMetrics } from './PerformanceMonitor';
import { globalLoop } from '../utils/globalLoop';
import { logger } from './logger';
import { EventSystem } from '../core/EventSystem';

export interface PerformanceSettings {
  // Frame rate thresholds
  minFrameRate: number;
  targetFrameRate: number;
  
  // Memory thresholds (percentage)
  memoryWarningThreshold: number;
  memoryCriticalThreshold: number;
  
  // Feature toggle thresholds
  disableEffectsThreshold: number;
  disableAnimationsThreshold: number;
  
  // Optimization intervals
  monitoringInterval: number; // frames
  optimizationInterval: number; // frames
}

export interface FeatureToggles {
  visualEffects: boolean;
  animations: boolean;
  particleEffects: boolean;
  backgroundEffects: boolean;
  transitions: boolean;
}

/**
 * Performance Optimizer System
 */
export class PerformanceOptimizer {
  private settings: PerformanceSettings = {
    minFrameRate: 30,
    targetFrameRate: 60,
    memoryWarningThreshold: process.env.NODE_ENV === 'development' ? 90 : 70, // Higher threshold in dev
    memoryCriticalThreshold: process.env.NODE_ENV === 'development' ? 98 : 85, // Higher threshold in dev
    disableEffectsThreshold: 25,
    disableAnimationsThreshold: 20,
    monitoringInterval: 60, // Monitor every second at 60fps
    optimizationInterval: process.env.NODE_ENV === 'development' ? 1800 : 300, // 30s in dev, 5s in prod
  };

  private featureToggles: FeatureToggles = {
    visualEffects: true,
    animations: true,
    particleEffects: true,
    backgroundEffects: true,
    transitions: true,
  };

  private isOptimizing = false;
  private isMonitoring = false;
  
  // Global runner instances for cleanup
  private monitorRunner: any = null;
  private optimizeRunner: any = null;

  // Performance history for trend analysis
  private performanceHistory: PerformanceMetrics[] = [];
  private readonly maxHistorySize = 60; // Keep 1 minute of history at 1Hz

  /**
   * Initialize performance optimizer
   */
  initialize(): void {
    if (this.isMonitoring) {
      logger.warn('PerformanceOptimizer already initialized', undefined, 'PerformanceOptimizer');
      return;
    }

    // Initialize performance monitor
    performanceMonitor.initialize();
    
    // Start monitoring loop using global runner
    this.startMonitoring();
    
    // Register event listeners
    this.registerEventListeners();
    
    this.isMonitoring = true;
    logger.info('PerformanceOptimizer initialized', { settings: this.settings }, 'PerformanceOptimizer');
  }

  /**
   * Get current feature toggles
   */
  getFeatureToggles(): Readonly<FeatureToggles> {
    return { ...this.featureToggles };
  }

  /**
   * Check if a specific feature is enabled
   */
  isFeatureEnabled(feature: keyof FeatureToggles): boolean {
    return this.featureToggles[feature];
  }

  /**
   * Update performance settings
   */
  updateSettings(newSettings: Partial<PerformanceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    logger.info('Performance settings updated', { settings: this.settings }, 'PerformanceOptimizer');
  }

  /**
   * Force optimization cycle
   */
  optimize(): void {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;
    
    try {
      const metrics = performanceMonitor.getMetrics();
      this.updatePerformanceHistory(metrics);
      
      // Analyze performance and adjust features
      this.analyzeAndOptimize(metrics);
      
      // Don't call performanceMonitor.optimize() here to avoid double optimization
      
      // Emit optimization event
      EventSystem.emit('performance:optimized', {
        metrics,
        featureToggles: this.featureToggles,
      });
      
      // Only log in production or when significant changes occur
      if (process.env.NODE_ENV !== 'development' || this.hasSignificantChanges()) {
        logger.info('Performance optimization completed', {
          metrics: this.getPerformanceSummary(metrics),
          featureToggles: this.featureToggles,
        }, 'PerformanceOptimizer');
      }
      
    } catch (error) {
      logger.error('Performance optimization failed', error, 'PerformanceOptimizer');
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Check if there are significant performance changes worth logging
   */
  private hasSignificantChanges(): boolean {
    if (this.performanceHistory.length < 2) return true;
    
    const current = this.performanceHistory[this.performanceHistory.length - 1];
    const previous = this.performanceHistory[this.performanceHistory.length - 2];
    
    // Check for significant frame rate changes (>10fps difference)
    const frameRateDiff = Math.abs(current.frameRate.average - previous.frameRate.average);
    if (frameRateDiff > 10) return true;
    
    // Check for significant memory changes (>20% difference)
    const memoryDiff = Math.abs(current.memoryUsage.percentage - previous.memoryUsage.percentage);
    if (memoryDiff > 20) return true;
    
    return false;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(metrics?: PerformanceMetrics): object {
    const currentMetrics = metrics || performanceMonitor.getMetrics();
    
    return {
      frameRate: Math.round(currentMetrics.frameRate.average),
      memoryUsage: Math.round(currentMetrics.memoryUsage.percentage),
      cacheEfficiency: Math.round(currentMetrics.cacheHitRates.regex * 100),
      resourceCount: currentMetrics.resourceCounts.regexPatterns + currentMetrics.resourceCounts.callbacks,
      featuresEnabled: Object.values(this.featureToggles).filter(Boolean).length,
    };
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    // Use global runner system instead of creating separate RAF loop
    if (!globalLoop.getIsRunning()) {
      globalLoop.start();
    }
    
    // Use global runner for monitoring
    this.createGlobalRunnerMonitoring();
  }

  /**
   * Create monitoring using global runner system
   */
  private createGlobalRunnerMonitoring(): void {
    // Monitor performance every second (60 frames at 60fps)
    const monitorRunner = globalLoop.repeat(() => {
      this.monitorPerformance();
    }, -1, this.settings.monitoringInterval);
    
    // Optimize every 30 seconds in dev, 5 seconds in prod
    const optimizeRunner = globalLoop.repeat(() => {
      this.optimize();
    }, -1, this.settings.optimizationInterval);
    
    // Store runners for cleanup
    this.monitorRunner = monitorRunner;
    this.optimizeRunner = optimizeRunner;
  }
  /**
   * Monitor current performance
   */
  private monitorPerformance(): void {
    const metrics = performanceMonitor.getMetrics();
    this.updatePerformanceHistory(metrics);
    
    // Check for critical performance issues
    if (metrics.frameRate.average < this.settings.disableAnimationsThreshold) {
      this.handleCriticalPerformance(metrics);
    } else if (metrics.frameRate.average < this.settings.disableEffectsThreshold) {
      this.handlePoorPerformance(metrics);
    } else if (metrics.memoryUsage.percentage > this.settings.memoryCriticalThreshold) {
      this.handleMemoryPressure(metrics);
    }
  }

  /**
   * Analyze performance and optimize features
   */
  private analyzeAndOptimize(metrics: PerformanceMetrics): void {
    const frameRate = metrics.frameRate.average;
    const memoryUsage = metrics.memoryUsage.percentage;
    
    // Determine optimization strategy based on performance
    if (frameRate < this.settings.disableAnimationsThreshold) {
      // Critical performance - disable all non-essential features
      this.featureToggles.visualEffects = false;
      this.featureToggles.animations = false;
      this.featureToggles.particleEffects = false;
      this.featureToggles.backgroundEffects = false;
      this.featureToggles.transitions = false;
    } else if (frameRate < this.settings.disableEffectsThreshold) {
      // Poor performance - disable effects but keep basic animations
      this.featureToggles.visualEffects = false;
      this.featureToggles.particleEffects = false;
      this.featureToggles.backgroundEffects = false;
      this.featureToggles.animations = true;
      this.featureToggles.transitions = true;
    } else if (frameRate < this.settings.minFrameRate) {
      // Below minimum - disable background effects
      this.featureToggles.backgroundEffects = false;
      this.featureToggles.particleEffects = false;
      this.featureToggles.visualEffects = true;
      this.featureToggles.animations = true;
      this.featureToggles.transitions = true;
    } else if (frameRate >= this.settings.targetFrameRate && memoryUsage < this.settings.memoryWarningThreshold) {
      // Good performance - enable all features
      this.featureToggles.visualEffects = true;
      this.featureToggles.animations = true;
      this.featureToggles.particleEffects = true;
      this.featureToggles.backgroundEffects = true;
      this.featureToggles.transitions = true;
    }
  }

  /**
   * Handle critical performance issues
   */
  private handleCriticalPerformance(metrics: PerformanceMetrics): void {
    logger.warn('Critical performance detected', {
      frameRate: metrics.frameRate.average,
      memoryUsage: metrics.memoryUsage.percentage,
    }, 'PerformanceOptimizer');
    
    // Disable all non-essential features immediately
    this.featureToggles.visualEffects = false;
    this.featureToggles.animations = false;
    this.featureToggles.particleEffects = false;
    this.featureToggles.backgroundEffects = false;
    
    // Emit critical performance event
    EventSystem.emit('performance:critical', { metrics, featureToggles: this.featureToggles });
  }

  /**
   * Handle poor performance
   */
  private handlePoorPerformance(metrics: PerformanceMetrics): void {
    logger.warn('Poor performance detected', {
      frameRate: metrics.frameRate.average,
      memoryUsage: metrics.memoryUsage.percentage,
    }, 'PerformanceOptimizer');
    
    // Emit poor performance event
    EventSystem.emit('performance:poor', { metrics, featureToggles: this.featureToggles });
  }

  /**
   * Handle memory pressure
   */
  private handleMemoryPressure(metrics: PerformanceMetrics): void {
    logger.warn('Memory pressure detected', {
      memoryUsage: metrics.memoryUsage.percentage,
      frameRate: metrics.frameRate.average,
    }, 'PerformanceOptimizer');
    
    // Trigger aggressive cleanup
    performanceMonitor.optimize();
    
    // Emit memory pressure event
    EventSystem.emit('performance:memory-pressure', { metrics });
  }

  /**
   * Update performance history
   */
  private updatePerformanceHistory(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Keep history size manageable
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Register event listeners
   */
  private registerEventListeners(): void {
    // Listen for panel switches to monitor transition performance
    EventSystem.on('panel:switching', () => {
      const startTime = performance.now();
      
      EventSystem.once('panel:switched', () => {
        const transitionTime = performance.now() - startTime;
        
        if (transitionTime > 200) { // 200ms threshold from requirements
          logger.warn('Slow panel transition detected', { transitionTime }, 'PerformanceOptimizer');
          EventSystem.emit('performance:slow-transition', { transitionTime });
        }
      });
    });
    
    // Listen for animation start/end to track animation performance
    EventSystem.on('animation:start', () => {
      performanceMonitor.recordFrame();
    });
    
    EventSystem.on('animation:end', () => {
      performanceMonitor.recordFrame();
    });
  }

  /**
   * Get performance trend analysis
   */
  getPerformanceTrend(): 'improving' | 'stable' | 'degrading' | 'insufficient-data' {
    if (this.performanceHistory.length < 10) {
      return 'insufficient-data';
    }
    
    const recent = this.performanceHistory.slice(-5);
    const older = this.performanceHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.frameRate.average, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.frameRate.average, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 2) return 'improving';
    if (difference < -2) return 'degrading';
    return 'stable';
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.isMonitoring = false;
    
    // Stop global runners
    if (this.monitorRunner) {
      this.monitorRunner.off();
      this.monitorRunner = null;
    }
    
    if (this.optimizeRunner) {
      this.optimizeRunner.off();
      this.optimizeRunner = null;
    }
    
    this.performanceHistory.length = 0;
    performanceMonitor.dispose();
    
    logger.info('PerformanceOptimizer disposed', undefined, 'PerformanceOptimizer');
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();