/**
 * DisabledManager - UI禁用状态管理器
 *
 * 提供统一的UI元素禁用/启用功能
 * 参考 oldCode/main.js DisabledManager (lines 2051-2070)
 */

import { logger } from './logger';

/** 禁用状态管理器接口 */
interface DisabledManagerInterface {
  apply(element: HTMLElement, disabled: boolean): void;
  applyBatch(elements: HTMLElement[] | NodeListOf<HTMLElement>, disabled: boolean): void;
}

/**
 * 禁用管理器实现
 */
const DisabledManager: DisabledManagerInterface = {
  /**
   * 应用禁用状态到单个元素
   */
  apply(element: HTMLElement, disabled: boolean): void {
    if (!element) return;

    if ('disabled' in element) {
      (element as HTMLInputElement | HTMLSelectElement | HTMLButtonElement).disabled = disabled;
    }

    element.classList.toggle('ui-disabled', disabled);
    element.style.cursor = disabled ? 'not-allowed' : '';

    logger.debug('DisabledManager applied', { disabled, tagName: element.tagName }, 'DisabledManager');
  },

  /**
   * 批量应用禁用状态
   */
  applyBatch(elements: HTMLElement[] | NodeListOf<HTMLElement>, disabled: boolean): void {
    if (!elements) return;

    const elementArray = Array.isArray(elements) ? elements : Array.from(elements);
    for (let i = 0; i < elementArray.length; i++) {
      DisabledManager.apply(elementArray[i], disabled);
    }
  }
};

/**
 * 便捷函数：禁用元素
 */
export function disableElement(element: HTMLElement): void {
  DisabledManager.apply(element, true);
}

/**
 * 便捷函数：启用元素
 */
export function enableElement(element: HTMLElement): void {
  DisabledManager.apply(element, false);
}

/**
 * 便捷函数：批量禁用元素
 */
export function disableElements(elements: HTMLElement[] | NodeListOf<HTMLElement>): void {
  DisabledManager.applyBatch(elements, true);
}

/**
 * 便捷函数：批量启用元素
 */
export function enableElements(elements: HTMLElement[] | NodeListOf<HTMLElement>): void {
  DisabledManager.applyBatch(elements, false);
}

export default DisabledManager;
