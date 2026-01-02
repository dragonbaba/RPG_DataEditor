/**
 * HistoryFilesDialog - 历史文件对话框
 * 显示已缓存文件的历史记录，支持快速打开
 * 参考 oldCode/main.js 的 HistoryFileItem 实现
 */

import { DOM } from '../core/DOMManager';
import { FileCacheManager, type CacheItem } from './FileCacheManager';
import { EventSystem } from '../core/EventSystem';
import { StateManager } from '../core/StateManager';
import type { DataItem } from '../core/StateManager';
import { logger } from './logger';

// ============ 常量 ============

const HISTORY_FILE_ITEM_CLASS = 'history-file-item';

// ============ 对象池 ============

const historyItemPool: HTMLDivElement[] = [];
let historyItemPoolIndex = 0;

function getHistoryItemElement(): HTMLDivElement {
  if (historyItemPoolIndex > 0) {
    return historyItemPool[--historyItemPoolIndex];
  }

  const element = document.createElement('div');
  element.className = `${HISTORY_FILE_ITEM_CLASS} flex items-center gap-3 p-3 bg-gray-800 rounded border border-gray-700 hover:border-cyan-500 cursor-pointer transition-colors`;

  return element;
}

function returnHistoryItemElement(element: HTMLDivElement): void {
  element.innerHTML = '';
  historyItemPool[historyItemPoolIndex++] = element;
}

// ============ 状态 ============

let isInitialized = false;
let isVisible = false;

let dialogElement: HTMLElement | null = null;
let listElement: HTMLElement | null = null;
let closeButton: HTMLButtonElement | null = null;

// ============ 渲染函数 ============

export function renderHistoryList(): void {
  if (!listElement) return;

  const existingItems = listElement.querySelectorAll(`.${HISTORY_FILE_ITEM_CLASS}`);
  for (let i = 0; i < existingItems.length; i++) {
    returnHistoryItemElement(existingItems[i] as HTMLDivElement);
  }

  listElement.innerHTML = '';

  const keys = FileCacheManager.keys();
  const cachedItems: Array<{ key: string; meta: CacheItem }> = [];

  for (const key of keys) {
    const meta = FileCacheManager.getMeta(key);
    if (meta) {
      cachedItems.push({ key, meta });
    }
  }

  if (cachedItems.length === 0) {
    listElement.innerHTML = '<div class="text-center text-gray-500 py-4">暂无历史文件</div>';
    return;
  }

  const sortedItems = cachedItems
    .sort((a, b) => b.meta.accessIndex - a.meta.accessIndex)
    .slice(0, 20);

  const fragment = document.createDocumentFragment();

  for (const item of sortedItems) {
    const element = getHistoryItemElement();
    element.dataset.key = item.key;

    const fileType = getFileTypeFromName(item.meta.fileName);

    element.innerHTML = `
      <div class="flex-1 min-w-0">
        <div class="text-sm text-gray-200 truncate">${item.meta.fileName}</div>
        <div class="text-xs text-gray-500">${formatTimestamp(item.meta.accessIndex)} · ${fileType}</div>
      </div>
      <div class="text-gray-500">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </div>
    `;

    element.addEventListener('click', () => handleHistoryItemClick(item));

    fragment.appendChild(element);
  }

  listElement.appendChild(fragment);
}

async function handleHistoryItemClick(itemData: { key: string; meta: CacheItem }): Promise<void> {
  try {
    const cached = FileCacheManager.get(itemData.key);
    if (!cached) {
      logger.warn('Cached file not found', { key: itemData.key }, 'HistoryFilesDialog');
      return;
    }

    const fileType = getFileTypeFromName(itemData.meta.fileName);

    let fileTypeEnum: 'data' | 'quest' | 'projectile' = 'data';
    if (fileType === '任务') {
      fileTypeEnum = 'quest';
    } else if (fileType === '弹道') {
      fileTypeEnum = 'projectile';
    }

    StateManager.loadData(cached as DataItem[], itemData.key, fileTypeEnum);

    hideDialog();
    EventSystem.emit('history-file:opened', { fileName: itemData.meta.fileName, filePath: itemData.key });

    logger.info('History file opened', { fileName: itemData.meta.fileName }, 'HistoryFilesDialog');
  } catch (error) {
    logger.error('Failed to open history file', { error, fileName: itemData.meta.fileName }, 'HistoryFilesDialog');
  }
}

