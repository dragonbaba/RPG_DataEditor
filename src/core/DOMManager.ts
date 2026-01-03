/**
 * DOMManager - DOM 元素缓存和管理器
 * 参考 oldCode/main.js 的 DOM 对象模式
 * 缓存所有常用 DOM 元素，提供类型安全的元素访问
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { FactoryPool } from '../pools/ObjectPool';

// ============ DOM 元素缓存接口 ============

/**
 * DOM 缓存对象 - 存储所有常用 DOM 元素引用
 */
export interface DOMCache {
  // ===== 对话框 =====
  inputDialog: HTMLElement | null;
  inputDialogTitle: HTMLElement | null;
  inputDialogMessage: HTMLElement | null;
  inputDialogInput: HTMLInputElement | null;
  inputDialogConfirm: HTMLButtonElement | null;
  inputDialogCancel: HTMLButtonElement | null;
  
  // ===== 主要面板 =====
  leftPanel: HTMLElement | null;
  itemList: HTMLElement | null;
  scriptList: HTMLElement | null;
  scriptPanel: HTMLElement | null;
  metaDataPanel: HTMLElement | null;
  metaDataList: HTMLElement | null;
  codeEditorContainer: HTMLElement | null;
  propertyModePanel: HTMLElement | null;
  propertyBaseGrid: HTMLElement | null;
  baseAttributeList: HTMLElement | null;
  customAttributeList: HTMLElement | null;
  noteModePanel: HTMLElement | null;
  noteEditor: HTMLTextAreaElement | null;
  noteModeSubtitle: HTMLElement | null;
  noteDescription: HTMLTextAreaElement | null;
  emptyStatePanel: HTMLElement | null;
  projectileModePanel: HTMLElement | null;
  questModePanel: HTMLElement | null;
  
  // ===== 状态栏 =====
  statusText: HTMLElement | null;
  characterCount: HTMLElement | null;
  lineCount: HTMLElement | null;
  
  // ===== 文件信息 =====
  codeFilePath: HTMLElement | null;
  
  // ===== 按钮 =====
  savePropertiesBtn: HTMLButtonElement | null;
  saveCustomPropertyBtn: HTMLButtonElement | null;
  addCustomPropertyBtn: HTMLButtonElement | null;
  saveCodeBtn: HTMLButtonElement | null;
  clearCodeBtn: HTMLButtonElement | null;
  saveNoteBtn: HTMLButtonElement | null;
  saveDescriptionBtn: HTMLButtonElement | null;
  
  // ===== 加载指示 =====
  loadingIndicator: HTMLElement | null;
  loadingText: HTMLElement | null;
  propertyModeSubtitle: HTMLElement | null;
  
  // ===== 历史文件对话框 =====
  historyFilesDialog: HTMLElement | null;
  historyFilesList: HTMLElement | null;
  historyFilesDialogClose: HTMLButtonElement | null;

  // ===== 主题设置对话框 =====
  themeSettingsDialog: HTMLElement | null;
  themeSettingsClose: HTMLButtonElement | null;
  presetCyberpunkBtn: HTMLButtonElement | null;
  presetMinimalBtn: HTMLButtonElement | null;
  presetHighContrastBtn: HTMLButtonElement | null;
  themeDarkBtn: HTMLButtonElement | null;
  themeLightBtn: HTMLButtonElement | null;
  accentCyanBtn: HTMLButtonElement | null;
  accentMagentaBtn: HTMLButtonElement | null;
  accentGreenBtn: HTMLButtonElement | null;
  accentOrangeBtn: HTMLButtonElement | null;
  animationsToggle: HTMLInputElement | null;
  fontSizeSelect: HTMLSelectElement | null;
  compactModeToggle: HTMLInputElement | null;
  
  // ===== 项目操作按钮 =====
  itemNewBtn: HTMLButtonElement | null;
  itemCopyBtn: HTMLButtonElement | null;
  itemDeleteBtn: HTMLButtonElement | null;
  itemSaveBtn: HTMLButtonElement | null;
  projectActions: HTMLElement | null;
   
