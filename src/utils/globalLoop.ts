/**
 * Global Animation Loop - global animation frame manager
 *
 * Core: only one requestAnimationFrame entry point.
 * - GlobalRunner.update() for timers/events
 * - GlobalMotion.update() for animations
 */

import { GlobalRunner, delay, repeat, everyFrame, type RunnerCallback } from './runner';
import { GlobalMotion } from './animation';

class GlobalAnimationLoop {
  private animationFrameId: number | null = null;
  private isRunning = false;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tick();
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    GlobalRunner.update();
    GlobalMotion.update();

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getRunnerCount(): number {
    return GlobalRunner.getCount();
  }

  // 直接暴露 runner 系统的接口，不需要动态导入
  delay(callback: RunnerCallback, frames: number, context?: unknown) {
    if (this.isRunning) {
      return delay(callback, frames, context);
    } else {
      // 如果 loop 没运行，用 setTimeout 作为 fallback
      const ms = frames * (1000 / 60);
      setTimeout(() => callback.call(context), ms);
      return null;
    }
  }

  repeat(callback: RunnerCallback, times: number, interval = 1, context?: unknown) {
    if (this.isRunning) {
      return repeat(callback, times, interval, context);
    } else {
      // 如果 loop 没运行，用 setInterval 作为 fallback
      let count = 0;
      const ms = interval * (1000 / 60);
      const intervalId = setInterval(() => {
        callback.call(context);
        count++;
        if (count >= times) {
          clearInterval(intervalId);
        }
      }, ms);
      return null;
    }
  }

  everyFrame(callback: RunnerCallback, context?: unknown) {
    if (this.isRunning) {
      return everyFrame(callback, context);
    }
    return null;
  }

  clear(): void {
    this.stop();
    GlobalRunner.clear();
    GlobalMotion.clear();
  }
}

export const globalLoop = new GlobalAnimationLoop();

export default globalLoop;
