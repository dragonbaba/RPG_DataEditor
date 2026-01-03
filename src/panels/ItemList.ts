/**
 * ItemList - 项目列表
 * 负责列表渲染与选择状态更新
 * 支持池化复用 DOM 元素
 *
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6
 */

import { DOM } from '../core/DOMManager';
import { acquireCard, releaseCard, acquireSpan, releaseSpan } from '../pools/DOMPools';
import { StateManager } from '../core/StateManager';
import { EventSystem } from '../core/EventSystem';
import { logger } from '../services/logger';
import { ObjectPool, Poolable } from '../pools/ObjectPool';

class ListItemEntry implements Poolable {
  element: HTMLDivElement | null = null;
  idElement: HTMLSpanElement | null = null;
  nameElement: HTMLSpanElement | null = null;
  dataIndex = -1;

  init(): void {
    if (!this.element) {
      this.element = acquireCard();
      this.idElement = acquireSpan();
      this.nameElement = acquireSpan();
      this.element.appendChild(this.idElement);
      this.element.appendChild(this.nameElement);
    }

    this.element.className = 'list-item flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-700 border-b border-gray-700';
    this.element.style.position = 'relative';
    this.element.style.boxSizing = 'border-box';

    if (this.idElement) {
      this.idElement.className = 'list-item-id text-cyan-400 text-xs font-mono min-w-[40px]';
    }
    if (this.nameElement) {
      this.nameElement.className = 'list-item-name text-gray-200 text-sm flex-1 truncate';
    }
  }

  reset(): void {
    this.dataIndex = -1;

    if (this.idElement) {
      this.idElement.textContent = '';
    }
    if (this.nameElement) {
      this.nameElement.textContent = '';
    }
    if (this.element) {
      this.element.classList.remove('active', 'bg-cyan-900');
      delete this.element.dataset.index;
      this.element.remove();
    }

    if (this.idElement) {
      releaseSpan(this.idElement);
      this.idElement = null;
    }
    if (this.nameElement) {
      releaseSpan(this.nameElement);
      this.nameElement = null;
    }
    if (this.element) {
      releaseCard(this.element);
      this.element = null;
    }
  }
}

const ITEM_HEIGHT = 40;
const listItemPool = new ObjectPool(ListItemEntry, 500);
const activeItems: ListItemEntry[] = [];
let activeItemCount = 0;
const currentDataRef: Array<unknown> = [];
let fileType = '';
let eventsBound = false;
let emptyStateElement: HTMLDivElement | null = null;

function getListItem(): ListItemEntry {
  return listItemPool.get();
}

function returnListItemToPool(item: ListItemEntry): void {
  listItemPool.return(item);
}

function recycleActiveItems(): void {
  for (let i = 0; i < activeItemCount; i++) {
    const item = activeItems[i];
    if (item) {
      returnListItemToPool(item);
    }
  }
  activeItems.length = 0;
  activeItemCount = 0;
}

function resetCurrentDataRef(): void {
  currentDataRef.length = 0;
}

function copyCurrentDataRef(source: Array<unknown>): void {
  currentDataRef.length = 0;
  for (let i = 0; i < source.length; i++) {
    currentDataRef.push(source[i]);
  }
}

function getEmptyStateElement(): HTMLDivElement {
  if (!emptyStateElement) {
    emptyStateElement = document.createElement('div');
    emptyStateElement.className = 'empty-state p-4 text-gray-500 text-center text-sm';
  }
  emptyStateElement.textContent = '数据为空';
  return emptyStateElement;
}

function renderListItems(listContainer: HTMLElement): void {
  const fragment = document.createDocumentFragment();
  const isQuest = fileType === 'quest';
  const isProjectile = fileType === 'projectile';

  for (let i = 1; i < currentDataRef.length; i++) {
    const data = currentDataRef[i];
    if (data === null || data === undefined) {
      continue;
    }

    const item = getListItem();
    if (!item.element || !item.idElement || !item.nameElement) {
      returnListItemToPool(item);
      continue;
    }

    const itemData = data as Record<string, unknown>;
    // 对于 quest 和 projectile 类型，使用数组索引 i 作为显示索引
    // 对于其他类型，使用数据中的 id 字段（如果存在）
    const displayIndex = (isQuest || isProjectile) ? i : ((itemData.id as number) || i);
    const itemName = isQuest
      ? ((itemData.title as string) || `任务${i}`)
      : ((itemData.name as string) || '[无名]');

    item.dataIndex = i;
    item.element.dataset.index = String(i);
    item.idElement.textContent = `#${displayIndex}`;
    item.nameElement.textContent = itemName;

    fragment.appendChild(item.element);
    activeItems[activeItemCount++] = item;
  }

  listContainer.appendChild(fragment);
}

function updateActiveHighlight(): void {
  const state = StateManager.getState();
  const selectedIndex = state.currentItemIndex;

  for (let i = 0; i < activeItemCount; i++) {
    const item = activeItems[i];
    if (!item || !item.element) continue;

    if (item.dataIndex === selectedIndex) {
      item.element.classList.add('active', 'bg-cyan-900');
    } else {
      item.element.classList.remove('active', 'bg-cyan-900');
    }
  }
}

