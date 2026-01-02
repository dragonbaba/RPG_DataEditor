/**
 * MonacoLoader Service - Monaco 编辑器加载管理器
 * 
 * 单例服务，负责：
 * 1. Monaco 编辑器的懒加载
 * 2. Web Worker 的集中管理（确保只创建一次）
 * 3. 主题和配置的初始化
 * 4. TypeScript 工作区支持
 * 
 * 参考 oldCode/main.js 实现，优化性能
 */

import * as monacoType from 'monaco-editor';

let monacoInstance: typeof monacoType | null = null;
let isLoading = false;
let loadPromise: Promise<typeof monacoType> | null = null;

// Worker 管理
let workerDisposer: (() => void) | null = null;

// extraLib 管理器
const extraLibDisposers: monacoType.IDisposable[] = [];

// TypeScript 配置
let tsConfigLoaded = false;

// 主题注册状态
let themesRegistered = false;

// 自定义 JS 补全项（缓存）
let cachedCompletions: monacoType.languages.CompletionItem[] | null = null;

// 日志
const logger = {
  debug: (msg: string, ...args: unknown[]) => console.debug(`[MonacoLoader] ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`[MonacoLoader] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[MonacoLoader] ${msg}`, ...args),
};

const OPTION_KEY_REGEXP = /[-_\s]/g;
const EMPTY_COMPILER_OPTION_MAP: Record<string, number> = Object.create(null);
let compilerOptionMaps: {
  target: Record<string, number>;
  module: Record<string, number>;
  moduleResolution: Record<string, number>;
  jsx: Record<string, number>;
  newLine: Record<string, number>;
} | null = null;

function normalizeCompilerOptionKey(value: string): string {
  return value.trim().replace(OPTION_KEY_REGEXP, '').toLowerCase();
}

function mapCompilerOption(
  map: Record<string, number>,
  value: unknown
): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;
  return map[normalizeCompilerOptionKey(value)];
}

function addCompilerOptionMap(
  map: Record<string, number>,
  key: string,
  value: number | undefined
): void {
  if (typeof value === 'number') {
    map[key] = value;
  }
}

function ensureCompilerOptionMaps(monaco: typeof monacoType): void {
  if (compilerOptionMaps) return;

  const ts = monaco.typescript;
  const target = Object.create(null) as Record<string, number>;
  const module = Object.create(null) as Record<string, number>;
  const moduleResolution = Object.create(null) as Record<string, number>;
  const jsx = Object.create(null) as Record<string, number>;
  const newLine = Object.create(null) as Record<string, number>;

  addCompilerOptionMap(target, 'es3', ts.ScriptTarget.ES3);
  addCompilerOptionMap(target, 'es5', ts.ScriptTarget.ES5);
  addCompilerOptionMap(target, 'es2015', ts.ScriptTarget.ES2015);
  addCompilerOptionMap(target, 'es2016', ts.ScriptTarget.ES2016);
  addCompilerOptionMap(target, 'es2017', ts.ScriptTarget.ES2017);
  addCompilerOptionMap(target, 'es2018', ts.ScriptTarget.ES2018);
  addCompilerOptionMap(target, 'es2019', ts.ScriptTarget.ES2019);
  addCompilerOptionMap(target, 'es2020', ts.ScriptTarget.ES2020);
  const scriptTarget = ts.ScriptTarget as unknown as Record<string, number>;
  addCompilerOptionMap(target, 'es2021', scriptTarget.ES2021);
  addCompilerOptionMap(target, 'es2022', scriptTarget.ES2022);
  addCompilerOptionMap(target, 'esnext', ts.ScriptTarget.ESNext);
  addCompilerOptionMap(target, 'latest', scriptTarget.Latest);

  addCompilerOptionMap(module, 'none', ts.ModuleKind.None);
  addCompilerOptionMap(module, 'commonjs', ts.ModuleKind.CommonJS);
  addCompilerOptionMap(module, 'amd', ts.ModuleKind.AMD);
  addCompilerOptionMap(module, 'umd', ts.ModuleKind.UMD);
  addCompilerOptionMap(module, 'system', ts.ModuleKind.System);
  addCompilerOptionMap(module, 'es2015', ts.ModuleKind.ES2015);
  const moduleKind = ts.ModuleKind as unknown as Record<string, number>;
  addCompilerOptionMap(module, 'es2020', moduleKind.ES2020);
  addCompilerOptionMap(module, 'es2022', moduleKind.ES2022);
  addCompilerOptionMap(module, 'esnext', moduleKind.ESNext);

  addCompilerOptionMap(moduleResolution, 'classic', ts.ModuleResolutionKind.Classic);
  addCompilerOptionMap(moduleResolution, 'node', ts.ModuleResolutionKind.NodeJs);
  addCompilerOptionMap(moduleResolution, 'nodejs', ts.ModuleResolutionKind.NodeJs);
  const moduleResolutionKind = ts.ModuleResolutionKind as unknown as Record<string, number>;
  addCompilerOptionMap(moduleResolution, 'node16', moduleResolutionKind.Node16);
  addCompilerOptionMap(moduleResolution, 'nodenext', moduleResolutionKind.NodeNext);
  addCompilerOptionMap(moduleResolution, 'bundler', moduleResolutionKind.Bundler);

  addCompilerOptionMap(jsx, 'none', ts.JsxEmit.None);
  addCompilerOptionMap(jsx, 'preserve', ts.JsxEmit.Preserve);
  addCompilerOptionMap(jsx, 'react', ts.JsxEmit.React);
  addCompilerOptionMap(jsx, 'reactnative', ts.JsxEmit.ReactNative);
  addCompilerOptionMap(jsx, 'reactjs', ts.JsxEmit.React);
  const jsxEmit = ts.JsxEmit as unknown as Record<string, number>;
  addCompilerOptionMap(jsx, 'reactjsx', jsxEmit.ReactJSX);
  addCompilerOptionMap(jsx, 'reactjsxdev', jsxEmit.ReactJSXDev);

  addCompilerOptionMap(newLine, 'crlf', ts.NewLineKind.CarriageReturnLineFeed);
  addCompilerOptionMap(newLine, 'lf', ts.NewLineKind.LineFeed);

  compilerOptionMaps = {
    target,
    module,
    moduleResolution,
    jsx,
    newLine,
  };
}

function normalizeTsCompilerOptions(
  monaco: typeof monacoType,
  options: Record<string, unknown>
): Record<string, unknown> {
  ensureCompilerOptionMaps(monaco);
  const maps = compilerOptionMaps ?? {
    target: EMPTY_COMPILER_OPTION_MAP,
    module: EMPTY_COMPILER_OPTION_MAP,
    moduleResolution: EMPTY_COMPILER_OPTION_MAP,
    jsx: EMPTY_COMPILER_OPTION_MAP,
    newLine: EMPTY_COMPILER_OPTION_MAP,
  };

  const normalized: Record<string, unknown> = { ...options };
  const target = mapCompilerOption(maps.target, options.target);
  const module = mapCompilerOption(maps.module, options.module);
  const moduleResolution = mapCompilerOption(maps.moduleResolution, options.moduleResolution);
  const jsx = mapCompilerOption(maps.jsx, options.jsx);
  const newLine = mapCompilerOption(maps.newLine, options.newLine);

  if (typeof target === 'number') normalized.target = target;
  if (typeof module === 'number') normalized.module = module;
  if (typeof moduleResolution === 'number') normalized.moduleResolution = moduleResolution;
  if (typeof jsx === 'number') normalized.jsx = jsx;
  if (typeof newLine === 'number') normalized.newLine = newLine;

  return normalized;
}

/**
 * 配置 Monaco Web Worker 环境
 * 只执行一次，确保 Worker 只创建一次
 */
function configureMonacoEnvironment(): void {
  if (typeof self === 'undefined') return;

  // 检查是否已经配置过
  const selfAny = self as unknown as Record<string, unknown>;
  if (selfAny.MonacoEnvironment) {
    logger.debug('MonacoEnvironment already configured');
    return;
  }

  selfAny.MonacoEnvironment = {
    getWorker: function (_moduleId: string, label: string): Worker {
      switch (label) {
        case 'json':
          return new Worker(
            new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
            { type: 'module' as const, name: label }
          );
        case 'typescript':
        case 'javascript':
          return new Worker(
            new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
            { type: 'module' as const, name: label }
          );
        default:
          return new Worker(
            new URL('monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
            { type: 'module' as const, name: label }
          );
      }
    },
  };

  logger.debug('MonacoEnvironment configured');
}

/**
 * 加载 Monaco Editor（懒加载）
 */
export async function loadMonaco(): Promise<typeof monacoType> {
  if (monacoInstance) {
    return monacoInstance;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      // 配置 Worker 环境（只配置一次）
      configureMonacoEnvironment();

      // 导入 Monaco
      const monaco = await import('monaco-editor');
      monacoInstance = monaco;

      logger.debug('Monaco loaded successfully');
      return monaco;
    } catch (error) {
      logger.error('Failed to load Monaco', error);
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * 获取已加载的 Monaco 实例
 * 如果未加载，返回 null
 */
export function getMonaco(): typeof monacoType | null {
  return monacoInstance;
}

/**
 * 注册自定义主题
 * 包含 Monokai Pro 主题（来自 oldCode/monaco-pro-theme.json）
 */
export function registerCustomThemes(monaco: typeof monacoType): void {
  if (themesRegistered) return;

  // Monokai Pro Theme - 来自 oldCode/monaco-pro-theme.json
  // Requirements: 5.1, 5.2, 5.3, 5.4
  monaco.editor.defineTheme('monokai-pro', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'F7F1FF', background: '222222' },
      { token: 'comment', foreground: '69676C', fontStyle: 'italic' },
      { token: 'string', foreground: 'FCE566' },
      { token: 'string.regexp', foreground: 'FC618D' },
      { token: 'constant', foreground: '948AE3' },
      { token: 'constant.numeric', foreground: '948AE3' },
      { token: 'constant.language', foreground: '948AE3' },
      { token: 'constant.character', foreground: '948AE3' },
      { token: 'constant.other', foreground: 'F7F1FF' },
      { token: 'constant.other.placeholder', foreground: 'FD9353' },
      { token: 'constant.other.symbol', foreground: 'FD9353' },
      { token: 'constant.other.property', foreground: '948AE3' },
      { token: 'keyword', foreground: 'FC618D' },
      { token: 'keyword.control', foreground: 'FC618D' },
      { token: 'keyword.operator', foreground: 'FC618D' },
      { token: 'storage', foreground: 'FC618D' },
      { token: 'storage.modifier', foreground: 'FC618D', fontStyle: 'italic' },
      { token: 'storage.type', foreground: '5AD4E6', fontStyle: 'italic' },
      { token: 'storage.type.extends', foreground: 'FC618D' },
      { token: 'entity.name.function', foreground: '7BD88F' },
      { token: 'variable.function', foreground: '7BD88F' },
      { token: 'entity.name.class', foreground: '5AD4E6' },
      { token: 'entity.name.type', foreground: '5AD4E6' },
      { token: 'entity.name.namespace', foreground: '5AD4E6' },
      { token: 'entity.name.tag', foreground: 'FC618D' },
      { token: 'entity.other.attribute-name', foreground: '5AD4E6', fontStyle: 'italic' },
      { token: 'entity.other.inherited-class', foreground: '5AD4E6', fontStyle: 'italic' },
      { token: 'entity.name.constant', foreground: '948AE3' },
      { token: 'entity.name.label', foreground: '948AE3' },
      { token: 'support.function', foreground: '7BD88F' },
      { token: 'support.constant', foreground: '5AD4E6' },
      { token: 'support.type', foreground: '5AD4E6', fontStyle: 'italic' },
      { token: 'support.class', foreground: '5AD4E6' },
      { token: 'support.variable', foreground: '5AD4E6' },
      { token: 'support.variable.property', foreground: '5AD4E6' },
      { token: 'support.macro', foreground: '7BD88F' },
      { token: 'support.constant.handlebars', foreground: '8B888F' },
      { token: 'variable', foreground: 'F7F1FF' },
      { token: 'variable.other', foreground: 'F7F1FF' },
      { token: 'variable.parameter', foreground: 'FD9353', fontStyle: 'italic' },
      { token: 'variable.language', foreground: 'BAB6C0', fontStyle: 'italic' },
      { token: 'variable.other.constant', foreground: '948AE3' },
      { token: 'variable.other.readwrite', foreground: 'F7F1FF' },
      { token: 'variable.other.member', foreground: 'F7F1FF' },
      { token: 'variable.other.property', foreground: 'F7F1FF' },
      { token: 'variable.other.event', foreground: 'F7F1FF' },
      { token: 'variable.other.enummember', foreground: '948AE3' },
      { token: 'variable.other.substitution', foreground: 'FD9353' },
      { token: 'variable.other.property.static', foreground: 'F7F1FF' },
      { token: 'markup.heading', foreground: 'FCE566' },
      { token: 'markup.inserted', foreground: '7BD88F' },
      { token: 'markup.deleted', foreground: 'FC618D' },
      { token: 'markup.changed', foreground: 'FCE566' },
      { token: 'markup.raw', foreground: 'FD9353' },
      { token: 'markup.italic', fontStyle: 'italic' },
      { token: 'markup.bold', fontStyle: 'bold' },
      { token: 'invalid', foreground: 'FC618D', fontStyle: 'italic underline' },
      { token: 'invalid.deprecated', foreground: 'FD9353', fontStyle: 'italic underline' },
      { token: 'punctuation', foreground: '8B888F' },
      { token: 'delimiter', foreground: '8B888F' },
      { token: 'token.warn-token', foreground: 'CD9731' },
      { token: 'token.error-token', foreground: 'F44747' },
      { token: 'token.debug-token', foreground: 'B267E6' },
    ],
    colors: {
      'editor.background': '#222222',
      'editor.foreground': '#F7F1FF',
      'editor.selectionBackground': '#BAB6C026',
      'editor.selectionHighlightBackground': '#F7F1FF26',
      'editor.lineHighlightBackground': '#F7F1FF0C',
      'editorCursor.foreground': '#F7F1FF',
      'editorLineNumber.foreground': '#525053',
      'editorLineNumber.activeForeground': '#BAB6C0',
      'editorWhitespace.foreground': '#525053',
      'editorIndentGuide.background': '#222222',
      'editorIndentGuide.activeBackground': '#7BD88FA5',
      'editor.selectionHighlightBorder': '#00000000',
      'editor.inactiveSelectionBackground': '#F7F1FF0C',
      'editorWidget.background': '#363537',
      'editorSuggestWidget.background': '#363537',
      'editorGutter.foldingControlForeground': '#BAB6C0',
      'editorOverviewRuler.border': '#222222',
    },
  });

  // Sci-Fi Dark Theme
  monaco.editor.defineTheme('sci-fi-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '00F0FF' },
      { token: 'string', foreground: 'FF8800' },
      { token: 'number', foreground: '00FF88' },
      { token: 'type', foreground: 'FF00FF' },
      { token: 'function', foreground: '00F0FF' },
      { token: 'variable', foreground: 'E0E0E0' },
      { token: 'constant', foreground: '00FF88' },
      { token: 'operator', foreground: '00F0FF' },
      { token: 'delimiter', foreground: '808080' },
    ],
    colors: {
      'editor.background': '#0a0a0f',
      'editor.foreground': '#E0E0E0',
      'editor.lineHighlightBackground': '#1a1a2e',
      'editor.selectionBackground': '#00F0FF33',
      'editor.inactiveSelectionBackground': '#00F0FF22',
      'editorCursor.foreground': '#00F0FF',
      'editorWhitespace.foreground': '#333344',
      'editorIndentGuide.background': '#333344',
      'editorIndentGuide.activeBackground': '#00F0FF44',
      'editorLineNumber.foreground': '#4a4a6a',
      'editorLineNumber.activeForeground': '#00F0FF',
      'editorGutter.background': '#0a0a0f',
      'editorWidget.background': '#0f0f1a',
      'editorWidget.border': '#00F0FF44',
      'editorSuggestWidget.background': '#0f0f1a',
      'editorSuggestWidget.border': '#00F0FF44',
      'editorSuggestWidget.selectedBackground': '#00F0FF33',
      'editorHoverWidget.background': '#0f0f1a',
      'editorHoverWidget.border': '#00F0FF44',
    },
  });

  // Sci-Fi Light Theme
  monaco.editor.defineTheme('sci-fi-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0088CC' },
      { token: 'string', foreground: 'CC6600' },
      { token: 'number', foreground: '008855' },
      { token: 'type', foreground: 'CC00CC' },
      { token: 'function', foreground: '0088CC' },
      { token: 'variable', foreground: '333333' },
      { token: 'constant', foreground: '008855' },
      { token: 'operator', foreground: '0088CC' },
      { token: 'delimiter', foreground: '666666' },
    ],
    colors: {
      'editor.background': '#f5f5fa',
      'editor.foreground': '#333333',
      'editor.lineHighlightBackground': '#e8e8f0',
      'editor.selectionBackground': '#0088CC33',
      'editor.inactiveSelectionBackground': '#0088CC22',
      'editorCursor.foreground': '#0088CC',
      'editorWhitespace.foreground': '#ccccdd',
      'editorIndentGuide.background': '#ccccdd',
      'editorIndentGuide.activeBackground': '#0088CC44',
      'editorLineNumber.foreground': '#8888aa',
      'editorLineNumber.activeForeground': '#0088CC',
      'editorGutter.background': '#f5f5fa',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#0088CC44',
      'editorSuggestWidget.background': '#ffffff',
      'editorSuggestWidget.border': '#0088CC44',
      'editorSuggestWidget.selectedBackground': '#0088CC22',
      'editorHoverWidget.background': '#ffffff',
      'editorHoverWidget.border': '#0088CC44',
    },
  });

  themesRegistered = true;
  logger.debug('Custom themes registered');

  // 注册自定义 JS 补全（参考 oldCode/main.js:6060-6116）
  registerJavaScriptCompletions(monaco);
}

const CUSTOM_JS_COMPLETIONS = [
  'console.log', 'console.error', 'console.warn', 'console.info',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'JSON.stringify', 'JSON.parse',
  'Array.isArray', 'Object.keys', 'Object.values', 'Object.entries',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'Math.abs', 'Math.max', 'Math.min', 'Math.round', 'Math.floor', 'Math.ceil', 'Math.random',
  'Date.now',
  'Promise.resolve', 'Promise.reject',
  'async function', 'await',
  'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'return',
  'try', 'catch', 'finally', 'throw', 'new', 'this', 'typeof', 'instanceof'
];

function registerJavaScriptCompletions(monaco: typeof monacoType): void {
  if (cachedCompletions !== null) return;

  const len = CUSTOM_JS_COMPLETIONS.length;
  cachedCompletions = new Array(len);
  for (let i = 0; i < len; i++) {
    const label = CUSTOM_JS_COMPLETIONS[i];
    cachedCompletions[i] = {
      label: label,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: label,
      range: { startLineNumber: 0, endLineNumber: 0, startColumn: 0, endColumn: 0 }
    };
  }

  const rangeRef = { range: { startLineNumber: 0, endLineNumber: 0, startColumn: 0, endColumn: 0 } };

  monaco.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems: function (model, position) {
      const word = model.getWordUntilPosition(position);
      rangeRef.range.startLineNumber = position.lineNumber;
      rangeRef.range.endLineNumber = position.lineNumber;
      rangeRef.range.startColumn = word.startColumn;
      rangeRef.range.endColumn = word.endColumn;

      for (let i = 0; i < cachedCompletions!.length; i++) {
        cachedCompletions![i].range = rangeRef.range;
      }

      return { suggestions: cachedCompletions! };
    }
  });

  logger.debug('Custom JavaScript completions registered');
}

/**
 * 配置 TypeScript/JavaScript 默认选项
 * 参考 oldCode/main.js:5997-6003
 */
export function configureTypeScriptDefaults(monaco: typeof monacoType): void {
  if (!monaco.typescript) return;

  const tsDefaults = monaco.typescript.typescriptDefaults;
  const jsDefaults = monaco.typescript.javascriptDefaults;

  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  const baseOptions = {
    allowJs: true,
    checkJs: true,
    target: monaco.typescript.ScriptTarget.ES2020,
    moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
    strict: false,
  };

  tsDefaults.setCompilerOptions(baseOptions);
  jsDefaults.setCompilerOptions(baseOptions);

  logger.debug('TypeScript defaults configured');
}

/**
 * 从 tsconfig.json 加载并应用编译器选项
 * 参考 oldCode/main.js:6004-6018
 */
export async function applyTsConfigFromPath(
  monaco: typeof monacoType,
  tsconfigPath: string,
  readFile: (path: string, encoding: string) => Promise<string>
): Promise<void> {
  try {
    const raw = await readFile(tsconfigPath, 'utf-8');
    const cfg = JSON.parse(raw);
    const opts = (cfg.compilerOptions || {}) as Record<string, unknown>;
    const normalizedOptions = normalizeTsCompilerOptions(monaco, opts);

    const ts = monaco.languages.typescript as {
      typescriptDefaults?: { setCompilerOptions: (o: unknown) => void };
      javascriptDefaults?: { setCompilerOptions: (o: unknown) => void };
    };
    ts.typescriptDefaults?.setCompilerOptions(normalizedOptions);
    ts.javascriptDefaults?.setCompilerOptions(normalizedOptions);

    logger.debug(`Applied tsconfig from ${tsconfigPath}`);
  } catch (error) {
    logger.warn('Failed to load tsconfig, using defaults', error);
  }
}

/**
 * 添加工作区 .d.ts 声明文件
 * 参考 oldCode/main.js:5950-5959
 */
export function addExtraLib(
  monaco: typeof monacoType,
  code: string,
  virtualPath: string
): void {
  const ts = monaco.languages.typescript as {
    typescriptDefaults?: { addExtraLib: (c: string, p: string) => { dispose: () => void } };
    javascriptDefaults?: { addExtraLib: (c: string, p: string) => { dispose: () => void } };
  };
  const tsDefaults = ts.typescriptDefaults;
  const jsDefaults = ts.javascriptDefaults;
  if (!tsDefaults) return;

  const tsDisposer = tsDefaults.addExtraLib(code, virtualPath);
  extraLibDisposers.push(tsDisposer);

  if (jsDefaults) {
    const jsDisposer = jsDefaults.addExtraLib(code, virtualPath);
    extraLibDisposers.push(jsDisposer);
  }
}

/**
 * 清理所有 extraLib
 * 参考 oldCode/main.js:5939-5948
 */
export function clearExtraLibs(): void {
  for (let i = 0; i < extraLibDisposers.length; i++) {
    try {
      extraLibDisposers[i].dispose?.();
    } catch (e) {
      logger.warn('Failed to dispose extraLib', e);
    }
  }
  extraLibDisposers.length = 0;
  logger.debug('Cleared all extraLibs');
}

/**
 * 加载工作区 .d.ts 文件
 * 参考 oldCode/main.js:5961-5987
 */
export async function loadWorkspaceDts(
  monaco: typeof monacoType,
  workspaceRoot: string,
  listDtsFiles: (root: string) => Promise<string[]>,
  readFile: (path: string, encoding: string) => Promise<string>
): Promise<void> {
  if (!monaco.languages?.typescript) return;

  clearExtraLibs();

  try {
    const dtsFiles = await listDtsFiles(workspaceRoot);
    if (!Array.isArray(dtsFiles) || dtsFiles.length === 0) {
      return;
    }

    for (const filePath of dtsFiles) {
      try {
        const code = await readFile(filePath, 'utf-8');
        const virtualPath = monaco.Uri.file(filePath).toString();
        addExtraLib(monaco, code, virtualPath);
      } catch (err) {
        logger.warn(`Failed to load .d.ts: ${filePath}`, err);
      }
    }

    logger.debug(`Loaded ${dtsFiles.length} .d.ts files`);
  } catch (error) {
    logger.warn('Failed to scan workspace .d.ts files', error);
  }
}

/**
 * 应用工作区设置（等待 Monaco 加载完成后）
 * 参考 oldCode/main.js:6021-6029
 */
export async function applyWorkspaceSettings(
  workspaceRoot: string | null,
  readFile: (path: string, encoding: string) => Promise<string>,
  listDtsFiles: (root: string) => Promise<string[]>
): Promise<void> {
  if (!workspaceRoot) return;

  const monaco = await loadMonaco();
  if (!monaco) return;

  // 配置 TypeScript
  configureTypeScriptDefaults(monaco);

  // 加载 tsconfig.json
  const tsconfigPath = `${workspaceRoot}/tsconfig.json`;
  await applyTsConfigFromPath(monaco, tsconfigPath, readFile);

  // 加载工作区 .d.ts
  await loadWorkspaceDts(monaco, workspaceRoot, listDtsFiles, readFile);

  tsConfigLoaded = true;
  logger.debug('Workspace settings applied');
}

/**
 * 初始化 Monaco 编辑器（完整初始化）
 * 返回编辑器实例
 */
export async function initializeMonaco(): Promise<typeof monacoType> {
  const monaco = await loadMonaco();

  // 注册主题
  registerCustomThemes(monaco);

  // 配置 TypeScript
  configureTypeScriptDefaults(monaco);

  return monaco;
}

/**
 * 检查 Monaco 是否已加载
 */
export function isMonacoLoaded(): boolean {
  return monacoInstance !== null;
}

/**
 * 检查工作区配置是否已加载
 */
export function isTsConfigLoaded(): boolean {
  return tsConfigLoaded;
}

/**
 * 清理所有资源
 */
export function dispose(): void {
  // 清理 extraLib
  clearExtraLibs();

  // 清理 Worker
  if (workerDisposer) {
    workerDisposer();
    workerDisposer = null;
  }

  // 重置状态
  monacoInstance = null;
  isLoading = false;
  loadPromise = null;
  tsConfigLoaded = false;
  themesRegistered = false;

  logger.debug('Disposed MonacoLoader');
}

export default {
  loadMonaco,
  getMonaco,
  initializeMonaco,
  registerCustomThemes,
  configureTypeScriptDefaults,
  applyTsConfigFromPath,
  addExtraLib,
  clearExtraLibs,
  loadWorkspaceDts,
  applyWorkspaceSettings,
  isMonacoLoaded,
  isTsConfigLoaded,
  dispose,
};
