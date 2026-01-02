/**
 * Services Index
 * 
 * Re-exports all services for convenient importing
 */

export { ipc } from './ipc';
export { fileSystemService, FileSystemService } from './FileSystemService';
export type { FileOperationResult } from './FileSystemService';

// Monaco Instance Manager (Requirements: 3.1, 3.2, 3.3)
export {
  monacoInstanceManager,
  resetMonacoInstanceManager,
} from './MonacoInstanceManager';
export type { MonacoEditorOptions } from './MonacoInstanceManager';

// IPC Listener Manager (Requirements: 4.1, 4.2, 4.4)
export {
  ipcListenerManager,
  resetIPCListenerManager,
} from './IPCListenerManager';

// Logger service (Requirements: 12.4, 12.5)
export { logger } from './logger';
export type { LogLevel, LogEntry, LoggerConfig, ChildLogger } from './logger';

// Serialization services (Requirements: 11.1, 11.2, 11.3, 11.4)
export { JSONSerializer, jsonSerializer } from './serialization';
export {
  JSONSerializationError,
  ErrorPositionParser,
  ErrorMessageGenerator,
  SerializationErrorHandler,
} from './serialization';
export type {
  SerializationResult,
  SerializationError,
  SerializationErrorCode,
  ErrorPosition,
  SerializeOptions,
  DeserializeOptions,
  ValidationResult,
  ValidationError,
} from './serialization';

// Script Path Manager (Requirements: 1.1, 1.2, 1.3, 1.4, 1.5)
export { ScriptPathManager, resetScriptPathManager } from './ScriptPathManager';
export type { ScriptPathInfo, ParseResult } from './ScriptPathManager';

// File Cache Manager (LRU cache for file data)
export { FileCacheManager } from './FileCacheManager';
export type { CacheItem } from './FileCacheManager';

// History Files Dialog
export {
  initHistoryFilesDialog,
  disposeHistoryFilesDialog,
  showDialog as showHistoryDialog,
  hideDialog as hideHistoryDialog,
  toggleDialog as toggleHistoryDialog,
  isDialogVisible as isHistoryDialogVisible,
  renderHistoryList,
} from './HistoryFilesDialog';

// Data Loader Service (Requirements: 2.5, 3)
export { DataLoaderService, resetDataLoaderService } from './DataLoaderService';
export type {
  AnimationData,
  BattlerData,
  WeaponData,
  SkillData,
  ItemData,
  ArmorData,
  SystemData,
  ProjectileOffset,
  DataLoadState,
  DataLoadResult,
} from './DataLoaderService';

// Script Cache Manager (Requirements: Cache management)
export { default as ScriptCacheManager, getScriptCache, setScriptCache, removeScriptCache, clearScriptCache, scriptCacheSize, hasScriptCache, getScriptCacheEntry, getScriptCacheKeys, getScriptCacheStats } from './ScriptCacheManager';
export type { ScriptCacheEntry } from './ScriptCacheManager';

// Quest Copy Dialog
export {
  initQuestCopyDialog,
  disposeQuestCopyDialog,
  showQuestCopyDialog,
  hideQuestCopyDialog,
  toggleQuestCopyDialog,
} from './QuestCopyDialog';

// Quest Editor
export {
  initQuestEditor,
  disposeQuestEditor,
  renderQuestList,
  selectQuest,
  getCurrentQuest,
  newQuest,
  deleteQuest,
  saveQuestFile,
  loadQuestFile,
  bindQuestToForm,
  handleQuestPanelClick,
  handleQuestPanelChange,
  handleQuestPanelInput,
  addRequirement,
  addObjective,
  addReward,
  loadQuestDataFile,
  QUEST_REQUIREMENT_TYPES,
  QUEST_OBJECTIVE_TYPES,
  QUEST_REWARD_TYPES,
  QUEST_DIFFICULTIES,
  QUEST_OPERATORS,
  createDefaultQuest,
} from './QuestEditor';

// Disabled Manager (UI state management)
export { default as DisabledManager, disableElement, enableElement, disableElements, enableElements } from './DisabledManager';

// Editor State Manager (Monaco editor state)
export { default as EditorStateManager, setEditorReadOnly, setEditorEditable } from './EditorStateManager';
