/**
 * 面板动画控制器
 * 使用预创建的 Motion 实现面板切换动画
 * 
 * Enhanced for editor-modernization:
 * - Better state management and error handling
 * - Improved animation performance
 * - Race condition protection
 */

import { createMotion, Motion } from '../utils/animation';
import { delay } from '../utils/runner';
import { logger } from '../services/logger';

export class PanelAnimator {
  // 预创建的 Motion 实例
  private readonly fadeInMotion: Motion;
  private readonly fadeOutMotion: Motion;

  private currentPanel: HTMLElement | null = null;
  private isAnimating = false;

  constructor() {
    this.fadeInMotion = this.buildFadeInMotion();
    this.fadeOutMotion = this.buildFadeOutMotion();
  }

  private buildFadeInMotion(): Motion {
    return createMotion()
      .setAnimation(0, 1, 'linear')
      .setFrames(8)
      .onUpdate(PanelAnimator.onFade)
      .autoReturn(false);
  }

  private buildFadeOutMotion(): Motion {
    return createMotion()
      .setAnimation(1, 0, 'linear')
      .setFrames(8)
      .onUpdate(PanelAnimator.onFade)
      .autoReturn(false);
  }

  async switchPanel(newPanel: HTMLElement): Promise<void> {
    if (this.currentPanel === newPanel) {
      return;
    }

    // 防止并发动画
    if (this.isAnimating) {
      logger.warn('Panel animation already in progress', undefined, 'PanelAnimator');
      return;
    }

    this.isAnimating = true;

    try {
      if (this.currentPanel) {
        await this.hidePanel(this.currentPanel);
      }

      this.currentPanel = newPanel;
      await this.showPanel(this.currentPanel);
    } catch (error) {
      logger.error('Panel animation failed', { error }, 'PanelAnimator');
      // 确保面板至少是可见的，即使动画失败
      if (newPanel) {
        this.forceShowPanel(newPanel);
        this.currentPanel = newPanel;
      }
    } finally {
      this.isAnimating = false;
    }
  }

  /** Gets the currently visible panel */
  getCurrentPanel(): HTMLElement | null {
    return this.currentPanel;
  }

  /** Force sets the current panel (used for initialization sync) */
  forceSetCurrentPanel(panel: HTMLElement | null): void {
    this.currentPanel = panel;
    if (panel) {
      this.forceShowPanel(panel);
    }
  }

  /** Gets whether animator is currently animating */
  isCurrentlyAnimating(): boolean {
    return this.isAnimating;
  }

  /** Force show panel without animation (fallback) */
  private forceShowPanel(panel: HTMLElement): void {
    panel.classList.remove('hidden');
    panel.style.display = '';
    panel.style.opacity = '1';
    panel.style.visibility = 'visible';
    panel.style.pointerEvents = '';
  }

  /** Force hide panel without animation (fallback) */
  private forceHidePanel(panel: HTMLElement): void {
    panel.classList.add('hidden');
    panel.style.display = 'none';
    panel.style.opacity = '0';
    panel.style.visibility = 'hidden';
    panel.style.pointerEvents = 'none';
  }

  showPanel(panel: HTMLElement): Promise<void> {
    panel.classList.remove('hidden');
    panel.style.display = ''; // Clear forced hidden style
    panel.style.visibility = 'visible';
    panel.style.pointerEvents = '';
    panel.style.opacity = '0';

    return new Promise((resolve, _reject) => {
      const timeoutRunner = delay(() => {
        logger.warn('Panel show animation timeout', undefined, 'PanelAnimator');
        this.forceShowPanel(panel);
        resolve();
      }, 60); // 1 second at 60fps

      // Force opacity to 1 on completion to ensure visibility
      this.fadeInMotion.onComplete(() => {
        timeoutRunner.off(); // Cancel timeout
        panel.style.opacity = '1';
        resolve();
      }).start(panel);
    });
  }

  hidePanel(panel: HTMLElement): Promise<void> {
    return new Promise((resolve, _reject) => {
      const timeoutRunner = delay(() => {
        logger.warn('Panel hide animation timeout', undefined, 'PanelAnimator');
        this.forceHidePanel(panel);
        resolve();
      }, 60); // 1 second at 60fps

      this.fadeOutMotion.onComplete(() => {
        timeoutRunner.off(); // Cancel timeout
        panel.classList.add('hidden');
        panel.style.visibility = 'hidden';
        panel.style.pointerEvents = 'none';
        resolve();
      }).start(panel);
    });
  }

  // Define callback with target parameter
  private static onFade(values: Float32Array, target?: unknown): void {
    const panel = target as HTMLElement;
    if (panel && panel.style) {
      panel.style.opacity = String(values[0]);
    }
  }
}
