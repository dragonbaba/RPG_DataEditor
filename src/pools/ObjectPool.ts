/**
 * Generic Object Pool implementation based on Zaun_Core.Pool
 * Optimized for performance with index-based tracking instead of array search.
 * Implements Requirements 4.1 and 4.2
 */

/**
 * Interface for poolable objects that can be reset and optionally initialized
 */
export interface Poolable {
  /** Reset the object state for reuse */
  reset(): void;
  /** Optional initialization method called when acquired */
  init?(arg?: unknown): void;
  /** Optional destroy method for cleanup */
  destroy?(): void;
}

/**
 * Statistics about the pool's current state
 */
export interface PoolStats {
  name: string;
  size: number;
  available: number;
  totalCreated: number;
  totalReturned: number;
  currentUsage: number;
}

/**
 * Generic Object Pool class that manages object lifecycle and reuse.
 * Uses index-based tracking for O(1) acquire/release operations.
 * 
 * @template T - The type of objects managed by this pool (must implement Poolable)
 * 
 * @example
 * ```typescript
 * class MyObject implements Poolable {
 *   value = 0;
 *   reset() { this.value = 0; }
 *   init(v: number) { this.value = v; }
 * }
 * 
 * const pool = new ObjectPool(MyObject, 100);
 * const obj = pool.get(42); // obj.value === 42
 * pool.return(obj);
 * ```
 */
export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private poolSize: number;
  private index: number = 0;
  private readonly classConstructor: new (arg?: unknown) => T;
  private totalCreated: number = 0;
  private totalReturned: number = 0;
  readonly name: string;

  /**
   * Creates an object pool
   * @param classConstructor - Constructor function for creating new objects
   * @param poolSize - Maximum pool size (default: 100)
   */
  constructor(classConstructor: new (arg?: unknown) => T, poolSize: number = 100) {
    this.classConstructor = classConstructor;
    this.poolSize = poolSize;
    this.name = classConstructor.name || 'AnonymousPool';
  }

  /**
   * Acquires an object from the pool. If no objects are available,
   * a new one is created. Calls init() if available.
   * 
   * @param arg - Optional argument passed to init()
   * @returns An object from the pool, ready for use
   */
  get(arg?: unknown): T {
    let item: T;

    if (this.index > 0) {
      // Reuse existing object from pool
      item = this.pool[--this.index];
    } else {
      // Create new object
      item = this.createItem(arg);
      this.totalCreated++;
    }

    // Initialize if method exists
    if (item.init) {
      item.init(arg);
    }

    return item;
  }

  /**
   * Creates a new object instance
   * @param arg - Optional argument passed to constructor
   * @returns New object instance
   */
  protected createItem(arg?: unknown): T {
    return new this.classConstructor(arg);
  }

  /**
   * Returns an object to the pool for reuse.
   * Calls reset() before storing.
   * 
   * @param target - The object to return to the pool
   */
  return(target: T): void {
    if (!target) {
      console.warn(`Attempted to return null/undefined to pool: ${this.name}`);
      return;
    }

    target.reset();
    this.pool[this.index++] = target;
    this.totalReturned++;
  }

  /**
   * Returns an object to the pool without calling reset().
   * Use when the object is already in a clean state.
   * 
   * @param target - The object to return to the pool
   */
  simpleReturn(target: T): void {
    if (!target) {
      console.warn(`Attempted to simple return null/undefined to pool: ${this.name}`);
      return;
    }

    this.pool[this.index++] = target;
    this.totalReturned++;
  }

  /**
   * Clears objects exceeding the pool size limit.
   * Calls destroy() on removed objects if available.
   */
  clear(): void {
    const pool = this.pool;
    const maxIndex = this.index;
    const poolSize = this.poolSize;

    if (maxIndex > poolSize) {
      for (let i = poolSize; i < maxIndex; i++) {
        const value = pool[i];
        if (value?.destroy) {
          value.destroy();
        }
      }
      this.index = poolSize;
      pool.length = poolSize;
    }
  }

  /**
   * Gets statistics about the current state of the pool.
   * 
   * @returns Object containing pool statistics
   */
  getStats(): PoolStats {
    return {
      name: this.name,
      size: this.poolSize,
      available: this.index,
      totalCreated: this.totalCreated,
      totalReturned: this.totalReturned,
      currentUsage: this.totalCreated - this.index,
    };
  }

  /**
   * Resizes the pool to a new maximum size.
   * If shrinking, excess objects are destroyed.
   * 
   * @param newSize - New maximum pool size
   */
  resize(newSize: number): void {
    if (newSize < 1) {
      console.warn(`Invalid pool size: ${newSize}, ignoring resize request`);
      return;
    }

    const oldSize = this.poolSize;

    if (newSize < oldSize) {
      const pool = this.pool;
      for (let i = newSize; i <= this.index; i++) {
        const value = pool[i];
        if (value?.destroy) {
          value.destroy();
        }
      }
      pool.length = newSize;
      this.index = Math.min(this.index, newSize - 1);
    }

    this.poolSize = newSize;
  }

  /**
   * Pre-allocates objects in the pool.
   * Useful for avoiding allocation during performance-critical operations.
   * 
   * @param count - Number of objects to pre-allocate
   * @param args - Arguments passed to constructor
   */
  preAllocate(count: number, ...args: unknown[]): void {
    const available = this.poolSize - this.index;

    if (count > available) {
      console.warn(
        `Cannot pre-allocate ${count} objects, only ${available} slots available in pool ${this.name}`
      );
      count = available;
    }

    for (let i = 0; i < count; i++) {
      const obj = new this.classConstructor(...args);
      this.totalCreated++;
      this.pool[this.index++] = obj;
    }
  }
}

