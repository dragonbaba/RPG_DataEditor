/**
 * EditorStateManager - 编辑器状态管理器
 *
 * 管理Monaco编辑器的只读状态和禁用样式
 * 参考 oldCode/main.js EditorStateManager (lines 2072-2119)
 */

import { logger } from './logger';

/** 编辑器类型 */
interface Editor {
  updateOptions(options: Record<string, unknown>): void;
  getDomNode(): HTMLElement | null;
}

/** 编辑器状态管理器接口 */
interface EditorStateManagerInterface {
  apply(editor: Editor | null, readOnly: boolean, container?: HTMLElement | null): void;
  applyBatch(editors: Array<{ editor: Editor; container?: HTMLElement }>, readOnly: boolean): void;
}

/**
 * 编辑器状态管理器实现
 */
const EditorStateManager: EditorStateManagerInterface = {
  /**
   * 应用编辑器状态
   */
  apply(editor: Editor | null, readOnly: boolean, container: HTMLElement | null = null): void {
    if (!editor) return;

    const updateOptions = {
      readOnly: readOnly,
      renderLineHighlight: readOnly ? 'none' : 'all',
    };

    editor.updateOptions(updateOptions);

    const domNode = editor.getDomNode();
    const wrapper = domNode?.parentElement;

    if (wrapper) {
      wrapper.classList.toggle('code-editor-disabled', readOnly);
      wrapper.style.pointerEvents = '';
      wrapper.style.opacity = '';
    }

    if (container) {
      container.classList.toggle('code-editor-disabled', readOnly);
    }

    logger.debug('EditorStateManager applied', { readOnly }, 'EditorStateManager');
  },

  /**
   * 批量应用编辑器状态
   */
  applyBatch(editors: Array<{ editor: Editor; container?: HTMLElement }>, readOnly: boolean): void {
    if (!Array.isArray(editors)) return;

    for (let i = 0; i < editors.length; i++) {
      const { editor, container } = editors[i];
      EditorStateManager.apply(editor, readOnly, container || null);
    }
  }
};

/**
 * 便捷函数：设置编辑器为只读
 */
export function setEditorReadOnly(editor: Editor | null, container?: HTMLElement): void {
  EditorStateManager.apply(editor, true, container || null);
}

/**
 * 便捷函数：设置编辑器为可编辑
 */
export function setEditorEditable(editor: Editor | null, container?: HTMLElement): void {
  EditorStateManager.apply(editor, false, container || null);
}

export default EditorStateManager;
