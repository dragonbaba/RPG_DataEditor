/**
 * Array Helpers - 数组操作工具函数
 * Performance-first approach - all callbacks are predefined functions
 */

export const filterNotIndex = (index: number) => {
  return <T>(_: T, i: number): boolean => i !== index;
};

export const filterNotValue = <T>(value: T) => {
  return (item: T): boolean => item !== value;
};

export const mapByIndex = <T>(index: number, newValue: T) => {
  return (item: T, i: number): T => (i === index ? newValue : item);
};

export const mapByIndexWithUpdates = <T>(index: number, updates: Partial<T>) => {
  return (item: T, i: number): T => (i === index ? { ...item, ...updates } : item);
};

export const sumDuration = <T extends { duration: number }>(total: number, item: T): number => {
  return total + item.duration;
};

export const findById = <T extends { id: string | number }>(id: string | number) => {
  return (item: T): boolean => item.id === id;
};

export const filterSegmentsNotIndex = (index: number) => {
  return <T>(_: T, i: number): boolean => i !== index;
};

export const mapPanelShortcut = (onTogglePanel: (panelId: string) => void) => {
  return (panelId: string, index: number) => ({
    key: `Digit${index + 1}`,
    ctrl: true,
    shift: true,
    handler: () => onTogglePanel(panelId),
    description: `切换面板 ${index + 1}`,
  });
};

export const mapModeShortcut = (onSetMode: (mode: string) => void) => {
  return (entry: any) => ({
    key: entry.key,
    ctrl: true,
    alt: true,
    handler: () => onSetMode(entry.mode),
    description: entry.description,
  });
};

export const mapAnimationToOption = <T extends { id: number; name: string }>(anim: T) => {
  return {
    value: anim.id,
    label: anim.name,
  };
};

export const mapEasingToOption = (opt: any) => {
  return {
    value: opt.value,
    label: opt.label,
  };
};

export const mapFileEntry = (path: string) => {
  const name = path.split(/[/\\]/).pop() || path;
  return { path, name };
};

export const mapKeyToObject = (obj: Record<string, any>) => {
  return (key: string) => ({ key, value: obj[key] });
};

export const mapSegmentStyles = (getStyle: (index: number) => any) => {
  return (item: any, index: number) => ({ item, style: getStyle(index) });
};

export const mapVisibleItems = (offset: number) => {
  return (item: any, localIndex: number) => ({ item, actualIndex: offset + localIndex });
};

export const mapRenderItem = <I>(renderFn: (item: any, index: I) => any) => {
  return (item: any, index: number): any => renderFn(item, index as I);
};

export const filterToastById = (id: string) => {
  return (toast: any): boolean => toast.id !== id;
};

// Additional render helpers
export const filterAttributeById = (id: string) => {
  return (a: any): boolean => a.id !== id;
};

export const mapAttributeWithId = (id: string, updates: any) => {
  return (a: any): any => (a.id === id ? { ...a, ...updates } : a);
};

export const filterBySeverity = (severities: any[]) => {
  return (marker: any): boolean => severities.includes(marker.severity);
};

export const disposeDisposable = () => {
  return (d: any) => d.dispose();
};

export const createTypeDefinitionLoader = () => {
  return ({ filename, content }: any) => filename;
};

export const mapDefaultValue = (DEFAULT_BASE_ATTRIBUTES: any[]) => {
  return (a: any) => a.defaultValue;
};

export const createScriptItemKey = (item: any, index: number) => {
  return item.key ?? index;
};

export const mapPanelSize = (panelStates: Record<string, any>, panels: any[]) => {
  return (p: any) => panelStates[p.id]?.size || 0;
};

// Completion helpers
export const mapCompletionItem = (item: any) => {
  return {
    label: item.label,
    kind: item.kind,
    detail: item.detail,
    documentation: item.documentation,
    insertText: item.insertText,
    insertTextRules: item.insertTextRules,
  };
};

export const disposeProvider = () => {
  return (provider: any) => provider.dispose();
};

// Helper for Monaco severity
export const getSeverityValue = (severity: string): number => {
  switch (severity) {
    case 'error': return 8;
    case 'warning': return 4;
    case 'info': return 2;
    case 'hint': return 1;
    default: return 2;
  }
};

export const mapMonacoMarker = (marker: any) => {
  return {
    severity: getSeverityValue(marker.severity),
    message: marker.message,
    startLineNumber: marker.startLineNumber,
    startColumn: marker.startColumn,
    endLineNumber: marker.endLineNumber,
    endColumn: marker.endColumn,
  };
};
