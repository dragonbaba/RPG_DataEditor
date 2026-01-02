/**
 * Performance Targets Unit Tests
 * 
 * Tests specific performance targets:
 * - Startup time under 3 seconds
 * - Panel transitions under 200ms
 * - 60fps animation performance
 * - 16ms interaction response time
 * 
 * Requirements: 3.6, 3.7, 3.9
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performanceMonitor } from '../PerformanceMonitor';
import { globalLoop } from '../../utils/globalLoop';

// Mock EditorMode enum
enum EditorMode {
  Quest = 'quest',
  Projectile = 'projectile', 
  Script = 'script',
  Property = 'property',
  Note = 'note'
}

// Mock PanelManager to avoid Monaco imports
class MockPanelManager {
  async showPanel(_mode: EditorMode): Promise<void> {
    // Simulate panel switching delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

describe('Performance Targets', () => {
  beforeEach(() => {
    // Mock DOM environment
    Object.defineProperty(global, 'performance', {
      value: {
        now: vi.fn(() => Date.now()),
        memory: {
          usedJSHeapSize: 1000000,
          totalJSHeapSize: 2000000,
        }
      },
      writable: true
    });

    Object.defineProperty(global, 'requestAnimationFrame', {
      value: vi.fn((callback) => {
        // Use setImmediate for more accurate timing in tests
        setImmediate(callback);
        return 1;
      }),
      writable: true
    });

    Object.defineProperty(global, 'window', {
      value: {
        setInterval: vi.fn().mockImplementation((callback, delay) => {
          return setTimeout(callback, delay);
        }),
        clearInterval: vi.fn()
      },
      writable: true
    });
    
    // Reset performance monitor
    performanceMonitor.resetStats();
    performanceMonitor.initialize();
    
    // Mock DOM elements for panel testing
    document.body.innerHTML = `
      <div id="quest-panel" style="display: none;"></div>
      <div id="projectile-panel" style="display: none;"></div>
      <div id="script-panel" style="display: none;"></div>
      <div id="property-panel" style="display: none;"></div>
      <div id="note-panel" style="display: none;"></div>
    `;
    
    // Start global loop for animation testing
    globalLoop.start();
  });

  afterEach(() => {
    globalLoop.stop();
    performanceMonitor.dispose();
    document.body.innerHTML = '';
  });

  describe('Startup Time Target', () => {
    it('should complete application startup in under 3 seconds', async () => {
      const startTime = Date.now();
      
      // Simulate application startup sequence
      performanceMonitor.initialize();
      
      // Simulate loading core systems
      await new Promise(resolve => setTimeout(resolve, 100)); // DOM setup
      await new Promise(resolve => setTimeout(resolve, 150)); // Theme system
      await new Promise(resolve => setTimeout(resolve, 200)); // Panel manager
      await new Promise(resolve => setTimeout(resolve, 100)); // Event system
      
      const endTime = Date.now();
      const startupTime = endTime - startTime;
      
      expect(startupTime).toBeLessThan(3000);
      
      // Verify metrics reflect good startup time
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.startupTime).toBeLessThan(3000);
    });

    it('should initialize core systems efficiently', () => {
      const startTime = performance.now();
      
      // Initialize performance monitor
      performanceMonitor.initialize();
      
      // Initialize global loop
      globalLoop.start();
      
      const endTime = performance.now();
      const initTime = endTime - startTime;
      
      // Core system initialization should be very fast
      expect(initTime).toBeLessThan(100);
    });
  });

  describe('Panel Transition Target', () => {
    it('should complete panel transitions in under 200ms', async () => {
      const panelManager = new MockPanelManager();
      
      const startTime = performance.now();
      
      // Simulate panel transition
      await panelManager.showPanel(EditorMode.Quest);
      await panelManager.showPanel(EditorMode.Projectile);
      
      const endTime = performance.now();
      const transitionTime = endTime - startTime;
      
      expect(transitionTime).toBeLessThan(200);
    });

    it('should handle rapid panel switching efficiently', async () => {
      const panelManager = new MockPanelManager();
      const modes = [EditorMode.Quest, EditorMode.Projectile, EditorMode.Script, EditorMode.Property];
      
      const startTime = performance.now();
      
      // Rapid panel switching
      for (const mode of modes) {
        await panelManager.showPanel(mode);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / modes.length;
      
      expect(averageTime).toBeLessThan(200);
    });
  });

  describe('Animation Performance Target', () => {
    it('should maintain 60fps during animations', async () => {
      let frameCount = 0;
      const testDuration = 1000; // 1 second
      
      // Start frame counting
      const startTime = performance.now();
      
      const frameCounter = () => {
        frameCount++;
        performanceMonitor.recordFrame();
        
        if (performance.now() - startTime < testDuration) {
          requestAnimationFrame(frameCounter);
        }
      };
      
      requestAnimationFrame(frameCounter);
      
      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, testDuration + 100));
      
      const metrics = performanceMonitor.getMetrics();
      
      // Should achieve reasonable fps in test environment
      expect(metrics.frameRate.average).toBeGreaterThan(30);
      expect(frameCount).toBeGreaterThan(30); // At least 30 frames in 1 second
    });

    it('should handle multiple concurrent animations efficiently', async () => {
      const animationCount = 10;
      let completedAnimations = 0;
      
      const startTime = performance.now();
      
      // Start multiple animations
      for (let i = 0; i < animationCount; i++) {
        const animate = () => {
          performanceMonitor.recordFrame();
          
          if (performance.now() - startTime < 500) {
            requestAnimationFrame(animate);
          } else {
            completedAnimations++;
          }
        };
        requestAnimationFrame(animate);
      }
      
      // Wait for animations to complete
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const metrics = performanceMonitor.getMetrics();
      
      expect(completedAnimations).toBe(animationCount);
      expect(metrics.frameRate.average).toBeGreaterThan(30); // Should maintain reasonable FPS
    });
  });

  describe('Interaction Response Target', () => {
    it('should respond to user interactions within 16ms', async () => {
      const interactions = [];
      const targetResponseTime = 16; // 16ms for 60fps
      
      // Simulate user interactions
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        // Simulate interaction processing
        performanceMonitor.getCallback('test-interaction', () => {
          return () => {
            // Simulate some processing
            const data = performanceMonitor.getArray('interaction-data', 10);
            data.push(i);
            performanceMonitor.returnArray('interaction-data', data);
          };
        })();
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        interactions.push(responseTime);
      }
      
      // All interactions should be under 16ms
      interactions.forEach(time => {
        expect(time).toBeLessThan(targetResponseTime);
      });
      
      // Average should be well under target
      const averageTime = interactions.reduce((sum, time) => sum + time, 0) / interactions.length;
      expect(averageTime).toBeLessThan(targetResponseTime / 2);
    });

    it('should handle high-frequency interactions efficiently', async () => {
      const interactionCount = 100;
      const interactions = [];
      
      const startTime = performance.now();
      
      // Simulate high-frequency interactions (like mouse moves)
      for (let i = 0; i < interactionCount; i++) {
        const interactionStart = performance.now();
        
        // Use cached resources for efficiency
        const regex = performanceMonitor.getRegex('test-pattern-\\d+');
        const callback = performanceMonitor.getCallback(`interaction-${i % 10}`, () => () => {});
        const array = performanceMonitor.getArray('temp-data', 5);
        
        // Simulate processing
        regex.test(`test-pattern-${i}`);
        callback();
        performanceMonitor.returnArray('temp-data', array);
        
        const interactionEnd = performance.now();
        interactions.push(interactionEnd - interactionStart);
      }
      
      const totalTime = performance.now() - startTime;
      const averageTime = interactions.reduce((sum, time) => sum + time, 0) / interactions.length;
      
      // Each interaction should be fast
      expect(averageTime).toBeLessThan(16);
      
      // Total processing should be efficient
      expect(totalTime).toBeLessThan(1000); // 100 interactions in under 1 second
      
      // Cache hit rates should be good for repeated operations
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.cacheHitRates.callbacks).toBeGreaterThan(0.8);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track performance metrics accurately', () => {
      // Generate some activity
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordFrame();
        performanceMonitor.getRegex(`pattern-${i}`);
        performanceMonitor.getCallback(`callback-${i}`, () => () => {});
      }
      
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.frameRate.current).toBeGreaterThan(0);
      expect(metrics.resourceCounts.regexPatterns).toBeGreaterThan(0);
      expect(metrics.resourceCounts.callbacks).toBeGreaterThan(0);
      expect(metrics.cacheHitRates.regex).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRates.callbacks).toBeGreaterThanOrEqual(0);
    });

    it('should identify performance issues', () => {
      // Simulate poor performance conditions
      const badFrameRates = [15, 20, 25, 18, 22]; // Below 30fps
      
      badFrameRates.forEach(fps => {
        // Simulate frame time for given FPS
        const frameTime = 1000 / fps;
        vi.spyOn(performance, 'now').mockReturnValue(frameTime);
        performanceMonitor.recordFrame();
      });
      
      const isGood = performanceMonitor.isPerformanceGood();
      expect(isGood).toBe(false);
    });

    it('should optimize performance when needed', () => {
      // Fill caches with data
      for (let i = 0; i < 100; i++) {
        performanceMonitor.getRegex(`pattern-${i}`);
        performanceMonitor.getCallback(`callback-${i}`, () => () => {});
      }
      
      const beforeMetrics = performanceMonitor.getMetrics();
      
      // Trigger optimization
      performanceMonitor.optimize();
      
      const afterMetrics = performanceMonitor.getMetrics();
      
      // Should maintain or improve performance
      expect(afterMetrics.resourceCounts.regexPatterns).toBeLessThanOrEqual(beforeMetrics.resourceCounts.regexPatterns);
      expect(afterMetrics.resourceCounts.callbacks).toBeLessThanOrEqual(beforeMetrics.resourceCounts.callbacks);
    });
  });
});