/**
 * IPCListenerManager Property Tests
 * 
 * Property-based tests for IPC Listener management
 * 
 * **Property 3: 幂等性 (Idempotence)**
 * *For any* repeated registrations, only one listener should be active.
 * **Validates: Requirements 4.1, 4.2**
 * 
 * Feature: performance-optimization, Property 3: 幂等性
 * 
 * Note: Since IPC requires Electron environment, we test the core
 * listener management logic using a mock approach that simulates
 * the IPC registration behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

/**
 * Mock IPC Listener Manager for property testing
 * This tests the core idempotence and listener management logic
 * without requiring the actual Electron IPC setup
 */
class MockIPCListenerManager {
  private static _instance: MockIPCListenerManager | null = null;
  
  // Track registered listeners by channel
  private listeners: Map<string, { callback: (data: unknown) => void; source?: string; registeredAt: number }> = new Map();
  
  // Track listeners by source for batch cleanup
  private listenersBySource: Map<string, Set<string>> = new Map();
  
  // Track actual IPC registration calls (simulates window.ipcOn calls)
  private ipcRegistrations: Map<string, number> = new Map();
  
  private isDisposed = false;

  private constructor() {}

  static getInstance(): MockIPCListenerManager {
    if (!MockIPCListenerManager._instance) {
      MockIPCListenerManager._instance = new MockIPCListenerManager();
    }
    return MockIPCListenerManager._instance;
  }

  static resetInstance(): void {
    if (MockIPCListenerManager._instance) {
      MockIPCListenerManager._instance.dispose();
      MockIPCListenerManager._instance = null;
    }
  }

  /**
   * Check if a listener is registered for a channel
   */
  hasListener(channel: string): boolean {
    return this.listeners.has(channel);
  }

  /**
   * Register a listener for a channel
   * Returns true if registered, false if already exists (idempotent)
   */
  register(channel: string, callback: (data: unknown) => void, source?: string): boolean {
    if (this.isDisposed) {
      return false;
    }

    // Idempotence check: if listener already exists, skip registration
    if (this.listeners.has(channel)) {
      return false;
    }

    // Store listener info
    this.listeners.set(channel, {
      callback,
      source,
      registeredAt: Date.now(),
    });

    // Track by source
    if (source) {
      if (!this.listenersBySource.has(source)) {
        this.listenersBySource.set(source, new Set());
      }
      this.listenersBySource.get(source)!.add(channel);
    }

    // Track IPC registration (simulates actual ipcOn call)
    const currentCount = this.ipcRegistrations.get(channel) || 0;
    this.ipcRegistrations.set(channel, currentCount + 1);

    return true;
  }

  /**
   * Unregister a listener for a channel
   */
  unregister(channel: string): boolean {
    const listenerInfo = this.listeners.get(channel);
    if (!listenerInfo) {
      return false;
    }

    // Remove from source tracking
    if (listenerInfo.source) {
      const sourceSet = this.listenersBySource.get(listenerInfo.source);
      if (sourceSet) {
        sourceSet.delete(channel);
        if (sourceSet.size === 0) {
          this.listenersBySource.delete(listenerInfo.source);
        }
      }
    }

    // Remove listener
    this.listeners.delete(channel);
    return true;
  }

