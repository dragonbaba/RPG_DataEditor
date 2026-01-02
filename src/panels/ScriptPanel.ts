/**
 * ScriptPanel - 脚本面板
 * 实现脚本列表显示和选择、脚本创建和删除
 * 使用对象池管理列表项
 */

import { DOM } from '../core/DOMManager';
import { acquireCard, releaseCard, acquireSpan, releaseSpan, recyclePoolTree } from '../pools/DOMPools';
import { delay } from '../utils/runner';
import { StateManager } from '../core/StateManager';
import { EventSystem } from '../core/EventSystem';
import { EditorManager } from '../core/EditorManager';
import { resolveScriptFilePath } from '../services/ScriptPathCompat';
import { getScriptCache, setScriptCache } from '../services/ScriptCacheManager';
import { logger } from '../services/logger';
import { fileSystemService } from '../services/FileSystemService';
import { themeManager } from '../theme/ThemeManager';
import { visualEffects } from '../theme/effects/VisualEffects';

// ============ 状态 ============

const EMPTY_SCRIPT_TEXT = '暂无脚本';
const NEW_SCRIPT_TEXT = '新建脚本';

let emptyStateElement: HTMLDivElement | null = null;
let newScriptButton: HTMLDivElement | null = null;
let newScriptLabel: HTMLSpanElement | null = null;
let dragSrcElement: HTMLElement | null = null;
let eventsBound = false;

function getEmptyStateElement(): HTMLDivElement {
  if (!emptyStateElement) {
    emptyStateElement = document.createElement('div');
    emptyStateElement.className = 'empty-state p-4 text-gray-500 text-center text-sm';
  }
  emptyStateElement.textContent = EMPTY_SCRIPT_TEXT;
  return emptyStateElement;
}

function getNewScriptButton(): HTMLDivElement {
  if (!newScriptButton) {
    newScriptButton = acquireCard();
    newScriptButton.className = 'script-item new-script-btn px-3 py-2 cursor-pointer hover:bg-cyan-900 border-b border-gray-700 text-sm text-cyan-400 flex items-center gap-2';
    newScriptLabel = acquireSpan();
    newScriptLabel.className = 'new-script-label';
    newScriptButton.appendChild(newScriptLabel);
    newScriptButton.addEventListener('click', handleCreateScript);
  }
  if (newScriptLabel) {
    newScriptLabel.textContent = `+ ${NEW_SCRIPT_TEXT}`;
  }
  return newScriptButton;
}

function findItemByKey(key: string): HTMLElement | null {
    const scriptList = DOM.scriptList;
    if (!scriptList) return null;
    return scriptList.querySelector(`.script-item[data-script="${key}"]`);
}

function handleDragStart(e: DragEvent): void {
  const target = e.currentTarget as HTMLElement;
  dragSrcElement = target;
  e.dataTransfer?.setData('text/plain', target.dataset.script || '');
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
  }
  // Delay adding the class to allow the drag image to be created using global runner
  delay(() => {
    target.classList.add('dragging');
  }, 1); // 1 frame delay
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault();
  if (!dragSrcElement) return;

  const target = e.currentTarget as HTMLElement;
  if (target !== dragSrcElement) {
    clearDragIndicators();
    target.classList.add('drag-over');
  }
}

function handleDragEnd(): void {
  if (dragSrcElement) {
    dragSrcElement.classList.remove('dragging');
    dragSrcElement = null;
  }
  clearDragIndicators();
}

