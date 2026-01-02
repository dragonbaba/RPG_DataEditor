/**
 * Editor-specific Object Pools
 * Optimizes memory allocation for frequently created/destroyed editor objects
 */

import * as monaco from 'monaco-editor';
import { FactoryPool, Poolable, PoolStats } from './ObjectPool';

class MarkerPoolItem implements Poolable {
  owner: string = '';
  resource: string = '';
  severity: monaco.MarkerSeverity = monaco.MarkerSeverity.Error;
  code: string | { value: string; target: monaco.Uri } | undefined;
  message: string = '';
  source: string | undefined;
  startLineNumber: number = 0;
  startColumn: number = 0;
  endLineNumber: number = 0;
  endColumn: number = 0;
  relatedInformation: monaco.editor.IRelatedInformation[] = [];
  tags: monaco.MarkerTag[] | undefined;

  reset(): void {
    this.owner = '';
    this.resource = '';
    this.severity = monaco.MarkerSeverity.Error;
    this.code = undefined;
    this.message = '';
    this.source = undefined;
    this.startLineNumber = 0;
    this.startColumn = 0;
    this.endLineNumber = 0;
    this.endColumn = 0;
    this.relatedInformation = [];
    this.tags = undefined;
  }

  init(data?: monaco.editor.IMarker): void {
    if (data) {
      this.owner = data.owner ?? '';
      this.resource = data.resource?.toString() ?? '';
      this.severity = data.severity;
      this.code = data.code;
      this.message = data.message;
      this.source = data.source;
      this.startLineNumber = data.startLineNumber;
      this.startColumn = data.startColumn;
      this.endLineNumber = data.endLineNumber;
      this.endColumn = data.endColumn;
      this.relatedInformation = data.relatedInformation ?? [];
      this.tags = data.tags;
    }
  }

  toMarker(): monaco.editor.IMarker {
    return {
      owner: this.owner,
      resource: this.resource ? monaco.Uri.parse(this.resource) : monaco.Uri.parse(''),
      severity: this.severity,
      code: this.code,
      message: this.message,
      source: this.source,
      startLineNumber: this.startLineNumber,
      startColumn: this.startColumn,
      endLineNumber: this.endLineNumber,
      endColumn: this.endColumn,
      relatedInformation: this.relatedInformation,
      tags: this.tags,
    };
  }
}

class CompletionItemPoolItem implements Poolable {
  label: string | monaco.languages.CompletionItemLabel = '';
  kind: monaco.languages.CompletionItemKind | undefined;
  tags: readonly monaco.languages.CompletionItemTag[] | undefined;
  detail: string | undefined;
  documentation: string | monaco.IMarkdownString | undefined;
  sortText: string | undefined;
  filterText: string | undefined;
  insertText: string | undefined;
  insertTextRules: monaco.languages.CompletionItemInsertTextRule | undefined;
  range: monaco.IRange | monaco.languages.CompletionItemRanges | undefined;
  commitCharacters: readonly string[] | undefined;
  additionalTextEdits: monaco.editor.ISingleEditOperation[] | undefined;
  command: monaco.languages.Command | undefined;

  reset(): void {
    this.label = '';
    this.kind = undefined;
    this.tags = undefined;
    this.detail = undefined;
    this.documentation = undefined;
    this.sortText = undefined;
    this.filterText = undefined;
    this.insertText = undefined;
    this.insertTextRules = undefined;
    this.range = undefined;
    this.commitCharacters = undefined;
    this.additionalTextEdits = undefined;
    this.command = undefined;
  }

  init(data?: monaco.languages.CompletionItem): void {
    if (data) {
      this.label = data.label;
      this.kind = data.kind;
      this.tags = data.tags;
      this.detail = data.detail;
      this.documentation = data.documentation;
      this.sortText = data.sortText;
      this.filterText = data.filterText;
      this.insertText = data.insertText;
      this.insertTextRules = data.insertTextRules;
      this.range = data.range;
      this.commitCharacters = data.commitCharacters;
      this.additionalTextEdits = data.additionalTextEdits;
      this.command = data.command;
    }
  }

  toCompletionItem(): monaco.languages.CompletionItem {
    return {
      label: this.label,
      kind: this.kind ?? monaco.languages.CompletionItemKind.Text,
      tags: this.tags,
      detail: this.detail ?? '',
      documentation: this.documentation,
      sortText: this.sortText ?? (this.label as string),
      filterText: this.filterText,
      insertText: this.insertText ?? (this.label as string),
      insertTextRules: this.insertTextRules,
      range: this.range ?? { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 },
      commitCharacters: this.commitCharacters as string[] | undefined,
      additionalTextEdits: this.additionalTextEdits,
      command: this.command,
    };
  }
}

const markerPool = new FactoryPool<MarkerPoolItem>(
  'MarkerPool',
  () => new MarkerPoolItem(),
  (item) => item.reset(),
  undefined,
  200
);

const completionItemPool = new FactoryPool<CompletionItemPoolItem>(
  'CompletionItemPool',
  () => new CompletionItemPoolItem(),
  (item) => item.reset(),
  undefined,
  300
);

export function getMarkerPool(): FactoryPool<MarkerPoolItem> {
  return markerPool;
}

export function getCompletionItemPool(): FactoryPool<CompletionItemPoolItem> {
  return completionItemPool;
}

export function getMarkerPoolStats(): PoolStats {
  return markerPool.getStats();
}

export function getCompletionItemPoolStats(): PoolStats {
  return completionItemPool.getStats();
}

export function preAllocateMarkerPool(count: number): void {
  markerPool.preAllocate(count);
}

export function preAllocateCompletionItemPool(count: number): void {
  completionItemPool.preAllocate(count);
}

export function clearMarkerPool(): void {
  markerPool.clear();
}

export function clearCompletionItemPool(): void {
  completionItemPool.clear();
}

