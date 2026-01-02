/**
 * QuestCopyDialog - 任务复制对话框
 *
 * 提供任务复制功能，允许用户从现有任务列表中选择要复制的任务
 *
 * Requirements: Quest copy functionality (from oldCode/main.js lines 406-410)
 */

import { StateManager, type DataItem } from '../core/StateManager';
import { EventSystem } from '../core/EventSystem';
import { FactoryPool } from '../pools/ObjectPool';
import { logger } from './logger';

/** 任务项类型 */
interface QuestCopyItem {
  element: HTMLDivElement;
  index: number;
  title: string;
}

/** 任务复制对话框状态 */
interface QuestCopyDialogState {
  isVisible: boolean;
  selectedIndex: number | null;
  questItems: QuestCopyItem[];
}

/** 对话框 DOM 元素 */
interface QuestCopyDialogElements {
  dialog: HTMLDivElement | null;
  list: HTMLDivElement | null;
  closeBtn: HTMLButtonElement | null;
  cancelBtn: HTMLButtonElement | null;
  confirmBtn: HTMLButtonElement | null;
}

/** 任务数据 */
interface QuestData {
  title: string;
  giver: string;
  category: boolean;
  repeatable: boolean;
  difficulty: number;
  description: string[];
  requirements: unknown[];
  objectives: unknown[];
  rewards: unknown[];
  [key: string]: unknown;
}

// ============ 对象池 ============

let questItemPool: FactoryPool<QuestCopyItem> | null = null;
const activeItems: QuestCopyItem[] = [];
let activeItemCount = 0;

function createQuestItem(): QuestCopyItem {
  const element = document.createElement('div');
  element.className = 'quest-copy-item p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors';

  return {
    element,
    index: -1,
    title: ''
  };
}

function resetQuestItem(item: QuestCopyItem): void {
  item.index = -1;
  item.title = '';
  item.element.textContent = '';
  item.element.classList.remove('bg-cyan-900', 'border-l-4', 'border-cyan-400');
}

function getQuestItemPool(): FactoryPool<QuestCopyItem> {
  if (!questItemPool) {
    questItemPool = new FactoryPool<QuestCopyItem>(
      'QuestCopyItemPool',
      createQuestItem,
      resetQuestItem,
      undefined,
      30
    );
  }
  return questItemPool;
}

// ============ 状态管理 ============

const state: QuestCopyDialogState = {
  isVisible: false,
  selectedIndex: null,
  questItems: []
};

const elements: QuestCopyDialogElements = {
  dialog: null,
  list: null,
  closeBtn: null,
  cancelBtn: null,
  confirmBtn: null
};

// ============ DOM 元素获取 ============

function cacheElements(): void {
  elements.dialog = document.getElementById('questCopyDialog') as HTMLDivElement | null;
  elements.list = document.getElementById('questCopyDialogList') as HTMLDivElement | null;
  elements.closeBtn = document.getElementById('questCopyDialogClose') as HTMLButtonElement | null;
  elements.cancelBtn = document.getElementById('questCopyDialogCancel') as HTMLButtonElement | null;
  elements.confirmBtn = document.getElementById('questCopyDialogConfirm') as HTMLButtonElement | null;
}

// ============ 渲染 ============

/**
 * 渲染任务列表
 */