  // ===== 弹道面板元素 =====
  projectilePreviewContainer: HTMLElement | null;
  projectileTemplateName: HTMLInputElement | null;
  projectileSegmentList: HTMLElement | null;
  projectileAddSegmentBtn: HTMLButtonElement | null;
  projectileClearSegmentsBtn: HTMLButtonElement | null;
  projectileSaveTemplateBtn: HTMLButtonElement | null;
  projectilePlayTestBtn: HTMLButtonElement | null;
  projectilePauseBtn: HTMLButtonElement | null;
  projectileStopBtn: HTMLButtonElement | null;
  projectileStepBackBtn: HTMLButtonElement | null;
  projectileStepForwardBtn: HTMLButtonElement | null;
  projectileFrameInfo: HTMLElement | null;
  projectileCreateTemplateBtn: HTMLButtonElement | null;
  projectileDeleteTemplateBtn: HTMLButtonElement | null;
  projectileAnimationFileSelect: HTMLSelectElement | null;
  projectileAnimationLoadBtn: HTMLButtonElement | null;
  projectileAnimationPickBtn: HTMLButtonElement | null;
  projectileAnimationStatus: HTMLElement | null;
  projectileEnemyFileSelect: HTMLSelectElement | null;
  projectileEnemyLoadBtn: HTMLButtonElement | null;
  projectileEnemyPickBtn: HTMLButtonElement | null;
  projectileEnemyStatus: HTMLElement | null;
  projectileActorFileSelect: HTMLSelectElement | null;
  projectileActorLoadBtn: HTMLButtonElement | null;
  projectileActorPickBtn: HTMLButtonElement | null;
  projectileActorStatus: HTMLElement | null;
  projectileWeaponFileSelect: HTMLSelectElement | null;
  projectileWeaponLoadBtn: HTMLButtonElement | null;
  projectileWeaponPickBtn: HTMLButtonElement | null;
  projectileWeaponStatus: HTMLElement | null;
  projectileSkillFileSelect: HTMLSelectElement | null;
  projectileSkillLoadBtn: HTMLButtonElement | null;
  projectileSkillPickBtn: HTMLButtonElement | null;
  projectileSkillStatus: HTMLElement | null;
  projectileStartAnimationSelect: HTMLSelectElement | null;
  projectileLaunchAnimationSelect: HTMLSelectElement | null;
  projectileEndAnimationSelect: HTMLSelectElement | null;
  projectileActorSelect: HTMLSelectElement | null;
  projectileActorOffsetX: HTMLInputElement | null;
  projectileActorOffsetY: HTMLInputElement | null;
  projectileActorOffsetSaveBtn: HTMLButtonElement | null;
  projectileEnemySelect: HTMLSelectElement | null;
  projectileEnemyOffsetX: HTMLInputElement | null;
  projectileEnemyOffsetY: HTMLInputElement | null;
  projectileEnemyOffsetSaveBtn: HTMLButtonElement | null;
  projectileEmitterRoleSelect: HTMLSelectElement | null;
  projectileEmitterCharacterSelect: HTMLSelectElement | null;
  projectileTargetRoleSelect: HTMLSelectElement | null;
  projectileTargetCharacterSelect: HTMLSelectElement | null;
   
  // ===== 任务面板元素 =====
  questCreateBtn: HTMLButtonElement | null;
  questSaveBtn: HTMLButtonElement | null;
  questDeleteBtn: HTMLButtonElement | null;
  questTitleInput: HTMLInputElement | null;
  questGiverInput: HTMLInputElement | null;
  questCategoryInput: HTMLInputElement | null;
  questRepeatableInput: HTMLInputElement | null;
  questDifficultySelect: HTMLSelectElement | null;
  questDescriptionInput: HTMLTextAreaElement | null;
  questStartSwitchList: HTMLElement | null;
  questFinishSwitchList: HTMLElement | null;
  questStartVariableList: HTMLElement | null;
  questFinishVariableList: HTMLElement | null;
  questObjectiveList: HTMLElement | null;
  questRewardList: HTMLElement | null;
  questRequirementList: HTMLElement | null;
  questAddStartSwitchBtn: HTMLButtonElement | null;
  questAddFinishSwitchBtn: HTMLButtonElement | null;
  questAddStartVariableBtn: HTMLButtonElement | null;
  questAddFinishVariableBtn: HTMLButtonElement | null;
  questAddObjectiveBtn: HTMLButtonElement | null;
  questAddRewardBtn: HTMLButtonElement | null;
  questAddRequirementBtn: HTMLButtonElement | null;
  questSystemFileSelect: HTMLSelectElement | null;
  questSystemLoadBtn: HTMLButtonElement | null;
  questSystemPickBtn: HTMLButtonElement | null;
  questSystemStatus: HTMLElement | null;
  questDataStatus: HTMLElement | null;
  questItemFileSelect: HTMLSelectElement | null;
  questItemLoadBtn: HTMLButtonElement | null;
  questItemPickBtn: HTMLButtonElement | null;
  questItemStatus: HTMLElement | null;
  questWeaponFileSelect: HTMLSelectElement | null;
  questWeaponLoadBtn: HTMLButtonElement | null;
  questWeaponPickBtn: HTMLButtonElement | null;
  questWeaponStatus: HTMLElement | null;
  questArmorFileSelect: HTMLSelectElement | null;
  questArmorLoadBtn: HTMLButtonElement | null;
  questArmorPickBtn: HTMLButtonElement | null;
  questArmorStatus: HTMLElement | null;
  questEnemyFileSelect: HTMLSelectElement | null;
  questEnemyLoadBtn: HTMLButtonElement | null;
  questEnemyPickBtn: HTMLButtonElement | null;
  questEnemyStatus: HTMLElement | null;
  questActorFileSelect: HTMLSelectElement | null;
  questActorLoadBtn: HTMLButtonElement | null;
  questActorPickBtn: HTMLButtonElement | null;
  questActorStatus: HTMLElement | null;
  projectileWeaponOffsetSelect: HTMLSelectElement | null;
  projectileSkillSelect: HTMLSelectElement | null;
}

// ============ DOMManager 类 ============

/**
 * DOM 管理器 - 单例模式
 * 缓存所有常用 DOM 元素，提供类型安全的访问方法
 */
