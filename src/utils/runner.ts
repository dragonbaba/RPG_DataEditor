/**
 * Runner System - frame-based scheduler.
 * Based on Zaun_Core.js runner pool design.
 * Uses object pools to reduce GC pressure.
 */

import { ObjectPool, Poolable } from '../pools/ObjectPool';

// ============ Runner Type Enum ============

export const enum RunnerType {
  /** Loop with wait */
  LoopWithWait = 1,
  /** Loop without wait */
  LoopWithoutWait = 2,
  /** Limited loop with wait */
  LimitWithWait = 3,
  /** Limited loop without wait */
  LimitWithoutWait = 4,
}

// ============ Callback Types ============

export type RunnerCallback = (loopTime?: number) => void;
export type RunnerCompleteCallback = () => void;

// ============ BaseRunner ============

/**
 * BaseRunner for all runner types.
 */
export abstract class BaseRunner implements Poolable {
  /** Runner type */
  abstract readonly runnerType: RunnerType;

  /** Callback function */
  callback: RunnerCallback | null = null;

  /** Completion callback */
  completeCallback: RunnerCompleteCallback | null = null;

  /** Auto return to pool */
  isReturnToPool = true;

  /** Bound context */
  context: unknown = null;

  /**
   * Set completion callback.
   */
  onComplete(callback: RunnerCompleteCallback): this {
    this.completeCallback = callback;
    return this;
  }

  /**
   * Trigger callback.
   */
  protected trigger(loopTime = 0): void {
    if (this.callback) {
      this.callback.call(this.context, loopTime);
    }
  }

  /**
   * Stop and trigger completion callback.
   */
  off(): this {
    this.runComplete();
    GlobalRunner.off(this);
    return this;
  }

  /**
   * Configure auto return behavior.
   */
  autoReturn(isReturn = true): this {
    this.isReturnToPool = isReturn;
    return this;
  }

  /**
   * Run completion callback.
   */
  protected runComplete(): void {
    if (this.completeCallback) {
      this.completeCallback.call(this.context);
      this.completeCallback = null;
    }
    this.callback = null;
  }

  /**
   * Update (implemented by subclasses).
   */
  abstract update(): void;

  /**
   * Initialize (implemented by subclasses).
   */
  abstract on(callback: RunnerCallback, context?: unknown, ...args: number[]): this;

  /**
   * Reset state.
   */
  reset(): void {
    this.callback = null;
    this.completeCallback = null;
    this.context = null;
    this.isReturnToPool = true;
  }
}

// ============ LoopWithWaitRunner ============

/**
 * Loop with wait - triggers every waitCount frames, infinite.
 */
export class LoopWithWaitRunner extends BaseRunner {
  readonly runnerType = RunnerType.LoopWithWait;
  waitCount = 0;
  count = -1;

  on(callback: RunnerCallback, context?: unknown, waitCount = 1): this {
    this.callback = callback;
    this.context = context;
    this.waitCount = waitCount;
    this.count = -1;
    return this;
  }

  update(): void {
    this.count++;
    if (this.count >= this.waitCount) {
      this.count = -1;
      this.trigger();
    }
  }

  reset(): void {
    super.reset();
    this.waitCount = 0;
    this.count = -1;
  }
}

// ============ LoopWithoutWaitRunner ============

/**
 * Loop without wait - triggers every frame, infinite.
 */
export class LoopWithoutWaitRunner extends BaseRunner {
  readonly runnerType = RunnerType.LoopWithoutWait;

  on(callback: RunnerCallback, context?: unknown): this {
    this.callback = callback;
    this.context = context;
    return this;
  }

  update(): void {
    this.trigger();
  }
}

// ============ LimitWithWaitRunner ============

/**
 * Limited loop with wait - triggers every waitCount frames, loopTime times.
 */
export class LimitWithWaitRunner extends BaseRunner {
  readonly runnerType = RunnerType.LimitWithWait;
  waitCount = 0;
  count = -1;
  loopTime = 0;

  on(callback: RunnerCallback, context?: unknown, waitCount = 1, loopTime = 1): this {
    this.callback = callback;
    this.context = context;
    this.waitCount = waitCount;
    this.loopTime = loopTime;
    this.count = -1;
    return this;
  }

  update(): void {
    this.count++;
    if (this.count >= this.waitCount) {
      this.count = -1;
      if (this.loopTime > 0) {
        this.loopTime--;
        this.trigger(this.loopTime);
        if (this.loopTime === 0) {
          this.off();
        }
      }
    }
  }

  reset(): void {
    super.reset();
    this.waitCount = 0;
    this.count = -1;
    this.loopTime = 0;
  }
}

// ============ LimitWithoutWaitRunner ============

/**
 * Limited loop without wait - triggers every frame, loopTime times.
 */
export class LimitWithoutWaitRunner extends BaseRunner {
  readonly runnerType = RunnerType.LimitWithoutWait;
  loopTime = 0;

  on(callback: RunnerCallback, context?: unknown, loopTime = 1): this {
    this.callback = callback;
    this.context = context;
    this.loopTime = loopTime;
    return this;
  }

  update(): void {
    if (this.loopTime > 0) {
      this.loopTime--;
      this.trigger(this.loopTime);
      if (this.loopTime === 0) {
        this.off();
      }
    }
  }