function handleItemListClick(e: Event): void {
  const target = e.target as HTMLElement;
  const listItem = target.closest('.list-item') as HTMLElement | null;

  if (listItem && listItem.dataset.index) {
    const index = parseInt(listItem.dataset.index, 10);
    selectItem(index);
  }
}

export function displayItemList(): void {
  const itemList = DOM.itemList;
  if (!itemList) return;

  recycleActiveItems();
  resetCurrentDataRef();

  const state = StateManager.getState();
  const currentData = state.currentData;
  fileType = state.currentFileType || '';

  itemList.textContent = '';

  if (!currentData || currentData.length === 0) {
    itemList.appendChild(getEmptyStateElement());
    return;
  }

  copyCurrentDataRef(currentData as Array<unknown>);
  renderListItems(itemList);
  updateActiveHighlight();

  if (!eventsBound) {
    itemList.addEventListener('click', handleItemListClick);
    eventsBound = true;
  }

  logger.debug('ItemList displayed', { count: activeItemCount }, 'ItemList');
}

export function selectItem(index: number): void {
  const state = StateManager.getState();
  const currentData = state.currentData;

  if (!currentData || index < 0 || index >= currentData.length) {
    logger.warn('Invalid item index', { index }, 'ItemList');
    return;
  }

  const item = currentData[index];
  if (item === null) {
    logger.warn('Item is null', { index }, 'ItemList');
    return;
  }

  StateManager.selectItem(index);
  updateActiveHighlight();

  const container = DOM.itemList?.parentElement;
  if (container) {
    let targetElement: HTMLElement | null = null;
    for (let i = 0; i < activeItemCount; i++) {
      const entry = activeItems[i];
      if (entry && entry.dataIndex === index) {
        targetElement = entry.element;
        break;
      }
    }

    if (targetElement) {
      const targetTop = targetElement.offsetTop;
      const targetScroll = targetTop - container.clientHeight / 2 + targetElement.offsetHeight / 2;
      container.scrollTop = Math.max(0, targetScroll);
    } else {
      const targetIndex = Math.max(0, index - 1);
      const targetScroll = targetIndex * ITEM_HEIGHT - container.clientHeight / 2 + ITEM_HEIGHT / 2;
      container.scrollTop = Math.max(0, targetScroll);
    }
  }

  EventSystem.emit('item:selected', index);
  logger.debug('Item selected', { index }, 'ItemList');
}

export function markItemListActive(_index: number): void {
  updateActiveHighlight();
}

export function getSelectedIndex(): number {
  return StateManager.getState().currentItemIndex;
}

export function refreshItemList(): void {
  displayItemList();
}

export async function handleCreateItem(): Promise<void> {
  const state = StateManager.getState();
  EventSystem.emit('item:create', { fileType: state.currentFileType });
  logger.info('Create item requested', { fileType: state.currentFileType }, 'ItemList');
}

export async function handleCopyItem(): Promise<void> {
  const state = StateManager.getState();

  if (state.currentItemIndex === null || !state.currentItem) {
    EventSystem.emit('error:show', '请先选择一个项目');
    return;
  }

  EventSystem.emit('item:copy', { index: state.currentItemIndex });
  logger.info('Copy item requested', { index: state.currentItemIndex }, 'ItemList');
}

export async function handleDeleteItem(): Promise<void> {
  const state = StateManager.getState();

  if (state.currentItemIndex === null || !state.currentItem) {
    EventSystem.emit('error:show', '请先选择一个项目');
    return;
  }

  EventSystem.emit('item:delete', { index: state.currentItemIndex });
  logger.info('Delete item requested', { index: state.currentItemIndex }, 'ItemList');
}

export function initItemList(): void {
  StateManager.subscribe(onStateChanged);

  if (DOM.itemNewBtn) {
    DOM.itemNewBtn.addEventListener('click', handleCreateItem);
  }
  if (DOM.itemCopyBtn) {
    DOM.itemCopyBtn.addEventListener('click', handleCopyItem);
  }
  if (DOM.itemDeleteBtn) {
    DOM.itemDeleteBtn.addEventListener('click', handleDeleteItem);
  }

  logger.info('ItemList initialized', undefined, 'ItemList');
}

export function disposeItemList(): void {
  recycleActiveItems();
  resetCurrentDataRef();

  const itemList = DOM.itemList;
  if (itemList && eventsBound) {
    itemList.removeEventListener('click', handleItemListClick);
    eventsBound = false;
  }

  if (DOM.itemNewBtn) {
    DOM.itemNewBtn.removeEventListener('click', handleCreateItem);
  }
  if (DOM.itemCopyBtn) {
    DOM.itemCopyBtn.removeEventListener('click', handleCopyItem);
  }
  if (DOM.itemDeleteBtn) {
    DOM.itemDeleteBtn.removeEventListener('click', handleDeleteItem);
  }

  logger.info('ItemList disposed', undefined, 'ItemList');
}

function onStateChanged(_state: unknown, changedKeys: string[]): void {
  if (changedKeys.includes('currentData') || changedKeys.includes('currentFileType')) {
    displayItemList();
  }
}

export default {
  init: initItemList,
  display: displayItemList,
  select: selectItem,
  markActive: markItemListActive,
  getSelected: getSelectedIndex,
  refresh: refreshItemList,
  dispose: disposeItemList,
};