class DOMManagerClass implements DOMCache {
  // ===== 对话框 =====
  inputDialog: HTMLElement | null = null;
  inputDialogTitle: HTMLElement | null = null;
  inputDialogMessage: HTMLElement | null = null;
  inputDialogInput: HTMLInputElement | null = null;
  inputDialogConfirm: HTMLButtonElement | null = null;
  inputDialogCancel: HTMLButtonElement | null = null;
  
  // ===== 主要面板 =====
  leftPanel: HTMLElement | null = null;
  itemList: HTMLElement | null = null;
  scriptList: HTMLElement | null = null;
  scriptPanel: HTMLElement | null = null;
  metaDataPanel: HTMLElement | null = null;
  metaDataList: HTMLElement | null = null;
  codeEditorContainer: HTMLElement | null = null;
  propertyModePanel: HTMLElement | null = null;
  propertyBaseGrid: HTMLElement | null = null;
  baseAttributeList: HTMLElement | null = null;
  customAttributeList: HTMLElement | null = null;
  noteModePanel: HTMLElement | null = null;
  noteEditor: HTMLTextAreaElement | null = null;
  noteModeSubtitle: HTMLElement | null = null;
  noteDescription: HTMLTextAreaElement | null = null;
  emptyStatePanel: HTMLElement | null = null;
  projectileModePanel: HTMLElement | null = null;
  questModePanel: HTMLElement | null = null;
  
  // ===== 状态栏 =====
  statusText: HTMLElement | null = null;
  characterCount: HTMLElement | null = null;
  lineCount: HTMLElement | null = null;
  
  // ===== 文件信息 =====
  codeFilePath: HTMLElement | null = null;
  
  // ===== 按钮 =====
  savePropertiesBtn: HTMLButtonElement | null = null;
  saveCustomPropertyBtn: HTMLButtonElement | null = null;
  addCustomPropertyBtn: HTMLButtonElement | null = null;
  saveCodeBtn: HTMLButtonElement | null = null;
  clearCodeBtn: HTMLButtonElement | null = null;
  saveNoteBtn: HTMLButtonElement | null = null;
  saveDescriptionBtn: HTMLButtonElement | null = null;
  
  // ===== 加载指示 =====
  loadingIndicator: HTMLElement | null = null;
  loadingText: HTMLElement | null = null;
  propertyModeSubtitle: HTMLElement | null = null;
  
  // ===== 历史文件对话框 =====
  historyFilesDialog: HTMLElement | null = null;
  historyFilesList: HTMLElement | null = null;
  historyFilesDialogClose: HTMLButtonElement | null = null;

  // ===== 主题设置对话框 =====
  themeSettingsDialog: HTMLElement | null = null;
  themeSettingsClose: HTMLButtonElement | null = null;
  presetCyberpunkBtn: HTMLButtonElement | null = null;
  presetMinimalBtn: HTMLButtonElement | null = null;
  presetHighContrastBtn: HTMLButtonElement | null = null;
  themeDarkBtn: HTMLButtonElement | null = null;
  themeLightBtn: HTMLButtonElement | null = null;
  accentCyanBtn: HTMLButtonElement | null = null;
  accentMagentaBtn: HTMLButtonElement | null = null;
  accentGreenBtn: HTMLButtonElement | null = null;
  accentOrangeBtn: HTMLButtonElement | null = null;
  animationsToggle: HTMLInputElement | null = null;
  fontSizeSelect: HTMLSelectElement | null = null;
  compactModeToggle: HTMLInputElement | null = null;
  
  // ===== 项目操作按钮 =====
  itemNewBtn: HTMLButtonElement | null = null;
  itemCopyBtn: HTMLButtonElement | null = null;
  itemDeleteBtn: HTMLButtonElement | null = null;
  itemSaveBtn: HTMLButtonElement | null = null;
  projectActions: HTMLElement | null = null;
  