function renderQuestList(): void {
  if (!elements.list) return;

  const pool = getQuestItemPool();

  for (let i = 0; i < activeItemCount; i++) {
    const item = activeItems[i];
    pool.return(item);
  }
  activeItemCount = 0;

  const stateManager = StateManager.getState();
  const quests = stateManager.currentData as QuestData[] | null;

  if (!quests || !Array.isArray(quests) || quests.length <= 1) {
    elements.list.innerHTML = '<div class="p-4 text-gray-500 text-center text-sm">暂无任务数据</div>';
    return;
  }

  elements.list.innerHTML = '';
  const fragment = document.createDocumentFragment();

  for (let i = 1; i < quests.length; i++) {
    const quest = quests[i];
    if (!quest) continue;

    const item = pool.get();
    item.index = i;
    item.title = quest.title || `任务${i}`;

    item.element.dataset.index = String(i);
    item.element.innerHTML = `<div class="text-sm text-gray-200 truncate">${item.title}</div>`;

    if (state.selectedIndex === i) {
      item.element.classList.add('bg-cyan-900', 'border-l-4', 'border-cyan-400');
    }

    item.element.addEventListener('click', () => handleItemClick(i));
    item.element.addEventListener('dblclick', () => handleItemDoubleClick(i));

    activeItems[activeItemCount++] = item;
    fragment.appendChild(item.element);
  }

  elements.list.appendChild(fragment);

  logger.debug('QuestCopyDialog rendered', { count: activeItemCount }, 'QuestCopyDialog');
}

// ============ 事件处理 ============

/**
 * 处理任务项点击
 */
function handleItemClick(index: number): void {
  state.selectedIndex = index;

  for (let i = 0; i < activeItemCount; i++) {
    const item = activeItems[i];
    if (item.index === index) {
      item.element.classList.add('bg-cyan-900', 'border-l-4', 'border-cyan-400');
    } else {
      item.element.classList.remove('bg-cyan-900', 'border-l-4', 'border-cyan-400');
    }
  }

  EventSystem.emit('quest:copy:selected', index);
}

/**
 * 处理任务项双击（直接复制）
 */
function handleItemDoubleClick(index: number): void {
  handleItemClick(index);
  copyQuest();
}

// ============ 复制操作 ============

/**
 * 执行任务复制
 */
function copyQuest(): void {
  if (state.selectedIndex === null) {
    logger.warn('No quest selected for copy', undefined, 'QuestCopyDialog');
    return;
  }

  const stateManager = StateManager.getState();
  const quests = stateManager.currentData as QuestData[] | null;

  if (!quests || !Array.isArray(quests) || state.selectedIndex < 1 || state.selectedIndex >= quests.length) {
    logger.error('Invalid quest index for copy', { index: state.selectedIndex }, 'QuestCopyDialog');
    return;
  }

  const sourceQuest = quests[state.selectedIndex];
  if (!sourceQuest) {
    logger.error('Source quest not found', { index: state.selectedIndex }, 'QuestCopyDialog');
    return;
  }

  const copiedQuest: QuestData = {
    ...sourceQuest,
    title: `${sourceQuest.title || '任务'} - 副本`,
    description: Array.isArray(sourceQuest.description) ? [...sourceQuest.description] : [],
    requirements: Array.isArray(sourceQuest.requirements) ? (sourceQuest.requirements as unknown[]).map(r => ({ ...(r as Record<string, unknown>) })) : [],
    objectives: Array.isArray(sourceQuest.objectives) ? (sourceQuest.objectives as unknown[]).map(o => ({ ...(o as Record<string, unknown>) })) : [],
    rewards: Array.isArray(sourceQuest.rewards) ? (sourceQuest.rewards as unknown[]).map(r => ({ ...(r as Record<string, unknown>) })) : []
  };

  quests.push(copiedQuest as QuestData);

  EventSystem.emit('quest:copied', {
    sourceIndex: state.selectedIndex,
    newIndex: quests.length - 1,
    quest: copiedQuest
  });

  hideQuestCopyDialog();

  StateManager.setState({ currentItemIndex: quests.length - 1, currentItem: copiedQuest as unknown as DataItem });

  logger.info('Quest copied successfully', {
    sourceIndex: state.selectedIndex,
    newIndex: quests.length - 1,
    title: copiedQuest.title
  }, 'QuestCopyDialog');
}

// ============ 对话框控制 ============

/**
 * 显示对话框
 */
export function showQuestCopyDialog(): void {
  cacheElements();

  if (!elements.dialog || !elements.list) {
    logger.error('QuestCopyDialog elements not found', undefined, 'QuestCopyDialog');
    return;
  }

  state.selectedIndex = null;
  renderQuestList();

  elements.dialog.classList.remove('hidden');
  state.isVisible = true;

  EventSystem.emit('quest:copy:dialog:opened');

  logger.debug('QuestCopyDialog shown', undefined, 'QuestCopyDialog');
}