  reset(): void {
    super.reset();
    this.loopTime = 0;
  }
}

// ============ RunnerPool ============

/**
 * Runner pool manager.
 */
class RunnerPoolManager {
  private loopWithWaitPool = new ObjectPool(LoopWithWaitRunner, 30);
  private loopWithoutWaitPool = new ObjectPool(LoopWithoutWaitRunner, 30);
  private limitWithWaitPool = new ObjectPool(LimitWithWaitRunner, 30);
  private limitWithoutWaitPool = new ObjectPool(LimitWithoutWaitRunner, 30);

  /**
   * Get an appropriate runner by parameters.
   * @param callback Callback function
   * @param context Callback context
   * @param waitCount Wait frames (0=every frame, >0=interval frames)
   * @param loopTime Loop count (-1=infinite, >0=limited)
   */
  get(
    callback: RunnerCallback,
    context?: unknown,
    waitCount = 0,
    loopTime = -1
  ): BaseRunner {
    if (waitCount > 0 && loopTime > 0) {
      return this.limitWithWaitPool.get().on(callback, context, waitCount, loopTime);
    } else if (waitCount > 0 && loopTime === -1) {
      return this.loopWithWaitPool.get().on(callback, context, waitCount);
    } else if (loopTime > 0) {
      return this.limitWithoutWaitPool.get().on(callback, context, loopTime);
    } else {
      return this.loopWithoutWaitPool.get().on(callback, context);
    }
  }

  /**
   * Return runner to the matching pool.
   */
  return(runner: BaseRunner): void {
    switch (runner.runnerType) {
      case RunnerType.LoopWithWait:
        this.loopWithWaitPool.return(runner as LoopWithWaitRunner);
        break;
      case RunnerType.LoopWithoutWait:
        this.loopWithoutWaitPool.return(runner as LoopWithoutWaitRunner);
        break;
      case RunnerType.LimitWithWait:
        this.limitWithWaitPool.return(runner as LimitWithWaitRunner);
        break;
      case RunnerType.LimitWithoutWait:
        this.limitWithoutWaitPool.return(runner as LimitWithoutWaitRunner);
        break;
    }
  }

  /**
   * Clear all pools.
   */
  clear(): void {
    this.loopWithWaitPool.clear();
    this.loopWithoutWaitPool.clear();
    this.limitWithWaitPool.clear();
    this.limitWithoutWaitPool.clear();
  }
}

const runnerPool = new RunnerPoolManager();

// ============ RunnerSystem ============

/**
 * Runner system - manages active runners.
 */
export class RunnerSystem {
  private runners: BaseRunner[] = [];
  private count = 0;

  /**
   * Add a runner.
   * @param callback Callback function
   * @param context Callback context
   * @param waitCount Wait frames
   * @param loopTime Loop count
   */
  on(
    callback: RunnerCallback,
    context?: unknown,
    waitCount = 0,
    loopTime = -1
  ): BaseRunner {
    const runner = runnerPool.get(callback, context, waitCount, loopTime);
    this.runners[this.count++] = runner;
    return runner;
  }

  /**
   * Remove a runner.
   */
  off(runner: BaseRunner): void {
    const index = this.runners.indexOf(runner);
    if (index !== -1) {
      this.runners.splice(index, 1);
      this.count--;
    }
    if (runner.isReturnToPool) {
      runnerPool.return(runner);
    }
  }

  /**
   * Add an existing runner instance.
   */
  put(runner: BaseRunner): void {
    if (!this.runners.includes(runner)) {
      this.runners[this.count++] = runner;
    }
  }

  /**
   * Update all runners.
   */
  update(): void {
    if (this.count === 0) return;

    let i = 0;
    while (i < this.count) {
      const runner = this.runners[i];
      if (runner) {
        runner.update();
      }

      if (this.runners[i] !== runner) {
        continue;
      }

      i++;
    }
  }

  /**
   * Clear all runners.
   */
  clear(): void {
    for (let i = 0; i < this.count; i++) {
      const runner = this.runners[i];
      if (runner && runner.isReturnToPool) {
        runnerPool.return(runner);
      }
    }
    this.runners.length = 0;
    this.count = 0;
  }

  /**
   * Get current runner count.
   */
  getCount(): number {
    return this.count;
  }
}

// ============ Global Runner Instance ============

/**
 * Global runner system singleton.
 */
export const GlobalRunner = new RunnerSystem();

// ============ Helpers ============

/**
 * Delay execution (once).
 * @param callback Callback function
 * @param frames Delay frames
 * @param context Callback context
 */
export function delay(callback: RunnerCallback, frames: number, context?: unknown): BaseRunner {
  return GlobalRunner.on(callback, context, frames, 1);
}

/**
 * Repeat execution (limited).
 * @param callback Callback function
 * @param times Execution count
 * @param interval Interval frames
 * @param context Callback context
 */
export function repeat(
  callback: RunnerCallback,
  times: number,
  interval = 1,
  context?: unknown
): BaseRunner {
  return GlobalRunner.on(callback, context, interval, times);
}

/**
 * Run every frame.
 * @param callback Callback function
 * @param context Callback context
 */
export function everyFrame(callback: RunnerCallback, context?: unknown): BaseRunner {
  return GlobalRunner.on(callback, context, 0, -1);
}

export default GlobalRunner;