  // ===== 弹道面板元素 =====
  projectilePreviewContainer: HTMLElement | null = null;
  projectileTemplateName: HTMLInputElement | null = null;
  projectileSegmentList: HTMLElement | null = null;
  projectileAddSegmentBtn: HTMLButtonElement | null = null;
  projectileClearSegmentsBtn: HTMLButtonElement | null = null;
  projectileSaveTemplateBtn: HTMLButtonElement | null = null;
  projectilePlayTestBtn: HTMLButtonElement | null = null;
  projectilePauseBtn: HTMLButtonElement | null = null;
  projectileStopBtn: HTMLButtonElement | null = null;
  projectileStepBackBtn: HTMLButtonElement | null = null;
  projectileStepForwardBtn: HTMLButtonElement | null = null;
  projectileFrameInfo: HTMLElement | null = null;
  projectileCreateTemplateBtn: HTMLButtonElement | null = null;
  projectileDeleteTemplateBtn: HTMLButtonElement | null = null;
  projectileAnimationFileSelect: HTMLSelectElement | null = null;
  projectileAnimationLoadBtn: HTMLButtonElement | null = null;
  projectileAnimationPickBtn: HTMLButtonElement | null = null;
  projectileAnimationStatus: HTMLElement | null = null;
  projectileEnemyFileSelect: HTMLSelectElement | null = null;
  projectileEnemyLoadBtn: HTMLButtonElement | null = null;
  projectileEnemyPickBtn: HTMLButtonElement | null = null;
  projectileEnemyStatus: HTMLElement | null = null;
  projectileActorFileSelect: HTMLSelectElement | null = null;
  projectileActorLoadBtn: HTMLButtonElement | null = null;
  projectileActorPickBtn: HTMLButtonElement | null = null;
  projectileActorStatus: HTMLElement | null = null;
  projectileWeaponFileSelect: HTMLSelectElement | null = null;
  projectileWeaponLoadBtn: HTMLButtonElement | null = null;
  projectileWeaponPickBtn: HTMLButtonElement | null = null;
  projectileWeaponStatus: HTMLElement | null = null;
  projectileSkillFileSelect: HTMLSelectElement | null = null;
  projectileSkillLoadBtn: HTMLButtonElement | null = null;
  projectileSkillPickBtn: HTMLButtonElement | null = null;
  projectileSkillStatus: HTMLElement | null = null;
  projectileStartAnimationSelect: HTMLSelectElement | null = null;
  projectileLaunchAnimationSelect: HTMLSelectElement | null = null;
  projectileEndAnimationSelect: HTMLSelectElement | null = null;
  projectileActorSelect: HTMLSelectElement | null = null;
  projectileActorOffsetX: HTMLInputElement | null = null;
  projectileActorOffsetY: HTMLInputElement | null = null;
  projectileActorOffsetSaveBtn: HTMLButtonElement | null = null;
  projectileEnemySelect: HTMLSelectElement | null = null;
  projectileEnemyOffsetX: HTMLInputElement | null = null;
  projectileEnemyOffsetY: HTMLInputElement | null = null;
  projectileEnemyOffsetSaveBtn: HTMLButtonElement | null = null;
  projectileEmitterRoleSelect: HTMLSelectElement | null = null;
  projectileEmitterCharacterSelect: HTMLSelectElement | null = null;
  projectileTargetRoleSelect: HTMLSelectElement | null = null;
  projectileTargetCharacterSelect: HTMLSelectElement | null = null;
  projectilePlaybackRate: HTMLSelectElement | null = null;
  projectileEmitterWeaponSelect: HTMLSelectElement | null = null;
  projectileEmitterSkillSelect: HTMLSelectElement | null = null;
  projectileEmitterTypeSelect: HTMLSelectElement | null = null;
  projectileTargetTypeSelect: HTMLSelectElement | null = null;
  projectileEmitterIdSelect: HTMLSelectElement | null = null;
  projectileTargetIdSelect: HTMLSelectElement | null = null;
  projectileTargetSkillSelect: HTMLSelectElement | null = null;