/**
 * Factory-based Object Pool for objects that don't use class constructors.
 * Useful for DOM elements or plain objects.
 * 
 * @template T - The type of objects managed by this pool
 */
export class FactoryPool<T> {
  private pool: T[] = [];
  private poolSize: number;
  private index: number = 0;
  private readonly factory: () => T;
  private readonly resetFn: (obj: T) => void;
  private readonly destroyFn?: (obj: T) => void;
  private totalCreated: number = 0;
  private totalReturned: number = 0;
  readonly name: string;

  /**
   * Creates a factory-based object pool
   * @param name - Pool name for debugging
   * @param factory - Factory function to create new objects
   * @param resetFn - Function to reset objects before reuse
   * @param destroyFn - Optional function to destroy objects
   * @param poolSize - Maximum pool size (default: 100)
   */
  constructor(
    name: string,
    factory: () => T,
    resetFn: (obj: T) => void,
    destroyFn?: (obj: T) => void,
    poolSize: number = 100
  ) {
    this.name = name;
    this.factory = factory;
    this.resetFn = resetFn;
    this.destroyFn = destroyFn;
    this.poolSize = poolSize;
  }

  /**
   * Acquires an object from the pool.
   * @returns An object from the pool, ready for use
   */
  get(): T {
    if (this.index > 0) {
      return this.pool[--this.index];
    }

    this.totalCreated++;
    return this.factory();
  }

  /**
   * Returns an object to the pool for reuse.
   * @param target - The object to return to the pool
   */
  return(target: T): void {
    if (!target) {
      console.warn(`Attempted to return null/undefined to pool: ${this.name}`);
      return;
    }

    this.resetFn(target);
    this.pool[this.index++] = target;
    this.totalReturned++;
  }

  /**
   * Returns an object without resetting it.
   * @param target - The object to return to the pool
   */
  simpleReturn(target: T): void {
    if (!target) {
      console.warn(`Attempted to simple return null/undefined to pool: ${this.name}`);
      return;
    }

    this.pool[this.index++] = target;
    this.totalReturned++;
  }

  /**
   * Clears objects exceeding the pool size limit.
   */
  clear(): void {
    const pool = this.pool;
    const maxIndex = this.index;
    const poolSize = this.poolSize;

    if (maxIndex > poolSize) {
      if (this.destroyFn) {
        for (let i = poolSize; i < maxIndex; i++) {
          this.destroyFn(pool[i]);
        }
      }
      this.index = poolSize;
      pool.length = poolSize;
    }
  }

  /**
   * Gets statistics about the current state of the pool.
   */
  getStats(): PoolStats {
    return {
      name: this.name,
      size: this.poolSize,
      available: this.index,
      totalCreated: this.totalCreated,
      totalReturned: this.totalReturned,
      currentUsage: this.totalCreated - this.index,
    };
  }

  /**
   * Pre-allocates objects in the pool.
   * @param count - Number of objects to pre-allocate
   */
  preAllocate(count: number): void {
    const available = this.poolSize - this.index;

    if (count > available) {
      console.warn(
        `Cannot pre-allocate ${count} objects, only ${available} slots available in pool ${this.name}`
      );
      count = available;
    }

    for (let i = 0; i < count; i++) {
      const obj = this.factory();
      this.resetFn(obj);
      this.totalCreated++;
      this.pool[this.index++] = obj;
    }
  }

  /**
   * Resizes the pool to a new maximum size.
   * @param newSize - New maximum pool size
   */
  resize(newSize: number): void {
    if (newSize < 1) {
      console.warn(`Invalid pool size: ${newSize}, ignoring resize request`);
      return;
    }

    if (newSize < this.poolSize) {
      const pool = this.pool;
      if (this.destroyFn) {
        for (let i = newSize; i <= this.index; i++) {
          this.destroyFn(pool[i]);
        }
      }
      pool.length = newSize;
      this.index = Math.min(this.index, newSize - 1);
    }

    this.poolSize = newSize;
  }
}
