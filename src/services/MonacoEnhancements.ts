/**
 * Monaco Editor Enhancements - Auto-completion, Formatting, and Markers
 * Requirements: 8.5, 8.6, 8.7
 */

import * as monacoType from 'monaco-editor';
import { getMonaco } from './MonacoLoader';

const log = {
  debug: (msg: string, ...args: unknown[]) => console.debug(`[MonacoEnhancements] ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`[MonacoEnhancements] ${msg}`, ...args),
};

interface CompletionItemDef {
  label: string;
  kind: monacoType.languages.CompletionItemKind;
  detail: string;
  documentation: string;
  insertText: string;
  insertTextRules?: monacoType.languages.CompletionItemInsertTextRule;
}

const RPG_COMPLETIONS: CompletionItemDef[] = [
  { label: 'player', kind: monacoType.languages.CompletionItemKind.Variable, detail: 'Player instance', documentation: 'The current player character', insertText: 'player' },
  { label: 'target', kind: monacoType.languages.CompletionItemKind.Variable, detail: 'Target entity', documentation: 'The current target entity', insertText: 'target' },
  { label: 'this.sprite', kind: monacoType.languages.CompletionItemKind.Property, detail: 'Sprite component', documentation: 'Access sprite component for visual manipulation', insertText: 'this.sprite' },
  { label: 'this.body', kind: monacoType.languages.CompletionItemKind.Property, detail: 'Body component', documentation: 'Access physics body component', insertText: 'this.body' },
  { label: 'this.stats', kind: monacoType.languages.CompletionItemKind.Property, detail: 'Stats component', documentation: 'Access character stats', insertText: 'this.stats' },
  { label: 'getPosition()', kind: monacoType.languages.CompletionItemKind.Method, detail: 'Get entity position', documentation: 'Returns the current position {x, y}', insertText: 'getPosition()' },
  { label: 'setPosition()', kind: monacoType.languages.CompletionItemKind.Method, detail: 'Set entity position', documentation: 'Sets the entity position', insertText: 'setPosition(${1:x}, ${1:y})' },
  { label: 'moveTo()', kind: monacoType.languages.CompletionItemKind.Method, detail: 'Move to position', documentation: 'Moves entity towards target', insertText: 'moveTo(${1:x}, ${1:y}, ${2:speed})' },
  { label: 'attack()', kind: monacoType.languages.CompletionItemKind.Method, detail: 'Perform attack', documentation: 'Executes an attack on the target', insertText: 'attack(${1:target}, ${2:damage})' },
  { label: 'useSkill()', kind: monacoType.languages.CompletionItemKind.Method, detail: 'Use skill', documentation: 'Uses a skill by ID', insertText: 'useSkill(${1:skillId})' },
  { label: 'playAnimation()', kind: monacoType.languages.CompletionItemKind.Method, detail: 'Play animation', documentation: 'Plays an animation by name', insertText: 'playAnimation(${1:animName})' },
  { label: 'showDamage()', kind: monacoType.languages.CompletionItemKind.Method, detail: 'Show damage number', documentation: 'Displays floating damage number', insertText: 'showDamage(${1:amount}, ${2:isCrit})' },
  { label: 'EventSystem.emit()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Emit event', documentation: 'Emits a global event', insertText: 'EventSystem.emit(${1:eventName}, ${2:data})' },
  { label: 'EventSystem.on()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Listen event', documentation: 'Adds an event listener', insertText: 'EventSystem.on(${1:eventName}, ${2:callback})' },
  { label: 'TimerManager.setTimeout()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Set timer', documentation: 'Sets a timer', insertText: 'TimerManager.setTimeout(${1:callback}, ${2:delay})' },
  { label: 'TimerManager.setInterval()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Set interval', documentation: 'Sets an interval timer', insertText: 'TimerManager.setInterval(${1:callback}, ${2:interval})' },
  { label: 'logger.info()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Log info', documentation: 'Logs an informational message', insertText: 'logger.info(${1:message})' },
  { label: 'logger.warn()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Log warning', documentation: 'Logs a warning message', insertText: 'logger.warn(${1:message})' },
  { label: 'logger.error()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Log error', documentation: 'Logs an error message', insertText: 'logger.error(${1:message})' },
  { label: 'GameState.get()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Get game state', documentation: 'Gets the current game state', insertText: 'GameState.get(${1:key})' },
  { label: 'GameState.set()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Set game state', documentation: 'Sets a game state value', insertText: 'GameState.set(${1:key}, ${2:value})' },
  { label: 'addItem()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Add item', documentation: 'Adds an item to inventory', insertText: 'addItem(${1:itemId}, ${2:quantity})' },
  { label: 'removeItem()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Remove item', documentation: 'Removes an item from inventory', insertText: 'removeItem(${1:itemId}, ${2:quantity})' },
  { label: 'playSound()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Play sound', documentation: 'Plays a sound effect', insertText: 'playSound(${1:soundId})' },
  { label: 'playMusic()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Play music', documentation: 'Plays background music', insertText: 'playMusic(${1:musicId})' },
  { label: 'showDialog()', kind: monacoType.languages.CompletionItemKind.Function, detail: 'Show dialog', documentation: 'Shows a dialog message', insertText: 'showDialog(${1:text})' },
  { label: 'fadeIn()', kind: monacoType.languages.CompletionItemKind.Method, detail: 'Fade in', documentation: 'Fades in sprite/UI element', insertText: 'fadeIn(${1:duration})' },
  { label: 'fadeOut()', kind: monacoType.languages.CompletionItemKind.Method, detail: 'Fade out', documentation: 'Fades out sprite/UI element', insertText: 'fadeOut(${1:duration})' },
];

const SNIPPETS: Array<{ label: string; detail: string; documentation: string; snippet: string }> = [
  { label: 'if', detail: 'if statement', documentation: 'Conditional statement', snippet: 'if (${1:condition}) {\n\t${2:// code}\n}' },
  { label: 'if-else', detail: 'if-else statement', documentation: 'Conditional with else', snippet: 'if (${1:condition}) {\n\t${2:// code}\n} else {\n\t${3:// code}\n}' },
  { label: 'for', detail: 'for loop', documentation: 'Iterates over a range', snippet: 'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3:// code}\n}' },
  { label: 'forEach', detail: 'Array forEach', documentation: 'Iterates over array elements', snippet: '${1:array}.forEach((${2:element}, ${3:index}) => {\n\t${4:// code}\n})' },
  { label: 'function', detail: 'Function declaration', documentation: 'Declares a named function', snippet: 'function ${1:name}(${2:params}) {\n\t${3:// code}\n}' },
  { label: 'arrow', detail: 'Arrow function', documentation: 'Declares an arrow function', snippet: '(${1:params}) => {\n\t${2:// code}\n}' },
  { label: 'async', detail: 'Async function', documentation: 'Declares an async function', snippet: 'async function ${1:name}(${2:params}) {\n\t${3:// code}\n}' },
  { label: 'try-catch', detail: 'Error handling', documentation: 'Catches and handles errors', snippet: 'try {\n\t${1:// code}\n} catch (${2:error}) {\n\t${3:// handle error}\n}' },
  { label: 'switch', detail: 'Switch statement', documentation: 'Multi-branch conditional', snippet: 'switch (${1:expression}) {\n\tcase ${2:value}:\n\t\t${3:// code}\n\t\tbreak;\n\tdefault:\n\t\t${4:// default}\n}' },
  { label: 'class', detail: 'Class declaration', documentation: 'Declares a new class', snippet: 'class ${1:ClassName} {\n\tconstructor(${2:params}) {\n\t\t${3:// init}\n\t}\n\n\t${4:method}(${5:params}) {\n\t\t${6:// code}\n\t}\n}' },
  { label: 'Entity', detail: 'Game entity class', documentation: 'Base class for game entities', snippet: 'class ${1:EntityName} extends Entity {\n\tconstructor(x, y) {\n\t\tsuper(x, y);\n\t\tthis.setup();\n\t}\n\n\tsetup() {\n\t\tthis.sprite = new Sprite(\'${2:texture}\');\n\t}\n\n\tupdate(deltaTime) {\n\t\tsuper.update(deltaTime);\n\t\t${3:// update}\n\t}\n}' },
  { label: 'Quest', detail: 'Quest script template', documentation: 'Template for quest scripts', snippet: 'export const ${1:questId} = {\n\tid: \'${1:questId}\',\n\ttitle: \'${2:Quest Title}\',\n\n\tstart() {\n\t\t${3:// start}\n\t},\n\n\tupdate() {\n\t\t${4:// check}\n\t},\n\n\tonComplete() {\n\t\t${5:// rewards}\n\t}\n};' },
  { label: 'Event', detail: 'Event listener', documentation: 'Template for event listeners', snippet: 'EventSystem.on(\'${1:event}\', (data) => {\n\t${2:// handle}\n});' },
  { label: 'Timer', detail: 'Timer loop', documentation: 'Creates a timer using GlobalRunner', snippet: 'let ${1:id} = GlobalRunner.on(() => {\n\t${2:// loop}\n}, this, ${3:interval}, ${4:-1});' },
  { label: 'log', detail: 'Debug logging', documentation: 'Logs debug information', snippet: 'logger.debug(\'${1:message}\', { ${2:data} }, \'${3:source}\');' },
  { label: 'Pool', detail: 'Object pool usage', documentation: 'Template for pool usage', snippet: 'const ${1:element} = acquire${2:Pool}();\ntry {\n\t${3:// use}\n} finally {\n\trelease${2:Pool}(${1:element});\n}' },
];

class MonacoEnhancements {
  private disposables: monacoType.IDisposable[] = [];
  private providers: monacoType.IDisposable[] = [];

  registerAll(): void {
    const monaco = getMonaco();
    if (!monaco) {
      log.warn('Monaco not loaded, skipping enhancements');
      return;
    }

    this.registerCompletion(monaco);
    this.registerSnippets(monaco);
    this.registerSignatureHelp(monaco);
    this.registerHover(monaco);

    log.debug('All Monaco enhancements registered');
  }

  private registerCompletion(monaco: typeof monacoType): void {
    const provider: monacoType.languages.CompletionItemProvider = {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range: monacoType.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const items: monacoType.languages.CompletionItem[] = RPG_COMPLETIONS.map((item) => ({
          label: item.label,
          kind: item.kind,
          detail: item.detail,
          documentation: { value: item.documentation, isTrusted: true },
          insertText: item.insertText,
          insertTextRules: item.insertTextRules,
          range,
        }));

        return { suggestions: items };
      },
    };

    const disposable = monaco.languages.registerCompletionItemProvider('javascript', {
      ...provider,
      triggerCharacters: ['.', ':', '@', '$'],
    });
    this.providers.push(disposable);
  }

  private registerSnippets(monaco: typeof monacoType): void {
    const provider: monacoType.languages.CompletionItemProvider = {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range: monacoType.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const items = SNIPPETS.map((s) => ({
          label: s.label,
          kind: monacoType.languages.CompletionItemKind.Snippet,
          detail: s.detail,
          documentation: { value: s.documentation, isTrusted: true },
          insertText: s.snippet,
          insertTextRules: monacoType.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }));

        return { suggestions: items };
      },
    };

    const disposable = monaco.languages.registerCompletionItemProvider('javascript', {
      ...provider,
      triggerCharacters: ['<', '['],
    });
    this.providers.push(disposable);
  }

  private registerSignatureHelp(monaco: typeof monacoType): void {
    const provider: monacoType.languages.SignatureHelpProvider = {
      signatureHelpTriggerCharacters: ['(', ','],
      provideSignatureHelp: (model, position) => {
        const line = model.getLineContent(position.lineNumber);
        const charBefore = position.column > 1 ? line[position.column - 2] : '';
        if (charBefore !== '(' && charBefore !== ',') return null;

        const word = model.getWordUntilPosition(position);
        const sig = this.getSignature(word.word);
        if (!sig) return null;

        return {
          value: {
            signatures: [sig],
            activeSignature: 0,
            activeParameter: this.getParamIndex(line, position.column),
          },
          dispose: () => {},
        };
      },
    };

    const disposable = monaco.languages.registerSignatureHelpProvider('javascript', provider);
    this.providers.push(disposable);
  }

  private getSignature(funcName: string): monacoType.languages.SignatureInformation | null {
    const sigs: Record<string, { params: string[]; doc: string }> = {
      'moveTo': { params: ['x', 'y', 'speed'], doc: 'Move to position' },
      'setPosition': { params: ['x', 'y'], doc: 'Set position' },
      'attack': { params: ['target', 'damage'], doc: 'Attack target' },
      'useSkill': { params: ['skillId'], doc: 'Use skill' },
      'playAnimation': { params: ['animName'], doc: 'Play animation' },
      'showDamage': { params: ['amount', 'isCrit'], doc: 'Show damage' },
      'EventSystem.emit': { params: ['event', 'data'], doc: 'Emit event' },
      'EventSystem.on': { params: ['event', 'callback'], doc: 'Add listener' },
      'TimerManager.setTimeout': { params: ['callback', 'delay'], doc: 'Set timeout' },
      'TimerManager.setInterval': { params: ['callback', 'interval'], doc: 'Set interval' },
      'logger.info': { params: ['message'], doc: 'Log info' },
      'logger.warn': { params: ['message'], doc: 'Log warning' },
      'logger.error': { params: ['message'], doc: 'Log error' },
      'GameState.get': { params: ['key'], doc: 'Get state' },
      'GameState.set': { params: ['key', 'value'], doc: 'Set state' },
      'addItem': { params: ['itemId', 'qty'], doc: 'Add item' },
      'playSound': { params: ['soundId'], doc: 'Play sound' },
      'showDialog': { params: ['text'], doc: 'Show dialog' },
      'fadeIn': { params: ['duration'], doc: 'Fade in' },
      'fadeOut': { params: ['duration'], doc: 'Fade out' },
    };

    const s = sigs[funcName];
    if (!s) return null;

    return {
      label: `${funcName}(${s.params.join(', ')})`,
      documentation: { value: s.doc, isTrusted: true },
      parameters: s.params.map((p, i) => ({
        label: p,
        documentation: { value: `Param ${i + 1}`, isTrusted: true },
      })),
    };
  }

  private getParamIndex(line: string, col: number): number {
    let depth = 0;
    let idx = 0;
    let inStr = false;
    let strChar = '';

    for (let i = 0; i < col - 1; i++) {
      const c = line[i];
      if (inStr) {
        if (c === strChar && line[i - 1] !== '\\') inStr = false;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        inStr = true;
        strChar = c;
        continue;
      }
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') { if (depth > 0) depth--; }
      else if (c === ',' && depth === 1) idx++;
    }
    return idx;
  }

  private registerHover(monaco: typeof monacoType): void {
    const provider: monacoType.languages.HoverProvider = {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const docs: Record<string, string> = {
          'player': '**Player**\nThe current player character.',
          'target': '**Target**\nThe current target entity.',
          'this.sprite': '**Sprite**\nVisual rendering component.',
          'this.body': '**Body**\nPhysics body component.',
          'EventSystem': '**EventSystem**\nGlobal event system.\n- emit(event, data)\n- on(event, callback)',
          'GlobalRunner': '**GlobalRunner**\nAnimation/timer system.',
          'logger': '**Logger**\nLogging utility.\n- info/warn/error/debug',
        };

        const doc = docs[word.word];
        if (!doc) return null;

        return {
          contents: [{ value: doc, isTrusted: true }],
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          },
        };
      },
    };

    const disposable = monaco.languages.registerHoverProvider('javascript', provider);
    this.providers.push(disposable);
  }

  registerCodeActions(editor: monacoType.editor.IStandaloneCodeEditor): void {
    const monaco = getMonaco();
    if (!monaco) return;

    editor.addAction({
      id: 'format-doc',
      label: 'Format Document',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: () => editor.getAction('editor.action.formatDocument')?.run(),
    });

    editor.addAction({
      id: 'trigger-suggest',
      label: 'Trigger Suggest',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space],
      run: () => editor.trigger('keyboard', 'editor.action.triggerSuggest', null),
    });
  }

  updateMarkers(
    editor: monacoType.editor.IStandaloneCodeEditor,
    markers: Array<{ message: string; severity: 'error' | 'warning' | 'info'; startLine: number; startColumn: number; endLine: number; endColumn: number }>
  ): void {
    const monaco = getMonaco();
    if (!monaco) return;

    const model = editor.getModel();
    if (!model) return;

    const m = markers.map((mk) => ({
      message: mk.message,
      severity: mk.severity === 'error' ? monaco.MarkerSeverity.Error
        : mk.severity === 'warning' ? monaco.MarkerSeverity.Warning
        : monaco.MarkerSeverity.Info,
      startLineNumber: mk.startLine,
      startColumn: mk.startColumn,
      endLineNumber: mk.endLine,
      endColumn: mk.endColumn,
    }));

    monaco.editor.setModelMarkers(model, 'editor', m);
  }

  clearMarkers(editor: monacoType.editor.IStandaloneCodeEditor): void {
    const monaco = getMonaco();
    if (!monaco) return;
    const model = editor.getModel();
    if (model) monaco.editor.setModelMarkers(model, 'editor', []);
  }

  dispose(): void {
    for (const d of this.disposables) { try { d.dispose(); } catch {} }
    for (const d of this.providers) { try { d.dispose(); } catch {} }
    this.disposables.length = 0;
    this.providers.length = 0;
    log.debug('Disposed');
  }
}

export const monacoEnhancements = new MonacoEnhancements();
export default monacoEnhancements;
