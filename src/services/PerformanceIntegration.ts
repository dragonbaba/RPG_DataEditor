/**
 * Performance Integration - Integrates performance optimization with existing systems
 * 
 * Integrates with:
 * - Theme system for effect toggling
 * - Animation system for performance-based adjustments
 * - Panel system for transition monitoring
 * - Global loop for frame rate optimization
 * 
 * Requirements: 3.1, 3.6, 3.7, 3.9
 */

import { performanceOptimizer, type FeatureToggles } from './PerformanceOptimizer';
import { globalLoop } from '../utils/globalLoop';
import { EventSystem } from '../core/EventSystem';
import { delayFrames, repeatFrames } from '../utils/delay';
import { logger } from './logger';

/**
 * Performance Integration System
 */
export class PerformanceIntegration {
  private isInitialized = false;
  private themeSystem: any = null;
  private animationSystem: any = null;

  /**
   * Initialize performance integration
   */
  initialize(): void {
    if (this.isInitialized) {
      logger.warn('PerformanceIntegration already initialized', undefined, 'PerformanceIntegration');
      return;
    }

    // Initialize performance optimizer
    performanceOptimizer.initialize();
    
    // Register event listeners
    this.registerEventListeners();
    
    // Integrate with existing systems
    this.integrateWithSystems();
    
    this.isInitialized = true;
    logger.info('PerformanceIntegration initialized', undefined, 'PerformanceIntegration');
  }

  /**
   * Register event listeners for performance integration
   */
  private registerEventListeners(): void {
    // Listen for performance optimization events
    EventSystem.on('performance:optimized', (data: { featureToggles: FeatureToggles }) => {
      this.applyFeatureToggles(data.featureToggles);
    });

    // Listen for critical performance events
    EventSystem.on('performance:critical', (data: { featureToggles: FeatureToggles }) => {
      logger.warn('Critical performance - disabling features', data.featureToggles, 'PerformanceIntegration');
      this.applyFeatureToggles(data.featureToggles);
      this.showPerformanceWarning('critical');
    });

    // Listen for poor performance events
    EventSystem.on('performance:poor', (data: { featureToggles: FeatureToggles }) => {
      logger.warn('Poor performance - reducing features', data.featureToggles, 'PerformanceIntegration');
      this.applyFeatureToggles(data.featureToggles);
      this.showPerformanceWarning('poor');
    });

    // Listen for memory pressure events
    EventSystem.on('performance:memory-pressure', () => {
      logger.warn('Memory pressure - triggering cleanup', undefined, 'PerformanceIntegration');
      this.handleMemoryPressure();
    });

    // Listen for slow transitions
    EventSystem.on('performance:slow-transition', (data: { transitionTime: number }) => {
      logger.warn('Slow panel transition detected', data, 'PerformanceIntegration');
      this.optimizeTransitions();
    });

    // Listen for panel switching to monitor performance
    EventSystem.on('panel:switching', () => {
      // Temporarily disable non-essential effects during transitions
      this.temporarilyReduceEffects();
    });

    EventSystem.on('panel:switched', () => {
      // Re-enable effects after transition
      this.restoreEffects();
    });
  }

  /**
   * Integrate with existing systems
   */
  private integrateWithSystems(): void {
    // Try to get theme system reference
    try {
      // Dynamic import to avoid circular dependencies
      import('../theme/SciFiThemeSystem').then(module => {
        this.themeSystem = module.sciFiThemeSystem;
        logger.info('Integrated with SciFiThemeSystem', undefined, 'PerformanceIntegration');
      }).catch(() => {
        logger.debug('SciFiThemeSystem not available for integration', undefined, 'PerformanceIntegration');
      });
    } catch (error) {
      logger.debug('Failed to integrate with theme system', error, 'PerformanceIntegration');
    }

    // Integrate with global loop
    if (!globalLoop.getIsRunning()) {
      globalLoop.start();
      logger.info('Started global animation loop for performance monitoring', undefined, 'PerformanceIntegration');
    }

    // Monitor global loop performance
    this.monitorGlobalLoop();
  }

  /**
   * Apply feature toggles to integrated systems
   */
  private applyFeatureToggles(toggles: FeatureToggles): void {
    // Apply to theme system if available
    if (this.themeSystem) {
      try {
        // Disable/enable visual effects
        if (this.themeSystem.setEffectsEnabled) {
          this.themeSystem.setEffectsEnabled(toggles.visualEffects);
        }

        // Disable/enable animations
        if (this.themeSystem.setAnimationsEnabled) {
          this.themeSystem.setAnimationsEnabled(toggles.animations);
        }

        // Disable/enable background effects
        if (this.themeSystem.setBackgroundEffectsEnabled) {
          this.themeSystem.setBackgroundEffectsEnabled(toggles.backgroundEffects);
        }
      } catch (error) {
        logger.error('Failed to apply feature toggles to theme system', error, 'PerformanceIntegration');
      }
    }

    // Apply to CSS for global effect control
    this.applyCSSFeatureToggles(toggles);

    // Emit feature toggle event for other systems
    EventSystem.emit('performance:features-toggled', toggles);
  }

