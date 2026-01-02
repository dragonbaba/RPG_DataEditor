/**
 * NotePanel - 备注面板
 * 实现备注编辑功能
 * 参考 oldCode/main.js 的 renderNotePanel 和 saveNote
 * 
 * Requirements: 15.1
 */

import { DOM, setDisabled } from '../core/DOMManager';
import { StateManager } from '../core/StateManager';
import { EventSystem } from '../core/EventSystem';
import { logger } from '../services/logger';
import { delay } from '../utils/runner';
import { themeManager } from '../theme/ThemeManager';
import { visualEffects } from '../theme/effects/VisualEffects';

let inputListenerBound = false;
let noteDirty = false;
let charCount = 0;
let lineCount = 0;
let autoSaveRunner: ReturnType<typeof delay> | null = null;

function updateCharCount(): void {
  const noteEditor = DOM.noteEditor;
  const description = DOM.noteDescription;
  
  if (noteEditor) {
    const text = noteEditor.value;
    charCount = text.length;
    lineCount = text.split('\n').length;
  }
  
  if (description) {
    const descText = description.value;
    const descLines = descText.split('\n').length;
    lineCount = Math.max(lineCount, descLines);
    charCount += descText.length;
  }
  
  updateStatusBar();
}

function updateStatusBar(): void {
  const charCountEl = DOM.characterCount;
  const lineCountEl = DOM.lineCount;
  
  if (charCountEl) {
    charCountEl.textContent = String(charCount);
  }
  
  if (lineCountEl) {
    lineCountEl.textContent = String(lineCount);
  }
}

function scheduleAutoSave(): void {
  if (autoSaveRunner) {
    autoSaveRunner.off();
    autoSaveRunner = null;
  }
  
  autoSaveRunner = delay(() => {
    if (noteDirty) {
      EventSystem.emit('note:autosave');
      noteDirty = false;
    }
  }, 300);
}

export function renderNotePanel(): void {
  const noteModePanel = DOM.noteModePanel;
  const noteEditor = DOM.noteEditor;
  
  if (!noteModePanel || !noteEditor) return;
  
  const state = StateManager.getState();
  const currentItem = state.currentItem;
  
  if (!currentItem) {
    updateNoteStatus('请先从左侧项目列表选择一个项目');
    setNoteEditorState('', true);
    setDescriptionState('', true);
    charCount = 0;
    lineCount = 0;
    updateStatusBar();
    return;
  }
  
  const item = currentItem as unknown as Record<string, unknown>;
  const canEdit = canEditNote(item);
  
  if (!canEdit) {
    const name = item.name as string || '未命名';
    const id = item.id as number || state.currentItemIndex || '-';
    updateNoteStatus(`当前项目: ${name} (ID: ${id}) - 该项目没有note属性，无法编辑`);
    setNoteEditorState('', true);
    setDescriptionState('', true);
    return;
  }
  
  const name = item.name as string || '未命名';
  const id = item.id as number || state.currentItemIndex || '-';
  updateNoteStatus(`当前项目: ${name} (ID: ${id})`);
  
  const noteContent = item.note as string || '';
  setNoteEditorState(noteContent, false);
  
  const description = item.description;
  let descriptionText = '';
  if (Array.isArray(description)) {
    descriptionText = description.join('\n');
  } else if (typeof description === 'string') {
    descriptionText = description;
  }
  setDescriptionState(descriptionText, false);
  
  setupInputListener();
  noteDirty = false;
  updateCharCount();
  
  logger.debug('NotePanel rendered', undefined, 'NotePanel');
}

function canEditNote(item: Record<string, unknown>): boolean {
  return 'note' in item || 'params' in item;
}

function updateNoteStatus(text: string): void {
  if (DOM.noteModeSubtitle) {
    DOM.noteModeSubtitle.textContent = text;
  }
}

function setNoteEditorState(value: string, disabled: boolean): void {
  const noteEditor = DOM.noteEditor;
  if (noteEditor) {
    noteEditor.value = value;
    setDisabled(noteEditor, disabled);
  }
  
  setDisabled(DOM.saveNoteBtn, disabled);
}

function setDescriptionState(value: string, disabled: boolean): void {
  const noteDescription = DOM.noteDescription;
  if (noteDescription) {
    noteDescription.value = value;
    setDisabled(noteDescription, disabled);
  }
  
  setDisabled(DOM.saveDescriptionBtn, disabled);
}

function setupInputListener(): void {
  const noteEditor = DOM.noteEditor;
  const noteDescription = DOM.noteDescription;
  
  if (noteEditor && !inputListenerBound) {
    noteEditor.addEventListener('input', handleNoteInput);
    inputListenerBound = true;
  }
  
  if (noteDescription && !noteDescription.dataset.inputBound) {
    noteDescription.addEventListener('input', handleDescriptionInput);
    noteDescription.dataset.inputBound = 'true';
  }
}

function handleNoteInput(): void {
  noteDirty = true;
  updateCharCount();
  EventSystem.emit('note:dirty');
  scheduleAutoSave();
}

function handleDescriptionInput(): void {
  noteDirty = true;
  updateCharCount();
  EventSystem.emit('note:dirty');
  scheduleAutoSave();
}

