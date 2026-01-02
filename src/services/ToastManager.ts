import { ObjectPool, Poolable } from '../pools/ObjectPool';
import { acquireToast, releaseToast } from '../pools/DOMPools';
import { BaseRunner, delay } from '../utils/runner';

const TOAST_REMOVE_FRAMES = 180;
const TOAST_FADE_FRAMES = 18;
const TOAST_FADE_DELAY_FRAMES = Math.max(0, TOAST_REMOVE_FRAMES - TOAST_FADE_FRAMES);

const TOAST_CLASS_ERROR = 'toast bg-red-900 text-white px-4 py-2 rounded shadow-lg animate-fade-in';
const TOAST_CLASS_INFO = 'toast bg-gray-800 text-white px-4 py-2 rounded shadow-lg animate-fade-in';

class ToastEntry implements Poolable {
  element: HTMLDivElement | null = null;
  container: HTMLElement | null = null;
  fadeRunner: BaseRunner | null = null;
  removeRunner: BaseRunner | null = null;

  init(container?: unknown): void {
    this.container = (container as HTMLElement) || null;
    if (!this.element) {
      this.element = acquireToast();
    }
  }

  reset(): void {
    if (this.fadeRunner) {
      this.fadeRunner.off();
      this.fadeRunner = null;
    }
    if (this.removeRunner) {
      this.removeRunner.off();
      this.removeRunner = null;
    }
    if (this.element) {
      this.element.remove();
      releaseToast(this.element);
      this.element = null;
    }
    this.container = null;
  }

  setup(message: string, className: string): void {
    if (!this.element || !this.container) return;
    this.element.className = className;
    this.element.textContent = message;
    this.container.appendChild(this.element);
  }
}

const toastPool = new ObjectPool(ToastEntry, 20);

function beginToastFade(this: ToastEntry): void {
  if (!this.element) return;
  this.element.classList.add('animate-fade-out');
}

function removeToast(this: ToastEntry): void {
  if (!this.element) return;
  this.element.remove();
}

function finalizeToast(this: ToastEntry): void {
  toastPool.return(this);
}

export function showErrorToast(message: string): void {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const entry = toastPool.get(container);
  entry.setup(message, TOAST_CLASS_ERROR);

  entry.fadeRunner = delay(beginToastFade, TOAST_FADE_DELAY_FRAMES, entry);
  entry.removeRunner = delay(removeToast, TOAST_REMOVE_FRAMES, entry);
  entry.removeRunner.onComplete(finalizeToast);
}

export function showInfoToast(message: string): void {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const entry = toastPool.get(container);
  entry.setup(message, TOAST_CLASS_INFO);

  entry.fadeRunner = delay(beginToastFade, TOAST_FADE_DELAY_FRAMES, entry);
  entry.removeRunner = delay(removeToast, TOAST_REMOVE_FRAMES, entry);
  entry.removeRunner.onComplete(finalizeToast);
}
