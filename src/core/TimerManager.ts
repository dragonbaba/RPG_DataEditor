/**
 * Timer Manager - 定时任务管理器
 * 使用 GlobalRunner 替代 setTimeout/requestAnimationFrame
 * 
 * 核心约束：
 * - 禁止使用 setTimeout（使用 GlobalRunner.delay）
 * - 禁止使用 requestAnimationFrame（使用 GlobalRunner.everyFrame）
 * - 预创建 Runner 实例
 */

import { GlobalRunner, BaseRunner, everyFrame, repeat, delay } from '../utils/runner';
import { Callbacks } from '../utils/callbackRegistry';

export class TimerManager {
  private static readonly AUTO_SAVE_INTERVAL_FRAMES = 1800;
  private static readonly STATUS_UPDATE_INTERVAL_FRAMES = 1;
  private static readonly SCROLL_SYNC_INTERVAL_FRAMES = 2;
  private static readonly PULSE_EFFECT_INTERVAL_FRAMES = 1;

  private autoSaveRunner: BaseRunner | null = null;
  private statusUpdateRunner: BaseRunner | null = null;
  private scrollSyncRunner: BaseRunner | null = null;
  private pulseEffectRunner: BaseRunner | null = null;

  private readonly boundAutoSave: () => void;
  private readonly boundStatusUpdate: () => void;
  private readonly boundScrollSync: () => void;
  private readonly boundPulseEffect: () => void;

  constructor() {
    this.boundAutoSave = Callbacks.autoSave;
    this.boundStatusUpdate = Callbacks.statusUpdate;
    this.boundScrollSync = Callbacks.scrollSync;
    this.boundPulseEffect = Callbacks.pulseEffect;
  }

  startAutoSave(): void {
    if (this.autoSaveRunner) return;
    this.autoSaveRunner = repeat(
      this.boundAutoSave,
      Infinity,
      TimerManager.AUTO_SAVE_INTERVAL_FRAMES
    );
  }

  stopAutoSave(): void {
    if (this.autoSaveRunner) {
      GlobalRunner.off(this.autoSaveRunner);
      this.autoSaveRunner = null;
    }
  }

  startStatusUpdate(): void {
    if (this.statusUpdateRunner) return;
    this.statusUpdateRunner = everyFrame(this.boundStatusUpdate);
  }

  stopStatusUpdate(): void {
    if (this.statusUpdateRunner) {
      GlobalRunner.off(this.statusUpdateRunner);
      this.statusUpdateRunner = null;
    }
  }

  startScrollSync(): void {
    if (this.scrollSyncRunner) return;
    this.scrollSyncRunner = repeat(
      this.boundScrollSync,
      Infinity,
      TimerManager.SCROLL_SYNC_INTERVAL_FRAMES
    );
  }

  stopScrollSync(): void {
    if (this.scrollSyncRunner) {
      GlobalRunner.off(this.scrollSyncRunner);
      this.scrollSyncRunner = null;
    }
  }

  startPulseEffect(): void {
    if (this.pulseEffectRunner) return;
    this.pulseEffectRunner = everyFrame(this.boundPulseEffect);
  }

  stopPulseEffect(): void {
    if (this.pulseEffectRunner) {
      GlobalRunner.off(this.pulseEffectRunner);
      this.pulseEffectRunner = null;
    }
  }

  schedule(callback: () => void, frames: number): void {
    delay(callback, frames);
  }

  scheduleRepeating(callback: () => void, times: number, interval: number): BaseRunner {
    return repeat(callback, times, interval);
  }

  startAllTimers(): void {
    this.startAutoSave();
    this.startStatusUpdate();
    this.startScrollSync();
    this.startPulseEffect();
  }

  stopAllTimers(): void {
    this.stopAutoSave();
    this.stopStatusUpdate();
    this.stopScrollSync();
    this.stopPulseEffect();
  }

  clear(): void {
    this.stopAllTimers();
  }

  isAutoSaveRunning(): boolean {
    return this.autoSaveRunner !== null;
  }

  isStatusUpdateRunning(): boolean {
    return this.statusUpdateRunner !== null;
  }

  isScrollSyncRunning(): boolean {
    return this.scrollSyncRunner !== null;
  }

  isPulseEffectRunning(): boolean {
    return this.pulseEffectRunner !== null;
  }
}

export const timerManager = new TimerManager();
export default timerManager;
