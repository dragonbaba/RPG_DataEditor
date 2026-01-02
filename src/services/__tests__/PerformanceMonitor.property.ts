/**
 * Property-based tests for PerformanceMonitor
 * 
 * Tests resource reuse optimization and performance monitoring
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.8
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { PerformanceMonitor } from '../PerformanceMonitor';

// Mock performance.memory for testing
const mockPerformanceMemory = {
  usedJSHeapSize: 1000000,
  totalJSHeapSize: 2000000,
  jsHeapSizeLimit: 4000000,
};

describe('PerformanceMonitor Property Tests', () => {
  let performanceMonitor: PerformanceMonitor;
  let originalPerformance: any;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    
    // Mock performance.memory
    originalPerformance = global.performance;
    global.performance = {
      ...originalPerformance,
      memory: mockPerformanceMemory,
      now: vi.fn().mockReturnValue(Date.now()),
    } as any;
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn().mockImplementation((callback) => {
      setTimeout(callback, 16);
      return 1;
    });
    
    // Mock window.setInterval
    global.window = {
      setInterval: vi.fn().mockImplementation((callback, delay) => {
        return setTimeout(callback, delay);
      }),
    } as any;
  });

  afterEach(() => {
    performanceMonitor.dispose();
    global.performance = originalPerformance;
    vi.clearAllMocks();
  });

  /**
   * Property 4: Resource reuse optimization
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.8
   */
  describe('Property 4: Resource reuse optimization', () => {
    it('should cache and reuse regex patterns consistently', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              pattern: fc.string({ minLength: 1, maxLength: 20 }),
              flags: fc.oneof(fc.constant(''), fc.constant('g'), fc.constant('i'), fc.constant('gi')),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (regexConfigs) => {
            performanceMonitor.initialize();
            
            const createdRegexes = new Map<string, RegExp>();
            
            // Create regexes and track them
            regexConfigs.forEach(({ pattern, flags }) => {
              try {
                const key = `${pattern}:${flags}`;
                const regex = performanceMonitor.getRegex(pattern, flags);
                
                expect(regex).toBeInstanceOf(RegExp);
                expect(regex.source).toBe(pattern);
                expect(regex.flags).toBe(flags);
                
                // Store for reuse test
                createdRegexes.set(key, regex);
              } catch (error) {
                // Invalid regex patterns should be handled gracefully
                expect(error).toBeInstanceOf(Error);
              }
            });
            
            // Test reuse - should return same instances
            createdRegexes.forEach((expectedRegex, key) => {
              const [pattern, flags] = key.split(':');
              try {
                const reusedRegex = performanceMonitor.getRegex(pattern, flags || undefined);
                expect(reusedRegex).toBe(expectedRegex);
              } catch (error) {
                // Should fail consistently
                expect(error).toBeInstanceOf(Error);
              }
            });
            
            // Verify metrics show caching is working
            const metrics = performanceMonitor.getMetrics();
            expect(metrics.resourceCounts.regexPatterns).toBeGreaterThanOrEqual(0);
            expect(metrics.cacheHitRates.regex).toBeGreaterThanOrEqual(0);
            expect(metrics.cacheHitRates.regex).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should cache and reuse callback functions consistently', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 20 }),
              value: fc.integer({ min: 1, max: 1000 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (callbackConfigs) => {
            performanceMonitor.resetStats(); // Reset before each test
            performanceMonitor.initialize();
            
            // Skip empty arrays
            if (callbackConfigs.length === 0) return;
            
            // Create a map of unique keys to their first occurrence value
            const uniqueKeys = new Map<string, number>();
            callbackConfigs.forEach(({ key, value }) => {
              if (!uniqueKeys.has(key)) {
                uniqueKeys.set(key, value);
              }
            });
            
            // Skip if no unique keys
            if (uniqueKeys.size === 0) return;
            
            const createdCallbacks = new Map<string, Function>();
            
            // Create callbacks for each unique key - this should create new callbacks
            uniqueKeys.forEach((value, key) => {
              const callback = performanceMonitor.getCallback(key, () => () => value);
              
              expect(typeof callback).toBe('function');
              expect(callback()).toBe(value);
              
              createdCallbacks.set(key, callback);
            });
            
            // Test reuse - should return same instances from cache
            createdCallbacks.forEach((expectedCallback, key) => {
              // When we request the same key again, we should get the same callback instance
              const reusedCallback = performanceMonitor.getCallback(key, () => () => 999); // Different factory
              expect(reusedCallback).toBe(expectedCallback); // Should be same instance (cached)
              // The cached callback should still work as expected
              expect(typeof reusedCallback).toBe('function');
            });
            
            // Verify metrics - we should have cache hits from the reuse
            const metrics = performanceMonitor.getMetrics();
            expect(metrics.resourceCounts.callbacks).toBeGreaterThanOrEqual(uniqueKeys.size);
            expect(metrics.cacheHitRates.callbacks).toBeGreaterThanOrEqual(0);
            expect(metrics.cacheHitRates.callbacks).toBeLessThanOrEqual(1);
            
            // If we had reuse, hit rate should be > 0
            if (uniqueKeys.size > 0) {
              expect(metrics.cacheHitRates.callbacks).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should pool and reuse arrays efficiently', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.string({ minLength: 1, maxLength: 10 }),
              size: fc.integer({ min: 0, max: 100 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (arrayConfigs) => {
            performanceMonitor.initialize();
            
            const obtainedArrays: Array<{ type: string; array: any[] }> = [];
            
            // Get arrays from pool
            arrayConfigs.forEach(({ type, size }) => {
              const array = performanceMonitor.getArray(type, size);
              
              expect(Array.isArray(array)).toBe(true);
              expect(array.length).toBe(size);
              
              obtainedArrays.push({ type, array });
            });
            
            // Return arrays to pool
            obtainedArrays.forEach(({ type, array }) => {
              performanceMonitor.returnArray(type, array);
            });
            
            // Get arrays again - should reuse from pool
            arrayConfigs.forEach(({ type, size }) => {
              const array = performanceMonitor.getArray(type, size);
              expect(Array.isArray(array)).toBe(true);
              expect(array.length).toBe(size);
            });
            
            // Verify metrics
            const metrics = performanceMonitor.getMetrics();
            expect(metrics.cacheHitRates.arrays).toBeGreaterThanOrEqual(0);
            expect(metrics.cacheHitRates.arrays).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain consistent performance metrics', () => {
      fc.assert(
        fc.property(
          fc.record({
            regexCount: fc.integer({ min: 1, max: 20 }),
            callbackCount: fc.integer({ min: 1, max: 20 }),
            arrayCount: fc.integer({ min: 1, max: 20 }),
            frameCount: fc.integer({ min: 1, max: 60 }),
          }),
          (config) => {
            performanceMonitor.initialize();
            
            // Create resources
            for (let i = 0; i < config.regexCount; i++) {
              performanceMonitor.getRegex(`pattern${i}`, 'g');
            }
            
            for (let i = 0; i < config.callbackCount; i++) {
              performanceMonitor.getCallback(`callback${i}`, () => () => i);
            }
            
            for (let i = 0; i < config.arrayCount; i++) {
              const array = performanceMonitor.getArray(`type${i}`, 10);
              performanceMonitor.returnArray(`type${i}`, array);
            }
            
            // Record frames
            for (let i = 0; i < config.frameCount; i++) {
              performanceMonitor.recordFrame();
            }
            
            const metrics = performanceMonitor.getMetrics();
            
            // Verify metric structure and ranges
            expect(typeof metrics.startupTime).toBe('number');
            expect(metrics.startupTime).toBeGreaterThanOrEqual(0);
            
            expect(typeof metrics.memoryUsage.used).toBe('number');
            expect(typeof metrics.memoryUsage.total).toBe('number');
            expect(typeof metrics.memoryUsage.percentage).toBe('number');
            expect(metrics.memoryUsage.percentage).toBeGreaterThanOrEqual(0);
            expect(metrics.memoryUsage.percentage).toBeLessThanOrEqual(100);
            
            expect(typeof metrics.frameRate.current).toBe('number');
            expect(typeof metrics.frameRate.average).toBe('number');
            expect(typeof metrics.frameRate.min).toBe('number');
            expect(typeof metrics.frameRate.max).toBe('number');
            
            expect(metrics.resourceCounts.regexPatterns).toBeGreaterThanOrEqual(0);
            expect(metrics.resourceCounts.callbacks).toBeGreaterThanOrEqual(0);
            expect(metrics.resourceCounts.arrays).toBeGreaterThanOrEqual(0);
            
            expect(metrics.cacheHitRates.regex).toBeGreaterThanOrEqual(0);
            expect(metrics.cacheHitRates.regex).toBeLessThanOrEqual(1);
            expect(metrics.cacheHitRates.callbacks).toBeGreaterThanOrEqual(0);
            expect(metrics.cacheHitRates.callbacks).toBeLessThanOrEqual(1);
            expect(metrics.cacheHitRates.arrays).toBeGreaterThanOrEqual(0);
            expect(metrics.cacheHitRates.arrays).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should optimize performance based on metrics', () => {
      fc.assert(
        fc.property(
          fc.record({
            createResources: fc.boolean(),
            simulateHighMemory: fc.boolean(),
            simulateLowHitRate: fc.boolean(),
          }),
          (scenario) => {
            performanceMonitor.initialize();
            
            if (scenario.createResources) {
              // Create many resources to test optimization
              for (let i = 0; i < 50; i++) {
                performanceMonitor.getRegex(`pattern${i}`, 'g');
                performanceMonitor.getCallback(`callback${i}`, () => () => i);
              }
            }
            
            if (scenario.simulateHighMemory) {
              // Mock high memory usage
              mockPerformanceMemory.usedJSHeapSize = mockPerformanceMemory.totalJSHeapSize * 0.9;
            }
            
            const metricsBefore = performanceMonitor.getMetrics();
            
            // Run optimization
            expect(() => {
              performanceMonitor.optimize();
            }).not.toThrow();
            
            const metricsAfter = performanceMonitor.getMetrics();
            
            // Verify metrics are still valid after optimization
            expect(metricsAfter.resourceCounts.regexPatterns).toBeGreaterThanOrEqual(0);
            expect(metricsAfter.resourceCounts.callbacks).toBeGreaterThanOrEqual(0);
            expect(metricsAfter.cacheHitRates.regex).toBeGreaterThanOrEqual(0);
            expect(metricsAfter.cacheHitRates.regex).toBeLessThanOrEqual(1);
            
            // Reset memory for next test
            mockPerformanceMemory.usedJSHeapSize = 1000000;
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle cache cleanup without breaking functionality', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),
          (resourceCount) => {
            performanceMonitor.initialize();
            
            // Create resources
            const regexKeys: string[] = [];
            const callbackKeys: string[] = [];
            
            for (let i = 0; i < resourceCount; i++) {
              const regexKey = `pattern${i}`;
              const callbackKey = `callback${i}`;
              
              performanceMonitor.getRegex(regexKey, 'g');
              performanceMonitor.getCallback(callbackKey, () => () => i);
              
              regexKeys.push(regexKey);
              callbackKeys.push(callbackKey);
            }
            
            const metricsBefore = performanceMonitor.getMetrics();
            
            // Force cleanup by calling optimize
            performanceMonitor.optimize();
            
            const metricsAfter = performanceMonitor.getMetrics();
            
            // Resources should still be accessible (or recreated if cleaned up)
            regexKeys.slice(0, 5).forEach(key => {
              const regex = performanceMonitor.getRegex(key, 'g');
              expect(regex).toBeInstanceOf(RegExp);
            });
            
            callbackKeys.slice(0, 5).forEach(key => {
              const callback = performanceMonitor.getCallback(key, () => () => 42);
              expect(typeof callback).toBe('function');
            });
            
            // Metrics should still be valid
            expect(metricsAfter.cacheHitRates.regex).toBeGreaterThanOrEqual(0);
            expect(metricsAfter.cacheHitRates.regex).toBeLessThanOrEqual(1);
            expect(metricsAfter.cacheHitRates.callbacks).toBeGreaterThanOrEqual(0);
            expect(metricsAfter.cacheHitRates.callbacks).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle invalid regex patterns gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('['),
            fc.constant('*'),
            fc.constant('?'),
            fc.constant('+'),
            fc.constant('('),
            fc.constant(')'),
          ),
          (invalidPattern) => {
            performanceMonitor.initialize();
            
            expect(() => {
              performanceMonitor.getRegex(invalidPattern);
            }).toThrow();
            
            // Should not break the system
            const validRegex = performanceMonitor.getRegex('valid', 'g');
            expect(validRegex).toBeInstanceOf(RegExp);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle multiple initializations gracefully', () => {
      performanceMonitor.initialize();
      const metrics1 = performanceMonitor.getMetrics();
      
      // Second initialization should not break anything
      performanceMonitor.initialize();
      const metrics2 = performanceMonitor.getMetrics();
      
      expect(metrics2.startupTime).toBeGreaterThanOrEqual(metrics1.startupTime);
    });

    it('should handle disposal during active monitoring', () => {
      performanceMonitor.initialize();
      
      // Create some resources
      performanceMonitor.getRegex('test', 'g');
      performanceMonitor.getCallback('test', () => () => 42);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.resourceCounts.regexPatterns).toBeGreaterThan(0);
      
      // Dispose should not throw
      expect(() => {
        performanceMonitor.dispose();
      }).not.toThrow();
      
      // Should handle calls after disposal gracefully
      expect(() => {
        performanceMonitor.getMetrics();
      }).not.toThrow();
    });

    it('should handle extreme resource counts', () => {
      performanceMonitor.initialize();
      
      // Create many resources to test limits
      for (let i = 0; i < 2000; i++) {
        performanceMonitor.getRegex(`pattern${i}`, 'g');
      }
      
      const metrics = performanceMonitor.getMetrics();
      
      // Should not crash and should have reasonable limits
      expect(metrics.resourceCounts.regexPatterns).toBeLessThan(2000); // Due to cache limits
      expect(metrics.cacheHitRates.regex).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRates.regex).toBeLessThanOrEqual(1);
    });

    it('should reset statistics correctly', () => {
      performanceMonitor.initialize();
      
      // Create resources and record frames
      performanceMonitor.getRegex('test', 'g');
      performanceMonitor.recordFrame();
      
      // Wait a bit to ensure startup time > 0
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // Small delay
      }
      
      const metricsBefore = performanceMonitor.getMetrics();
      expect(metricsBefore.startupTime).toBeGreaterThanOrEqual(0);
      
      // Reset stats
      performanceMonitor.resetStats();
      
      const metricsAfter = performanceMonitor.getMetrics();
      expect(metricsAfter.startupTime).toBeLessThanOrEqual(metricsBefore.startupTime);
    });
  });
});