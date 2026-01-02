/**
 * 侧边栏动画控制器
 * 使用预创建的 Motion 和回调函数
 */

import { createMotion, Motion } from '../utils/animation';
import { delay } from '../utils/runner';
import { DOM } from './DOMManager';

export class SidebarAnimator {
  // 预创建的 Motion 实例
  private readonly slideInMotion: Motion;
  private readonly slideOutMotion: Motion;

  // 当前动画状态
  private isExpanded = true;
  private isAnimating = false;

  constructor() {
    this.slideInMotion = this.buildSlideInMotion();
    this.slideOutMotion = this.buildSlideOutMotion();
  }

  private buildSlideInMotion(): Motion {
    return createMotion()
      .setAnimation(0, 260, 'easeOutBack')
      .setFrames(16)
      .onUpdate(SidebarAnimator.callbacks.slideIn)
      .autoReturn(false);
  }

  private buildSlideOutMotion(): Motion {
    return createMotion()
      .setAnimation(260, 0, 'easeInBack')
      .setFrames(16)
      .onUpdate(SidebarAnimator.callbacks.slideOut)
      .autoReturn(false);
  }

  toggle(): void {
    if (this.isAnimating) return;

    // A simple lock to prevent spamming.
    // A more robust solution would use onComplete callbacks.
    this.isAnimating = true;
    // 使用 GlobalRunner.delay 替代 setTimeout
    delay(() => {
      this.isAnimating = false;
    }, 16); // 16 frames is approx 266ms at 60fps

    if (this.isExpanded) {
      this.slideOutMotion.start();
    } else {
      this.slideInMotion.start();
    }
    this.isExpanded = !this.isExpanded;
  }

  // 预创建的回调函数（静态）
  private static readonly callbacks = {
    slideIn: (values: Float32Array): void => {
      const sidebar = DOM.leftPanel;
      if (sidebar) {
        sidebar.style.flex = `0 0 ${values[0]}px`;
      }
    },
    slideOut: (values: Float32Array): void => {
      const sidebar = DOM.leftPanel;
      if (sidebar) {
        sidebar.style.flex = `0 0 ${values[0]}px`;
      }
    },
  };
}