/**
 * 隐藏对话框
 */
export function hideQuestCopyDialog(): void {
  if (!elements.dialog) {
    cacheElements();
  }

  if (elements.dialog) {
    elements.dialog.classList.add('hidden');
  }

  state.isVisible = false;
  state.selectedIndex = null;

  EventSystem.emit('quest:copy:dialog:closed');

  logger.debug('QuestCopyDialog hidden', undefined, 'QuestCopyDialog');
}

/**
 * 切换对话框显示状态
 */
export function toggleQuestCopyDialog(): void {
  if (state.isVisible) {
    hideQuestCopyDialog();
  } else {
    showQuestCopyDialog();
  }
}

// ============ 事件绑定 ============

let eventsBound = false;

/**
 * 绑定对话框事件
 */
function bindEvents(): void {
  if (eventsBound) return;

  cacheElements();

  if (elements.closeBtn) {
    elements.closeBtn.addEventListener('click', hideQuestCopyDialog);
  }

  if (elements.cancelBtn) {
    elements.cancelBtn.addEventListener('click', hideQuestCopyDialog);
  }

  if (elements.confirmBtn) {
    elements.confirmBtn.addEventListener('click', copyQuest);
  }

  if (elements.dialog) {
    elements.dialog.addEventListener('click', (e) => {
      if (e.target === elements.dialog) {
        hideQuestCopyDialog();
      }
    });
  }

  document.addEventListener('keydown', handleKeyDown);

  eventsBound = true;
}

/**
 * 处理键盘事件
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (!state.isVisible) return;

  if (e.key === 'Escape') {
    hideQuestCopyDialog();
  } else if (e.key === 'Enter') {
    if (state.selectedIndex !== null) {
      copyQuest();
    }
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    navigateList(e.key === 'ArrowDown' ? 1 : -1);
  }
}

/**
 * 在列表中导航
 */
function navigateList(direction: number): void {
  if (activeItemCount === 0) return;

  let newIndex = 0;

  if (state.selectedIndex === null) {
    newIndex = direction > 0 ? 0 : activeItemCount - 1;
  } else {
    const currentItem = activeItems.find(item => item.index === state.selectedIndex);
    if (currentItem) {
      const currentPos = activeItems.indexOf(currentItem);
      newIndex = Math.max(0, Math.min(activeItemCount - 1, currentPos + direction));
    }
  }

  handleItemClick(activeItems[newIndex].index);
}

// ============ 初始化 ============

/**
 * 初始化任务复制对话框
 */
export function initQuestCopyDialog(): void {
  bindEvents();

  logger.info('QuestCopyDialog initialized', undefined, 'QuestCopyDialog');
}

/**
 * 清理任务复制对话框
 */
export function disposeQuestCopyDialog(): void {
  hideQuestCopyDialog();

  const pool = getQuestItemPool();
  for (let i = 0; i < activeItemCount; i++) {
    pool.return(activeItems[i]);
  }
  activeItemCount = 0;

  if (elements.closeBtn) {
    elements.closeBtn.removeEventListener('click', hideQuestCopyDialog);
  }

  if (elements.cancelBtn) {
    elements.cancelBtn.removeEventListener('click', hideQuestCopyDialog);
  }

  if (elements.confirmBtn) {
    elements.confirmBtn.removeEventListener('click', copyQuest);
  }

  document.removeEventListener('keydown', handleKeyDown);

  eventsBound = false;

  logger.info('QuestCopyDialog disposed', undefined, 'QuestCopyDialog');
}

// ============ 导出 ============

export default {
  init: initQuestCopyDialog,
  dispose: disposeQuestCopyDialog,
  show: showQuestCopyDialog,
  hide: hideQuestCopyDialog,
  toggle: toggleQuestCopyDialog
};
