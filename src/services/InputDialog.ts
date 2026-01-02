import { DOM } from '../core/DOMManager';

let resolvePending: ((value: string | null) => void) | null = null;
let initialized = false;

function closeDialog(result: string | null): void {
  if (DOM.inputDialog) {
    DOM.inputDialog.classList.add('hidden');
  }
  if (resolvePending) {
    const resolve = resolvePending;
    resolvePending = null;
    resolve(result);
  }
}

function handleConfirm(): void {
  const value = DOM.inputDialogInput ? DOM.inputDialogInput.value.trim() : '';
  closeDialog(value || null);
}

function handleCancel(): void {
  closeDialog(null);
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleConfirm();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    handleCancel();
  }
}

function handleDialogClick(e: MouseEvent): void {
  if (e.target === DOM.inputDialog) {
    handleCancel();
  }
}

export function initInputDialog(): void {
  if (initialized) return;
  initialized = true;

  if (DOM.inputDialogConfirm) {
    DOM.inputDialogConfirm.addEventListener('click', handleConfirm);
  }
  if (DOM.inputDialogCancel) {
    DOM.inputDialogCancel.addEventListener('click', handleCancel);
  }
  if (DOM.inputDialogInput) {
    DOM.inputDialogInput.addEventListener('keydown', handleKeydown);
  }
  if (DOM.inputDialog) {
    DOM.inputDialog.addEventListener('click', handleDialogClick);
  }
}

export function showInputDialog(title: string, message: string): Promise<string | null> {
  initInputDialog();

  if (DOM.inputDialogTitle) {
    DOM.inputDialogTitle.textContent = title;
  }
  if (DOM.inputDialogMessage) {
    DOM.inputDialogMessage.textContent = message;
  }
  if (DOM.inputDialogInput) {
    DOM.inputDialogInput.value = '';
  }
  if (DOM.inputDialog) {
    DOM.inputDialog.classList.remove('hidden');
  }
  if (DOM.inputDialogInput) {
    DOM.inputDialogInput.focus();
  }

  return new Promise((resolve) => {
    resolvePending = resolve;
  });
}

export function hideInputDialog(): void {
  closeDialog(null);
}

export default {
  init: initInputDialog,
  show: showInputDialog,
  hide: hideInputDialog,
};
