/**
 * MetaDataPanel - 元数据面板
 * 实现元数据解析和显示、标签值编辑
 * 复用现有的 metaDataExtractor.ts
 * 参考 oldCode/main.js 的 MetaDataItem 和 renderMetaDataPanel
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */

import { DOM, divPool, addClass, removeClass } from '../core/DOMManager';
import { StateManager } from '../core/StateManager';
import { EventSystem } from '../core/EventSystem';
import { extractMetaData, type MetaData } from '../utils/metaDataExtractor';
import { logger } from '../services/logger';

// ============ 类型定义 ============

/** 元数据列表项 */
interface MetaDataItem {
  element: HTMLDivElement;
  nameElement: HTMLDivElement;
  valueElement: HTMLDivElement;
  key: string;
}

// ============ 对象池 ============

/** 元数据项池 */
const metaItemPool: MetaDataItem[] = [];
let metaItemPoolIndex = 0;

/**
 * 获取元数据项
 */
function getMetaItem(): MetaDataItem {
  if (metaItemPoolIndex > 0) {
    return metaItemPool[--metaItemPoolIndex];
  }
  
  const element = divPool.get();
  element.className = 'meta-data-item flex justify-between items-start p-2 border-b border-gray-700 hover:bg-gray-800';
  
  const nameElement = document.createElement('div') as HTMLDivElement;
  nameElement.className = 'meta-data-name text-cyan-400 font-medium text-sm min-w-[100px]';
  
  const valueElement = document.createElement('div') as HTMLDivElement;
  valueElement.className = 'meta-data-value text-gray-300 text-sm flex-1 text-right break-all';
  
  element.appendChild(nameElement);
  element.appendChild(valueElement);
  
  return { element, nameElement, valueElement, key: '' };
}

/**
 * 归还元数据项
 */
function returnMetaItem(item: MetaDataItem): void {
  item.key = '';
  item.nameElement.textContent = '';
  item.valueElement.textContent = '';
  removeClass(item.element, 'editing');
  metaItemPool[metaItemPoolIndex++] = item;
}

// ============ 状态 ============

/** 当前元数据项 */
const currentItems: MetaDataItem[] = [];
let currentItemCount = 0;

/** 当前解析的元数据 */
let currentMeta: MetaData = {};

/** 事件监听器是否已绑定 */
let eventsBound = false;

// ============ 元数据渲染 ============

/**
 * 渲染元数据面板
 */
export function renderMetaDataPanel(): void {
  const metaDataList = DOM.metaDataList;
  if (!metaDataList) return;
  
  // 回收现有项
  for (let i = 0; i < currentItemCount; i++) {
    const item = currentItems[i];
    if (item.element.parentNode) {
      item.element.parentNode.removeChild(item.element);
    }
    returnMetaItem(item);
  }
  currentItemCount = 0;
  
  // 获取当前项目
  const state = StateManager.getState();
  const currentItem = state.currentItem;
  
  if (!currentItem) {
    metaDataList.innerHTML = '<div class="empty-state p-4 text-gray-500 text-center text-sm">选择项目以查看元数据</div>';
    return;
  }
  
  // 从 note 字段解析元数据
  const note = 'note' in currentItem ? (currentItem.note as string) : '';
  currentMeta = extractMetaData(note);
  
  const metaKeys = Object.keys(currentMeta);
  
  if (metaKeys.length === 0) {
    metaDataList.innerHTML = '<div class="empty-state p-4 text-gray-500 text-center text-sm">暂无元数据</div>';
    return;
  }
  
  // 清空列表
  metaDataList.innerHTML = '';
  
  // 使用 Fragment 优化 DOM 插入
  const fragment = document.createDocumentFragment();
  
  for (let i = 0; i < metaKeys.length; i++) {
    const key = metaKeys[i];
    const value = currentMeta[key];
    const item = getMetaItem();
    
    item.key = key;
    item.nameElement.textContent = key;
    item.valueElement.textContent = formatValue(value);
    item.element.dataset.metaKey = key;
    
    currentItems[currentItemCount++] = item;
    fragment.appendChild(item.element);
  }
  
  metaDataList.appendChild(fragment);
  
  // 设置事件委托
  setupMetaListDelegate();
  
  logger.debug('MetaDataPanel rendered', { count: metaKeys.length }, 'MetaDataPanel');
}