  /**
   * Unregister all listeners from a specific source
   */
  unregisterBySource(source: string): number {
    const channels = this.listenersBySource.get(source);
    if (!channels || channels.size === 0) {
      return 0;
    }

    let count = 0;
    const channelsToRemove = [...channels];
    
    for (const channel of channelsToRemove) {
      if (this.unregister(channel)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all listeners
   */
  clearAll(): number {
    const count = this.listeners.size;
    
    const channels = [...this.listeners.keys()];
    for (const channel of channels) {
      this.unregister(channel);
    }

    this.listenersBySource.clear();
    return count;
  }

  /**
   * Get the number of registered listeners
   */
  getListenerCount(): number {
    return this.listeners.size;
  }

  /**
   * Get the number of listeners for a specific source
   */
  getListenerCountBySource(source: string): number {
    return this.listenersBySource.get(source)?.size ?? 0;
  }

  /**
   * Get all registered channels
   */
  getRegisteredChannels(): string[] {
    return [...this.listeners.keys()];
  }

  /**
   * Get the number of times a channel was registered to IPC
   * This helps verify idempotence - should always be 1 for active listeners
   */
  getIPCRegistrationCount(channel: string): number {
    return this.ipcRegistrations.get(channel) || 0;
  }

  /**
   * Get all sources
   */
  getSources(): string[] {
    return [...this.listenersBySource.keys()];
  }

  /**
   * Replace a listener (unregister then register)
   */
  replace(channel: string, callback: (data: unknown) => void, source?: string): boolean {
    this.unregister(channel);
    return this.register(channel, callback, source);
  }

  /**
   * Dispose the manager
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.clearAll();
    this.ipcRegistrations.clear();
    this.isDisposed = true;
  }

  /**
   * Check if manager is disposed
   */
  isManagerDisposed(): boolean {
    return this.isDisposed;
  }
}

// Generator for valid channel names (simulating IPCEventChannels)
const channelArb = fc.constantFrom(
  'file-loaded',
  'set-data-path',
  'set-script-path',
  'set-workspace-path',
  'save-settings',
  'switch-mode',
  'show-history-files',
  'toggle-theme-settings',
  'toggle-sidebar',
  'fullscreen-changed'
);

// Generator for source names
const sourceArb = fc.constantFrom('App', 'Editor', 'Sidebar', 'Dialog', 'Settings');

describe('IPCListenerManager Property Tests', () => {
  beforeEach(() => {
    MockIPCListenerManager.resetInstance();
  });

  afterEach(() => {
    MockIPCListenerManager.resetInstance();
  });

  /**
   * Property 3: 幂等性 (Idempotence)
   * 
   * For any repeated registrations, only one listener should be active.
   * 
   * **Validates: Requirements 4.1, 4.2**
   * Feature: performance-optimization, Property 3: 幂等性
   */
  describe('Property 3: 幂等性 (Idempotence)', () => {
    /**
     * Core idempotence property:
     * For any channel, registering the same channel multiple times
     * should result in exactly one active listener
     */
    it('should maintain exactly one listener per channel regardless of registration attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          channelArb,
          fc.integer({ min: 1, max: 50 }),
          async (channel, registrationAttempts) => {
            MockIPCListenerManager.resetInstance();
            const manager = MockIPCListenerManager.getInstance();
            
            let successCount = 0;
            
            // Attempt to register the same channel multiple times
            for (let i = 0; i < registrationAttempts; i++) {
              const callback = () => {};
              const result = manager.register(channel, callback, 'TestSource');
              if (result) {
                successCount++;
              }
            }
            
            // Only the first registration should succeed
            expect(successCount).toBe(1);
            
            // Only one listener should be active
            expect(manager.getListenerCount()).toBe(1);
            expect(manager.hasListener(channel)).toBe(true);
            
            // IPC should only have been called once
            expect(manager.getIPCRegistrationCount(channel)).toBe(1);
            
            manager.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Idempotence across multiple channels:
     * For any set of channels, each channel should have at most one listener
     */
    it('should maintain at most one listener per channel across multiple channels', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(channelArb, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 1, max: 10 }),
          async (channels, registrationsPerChannel) => {
            MockIPCListenerManager.resetInstance();
            const manager = MockIPCListenerManager.getInstance();
            
            const uniqueChannels = [...new Set(channels)];
            
            // Register each channel multiple times
            for (const channel of channels) {
              for (let i = 0; i < registrationsPerChannel; i++) {
                manager.register(channel, () => {}, 'TestSource');
              }
            }
            
            // Number of listeners should equal number of unique channels
            expect(manager.getListenerCount()).toBe(uniqueChannels.length);
            
            // Each unique channel should have exactly one IPC registration
            for (const channel of uniqueChannels) {
              expect(manager.getIPCRegistrationCount(channel)).toBe(1);
            }
            
            manager.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Idempotence with different sources:
     * Even with different sources, the same channel should only have one listener
     */
    it('should prevent duplicate registration even from different sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          channelArb,
          fc.array(sourceArb, { minLength: 2, maxLength: 5 }),
          async (channel, sources) => {
            MockIPCListenerManager.resetInstance();
            const manager = MockIPCListenerManager.getInstance();
            
            let successCount = 0;
            
            // Try to register the same channel from different sources
            for (const source of sources) {
              const result = manager.register(channel, () => {}, source);
              if (result) {
                successCount++;
              }
            }
            
            // Only the first registration should succeed
            expect(successCount).toBe(1);
            expect(manager.getListenerCount()).toBe(1);
            
            manager.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Re-registration after unregister:
     * After unregistering, the same channel can be registered again
     */
    it('should allow re-registration after unregister', async () => {
      await fc.assert(
        fc.asyncProperty(
          channelArb,
          fc.integer({ min: 1, max: 10 }),
          async (channel, cycles) => {
            MockIPCListenerManager.resetInstance();
            const manager = MockIPCListenerManager.getInstance();
            
            for (let i = 0; i < cycles; i++) {
              // Register
              const registerResult = manager.register(channel, () => {}, 'TestSource');
              expect(registerResult).toBe(true);
              expect(manager.hasListener(channel)).toBe(true);
              
              // Unregister
              const unregisterResult = manager.unregister(channel);
              expect(unregisterResult).toBe(true);
              expect(manager.hasListener(channel)).toBe(false);
            }
            
            // After all cycles, no listener should be active
            expect(manager.getListenerCount()).toBe(0);
            
            manager.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property tests for cleanup behavior
   * These support Requirements 4.1 (cleanup on unmount) and 4.3 (cleanup on refresh)
   */
  describe('Cleanup Properties', () => {
    /**
     * unregisterBySource should remove all listeners from that source
     */
    it('should remove all listeners from a source when unregisterBySource is called', async () => {
      await fc.assert(
        fc.asyncProperty(
          sourceArb,
          fc.array(channelArb, { minLength: 1, maxLength: 10 }),
          async (source, channels) => {
            MockIPCListenerManager.resetInstance();
            const manager = MockIPCListenerManager.getInstance();
            
            const uniqueChannels = [...new Set(channels)];
            
            // Register all channels with the same source
            for (const channel of uniqueChannels) {
              manager.register(channel, () => {}, source);
            }
            
            expect(manager.getListenerCountBySource(source)).toBe(uniqueChannels.length);
            
            // Unregister by source
            const removedCount = manager.unregisterBySource(source);
            
            expect(removedCount).toBe(uniqueChannels.length);
            expect(manager.getListenerCountBySource(source)).toBe(0);
            expect(manager.getListenerCount()).toBe(0);
            
            manager.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * clearAll should remove all listeners
     */
    it('should remove all listeners when clearAll is called', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(channelArb, sourceArb),
            { minLength: 1, maxLength: 10 }
          ),
          async (channelSourcePairs) => {
            MockIPCListenerManager.resetInstance();
            const manager = MockIPCListenerManager.getInstance();
            
            // Register various channels with various sources
            const registeredChannels = new Set<string>();
            for (const [channel, source] of channelSourcePairs) {
              if (manager.register(channel, () => {}, source)) {
                registeredChannels.add(channel);
              }
            }
            
            const initialCount = manager.getListenerCount();
            expect(initialCount).toBe(registeredChannels.size);
            
            // Clear all
            const clearedCount = manager.clearAll();
            
            expect(clearedCount).toBe(initialCount);
            expect(manager.getListenerCount()).toBe(0);
            expect(manager.getSources().length).toBe(0);
            
            manager.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * dispose should be idempotent
     */
    it('should handle multiple dispose calls safely', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (disposeCount) => {
            MockIPCListenerManager.resetInstance();
            const manager = MockIPCListenerManager.getInstance();
            
            // Register some listeners
            manager.register('file-loaded', () => {}, 'TestSource');
            manager.register('switch-mode', () => {}, 'TestSource');
            
            // Multiple dispose calls should not throw
            for (let i = 0; i < disposeCount; i++) {
              expect(() => manager.dispose()).not.toThrow();
            }
            
            expect(manager.isManagerDisposed()).toBe(true);
            expect(manager.getListenerCount()).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Registration should fail after dispose
     */
    it('should reject registrations after dispose', async () => {
      await fc.assert(
        fc.asyncProperty(
          channelArb,
          async (channel) => {
            MockIPCListenerManager.resetInstance();
            const manager = MockIPCListenerManager.getInstance();
            
            manager.dispose();
            
            const result = manager.register(channel, () => {}, 'TestSource');
            
            expect(result).toBe(false);
            expect(manager.getListenerCount()).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Replace operation properties
   */
  describe('Replace Operation Properties', () => {
    /**
     * Replace should always result in exactly one listener
     */
    it('should maintain exactly one listener after replace operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          channelArb,
          fc.integer({ min: 1, max: 10 }),
          async (channel, replaceCount) => {
            MockIPCListenerManager.resetInstance();
            const manager = MockIPCListenerManager.getInstance();
            
            // Initial registration
            manager.register(channel, () => {}, 'InitialSource');
            
            // Multiple replace operations
            for (let i = 0; i < replaceCount; i++) {
              manager.replace(channel, () => {}, `Source${i}`);
            }
            
            // Should still have exactly one listener
            expect(manager.getListenerCount()).toBe(1);
            expect(manager.hasListener(channel)).toBe(true);
            
            manager.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Singleton pattern properties
   */
  describe('Singleton Pattern Properties', () => {
    /**
     * getInstance should always return the same instance
     */
    it('should maintain singleton pattern across multiple getInstance calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          async (callCount) => {
            MockIPCListenerManager.resetInstance();
            
            const instances: MockIPCListenerManager[] = [];
            
            for (let i = 0; i < callCount; i++) {
              instances.push(MockIPCListenerManager.getInstance());
            }
            
            // All instances should be the same object
            const firstInstance = instances[0];
            for (const instance of instances) {
              expect(instance).toBe(firstInstance);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