function getFileTypeFromName(fileName: string): string {
  const lowerName = fileName.toLowerCase();

  if (lowerName.includes('quest')) return '任务';
  if (lowerName.includes('projectile')) return '弹道';
  if (lowerName.includes('actor') || lowerName.includes('character')) return '角色';
  if (lowerName.includes('enemy') || lowerName.includes('monster')) return '敌人';
  if (lowerName.includes('item')) return '物品';
  if (lowerName.includes('weapon')) return '武器';
  if (lowerName.includes('armor')) return '防具';
  if (lowerName.includes('skill')) return '技能';
  if (lowerName.includes('animation')) return '动画';
  if (lowerName.includes('system')) return '系统';

  return '数据';
}

function formatTimestamp(accessIndex: number): string {
  if (accessIndex <= 0) return '未知时间';

  const now = Date.now();
  const diff = now - accessIndex * 1000;

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} 分钟前`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} 小时前`;
  } else {
    const days = Math.floor(diff / 86400000);
    return `${days} 天前`;
  }
}

// ============ 对话框控制 ============

export function showDialog(): void {
  if (!dialogElement) {
    logger.warn('History files dialog not found', undefined, 'HistoryFilesDialog');
    return;
  }

  renderHistoryList();
  dialogElement.classList.remove('hidden');
  isVisible = true;

  logger.debug('History files dialog shown', undefined, 'HistoryFilesDialog');
}

export function hideDialog(): void {
  if (!dialogElement) return;

  dialogElement.classList.add('hidden');
  isVisible = false;

  logger.debug('History files dialog hidden', undefined, 'HistoryFilesDialog');
}

export function toggleDialog(): void {
  if (isVisible) {
    hideDialog();
  } else {
    showDialog();
  }
}

export function isDialogVisible(): boolean {
  return isVisible;
}

function handleCloseClick(): void {
  hideDialog();
}

function handleDialogClick(e: Event): void {
  const target = e.target as HTMLElement;
  if (target === dialogElement) {
    hideDialog();
  }
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isVisible) {
    hideDialog();
  }
}

// ============ 初始化 ============

export function initHistoryFilesDialog(): void {
  if (isInitialized) {
    logger.warn('HistoryFilesDialog already initialized', undefined, 'HistoryFilesDialog');
    return;
  }

  dialogElement = DOM.historyFilesDialog;
  listElement = DOM.historyFilesList;
  closeButton = DOM.historyFilesDialogClose;

  if (!dialogElement || !listElement) {
    logger.warn('History files dialog elements not found', undefined, 'HistoryFilesDialog');
    return;
  }

  if (closeButton) {
    closeButton.addEventListener('click', handleCloseClick);
  }

  dialogElement.addEventListener('click', handleDialogClick);
  document.addEventListener('keydown', handleKeyDown);

  isInitialized = true;
  logger.info('HistoryFilesDialog initialized', undefined, 'HistoryFilesDialog');
}

export function disposeHistoryFilesDialog(): void {
  if (closeButton) {
    closeButton.removeEventListener('click', handleCloseClick);
  }

  if (dialogElement) {
    dialogElement.removeEventListener('click', handleDialogClick);
  }

  document.removeEventListener('keydown', handleKeyDown);

  while (historyItemPoolIndex > 0) {
    historyItemPoolIndex--;
    const element = historyItemPool[historyItemPoolIndex];
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  isInitialized = false;
  isVisible = false;
  dialogElement = null;
  listElement = null;
  closeButton = null;

  logger.info('HistoryFilesDialog disposed', undefined, 'HistoryFilesDialog');
}

export default {
  init: initHistoryFilesDialog,
  dispose: disposeHistoryFilesDialog,
  show: showDialog,
  hide: hideDialog,
  toggle: toggleDialog,
  isVisible,
  render: renderHistoryList,
};
