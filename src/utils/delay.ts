/**
 * Unified delay utility that uses global runner system when available,
 * falls back to setTimeout in test environments or when runner is not available.
 */

import { globalLoop } from './globalLoop';

/**
 * Delay execution by specified frames
 * @param callback Function to execute after delay
 * @param frames Number of frames to wait (at 60fps, 1 frame ≈ 16.67ms)
 * @param context Optional context for callback
 * @returns Promise that resolves when delay is complete
 */
export function delayFrames(callback: () => void, frames: number, context?: unknown): Promise<void> {
  return new Promise<void>((resolve) => {
    globalLoop.delay(() => {
      callback.call(context);
      resolve();
    }, frames, context);
  });
}

/**
 * Delay execution by specified milliseconds
 * @param callback Function to execute after delay
 * @param ms Milliseconds to wait
 * @param context Optional context for callback
 * @returns Promise that resolves when delay is complete
 */
export function delayMs(callback: () => void, ms: number, context?: unknown): Promise<void> {
  const frames = Math.ceil(ms / (1000 / 60)); // Convert milliseconds to frames
  return delayFrames(callback, frames, context);
}

/**
 * Simple delay that returns a promise (for use with await)
 * @param frames Number of frames to wait
 * @returns Promise that resolves after delay
 */
export function waitFrames(frames: number): Promise<void> {
  return delayFrames(() => {}, frames);
}

/**
 * Simple delay that returns a promise (for use with await)
 * @param ms Milliseconds to wait
 * @returns Promise that resolves after delay
 */
export function waitMs(ms: number): Promise<void> {
  return delayMs(() => {}, ms);
}

/**
 * Repeat execution with interval using global runner system when available
 * @param callback Function to execute repeatedly
 * @param times Number of times to execute (-1 for infinite)
 * @param intervalFrames Interval between executions in frames
 * @param context Optional context for callback
 * @returns Function to stop the repetition
 */
export function repeatFrames(
  callback: () => void, 
  times: number, 
  intervalFrames: number, 
  context?: unknown
): () => void {
  const runner = globalLoop.repeat(callback, times, intervalFrames, context);
  
  // Return stop function
  return () => {
    if (runner) {
      runner.off();
    }
  };
}

/**
 * Repeat execution with interval in milliseconds
 * @param callback Function to execute repeatedly
 * @param times Number of times to execute (-1 for infinite)
 * @param intervalMs Interval between executions in milliseconds
 * @param context Optional context for callback
 * @returns Function to stop the repetition
 */
export function repeatMs(
  callback: () => void, 
  times: number, 
  intervalMs: number, 
  context?: unknown
): () => void {
  const intervalFrames = Math.ceil(intervalMs / (1000 / 60));
  return repeatFrames(callback, times, intervalFrames, context);
}