  // ===== 任务面板元素 =====
  questCreateBtn: HTMLButtonElement | null = null;
  questSaveBtn: HTMLButtonElement | null = null;
  questDeleteBtn: HTMLButtonElement | null = null;
  questTitleInput: HTMLInputElement | null = null;
  questGiverInput: HTMLInputElement | null = null;
  questCategoryInput: HTMLInputElement | null = null;
  questRepeatableInput: HTMLInputElement | null = null;
  questDifficultySelect: HTMLSelectElement | null = null;
  questDescriptionInput: HTMLTextAreaElement | null = null;
  questStartSwitchList: HTMLElement | null = null;
  questFinishSwitchList: HTMLElement | null = null;
  questStartVariableList: HTMLElement | null = null;
  questFinishVariableList: HTMLElement | null = null;
  questObjectiveList: HTMLElement | null = null;
  questRewardList: HTMLElement | null = null;
  questRequirementList: HTMLElement | null = null;
  questAddStartSwitchBtn: HTMLButtonElement | null = null;
  questAddFinishSwitchBtn: HTMLButtonElement | null = null;
  questAddStartVariableBtn: HTMLButtonElement | null = null;
  questAddFinishVariableBtn: HTMLButtonElement | null = null;
  questAddObjectiveBtn: HTMLButtonElement | null = null;
  questAddRewardBtn: HTMLButtonElement | null = null;
  questAddRequirementBtn: HTMLButtonElement | null = null;
  questSystemFileSelect: HTMLSelectElement | null = null;
  questSystemLoadBtn: HTMLButtonElement | null = null;
  questSystemPickBtn: HTMLButtonElement | null = null;
  questSystemStatus: HTMLElement | null = null;
  questDataStatus: HTMLElement | null = null;
  questItemFileSelect: HTMLSelectElement | null = null;
  questItemLoadBtn: HTMLButtonElement | null = null;
  questItemPickBtn: HTMLButtonElement | null = null;
  questItemStatus: HTMLElement | null = null;
  questWeaponFileSelect: HTMLSelectElement | null = null;
  questWeaponLoadBtn: HTMLButtonElement | null = null;
  questWeaponPickBtn: HTMLButtonElement | null = null;
  questWeaponStatus: HTMLElement | null = null;
  questArmorFileSelect: HTMLSelectElement | null = null;
  questArmorLoadBtn: HTMLButtonElement | null = null;
  questArmorPickBtn: HTMLButtonElement | null = null;
  questArmorStatus: HTMLElement | null = null;
  questEnemyFileSelect: HTMLSelectElement | null = null;
  questEnemyLoadBtn: HTMLButtonElement | null = null;
  questEnemyPickBtn: HTMLButtonElement | null = null;
  questEnemyStatus: HTMLElement | null = null;
  questActorFileSelect: HTMLSelectElement | null = null;
  questActorLoadBtn: HTMLButtonElement | null = null;
  questActorPickBtn: HTMLButtonElement | null = null;
  questActorStatus: HTMLElement | null = null;
  projectileWeaponOffsetSelect: HTMLSelectElement | null = null;
  projectileSkillSelect: HTMLSelectElement | null = null;

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 初始化 DOM 缓存
   * 在 DOMContentLoaded 后调用
   */
  init(): void {
    if (this.initialized) {
      console.warn('[DOMManager] Already initialized');
      return;
    }

    // ===== 对话框 =====
    this.inputDialog = this.getElement('inputDialog');
    this.inputDialogTitle = this.getElement('inputDialogTitle');
    this.inputDialogMessage = this.getElement('inputDialogMessage');
    this.inputDialogInput = this.getElement('inputDialogInput') as HTMLInputElement;
    this.inputDialogConfirm = this.getElement('inputDialogConfirm') as HTMLButtonElement;
    this.inputDialogCancel = this.getElement('inputDialogCancel') as HTMLButtonElement;

    // ===== 主要面板 =====
    this.leftPanel = this.getElement('leftPanel');
    this.itemList = this.getElement('itemList');
    this.scriptList = this.getElement('scriptList');
    this.scriptPanel = this.getElement('scriptPanel');
    this.metaDataPanel = this.getElement('metaDataPanel');
    this.metaDataList = this.getElement('metaDataList');
    this.codeEditorContainer = this.getElement('codeEditorContainer');
    this.propertyModePanel = this.getElement('propertyModePanel');
    this.propertyBaseGrid = this.getElement('propertyBaseGrid');
    this.baseAttributeList = this.getElement('baseAttributeList');
    this.customAttributeList = this.getElement('customAttributeList');
    this.noteModePanel = this.getElement('noteModePanel');
    this.noteEditor = this.getElement('noteEditor') as HTMLTextAreaElement;
    this.noteModeSubtitle = this.getElement('noteModeSubtitle');
    this.noteDescription = this.getElement('noteDescription') as HTMLTextAreaElement;
    this.emptyStatePanel = this.getElement('emptyStatePanel');
    this.projectileModePanel = this.getElement('projectileModePanel');
    this.questModePanel = this.getElement('questModePanel');

    // ===== 状态栏 =====
    this.statusText = this.getElement('statusText');
    this.characterCount = this.getElement('characterCount');
    this.lineCount = this.getElement('lineCount');

    // ===== 文件信息 =====
    this.codeFilePath = this.getElement('codeFilePath');

    // ===== 按钮 =====
    this.savePropertiesBtn = this.getElement('savePropertiesBtn') as HTMLButtonElement;
    this.saveCustomPropertyBtn = this.getElement('saveCustomPropertyBtn') as HTMLButtonElement;
    this.addCustomPropertyBtn = this.getElement('addCustomPropertyBtn') as HTMLButtonElement;
    this.saveCodeBtn = this.getElement('saveCodeBtn') as HTMLButtonElement;
    this.clearCodeBtn = this.getElement('clearCodeBtn') as HTMLButtonElement;
    this.saveNoteBtn = this.getElement('saveNoteBtn') as HTMLButtonElement;
    this.saveDescriptionBtn = this.getElement('saveDescriptionBtn') as HTMLButtonElement;

    // ===== 加载指示 =====
    this.loadingIndicator = this.getElement('loadingIndicator');
    this.loadingText = this.getElement('loadingText');
    this.propertyModeSubtitle = this.getElement('propertyModeSubtitle');

    // ===== 历史文件对话框 =====
    this.historyFilesDialog = this.getElement('historyFilesDialog');
    this.historyFilesList = this.getElement('historyFilesList');
    this.historyFilesDialogClose = this.getElement('historyFilesDialogClose') as HTMLButtonElement;

    // ===== 主题设置对话框 =====
    this.themeSettingsDialog = this.getElement('themeSettingsDialog');
    this.themeSettingsClose = this.getElement('themeSettingsClose') as HTMLButtonElement;
    this.presetCyberpunkBtn = this.getElement('presetCyberpunkBtn') as HTMLButtonElement;
    this.presetMinimalBtn = this.getElement('presetMinimalBtn') as HTMLButtonElement;
    this.presetHighContrastBtn = this.getElement('presetHighContrastBtn') as HTMLButtonElement;
    this.themeDarkBtn = this.getElement('themeDarkBtn') as HTMLButtonElement;
    this.themeLightBtn = this.getElement('themeLightBtn') as HTMLButtonElement;
    this.accentCyanBtn = this.getElement('accentCyanBtn') as HTMLButtonElement;
    this.accentMagentaBtn = this.getElement('accentMagentaBtn') as HTMLButtonElement;
    this.accentGreenBtn = this.getElement('accentGreenBtn') as HTMLButtonElement;
    this.accentOrangeBtn = this.getElement('accentOrangeBtn') as HTMLButtonElement;
    this.animationsToggle = this.getElement('animationsToggle') as HTMLInputElement;
    this.fontSizeSelect = this.getElement('fontSizeSelect') as HTMLSelectElement;
    this.compactModeToggle = this.getElement('compactModeToggle') as HTMLInputElement;

    // ===== 项目操作按钮 =====
    this.itemNewBtn = this.getElement('itemNewBtn') as HTMLButtonElement;
    this.itemCopyBtn = this.getElement('itemCopyBtn') as HTMLButtonElement;
    this.itemDeleteBtn = this.getElement('itemDeleteBtn') as HTMLButtonElement;
    this.itemSaveBtn = this.getElement('itemSaveBtn') as HTMLButtonElement;
    this.projectActions = this.getElement('projectActions');

    // ===== 弹道面板元素 =====
    this.projectilePreviewContainer = this.getElement('projectilePreviewContainer');
    this.projectileTemplateName = this.getElement('projectileTemplateName') as HTMLInputElement;
    this.projectileSegmentList = this.getElement('projectileSegmentList');
    this.projectileAddSegmentBtn = this.getElement('projectileAddSegmentBtn') as HTMLButtonElement;
    this.projectileClearSegmentsBtn = this.getElement('projectileClearSegmentsBtn') as HTMLButtonElement;
    this.projectileSaveTemplateBtn = this.getElement('projectileSaveTemplateBtn') as HTMLButtonElement;
    this.projectilePlayTestBtn = this.getElement('projectilePlayTestBtn') as HTMLButtonElement;
    this.projectilePauseBtn = this.getElement('projectilePauseBtn') as HTMLButtonElement;
    this.projectileStopBtn = this.getElement('projectileStopBtn') as HTMLButtonElement;
    this.projectileStepBackBtn = this.getElement('projectileStepBackBtn') as HTMLButtonElement;
    this.projectileStepForwardBtn = this.getElement('projectileStepForwardBtn') as HTMLButtonElement;
    this.projectileFrameInfo = this.getElement('projectileFrameInfo');
    this.projectileCreateTemplateBtn = this.getElement('projectileCreateTemplateBtn') as HTMLButtonElement;
    this.projectileDeleteTemplateBtn = this.getElement('projectileDeleteTemplateBtn') as HTMLButtonElement;
    this.projectileAnimationFileSelect = this.getElement('projectileAnimationFileSelect') as HTMLSelectElement;
    this.projectileAnimationLoadBtn = this.getElement('projectileAnimationLoadBtn') as HTMLButtonElement;
    this.projectileAnimationPickBtn = this.getElement('projectileAnimationPickBtn') as HTMLButtonElement;
    this.projectileAnimationStatus = this.getElement('projectileAnimationStatus');
    this.projectileEnemyFileSelect = this.getElement('projectileEnemyFileSelect') as HTMLSelectElement;
    this.projectileEnemyLoadBtn = this.getElement('projectileEnemyLoadBtn') as HTMLButtonElement;
    this.projectileEnemyPickBtn = this.getElement('projectileEnemyPickBtn') as HTMLButtonElement;
    this.projectileEnemyStatus = this.getElement('projectileEnemyStatus');
    this.projectileActorFileSelect = this.getElement('projectileActorFileSelect') as HTMLSelectElement;
    this.projectileActorLoadBtn = this.getElement('projectileActorLoadBtn') as HTMLButtonElement;
    this.projectileActorPickBtn = this.getElement('projectileActorPickBtn') as HTMLButtonElement;
    this.projectileActorStatus = this.getElement('projectileActorStatus');
    this.projectileWeaponFileSelect = this.getElement('projectileWeaponFileSelect') as HTMLSelectElement;
    this.projectileWeaponLoadBtn = this.getElement('projectileWeaponLoadBtn') as HTMLButtonElement;
    this.projectileWeaponPickBtn = this.getElement('projectileWeaponPickBtn') as HTMLButtonElement;
    this.projectileWeaponStatus = this.getElement('projectileWeaponStatus');
    this.projectileSkillFileSelect = this.getElement('projectileSkillFileSelect') as HTMLSelectElement;
    this.projectileSkillLoadBtn = this.getElement('projectileSkillLoadBtn') as HTMLButtonElement;
    this.projectileSkillPickBtn = this.getElement('projectileSkillPickBtn') as HTMLButtonElement;
    this.projectileSkillStatus = this.getElement('projectileSkillStatus');
    this.projectileStartAnimationSelect = this.getElement('projectileStartAnimationSelect') as HTMLSelectElement;
    this.projectileLaunchAnimationSelect = this.getElement('projectileLaunchAnimationSelect') as HTMLSelectElement;
    this.projectileEndAnimationSelect = this.getElement('projectileEndAnimationSelect') as HTMLSelectElement;
    this.projectileActorSelect = this.getElement('projectileActorSelect') as HTMLSelectElement;
    this.projectileActorOffsetX = this.getElement('projectileActorOffsetX') as HTMLInputElement;
    this.projectileActorOffsetY = this.getElement('projectileActorOffsetY') as HTMLInputElement;
    this.projectileActorOffsetSaveBtn = this.getElement('projectileActorOffsetSaveBtn') as HTMLButtonElement;
    this.projectileEnemySelect = this.getElement('projectileEnemySelect') as HTMLSelectElement;
    this.projectileEnemyOffsetX = this.getElement('projectileEnemyOffsetX') as HTMLInputElement;
    this.projectileEnemyOffsetY = this.getElement('projectileEnemyOffsetY') as HTMLInputElement;
    this.projectileEnemyOffsetSaveBtn = this.getElement('projectileEnemyOffsetSaveBtn') as HTMLButtonElement;
    this.projectileEmitterRoleSelect = this.getElement('projectileEmitterRoleSelect') as HTMLSelectElement;
    this.projectileEmitterCharacterSelect = this.getElement('projectileEmitterCharacterSelect') as HTMLSelectElement;
    this.projectileTargetRoleSelect = this.getElement('projectileTargetRoleSelect') as HTMLSelectElement;
    this.projectileTargetCharacterSelect = this.getElement('projectileTargetCharacterSelect') as HTMLSelectElement;
    this.projectilePlaybackRate = this.getElement('projectilePlaybackRate') as HTMLSelectElement;
    this.projectileEmitterWeaponSelect = this.getElement('projectileEmitterWeaponSelect') as HTMLSelectElement;
    this.projectileEmitterSkillSelect = this.getElement('projectileEmitterSkillSelect') as HTMLSelectElement;
    this.projectileEmitterTypeSelect = this.getElement('projectileEmitterTypeSelect') as HTMLSelectElement;
    this.projectileTargetTypeSelect = this.getElement('projectileTargetTypeSelect') as HTMLSelectElement;
    this.projectileEmitterIdSelect = this.getElement('projectileEmitterIdSelect') as HTMLSelectElement;
    this.projectileTargetIdSelect = this.getElement('projectileTargetIdSelect') as HTMLSelectElement;
    this.projectileTargetSkillSelect = this.getElement('projectileTargetSkillSelect') as HTMLSelectElement;

    // ===== 任务面板元素 =====
    this.questCreateBtn = this.getElement('questCreateBtn') as HTMLButtonElement;
    this.questSaveBtn = this.getElement('questSaveBtn') as HTMLButtonElement;
    this.questDeleteBtn = this.getElement('questDeleteBtn') as HTMLButtonElement;
    this.questTitleInput = this.getElement('questTitleInput') as HTMLInputElement;
    this.questGiverInput = this.getElement('questGiverInput') as HTMLInputElement;
    this.questCategoryInput = this.getElement('questCategoryInput') as HTMLInputElement;
    this.questRepeatableInput = this.getElement('questRepeatableInput') as HTMLInputElement;
    this.questDifficultySelect = this.getElement('questDifficultySelect') as HTMLSelectElement;
    this.questDescriptionInput = this.getElement('questDescriptionInput') as HTMLTextAreaElement;
    this.questStartSwitchList = this.getElement('questStartSwitchList');
    this.questFinishSwitchList = this.getElement('questFinishSwitchList');
    this.questStartVariableList = this.getElement('questStartVariableList');
    this.questFinishVariableList = this.getElement('questFinishVariableList');
    this.questObjectiveList = this.getElement('questObjectiveList');
    this.questRewardList = this.getElement('questRewardList');
    this.questRequirementList = this.getElement('questRequirementList');
    this.questAddStartSwitchBtn = this.getElement('questAddStartSwitchBtn') as HTMLButtonElement;
    this.questAddFinishSwitchBtn = this.getElement('questAddFinishSwitchBtn') as HTMLButtonElement;
    this.questAddStartVariableBtn = this.getElement('questAddStartVariableBtn') as HTMLButtonElement;
    this.questAddFinishVariableBtn = this.getElement('questAddFinishVariableBtn') as HTMLButtonElement;
    this.questAddObjectiveBtn = this.getElement('questAddObjectiveBtn') as HTMLButtonElement;
    this.questAddRewardBtn = this.getElement('questAddRewardBtn') as HTMLButtonElement;
    this.questAddRequirementBtn = this.getElement('questAddRequirementBtn') as HTMLButtonElement;
    this.questSystemFileSelect = this.getElement('questSystemFileSelect') as HTMLSelectElement;
    this.questSystemLoadBtn = this.getElement('questSystemLoadBtn') as HTMLButtonElement;
    this.questSystemPickBtn = this.getElement('questSystemPickBtn') as HTMLButtonElement;
    this.questSystemStatus = this.getElement('questSystemStatus');
    this.questDataStatus = this.getElement('questDataStatus');
    this.questItemFileSelect = this.getElement('questItemFileSelect') as HTMLSelectElement;
    this.questItemLoadBtn = this.getElement('questItemLoadBtn') as HTMLButtonElement;
    this.questItemPickBtn = this.getElement('questItemPickBtn') as HTMLButtonElement;
    this.questItemStatus = this.getElement('questItemStatus');
    this.questWeaponFileSelect = this.getElement('questWeaponFileSelect') as HTMLSelectElement;
    this.questWeaponLoadBtn = this.getElement('questWeaponLoadBtn') as HTMLButtonElement;
    this.questWeaponPickBtn = this.getElement('questWeaponPickBtn') as HTMLButtonElement;
    this.questWeaponStatus = this.getElement('questWeaponStatus');
    this.questArmorFileSelect = this.getElement('questArmorFileSelect') as HTMLSelectElement;
    this.questArmorLoadBtn = this.getElement('questArmorLoadBtn') as HTMLButtonElement;
    this.questArmorPickBtn = this.getElement('questArmorPickBtn') as HTMLButtonElement;
    this.questArmorStatus = this.getElement('questArmorStatus');
    this.questEnemyFileSelect = this.getElement('questEnemyFileSelect') as HTMLSelectElement;
    this.questEnemyLoadBtn = this.getElement('questEnemyLoadBtn') as HTMLButtonElement;
    this.questEnemyPickBtn = this.getElement('questEnemyPickBtn') as HTMLButtonElement;
    this.questEnemyStatus = this.getElement('questEnemyStatus');
    this.questActorFileSelect = this.getElement('questActorFileSelect') as HTMLSelectElement;
    this.questActorLoadBtn = this.getElement('questActorLoadBtn') as HTMLButtonElement;
    this.questActorPickBtn = this.getElement('questActorPickBtn') as HTMLButtonElement;
    this.questActorStatus = this.getElement('questActorStatus');
    this.projectileWeaponOffsetSelect = this.getElement('projectileWeaponOffsetSelect') as HTMLSelectElement;
    this.projectileSkillSelect = this.getElement('projectileSkillSelect') as HTMLSelectElement;

    this.initialized = true;
    console.log('[DOMManager] Initialized');
  }

