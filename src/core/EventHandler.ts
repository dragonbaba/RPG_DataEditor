/**
 * Event Handler - 事件处理器基类
 * 使用预创建的绑定方法，避免运行时创建函数
 * 
 * 核心约束：
 * - 禁止在事件处理中创建新函数
 * - 使用预创建的绑定方法
 * - 统一事件管理
 */

export abstract class EventHandler {
  protected readonly boundHandleEvent: (event: Event) => void;

  constructor() {
    this.boundHandleEvent = this.handleEvent.bind(this);
  }

  protected abstract handleEvent(event: Event): void;

  protected bindEvent(element: EventTarget, eventType: string): void {
    element.addEventListener(eventType, this.boundHandleEvent);
  }

  protected unbindEvent(element: EventTarget, eventType: string): void {
    element.removeEventListener(eventType, this.boundHandleEvent);
  }

  protected bindEvents(element: EventTarget, events: { type: string; handler?: EventListener }[]): void {
    for (const evt of events) {
      this.bindEvent(element, evt.type);
    }
  }

  protected unbindEvents(element: EventTarget, events: { type: string; handler?: EventListener }[]): void {
    for (const evt of events) {
      this.unbindEvent(element, evt.type);
    }
  }

  abstract init(): void;

  abstract destroy(): void;
}

/**
 * 复合事件处理器
 * 管理多个相关事件
 */
export class CompositeEventHandler extends EventHandler {
  private readonly handlers: Map<EventTarget, Map<string, EventListener>> = new Map();

  protected handleEvent(event: Event): void {
    const target = event.currentTarget as EventTarget;
    const eventType = event.type;
    const handlerMap = this.handlers.get(target);
    if (handlerMap) {
      const handler = handlerMap.get(eventType);
      if (handler) {
        handler(event);
      }
    }
  }

  addHandler(element: EventTarget, eventType: string, handler: EventListener): void {
    if (!this.handlers.has(element)) {
      this.handlers.set(element, new Map());
    }
    this.handlers.get(element)!.set(eventType, handler);
    this.bindEvent(element, eventType);
  }

  removeHandler(element: EventTarget, eventType: string): void {
    this.unbindEvent(element, eventType);
    const handlerMap = this.handlers.get(element);
    if (handlerMap) {
      handlerMap.delete(eventType);
      if (handlerMap.size === 0) {
        this.handlers.delete(element);
      }
    }
  }

  init(): void {
  }

  destroy(): void {
    for (const [element, handlerMap] of this.handlers) {
      for (const eventType of handlerMap.keys()) {
        this.unbindEvent(element, eventType);
      }
    }
    this.handlers.clear();
  }
}

/**
 * 静态事件处理注册表
 * 用于预定义的事件处理
 */
export const EventHandlers = {
  sidebar: {
    toggle: (event: Event): void => {
      const customEvent = new CustomEvent('sidebar:toggle');
      window.dispatchEvent(customEvent);
    },
    expand: (event: Event): void => {
      const customEvent = new CustomEvent('sidebar:expand');
      window.dispatchEvent(customEvent);
    },
    collapse: (event: Event): void => {
      const customEvent = new CustomEvent('sidebar:collapse');
      window.dispatchEvent(customEvent);
    },
  },

  panel: {
    property: (event: Event): void => {
      const customEvent = new CustomEvent('panel:switch', { detail: { panel: 'property' } });
      window.dispatchEvent(customEvent);
    },
    note: (event: Event): void => {
      const customEvent = new CustomEvent('panel:switch', { detail: { panel: 'note' } });
      window.dispatchEvent(customEvent);
    },
    quest: (event: Event): void => {
      const customEvent = new CustomEvent('panel:switch', { detail: { panel: 'quest' } });
      window.dispatchEvent(customEvent);
    },
    projectile: (event: Event): void => {
      const customEvent = new CustomEvent('panel:switch', { detail: { panel: 'projectile' } });
      window.dispatchEvent(customEvent);
    },
  },

  file: {
    open: (event: Event): void => {
      const customEvent = new CustomEvent('file:open');
      window.dispatchEvent(customEvent);
    },
    save: (event: Event): void => {
      const customEvent = new CustomEvent('file:save');
      window.dispatchEvent(customEvent);
    },
    saveAs: (event: Event): void => {
      const customEvent = new CustomEvent('file:saveas');
      window.dispatchEvent(customEvent);
    },
  },

  theme: {
    toggle: (event: Event): void => {
      const customEvent = new CustomEvent('theme:toggle');
      window.dispatchEvent(customEvent);
    },
    settings: (event: Event): void => {
      const customEvent = new CustomEvent('theme:settings');
      window.dispatchEvent(customEvent);
    },
  },
};

export default EventHandler;