export function getNoteContent(): string {
  return DOM.noteEditor?.value ?? '';
}

export function getDescriptionContent(): string {
  return DOM.noteDescription?.value ?? '';
}

export function isNoteDirty(): boolean {
  return noteDirty;
}

export async function saveNote(): Promise<void> {
  const state = StateManager.getState();
  
  if (!state.currentItem || state.currentItemIndex === null || !state.currentFilePath) {
    EventSystem.emit('error:show', '请先选择文件和项目');
    return;
  }
  
  const item = state.currentItem as unknown as Record<string, unknown>;
  
  if (!canEditNote(item)) {
    EventSystem.emit('error:show', '该项目没有note属性，无法编辑备注');
    return;
  }
  
  const noteContent = getNoteContent();
  
  EventSystem.emit('note:save', {
    content: noteContent,
    itemIndex: state.currentItemIndex,
  });
  
  noteDirty = false;
  
  logger.info('Note save requested', undefined, 'NotePanel');
}

export async function saveDescription(): Promise<void> {
  const state = StateManager.getState();
  
  if (!state.currentItem || state.currentItemIndex === null || !state.currentFilePath) {
    EventSystem.emit('error:show', '请先选择文件和项目');
    return;
  }
  
  const descriptionContent = getDescriptionContent();
  const descriptionLines = descriptionContent.split('\n').filter(line => line.trim() !== '');
  
  EventSystem.emit('description:save', {
    content: descriptionLines,
    itemIndex: state.currentItemIndex,
  });
  
  logger.info('Description save requested', undefined, 'NotePanel');
}

export function initNotePanel(): void {
  // Apply sci-fi theme to main note panel
  const noteModePanel = DOM.noteModePanel;
  if (noteModePanel) {
    themeManager.createFuturisticPanel(noteModePanel, {
      variant: 'primary',
      scanlines: true,
      cornerAccents: true,
    });
  }

  // Apply theme to note editor
  const noteEditor = DOM.noteEditor;
  if (noteEditor) {
    themeManager.createFuturisticInput(noteEditor);
    
    // Add scanning line effect to note editor
    visualEffects.createScanningLine(noteEditor, {
      color: 'rgba(0, 240, 255, 0.2)',
      speed: 5000,
      opacity: 0.15,
    });
  }

  // Apply theme to description editor
  const noteDescription = DOM.noteDescription;
  if (noteDescription) {
    themeManager.createFuturisticInput(noteDescription);
    
    // Add holographic flicker effect
    visualEffects.createHolographicFlicker(noteDescription, {
      intensity: 0.02,
      frequency: 0.03,
      duration: 100,
    });
  }

  // Apply theme to action buttons
  const actionButtons = [
    DOM.saveNoteBtn,
    DOM.saveDescriptionBtn,
  ];

  actionButtons.forEach((btn, index) => {
    if (btn) {
      const variants = ['primary', 'success'] as const;
      themeManager.createFuturisticButton(btn, variants[index]);
    }
  });

  // Apply theme to status bar elements
  const statusElements = [
    DOM.characterCount,
    DOM.lineCount,
    DOM.noteModeSubtitle,
  ];

  statusElements.forEach(element => {
    if (element) {
      themeManager.applySciFiEffects(element, {
        variant: 'accent',
        glow: false,
        scanlines: false,
      });
    }
  });

  StateManager.subscribe((_state, changedKeys) => {
    if (changedKeys.includes('currentItem') || changedKeys.includes('currentItemIndex')) {
      renderNotePanel();
    }
  });
  
  if (DOM.saveNoteBtn) {
    DOM.saveNoteBtn.addEventListener('click', saveNote);
  }
  
  if (DOM.saveDescriptionBtn) {
    DOM.saveDescriptionBtn.addEventListener('click', saveDescription);
  }
  
  logger.info('NotePanel initialized with sci-fi theme', undefined, 'NotePanel');
}

export function disposeNotePanel(): void {
  const noteEditor = DOM.noteEditor;
  const noteDescription = DOM.noteDescription;
  
  if (noteEditor && inputListenerBound) {
    noteEditor.removeEventListener('input', handleNoteInput);
    inputListenerBound = false;
  }
  
  if (noteDescription) {
    noteDescription.removeEventListener('input', handleDescriptionInput);
    delete noteDescription.dataset.inputBound;
  }
  
  if (DOM.saveNoteBtn) {
    DOM.saveNoteBtn.removeEventListener('click', saveNote);
  }
  
  if (DOM.saveDescriptionBtn) {
    DOM.saveDescriptionBtn.removeEventListener('click', saveDescription);
  }
  
  if (autoSaveRunner) {
    autoSaveRunner.off();
    autoSaveRunner = null;
  }
  
  noteDirty = false;
  
  logger.info('NotePanel disposed', undefined, 'NotePanel');
}

export default {
  init: initNotePanel,
  render: renderNotePanel,
  save: saveNote,
  saveDescription,
  getContent: getNoteContent,
  getDescription: getDescriptionContent,
  isDirty: isNoteDirty,
  dispose: disposeNotePanel,
};