/**
 * 格式化元数据值用于显示
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return JSON.stringify(value, null, 2);
  }
  
  if (typeof value === 'boolean') {
    return value ? '✓ true' : '✗ false';
  }
  
  return String(value);
}

/**
 * 设置元数据列表事件委托
 */
function setupMetaListDelegate(): void {
  const metaDataList = DOM.metaDataList;
  if (!metaDataList || eventsBound) return;
  
  metaDataList.addEventListener('click', handleMetaListClick);
  metaDataList.addEventListener('dblclick', handleMetaListDblClick);
  eventsBound = true;
}

/**
 * 处理元数据列表点击
 */
function handleMetaListClick(e: Event): void {
  const target = e.target as HTMLElement;
  const metaItem = target.closest('.meta-data-item') as HTMLElement | null;
  
  if (metaItem && metaItem.dataset.metaKey) {
    selectMetaItem(metaItem.dataset.metaKey);
  }
}

/**
 * 处理元数据列表双击（编辑）
 */
function handleMetaListDblClick(e: Event): void {
  const target = e.target as HTMLElement;
  const metaItem = target.closest('.meta-data-item') as HTMLElement | null;
  
  if (metaItem && metaItem.dataset.metaKey) {
    editMetaItem(metaItem.dataset.metaKey);
  }
}

/**
 * 选择元数据项
 */
function selectMetaItem(key: string): void {
  // 更新高亮
  for (let i = 0; i < currentItemCount; i++) {
    const item = currentItems[i];
    if (item.key === key) {
      addClass(item.element, 'bg-cyan-900/30');
    } else {
      removeClass(item.element, 'bg-cyan-900/30');
    }
  }
  
  EventSystem.emit('metadata:selected', key);
}

/**
 * 编辑元数据项
 */
function editMetaItem(key: string): void {
  const value = currentMeta[key];
  
  // 触发编辑事件，由外部处理对话框
  EventSystem.emit('metadata:edit', { key, value });
  
  logger.debug('Edit metadata requested', { key }, 'MetaDataPanel');
}

/**
 * 更新元数据值
 */
export function updateMetaValue(key: string, newValue: unknown): void {
  currentMeta[key] = newValue as MetaData[string];
  
  // 更新显示
  for (let i = 0; i < currentItemCount; i++) {
    const item = currentItems[i];
    if (item.key === key) {
      item.valueElement.textContent = formatValue(newValue);
      break;
    }
  }
  
  // 触发变更事件
  EventSystem.emit('metadata:changed', { key, value: newValue });
  
  logger.debug('Metadata value updated', { key }, 'MetaDataPanel');
}

/**
 * 获取当前元数据
 */
export function getCurrentMeta(): MetaData {
  return currentMeta;
}

// ============ 初始化 ============

/**
 * 初始化元数据面板
 */
export function initMetaDataPanel(): void {
  // 订阅状态变更
  StateManager.subscribe((_state, changedKeys) => {
    if (changedKeys.includes('currentItem') || changedKeys.includes('currentItemIndex')) {
      renderMetaDataPanel();
    }
  });
  
  // 监听备注保存事件，重新解析元数据
  EventSystem.on('note:saved', () => {
    renderMetaDataPanel();
  });
  
  logger.info('MetaDataPanel initialized', undefined, 'MetaDataPanel');
}

// ============ 清理 ============

/**
 * 清理元数据面板
 */
export function disposeMetaDataPanel(): void {
  // 回收所有列表项
  for (let i = 0; i < currentItemCount; i++) {
    returnMetaItem(currentItems[i]);
  }
  currentItemCount = 0;
  currentMeta = {};
  
  // 移除事件监听
  const metaDataList = DOM.metaDataList;
  if (metaDataList && eventsBound) {
    metaDataList.removeEventListener('click', handleMetaListClick);
    metaDataList.removeEventListener('dblclick', handleMetaListDblClick);
    eventsBound = false;
  }
  
  logger.info('MetaDataPanel disposed', undefined, 'MetaDataPanel');
}

export default {
  init: initMetaDataPanel,
  render: renderMetaDataPanel,
  updateValue: updateMetaValue,
  getMeta: getCurrentMeta,
  dispose: disposeMetaDataPanel,
};