  /**
   * Apply feature toggles via CSS classes
   */
  private applyCSSFeatureToggles(toggles: FeatureToggles): void {
    const body = document.body;
    
    // Visual effects
    body.classList.toggle('disable-visual-effects', !toggles.visualEffects);
    
    // Animations
    body.classList.toggle('disable-animations', !toggles.animations);
    
    // Particle effects
    body.classList.toggle('disable-particle-effects', !toggles.particleEffects);
    
    // Background effects
    body.classList.toggle('disable-background-effects', !toggles.backgroundEffects);
    
    // Transitions
    body.classList.toggle('disable-transitions', !toggles.transitions);
  }

  /**
   * Show performance warning to user
   */
  private showPerformanceWarning(level: 'poor' | 'critical'): void {
    const message = level === 'critical' 
      ? '性能严重下降，已禁用部分视觉效果以提升性能'
      : '性能下降，已减少部分视觉效果';

    // Try to show toast notification
    try {
      EventSystem.emit('toast:show', {
        message,
        type: 'warning',
        duration: 5000,
      });
    } catch (error) {
      // Fallback to console warning
      logger.warn(message, undefined, 'PerformanceIntegration');
    }
  }

  /**
   * Handle memory pressure
   */
  private handleMemoryPressure(): void {
    // Trigger garbage collection if available
    if (window.gc) {
      try {
        window.gc();
        logger.info('Manual garbage collection triggered', undefined, 'PerformanceIntegration');
      } catch (error) {
        logger.debug('Manual garbage collection failed', error, 'PerformanceIntegration');
      }
    }

    // Clear caches in various systems
    EventSystem.emit('cache:clear');
    
    // Reduce object pool sizes temporarily
    EventSystem.emit('pools:reduce');
  }

  /**
   * Optimize transitions for better performance
   */
  private optimizeTransitions(): void {
    // Temporarily disable complex animations during transitions
    document.body.classList.add('optimize-transitions');
    
    // Remove optimization after a delay using global runner
    delayFrames(() => {
      document.body.classList.remove('optimize-transitions');
    }, 60); // 60 frames ≈ 1 second at 60fps
  }

  /**
   * Temporarily reduce effects during panel transitions
   */
  private temporarilyReduceEffects(): void {
    document.body.classList.add('transition-mode');
  }

  /**
   * Restore effects after panel transitions
   */
  private restoreEffects(): void {
    // Small delay to ensure transition is complete using global runner
    delayFrames(() => {
      document.body.classList.remove('transition-mode');
    }, 6); // 6 frames ≈ 100ms at 60fps
  }

  /**
   * Monitor global loop performance
   */
  private monitorGlobalLoop(): void {
    let lastRunnerCount = 0;
    
    const monitor = () => {
      if (!this.isInitialized) return;
      
      const runnerCount = globalLoop.getRunnerCount();
      
      // Check for runner count growth (potential memory leak)
      if (runnerCount > lastRunnerCount + 50) {
        logger.warn('High runner count detected', { 
          current: runnerCount, 
          previous: lastRunnerCount 
        }, 'PerformanceIntegration');
        
        EventSystem.emit('performance:high-runner-count', { runnerCount });
      }
      
      lastRunnerCount = runnerCount;
      
      // Schedule next check using global runner
      delayFrames(monitor, 300); // 300 frames ≈ 5 seconds at 60fps
    };
    
    // Start monitoring using global runner
    delayFrames(monitor, 60); // 60 frames ≈ 1 second at 60fps
  }

  /**
   * Get current performance status
   */
  getPerformanceStatus(): {
    isOptimal: boolean;
    frameRate: number;
    memoryUsage: number;
    featuresEnabled: number;
    trend: string;
  } {
    const summary = performanceOptimizer.getPerformanceSummary();
    const trend = performanceOptimizer.getPerformanceTrend();
    
    return {
      isOptimal: summary.frameRate >= 50 && summary.memoryUsage < 70,
      frameRate: summary.frameRate,
      memoryUsage: summary.memoryUsage,
      featuresEnabled: summary.featuresEnabled,
      trend,
    };
  }

  /**
   * Force performance optimization
   */
  optimize(): void {
    performanceOptimizer.optimize();
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.isInitialized = false;
    performanceOptimizer.dispose();
    
    // Remove CSS classes
    document.body.classList.remove(
      'disable-visual-effects',
      'disable-animations', 
      'disable-particle-effects',
      'disable-background-effects',
      'disable-transitions',
      'optimize-transitions',
      'transition-mode'
    );
    
    logger.info('PerformanceIntegration disposed', undefined, 'PerformanceIntegration');
  }
}

// Export singleton instance
export const performanceIntegration = new PerformanceIntegration();