function clearDragIndicators(): void {
    DOM.scriptList?.querySelectorAll('.script-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDrop(e: DragEvent): void {
  e.stopPropagation();
  const srcElement = dragSrcElement;
  const targetElement = e.currentTarget as HTMLElement;
  
  if (!srcElement || srcElement === targetElement) {
    return;
  }

  reorderScripts(srcElement, targetElement);
  
  dragSrcElement = null;
  clearDragIndicators();
}

function reorderScripts(src: HTMLElement, target: HTMLElement): void {
    const state = StateManager.getState();
    const currentItem = state.currentItem;
    if (!currentItem || !('scripts' in currentItem) || !currentItem.scripts) return;

    const scriptContainer = src.parentNode;
    if (!scriptContainer) return;

    const children = Array.from(scriptContainer.children);
    const srcIndex = children.indexOf(src);
    const targetIndex = children.indexOf(target);

    // Reorder DOM
    if (srcIndex > targetIndex) {
        scriptContainer.insertBefore(src, target);
    } else {
        scriptContainer.insertBefore(src, target.nextSibling);
    }

    // Reorder data
    const scriptKeys = Array.from(scriptContainer.querySelectorAll('.script-item[data-script]')).map(el => (el as HTMLElement).dataset.script || '');
    const oldScripts = currentItem.scripts as Record<string, string>;
    const newScripts: Record<string, string> = {};
    for (const key of scriptKeys) {
        if (oldScripts[key]) {
            newScripts[key] = oldScripts[key];
        }
    }
    currentItem.scripts = newScripts;

    EventSystem.emit('script:reordered', { newOrder: newScripts });
    logger.info('Scripts reordered', { count: Object.keys(newScripts).length }, 'ScriptPanel');
}

export function displayScriptList(): void {
  const scriptList = DOM.scriptList;
  if (!scriptList) return;

  recyclePoolTree(scriptList);

  const state = StateManager.getState();
  const currentItem = state.currentItem;

  const scripts = currentItem && 'scripts' in currentItem ? (currentItem.scripts as Record<string, string>) : null;
  const scriptKeys = scripts ? Object.keys(scripts) : [];

  if (scriptKeys.length === 0) {
    scriptList.appendChild(getEmptyStateElement());
  } else {
    const fragment = document.createDocumentFragment();
    for (const key of scriptKeys) {
      const item = acquireCard();
      item.className = 'script-item px-3 py-2 cursor-pointer hover:bg-gray-700 border-b border-gray-700 text-sm';
      item.draggable = true;
      item.dataset.script = key;

      // Apply sci-fi styling to script items
      themeManager.applySciFiEffects(item, {
        variant: 'primary',
        glow: false,
        scanlines: false,
      });

      // Add hover glow effect
      item.addEventListener('mouseenter', () => {
        visualEffects.createPulsingGlow(item, {
          color: 'rgba(0, 240, 255, 0.2)',
          intensity: 0.4,
          duration: 1000,
          infinite: false,
        });
      });

      const span = acquireSpan();
      span.className = 'script-item-label';
      span.textContent = key;
      item.appendChild(span);

      if (key === state.currentScriptKey) {
        item.classList.add('active', 'bg-cyan-900');
        // Add active state glow
        themeManager.applySciFiEffects(item, {
          variant: 'primary',
          glow: true,
        });
      }

      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragleave', clearDragIndicators);
      item.addEventListener('dragend', handleDragEnd);
      item.addEventListener('drop', handleDrop);

      fragment.appendChild(item);
    }
    scriptList.appendChild(fragment);
  }

  // Apply sci-fi styling to new script button
  const newScriptBtn = getNewScriptButton();
  themeManager.createFuturisticButton(newScriptBtn, 'accent');
  scriptList.appendChild(newScriptBtn);

  if (!eventsBound) {
    scriptList.addEventListener('click', handleScriptListClick);
    eventsBound = true;
  }

  updateEditorState(scriptKeys.length > 0);
}

function handleScriptListClick(e: Event): void {
  const target = e.target as HTMLElement;
  const scriptItem = target.closest('.script-item') as HTMLElement | null;

  if (scriptItem && scriptItem.dataset.script) {
    selectScript(scriptItem.dataset.script);
  }
}

export function selectScript(key: string): void {
  const state = StateManager.getState();
  const currentItem = state.currentItem;

  if (!currentItem || !('scripts' in currentItem) || !currentItem.scripts) return;

  const scripts = currentItem.scripts as Record<string, string>;
  const scriptPath = scripts[key];

  if (!scriptPath) {
    logger.warn('Script not found', { key }, 'ScriptPanel');
    return;
  }

  StateManager.selectScript(key);

  const scriptList = DOM.scriptList;
  if (scriptList) {
      scriptList.querySelectorAll('.script-item').forEach(item => {
          if ((item as HTMLElement).dataset.script === key) {
              item.classList.add('active', 'bg-cyan-900');
          } else {
              item.classList.remove('active', 'bg-cyan-900');
          }
      });
  }

  loadScriptContent(key, scriptPath);

  EventSystem.emit('script:selected', key);

  logger.debug('Script selected', { key }, 'ScriptPanel');
}

async function loadScriptContent(key: string, scriptPath: string): Promise<void> {
  try {
    const resolvedPath = resolveScriptFilePath(scriptPath);
    
    // 首先检查缓存
    let scriptContent = getScriptCache(resolvedPath);
    
    if (scriptContent === null) {
      // 缓存中没有，从文件读取
      const fileExists = await fileSystemService.exists(resolvedPath);

      if (!fileExists) {
        logger.warn('Script file not found', { key, path: resolvedPath }, 'ScriptPanel');
        EditorManager.setValue(`// 脚本: ${key}\n// 路径: ${resolvedPath}\n// 文件不存在`);
        if (DOM.codeFilePath) {
          DOM.codeFilePath.textContent = `脚本: ${key} (文件不存在)`;
        }
        return;
      }

      const result = await fileSystemService.readFile(resolvedPath);
      if (!result.success || typeof result.data !== 'string') {
        logger.error('Failed to read script content', { key, error: result.error }, 'ScriptPanel');
        EditorManager.setValue(`// 加载脚本失败: ${key}\n// 错误: ${result.error}`);
        return;
      }

      scriptContent = result.data;
      // 缓存读取的内容
      setScriptCache(resolvedPath, scriptContent);
    }

    // 设置编辑器内容和模型
    EditorManager.setModel(scriptContent, resolvedPath, 'javascript');

    if (DOM.codeFilePath) {
      DOM.codeFilePath.textContent = `脚本: ${key}`;
    }

    logger.debug('Script content loaded', { key, path: resolvedPath, fromCache: scriptContent !== null }, 'ScriptPanel');
  } catch (error) {
    logger.error('Failed to load script content', { key, error }, 'ScriptPanel');
    EditorManager.setValue(`// 加载脚本失败: ${key}\n// 错误: ${(error as Error).message}`);
    if (DOM.codeFilePath) {
      DOM.codeFilePath.textContent = `脚本: ${key} (加载失败)`;
    }
  }
}


function updateEditorState(hasScripts: boolean): void {
  EditorManager.setDisabled(!hasScripts);

  if (DOM.saveCodeBtn) {
    DOM.saveCodeBtn.disabled = !hasScripts;
    DOM.saveCodeBtn.classList.toggle('opacity-50', !hasScripts);
  }
  if (DOM.clearCodeBtn) {
    DOM.clearCodeBtn.disabled = !hasScripts;
    DOM.clearCodeBtn.classList.toggle('opacity-50', !hasScripts);
  }
}

async function handleCreateScript(): Promise<void> {
  EventSystem.emit('script:create');
  logger.info('Create script requested', undefined, 'ScriptPanel');
}

export async function handleDeleteScript(): Promise<void> {
  const state = StateManager.getState();
  const currentScriptKey = state.currentScriptKey;

  if (!currentScriptKey) {
    logger.warn('No script selected for deletion', undefined, 'ScriptPanel');
    return;
  }

  EventSystem.emit('script:delete', currentScriptKey);
  logger.info('Delete script requested', { key: currentScriptKey }, 'ScriptPanel');
}

function handleStateChange(_state: unknown, changedKeys: string[]): void {
  if (changedKeys.includes('currentItem') || changedKeys.includes('currentScriptKey')) {
    displayScriptList();
  }
}

export function initScriptPanel(): void {
  // Apply sci-fi theme to script panel
  const scriptPanel = DOM.scriptPanel;
  if (scriptPanel) {
    themeManager.createFuturisticPanel(scriptPanel, {
      variant: 'primary',
      scanlines: true,
      cornerAccents: true,
    });
  }

  // Apply theme to script list container
  const scriptList = DOM.scriptList;
  if (scriptList) {
    themeManager.applySciFiEffects(scriptList, {
      variant: 'secondary',
      glow: false,
      scanlines: true,
    });
    
    // Add digital rain effect to script list background
    visualEffects.createDigitalRain(scriptList, {
      characters: '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
      columns: 15,
      speed: 120,
      color: 'rgba(0, 240, 255, 0.1)',
    });
  }

  // Apply theme to code editor container
  const codeEditorContainer = DOM.codeEditorContainer;
  if (codeEditorContainer) {
    themeManager.createFuturisticPanel(codeEditorContainer, {
      variant: 'accent',
      scanlines: false,
      cornerAccents: true,
    });
  }

  StateManager.subscribe(handleStateChange);
  logger.info('ScriptPanel initialized with sci-fi theme', undefined, 'ScriptPanel');
}

export function disposeScriptPanel(): void {
  const scriptList = DOM.scriptList;
  if (scriptList) {
    recyclePoolTree(scriptList);
    if (eventsBound) {
      scriptList.removeEventListener('click', handleScriptListClick);
      eventsBound = false;
    }
  }

  if (newScriptButton) {
    newScriptButton.removeEventListener('click', handleCreateScript);
    // recyclePoolTree will have already recycled newScriptButton if it was in the list,
    // but just in case it wasn't or we want to be explicit:
    newScriptButton = null;
    newScriptLabel = null;
  }
  
  logger.info('ScriptPanel disposed', undefined, 'ScriptPanel');
}

export default {
  init: initScriptPanel,
  display: displayScriptList,
  select: selectScript,
  dispose: disposeScriptPanel,
};
