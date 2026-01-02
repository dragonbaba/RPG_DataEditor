/**
 * Object Pool Tests - 对象池系统验证
 * Checkpoint 6: 验证对象池正常复用
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectPool, FactoryPool, Poolable } from './ObjectPool';

// Test class implementing Poolable interface
class TestObject implements Poolable {
  value: number = 0;
  initialized: boolean = false;

  reset(): void {
    this.value = 0;
    this.initialized = false;
  }

  init(arg?: unknown): void {
    if (typeof arg === 'number') {
      this.value = arg;
    }
    this.initialized = true;
  }

  destroy(): void {
    this.value = -1;
  }
}

describe('ObjectPool', () => {
  let pool: ObjectPool<TestObject>;

  beforeEach(() => {
    pool = new ObjectPool(TestObject, 10);
  });

  it('should create new objects when pool is empty', () => {
    const obj = pool.get();
    
    expect(obj).toBeInstanceOf(TestObject);
    expect(obj.initialized).toBe(true);
  });

  it('should initialize objects with provided argument', () => {
    const obj = pool.get(42);
    
    expect(obj.value).toBe(42);
    expect(obj.initialized).toBe(true);
  });

  it('should reuse objects after return', () => {
    const obj1 = pool.get(10);
    pool.return(obj1);
    
    const obj2 = pool.get(20);
    
    // Should be the same instance
    expect(obj2).toBe(obj1);
    // But with new value
    expect(obj2.value).toBe(20);
  });

  it('should reset objects when returned', () => {
    const obj = pool.get(100);
    expect(obj.value).toBe(100);
    
    pool.return(obj);
    
    // After return, object should be reset
    expect(obj.value).toBe(0);
    expect(obj.initialized).toBe(false);
  });

  it('should track pool statistics correctly', () => {
    const obj1 = pool.get();
    const obj2 = pool.get();
    
    let stats = pool.getStats();
    expect(stats.totalCreated).toBe(2);
    expect(stats.available).toBe(0);
    
    pool.return(obj1);
    pool.return(obj2);
    
    stats = pool.getStats();
    expect(stats.totalReturned).toBe(2);
    expect(stats.available).toBe(2);
  });

  it('should pre-allocate objects', () => {
    pool.preAllocate(5);
    
    const stats = pool.getStats();
    expect(stats.totalCreated).toBe(5);
    expect(stats.available).toBe(5);
  });

  it('should handle simpleReturn without reset', () => {
    const obj = pool.get(50);
    pool.simpleReturn(obj);
    
    // Value should NOT be reset
    expect(obj.value).toBe(50);
    
    const stats = pool.getStats();
    expect(stats.available).toBe(1);
  });

  it('should clear excess objects beyond pool size', () => {
    // Create more objects than pool size
    const objects: TestObject[] = [];
    for (let i = 0; i < 15; i++) {
      objects.push(pool.get());
    }
    
    // Return all objects
    for (const obj of objects) {
      pool.return(obj);
    }
    
    let stats = pool.getStats();
    expect(stats.available).toBe(15);
    
    // Clear should remove excess
    pool.clear();
    
    stats = pool.getStats();
    expect(stats.available).toBe(10); // Pool size is 10
  });

  it('should resize pool correctly', () => {
    pool.preAllocate(8);
    
    pool.resize(5);
    
    const stats = pool.getStats();
    expect(stats.size).toBe(5);
  });

  it('should handle null/undefined return gracefully', () => {
    // Should not throw
    pool.return(null as unknown as TestObject);
    pool.return(undefined as unknown as TestObject);
    
    const stats = pool.getStats();
    expect(stats.available).toBe(0);
  });
});

describe('FactoryPool', () => {
  let pool: FactoryPool<{ value: number }>;

  beforeEach(() => {
    pool = new FactoryPool(
      'TestFactoryPool',
      () => ({ value: 0 }),
      (obj) => { obj.value = 0; },
      undefined,
      10
    );
  });

  it('should create objects using factory function', () => {
    const obj = pool.get();
    
    expect(obj).toHaveProperty('value');
    expect(obj.value).toBe(0);
  });

  it('should reuse objects after return', () => {
    const obj1 = pool.get();
    obj1.value = 100;
    pool.return(obj1);
    
    const obj2 = pool.get();
    
    expect(obj2).toBe(obj1);
    expect(obj2.value).toBe(0); // Reset by return
  });

  it('should track statistics correctly', () => {
    pool.get();
    pool.get();
    
    const stats = pool.getStats();
    expect(stats.name).toBe('TestFactoryPool');
    expect(stats.totalCreated).toBe(2);
  });

  it('should pre-allocate objects', () => {
    pool.preAllocate(3);
    
    const stats = pool.getStats();
    expect(stats.available).toBe(3);
    expect(stats.totalCreated).toBe(3);
  });
});
