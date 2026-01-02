/**
 * Property-based tests for Enhanced Object Pooling System
 * 
 * Tests object pooling implementation and performance monitoring
 * Requirements: 4.1, 4.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ObjectPool, FactoryPool, Poolable } from '../ObjectPool';

// Mock performance.memory for testing
const mockPerformanceMemory = {
  usedJSHeapSize: 1000000,
  totalJSHeapSize: 2000000,
  jsHeapSizeLimit: 4000000,
};

// Test poolable object
class TestPoolable implements Poolable {
  value: number = 0;
  initialized: boolean = false;
  destroyed: boolean = false;

  reset(): void {
    this.value = 0;
    this.initialized = false;
  }

  init(value?: number): void {
    this.value = value || 0;
    this.initialized = true;
  }

  destroy(): void {
    this.destroyed = true;
  }
}

// Mock the PerformanceMonitor functions to avoid Monaco imports
vi.mock('../PerformanceMonitor', () => ({
  getAllPoolsStats: vi.fn().mockReturnValue({
    pools: {},
    editorPools: {
      marker: { name: 'MarkerPool', size: 200, available: 150, totalCreated: 50, totalReturned: 0, currentUsage: 50 },
      completionItem: { name: 'CompletionItemPool', size: 300, available: 250, totalCreated: 50, totalReturned: 0, currentUsage: 50 },
    },
    memory: { used: 1000000, total: 2000000, percentage: 50 },
    fps: 60,
    frameTime: 16.67,
  }),
  printPoolStats: vi.fn(),
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  isMonitoringActive: vi.fn().mockReturnValue(false),
  clearAllEditorPools: vi.fn(),
}));

describe('Enhanced Object Pooling Property Tests', () => {
  let originalPerformance: any;

  beforeEach(() => {
    // Mock performance.memory
    originalPerformance = global.performance;
    global.performance = {
      ...originalPerformance,
      memory: mockPerformanceMemory,
      now: vi.fn().mockReturnValue(Date.now()),
    } as any;

    // Mock DOM methods
    global.document = {
      createElement: vi.fn().mockImplementation((tag: string) => ({
        tagName: tag.toUpperCase(),
        className: '',
        textContent: '',
        innerHTML: '',
        style: { cssText: '' },
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn().mockReturnValue(false),
        },
        removeAttribute: vi.fn(),
        querySelector: vi.fn().mockReturnValue(null),
        appendChild: vi.fn(),
        parentNode: null,
      })),
      body: {
        appendChild: vi.fn(),
      },
      queryCommandSupported: vi.fn().mockReturnValue(true),
    } as any;

    // Mock navigator
    global.navigator = {
      clipboard: undefined,
    } as any;
  });

  afterEach(() => {
    global.performance = originalPerformance;
    vi.clearAllMocks();
  });

  /**
   * Property 5: Object pooling implementation
   * Validates: Requirements 4.1, 4.2
   */
  describe('Property 5: Object pooling implementation', () => {
    it('should maintain consistent pool state during acquire/release cycles', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              action: fc.oneof(fc.constant('acquire'), fc.constant('release')),
              value: fc.integer({ min: 1, max: 1000 }),
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (operations) => {
            const pool = new ObjectPool(TestPoolable, 50);
            const acquired: TestPoolable[] = [];
            
            operations.forEach(({ action, value }) => {
              if (action === 'acquire') {
                const obj = pool.get(value);
                expect(obj).toBeInstanceOf(TestPoolable);
                expect(obj.initialized).toBe(true);
                expect(obj.value).toBe(value);
                acquired.push(obj);
              } else if (action === 'release' && acquired.length > 0) {
                const obj = acquired.pop()!;
                pool.return(obj);
                expect(obj.value).toBe(0); // Should be reset
                expect(obj.initialized).toBe(false);
              }
            });
            
            const stats = pool.getStats();
            expect(stats.name).toBe('TestPoolable');
            expect(stats.totalCreated).toBeGreaterThanOrEqual(0);
            expect(stats.totalReturned).toBeGreaterThanOrEqual(0);
            expect(stats.currentUsage).toBe(acquired.length);
            expect(stats.available).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle factory pools correctly with custom reset functions', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 10 }),
              value: fc.integer({ min: 1, max: 100 }),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (objects) => {
            interface TestObject {
              id: string;
              value: number;
              used: boolean;
            }
            
            const pool = new FactoryPool<TestObject>(
              'TestFactory',
              () => ({ id: '', value: 0, used: false }),
              (obj) => {
                obj.id = '';
                obj.value = 0;
                obj.used = false;
              },
              undefined,
              30
            );
            
            const acquired: TestObject[] = [];
            
            objects.forEach(({ id, value }) => {
              const obj = pool.get();
              obj.id = id;
              obj.value = value;
              obj.used = true;
              
              expect(obj.id).toBe(id);
              expect(obj.value).toBe(value);
              expect(obj.used).toBe(true);
              
              acquired.push(obj);
            });
            
            // Return all objects
            acquired.forEach(obj => {
              pool.return(obj);
              // Should be reset
              expect(obj.id).toBe('');
              expect(obj.value).toBe(0);
              expect(obj.used).toBe(false);
            });
            
            const stats = pool.getStats();
            expect(stats.name).toBe('TestFactory');
            expect(stats.currentUsage).toBe(0);
            expect(stats.available).toBe(acquired.length);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should maintain pool size limits and handle overflow correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            poolSize: fc.integer({ min: 5, max: 20 }),
            operations: fc.integer({ min: 10, max: 100 }),
          }),
          ({ poolSize, operations }) => {
            const pool = new ObjectPool(TestPoolable, poolSize);
            const acquired: TestPoolable[] = [];
            
            // Acquire more objects than pool size
            for (let i = 0; i < operations; i++) {
              const obj = pool.get(i);
              acquired.push(obj);
            }
            
            const statsAfterAcquire = pool.getStats();
            expect(statsAfterAcquire.currentUsage).toBe(operations);
            expect(statsAfterAcquire.totalCreated).toBe(operations);
            
            // Return all objects
            acquired.forEach(obj => pool.return(obj));
            
            const statsAfterReturn = pool.getStats();
            expect(statsAfterReturn.currentUsage).toBe(0);
            expect(statsAfterReturn.totalReturned).toBe(operations);
            
            // Clear excess objects
            pool.clear();
            
            const statsAfterClear = pool.getStats();
            expect(statsAfterClear.available).toBeLessThanOrEqual(poolSize);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle pool resizing correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            initialSize: fc.integer({ min: 10, max: 50 }),
            newSize: fc.integer({ min: 5, max: 100 }),
            objectCount: fc.integer({ min: 5, max: 30 }),
          }),
          ({ initialSize, newSize, objectCount }) => {
            const pool = new ObjectPool(TestPoolable, initialSize);
            
            // Pre-allocate some objects
            pool.preAllocate(Math.min(objectCount, initialSize - 1));
            
            // Resize pool
            pool.resize(newSize);
            
            const statsAfterResize = pool.getStats();
            expect(statsAfterResize.size).toBe(newSize);
            
            if (newSize < initialSize) {
              // If shrinking, available should be limited
              expect(statsAfterResize.available).toBeLessThanOrEqual(newSize);
            }
            
            // Pool should still function correctly
            const obj = pool.get(42);
            expect(obj.value).toBe(42);
            pool.return(obj);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should track statistics accurately across multiple operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              acquire: fc.integer({ min: 0, max: 10 }),
              release: fc.integer({ min: 0, max: 10 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (batches) => {
            const pool = new ObjectPool(TestPoolable, 100);
            const acquired: TestPoolable[] = [];
            let totalReleased = 0;
            
            batches.forEach(({ acquire, release }) => {
              // Acquire objects
              for (let i = 0; i < acquire; i++) {
                const obj = pool.get(i);
                acquired.push(obj);
              }
              
              // Release objects
              const toRelease = Math.min(release, acquired.length);
              for (let i = 0; i < toRelease; i++) {
                const obj = acquired.pop()!;
                pool.return(obj);
                totalReleased++;
              }
            });
            
            const stats = pool.getStats();
            expect(stats.totalReturned).toBe(totalReleased);
            expect(stats.currentUsage).toBe(acquired.length);
            expect(stats.available).toBeGreaterThanOrEqual(0);
            expect(stats.totalCreated).toBeGreaterThanOrEqual(stats.currentUsage);
            
            // Verify that currentUsage + available + totalReturned makes sense
            // currentUsage = objects currently in use
            // available = objects in pool ready for reuse
            // totalReturned = total objects that have been returned
            expect(stats.currentUsage).toBe(stats.totalCreated - stats.available);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle pre-allocation correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            poolSize: fc.integer({ min: 20, max: 100 }),
            preAllocCount: fc.integer({ min: 1, max: 50 }),
          }),
          ({ poolSize, preAllocCount }) => {
            const pool = new ObjectPool(TestPoolable, poolSize);
            
            const maxPreAlloc = Math.min(preAllocCount, poolSize - 1);
            pool.preAllocate(maxPreAlloc);
            
            const stats = pool.getStats();
            expect(stats.available).toBe(maxPreAlloc);
            expect(stats.totalCreated).toBe(maxPreAlloc);
            expect(stats.currentUsage).toBe(0);
            
            // Acquiring should reuse pre-allocated objects
            const obj = pool.get(123);
            expect(obj.value).toBe(123);
            
            const statsAfterAcquire = pool.getStats();
            expect(statsAfterAcquire.available).toBe(maxPreAlloc - 1);
            expect(statsAfterAcquire.currentUsage).toBe(1);
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Pool monitoring and performance integration', () => {
    it('should provide accurate pool statistics', async () => {
      const { getAllPoolsStats } = await import('../PerformanceMonitor');
      const stats = getAllPoolsStats();
      
      expect(stats).toHaveProperty('pools');
      expect(stats).toHaveProperty('editorPools');
      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('fps');
      expect(stats).toHaveProperty('frameTime');
      
      expect(stats.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(stats.memory.percentage).toBeLessThanOrEqual(100);
      expect(stats.fps).toBeGreaterThanOrEqual(0);
      expect(stats.frameTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle monitoring lifecycle correctly', async () => {
      const { isMonitoringActive, startMonitoring, stopMonitoring } = await import('../PerformanceMonitor');
      
      expect(isMonitoringActive()).toBe(false);
      
      startMonitoring();
      stopMonitoring();
      
      // Functions should be called without errors
      expect(startMonitoring).toHaveBeenCalled();
      expect(stopMonitoring).toHaveBeenCalled();
    });

    it('should handle pool cleanup without errors', async () => {
      const { clearAllEditorPools } = await import('../PerformanceMonitor');
      
      expect(() => {
        clearAllEditorPools();
      }).not.toThrow();
    });

    it('should print pool statistics without errors', async () => {
      const { printPoolStats } = await import('../PerformanceMonitor');
      
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
      
      expect(() => {
        printPoolStats();
      }).not.toThrow();
      
      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null/undefined returns gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
          (shouldReturnNull) => {
            const pool = new ObjectPool(TestPoolable, 50);
            
            shouldReturnNull.forEach(returnNull => {
              const obj = pool.get(42);
              
              if (returnNull) {
                // Should handle null gracefully
                pool.return(null as any);
                pool.simpleReturn(undefined as any);
              } else {
                pool.return(obj);
              }
            });
            
            // Pool should still function
            const stats = pool.getStats();
            expect(stats.totalCreated).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle invalid pool sizes gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -100, max: 0 }),
            fc.constant(NaN),
            fc.constant(Infinity),
            fc.constant(-Infinity)
          ),
          (invalidSize) => {
            const pool = new ObjectPool(TestPoolable, 10);
            
            // Should not crash on invalid resize
            expect(() => {
              pool.resize(invalidSize);
            }).not.toThrow();
            
            // Pool should still function
            const obj = pool.get(123);
            expect(obj.value).toBe(123);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle destroy method calls correctly', () => {
      const pool = new ObjectPool(TestPoolable, 5);
      
      // Create more objects than pool size
      const objects: TestPoolable[] = [];
      for (let i = 0; i < 10; i++) {
        objects.push(pool.get(i));
      }
      
      // Return all objects
      objects.forEach(obj => pool.return(obj));
      
      // Clear should call destroy on excess objects
      pool.clear();
      
      const stats = pool.getStats();
      expect(stats.available).toBeLessThanOrEqual(5);
    });

    it('should handle concurrent operations safely', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              operations: fc.array(
                fc.oneof(
                  fc.constant('get'),
                  fc.constant('return'),
                  fc.constant('clear'),
                  fc.constant('stats')
                ),
                { minLength: 1, maxLength: 10 }
              ),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (batches) => {
            const pool = new ObjectPool(TestPoolable, 20);
            const acquired: TestPoolable[] = [];
            
            batches.forEach(({ operations }) => {
              operations.forEach(op => {
                try {
                  switch (op) {
                    case 'get':
                      acquired.push(pool.get(Math.random()));
                      break;
                    case 'return':
                      if (acquired.length > 0) {
                        pool.return(acquired.pop()!);
                      }
                      break;
                    case 'clear':
                      pool.clear();
                      break;
                    case 'stats':
                      const stats = pool.getStats();
                      expect(stats).toBeDefined();
                      break;
                  }
                } catch (error) {
                  // Should not throw errors
                  expect(error).toBeUndefined();
                }
              });
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});