  /**
   * 获取元素并记录警告（如果未找到）
   */
  private getElement(id: string): HTMLElement | null {
    const element = document.getElementById(id);
    if (!element) {
      // 不是所有元素都必须存在，只在调试时记录
      // console.warn(`[DOMManager] Element not found: #${id}`);
    }
    return element;
  }

  /**
   * 安全获取元素 - 带类型检查
   */
  getById<T extends HTMLElement = HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }

  /**
   * 查询选择器
   */
  query<T extends HTMLElement = HTMLElement>(selector: string, parent?: HTMLElement): T | null {
    const root = parent || document;
    return root.querySelector(selector) as T | null;
  }

  /**
   * 查询所有匹配元素
   */
  queryAll<T extends HTMLElement = HTMLElement>(selector: string, parent?: HTMLElement): NodeListOf<T> {
    const root = parent || document;
    return root.querySelectorAll(selector) as NodeListOf<T>;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// ============ DOM 元素池 ============

/**
 * 创建 DIV 元素池
 */
export const divPool = new FactoryPool<HTMLDivElement>(
  'DivPool',
  () => document.createElement('div'),
  (el) => {
    el.className = '';
    el.textContent = '';
    el.innerHTML = '';
    el.removeAttribute('data-index');
    el.removeAttribute('data-script');
  },
  undefined,
  100
);

/**
 * 创建 SPAN 元素池
 */
export const spanPool = new FactoryPool<HTMLSpanElement>(
  'SpanPool',
  () => document.createElement('span'),
  (el) => {
    el.className = '';
    el.textContent = '';
  },
  undefined,
  50
);

/**
 * 创建 OPTION 元素池
 */
export const optionPool = new FactoryPool<HTMLOptionElement>(
  'OptionPool',
  () => document.createElement('option'),
  (el) => {
    el.value = '';
    el.textContent = '';
    el.selected = false;
  },
  undefined,
  200
);

// ============ DOM 工具函数 ============

/**
 * 批量回收子元素到池
 */
export function recycleChildren(parent: HTMLElement, pool: FactoryPool<HTMLElement>): void {
  const children = parent.children;
  const length = children.length;
  
  for (let i = length - 1; i >= 0; i--) {
    const child = children[i] as HTMLElement;
    pool.return(child);
  }
  
  parent.innerHTML = '';
}

/**
 * 显示/隐藏元素
 */
export function setVisible(element: HTMLElement | null, visible: boolean): void {
  if (element) {
    element.classList.toggle('hidden', !visible);
  }
}

/**
 * 设置元素禁用状态
 */
export function setDisabled(element: HTMLElement | null, disabled: boolean): void {
  if (element) {
    if (disabled) {
      element.setAttribute('disabled', 'true');
      element.classList.add('disabled');
    } else {
      element.removeAttribute('disabled');
      element.classList.remove('disabled');
    }
  }
}

/**
 * 添加类名
 */
export function addClass(element: HTMLElement | null, className: string): void {
  if (element) {
    element.classList.add(className);
  }
}

/**
 * 移除类名
 */
export function removeClass(element: HTMLElement | null, className: string): void {
  if (element) {
    element.classList.remove(className);
  }
}

/**
 * 切换类名
 */
export function toggleClass(element: HTMLElement | null, className: string, force?: boolean): void {
  if (element) {
    element.classList.toggle(className, force);
  }
}

// ============ 导出单例 ============

/** 全局 DOM 管理器实例 */
export const DOM = new DOMManagerClass();

export default DOM;
