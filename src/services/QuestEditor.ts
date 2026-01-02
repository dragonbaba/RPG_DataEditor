/**
 * QuestEditor - 任务编辑器
 *
 * 实现任务编辑功能
 * 参考 oldCode/main.js QuestEditor (lines 346-1983)
 */

import { StateManager, type DataItem } from '../core/StateManager';
import { EventSystem } from '../core/EventSystem';
import { FactoryPool } from '../pools/ObjectPool';
import { logger } from './logger';
import { ipc } from './ipc';
import type { RPGQuest, SwitchAction, VariableAction, QuestObjective, QuestReward } from '../types';

// ============ 常量定义 ============

export const QUEST_REQUIREMENT_TYPES = [
  { value: 0, label: '无要求' },
  { value: 1, label: '等级要求' },
  { value: 2, label: '前置任务' },
  { value: 3, label: '物品' },
  { value: 4, label: '武器' },
  { value: 5, label: '防具' },
  { value: 6, label: '开关' },
  { value: 7, label: '变量' },
  { value: 8, label: '金币' }
];

export const QUEST_OBJECTIVE_TYPES = [
  { value: 1, label: '击杀敌人' },
  { value: 2, label: '收集物品' },
  { value: 3, label: '收集武器' },
  { value: 4, label: '收集防具' },
  { value: 5, label: '开关值' },
  { value: 6, label: '变量值' },
  { value: 7, label: '收集金币' }
];

export const QUEST_REWARD_TYPES = [
  { value: 1, label: '物品' },
  { value: 2, label: '武器' },
  { value: 3, label: '防具' },
  { value: 4, label: '金币' },
  { value: 5, label: '经验值' },
  { value: 6, label: '开关' },
  { value: 7, label: '变量' }
];

export const QUEST_DIFFICULTIES = [
  { value: 1, label: '简单' },
  { value: 2, label: '普通' },
  { value: 3, label: '困难' },
  { value: 4, label: '专家' },
  { value: 5, label: '大师' }
];

export const QUEST_OPERATORS = ['>', '>=', '<', '<=', '===', '!=='];
export const VARIABLE_OPERATORS = ['+', '-', '*', '/', '='];

// ============ 状态管理 ============

interface QuestSystem {
  switches: Array<{ id: number; name: string }>;
  variables: Array<{ id: number; name: string }>;
  items: DataItem[];
  weapons: DataItem[];
  armors: DataItem[];
  enemies: DataItem[];
  actors: DataItem[];
}

interface QuestEditorState {
  quests: RPGQuest[];
  currentIndex: number;
  questFilePath: string;
  dataPath: string;
  questDataPaths: Record<string, string>;
  system: QuestSystem;
}

const state: QuestEditorState = {
  quests: [],
  currentIndex: -1,
  questFilePath: '',
  dataPath: '',
  questDataPaths: {},
  system: {
    switches: [],
    variables: [],
    items: [],
    weapons: [],
    armors: [],
    enemies: [],
    actors: []
  }
};

// ============ 对象池 ============

interface QuestCardItem {
  element: HTMLDivElement;
  index: number;
  type: 'requirement' | 'objective' | 'reward';
}

interface SwitchRowItem {
  element: HTMLDivElement;
  index: number;
  listKey: string;
}

interface VariableRowItem {
  element: HTMLDivElement;
  index: number;
  listKey: string;
}

interface OptionItem {
  element: HTMLOptionElement;
  value: string;
  label: string;
}

let questCardPool: FactoryPool<QuestCardItem> | null = null;
let switchRowPool: FactoryPool<SwitchRowItem> | null = null;
let variableRowPool: FactoryPool<VariableRowItem> | null = null;
let optionPool: FactoryPool<OptionItem> | null = null;

function getQuestCardPool(): FactoryPool<QuestCardItem> {
  if (!questCardPool) {
    questCardPool = new FactoryPool<QuestCardItem>(
      'QuestCardPool',
      () => ({
        element: document.createElement('div') as HTMLDivElement,
        index: -1,
        type: 'requirement'
      }),
      (item) => {
        item.index = -1;
        item.type = 'requirement';
        item.element.innerHTML = '';
      },
      undefined,
      50
    );
  }
  return questCardPool;
}

function getSwitchRowPool(): FactoryPool<SwitchRowItem> {
  if (!switchRowPool) {
    switchRowPool = new FactoryPool<SwitchRowItem>(
      'SwitchRowPool',
      () => ({
        element: document.createElement('div') as HTMLDivElement,
        index: -1,
        listKey: ''
      }),
      (item) => {
        item.index = -1;
        item.listKey = '';
        item.element.innerHTML = '';
      },
      undefined,
      30
    );
  }
  return switchRowPool;
}

function getVariableRowPool(): FactoryPool<VariableRowItem> {
  if (!variableRowPool) {
    variableRowPool = new FactoryPool<VariableRowItem>(
      'VariableRowPool',
      () => ({
        element: document.createElement('div') as HTMLDivElement,
        index: -1,
        listKey: ''
      }),
      (item) => {
        item.index = -1;
        item.listKey = '';
        item.element.innerHTML = '';
      },
      undefined,
      30
    );
  }
  return variableRowPool;
}

function getOptionPool(): FactoryPool<OptionItem> {
  if (!optionPool) {
    optionPool = new FactoryPool<OptionItem>(
      'OptionPool',
      () => ({
        element: document.createElement('option') as HTMLOptionElement,
        value: '',
        label: ''
      }),
      (item) => {
        item.value = '';
        item.label = '';
        item.element.value = '';
        item.element.textContent = '';
      },
      undefined,
      100
    );
  }
  return optionPool;
}

// ============ 默认任务 ============

export function createDefaultQuest(): RPGQuest {
  return {
    id: 0,
    title: '新的任务',
    giver: 'NPC',
    category: true,
    repeatable: false,
    difficulty: 1,
    startSwitches: [],
    startVariables: [],
    switches: [],
    variables: [],
    description: ['任务简介'],
    requirements: [],
    objectives: [
      { type: 'kill' as const, target: 1, count: 1 }
    ],
    rewards: []
  };
}

// ============ DOM 工具函数 ============

function recycleOptions(container: HTMLElement): void {
  const options = container.querySelectorAll('option');
  const pool = getOptionPool();
  for (const option of options) {
    const item = option as HTMLOptionElement;
    pool.return({ element: item, value: item.value, label: item.textContent || '' });
  }
  container.innerHTML = '';
}

function fillSelectOptions(container: HTMLElement, options: Array<{ value: number | string; label: string }>): void {
  recycleOptions(container);
  const frag = document.createDocumentFragment();
  for (const opt of options) {
    const pool = getOptionPool();
    const item = pool.get();
    item.value = String(opt.value);
    item.label = opt.label;
    item.element.value = String(opt.value);
    item.element.textContent = opt.label;
    frag.appendChild(item.element);
  }
  container.appendChild(frag);
}

// ============ 任务列表渲染 ============

export function renderQuestList(): void {
  const stateManager = StateManager.getState();
  state.quests = stateManager.quests || [];

  EventSystem.emit('quest:list:rendered', { count: state.quests.length });
}

export function selectQuest(index: number): void {
  if (index < 0 || index >= state.quests.length) return;

  state.currentIndex = index;
  const quest = state.quests[index];

  StateManager.setState({
    currentData: [null, ...state.quests] as DataItem[],
    currentFileType: 'quest',
    currentItemIndex: index + 1,
    currentItem: quest
  });

  EventSystem.emit('quest:selected', { index, quest });
}

export function getCurrentQuest(): RPGQuest | null {
  if (state.currentIndex < 0 || state.currentIndex >= state.quests.length) return null;
  return state.quests[state.currentIndex];
}

// ============ 新建/删除/保存 ============

export function newQuest(): void {
  collectFormToQuest();
  const newId = state.quests.length > 0 ? Math.max(...state.quests.map(q => q.id)) + 1 : 1;
  const quest: RPGQuest = {
    id: newId,
    title: '新的任务',
    giver: 'NPC',
    category: true,
    repeatable: false,
    difficulty: 1,
    startSwitches: [],
    startVariables: [],
    switches: [],
    variables: [],
    description: ['任务简介'],
    requirements: [],
    objectives: [{ type: 'kill' as const, target: 1, count: 1 }],
    rewards: []
  };
  state.quests.push(quest);
  state.currentIndex = state.quests.length - 1;
  renderQuestList();
  selectQuest(state.currentIndex);
  EventSystem.emit('quest:created', { index: state.currentIndex, quest });
}

export async function deleteQuest(): Promise<void> {
  if (state.currentIndex < 0) return;

  collectFormToQuest();
  state.quests.splice(state.currentIndex, 1);
  state.currentIndex = Math.max(0, state.currentIndex - 1);

  renderQuestList();
  const quest = state.quests[state.currentIndex];
  if (quest) selectQuest(state.currentIndex);

  await saveQuestFile();
  EventSystem.emit('quest:deleted', { index: state.currentIndex });
}

export async function saveQuestFile(): Promise<void> {
  if (!state.questFilePath) return;

  collectFormToQuest();
  const payload = [null, ...state.quests];

  try {
    await ipc.file.write(state.questFilePath, JSON.stringify(payload, null, 2));
    EventSystem.emit('quest:saved', { filePath: state.questFilePath, count: state.quests.length });
  } catch (err) {
    logger.error('Failed to save quest file', { error: err }, 'QuestEditor');
  }
}

export async function loadQuestFile(filePath: string): Promise<void> {
  if (!filePath) return;

  try {
    const raw = await ipc.file.read(filePath);
    const data = JSON.parse(raw);

    let quests: RPGQuest[] = Array.isArray(data) ? data.slice(1) : [];
    if (!quests.length) quests = [createDefaultQuest()];

    state.quests = quests;
    state.currentIndex = 0;
    state.questFilePath = filePath;

    renderQuestList();
    selectQuest(0);

    EventSystem.emit('quest:loaded', { filePath, count: quests.length });
  } catch (err) {
    logger.error('Failed to load quest file', { error: err }, 'QuestEditor');
  }
}

// ============ 收集表单数据 ============

export function collectFormToQuest(): void {
  const quest = getCurrentQuest();
  if (!quest) return;

  const titleInput = document.getElementById('questTitleInput') as HTMLInputElement | null;
  const giverInput = document.getElementById('questGiverInput') as HTMLInputElement | null;
  const categoryInput = document.getElementById('questCategoryInput') as HTMLInputElement | null;
  const repeatableInput = document.getElementById('questRepeatableInput') as HTMLInputElement | null;
  const difficultySelect = document.getElementById('questDifficultySelect') as HTMLSelectElement | null;
  const descriptionInput = document.getElementById('questDescriptionInput') as HTMLTextAreaElement | null;

  if (titleInput) quest.title = titleInput.value;
  if (giverInput) quest.giver = giverInput.value;
  if (categoryInput) quest.category = categoryInput.checked;
  if (repeatableInput) quest.repeatable = repeatableInput.checked;
  if (difficultySelect) quest.difficulty = parseInt(difficultySelect.value) || 1;
  if (descriptionInput) quest.description = descriptionInput.value.split('\n').filter(l => l.trim());

  EventSystem.emit('quest:form:collected', { quest });
}

// ============ 开关列表渲染 ============

export function renderSwitchList(container: HTMLElement, data: SwitchAction[], listKey?: string): void {
  if (!container) return;

  const pool = getSwitchRowPool();
  const rows = container.querySelectorAll('.mini-row');
  for (const row of rows) {
    const item = row as unknown as { __questSwitchRow?: SwitchRowItem };
    if (item.__questSwitchRow) {
      pool.return(item.__questSwitchRow);
    }
  }
  container.innerHTML = '';

  if (listKey) {
    container.dataset.questList = listKey;
  }

  const switches = state.system.switches;
  const frag = document.createDocumentFragment();

  for (let idx = 0; idx < data.length; idx++) {
    const row = data[idx];
    const item = pool.get();
    item.index = idx;
    item.listKey = listKey || container.dataset.questList || '';

    item.element.className = 'mini-row';
    item.element.dataset.index = String(idx);

    const select = document.createElement('select') as HTMLSelectElement;
    select.className = 'switch-select theme-select';
    select.dataset.questList = item.listKey;
    select.dataset.switchField = 'id';

    const valueSelect = document.createElement('select') as HTMLSelectElement;
    valueSelect.className = 'switch-value theme-select';
    valueSelect.dataset.questList = item.listKey;
    valueSelect.dataset.switchField = 'value';

    fillSelectOptions(valueSelect, [
      { value: 'true', label: '开启' },
      { value: 'false', label: '关闭' }
    ]);
    valueSelect.value = row.value ? 'true' : 'false';

    fillSelectOptions(select, switches.map((s, i) => ({ value: i, label: s?.name || `开关${i}` })));
    select.value = String(row.id || 0);

    const removeBtn = document.createElement('button') as HTMLButtonElement;
    removeBtn.className = 'icon-btn mini-row-remove';
    removeBtn.textContent = '×';
    removeBtn.title = '删除';

    item.element.appendChild(select);
    item.element.appendChild(valueSelect);
    item.element.appendChild(removeBtn);

    (item.element as unknown as { __questSwitchRow?: SwitchRowItem }).__questSwitchRow = item;
    frag.appendChild(item.element);
  }

  container.appendChild(frag);

  EventSystem.emit('quest:switchList:rendered', { container, count: data.length });
}

export function renderStartSwitchList(): void {
  const container = document.getElementById('questStartSwitchList') as HTMLElement | null;
  const quest = getCurrentQuest();
  if (container && quest) {
    renderSwitchList(container, quest.startSwitches || [], 'startSwitches');
  }
}

export function renderFinishSwitchList(): void {
  const container = document.getElementById('questFinishSwitchList') as HTMLElement | null;
  const quest = getCurrentQuest();
  if (container && quest) {
    renderSwitchList(container, quest.switches || [], 'switches');
  }
}

// ============ 变量列表渲染 ============

export function renderVariableList(container: HTMLElement, data: VariableAction[], listKey?: string): void {
  if (!container) return;

  const pool = getVariableRowPool();
  const rows = container.querySelectorAll('.variable-row, .mini-row');
  for (const row of rows) {
    const item = row as unknown as { __questVariableRow?: VariableRowItem };
    if (item.__questVariableRow) {
      pool.return(item.__questVariableRow);
    }
  }
  container.innerHTML = '';

  if (listKey) {
    container.dataset.questList = listKey;
  }

  const variables = state.system.variables;
  const frag = document.createDocumentFragment();

  for (let idx = 0; idx < data.length; idx++) {
    const row = data[idx];
    const item = pool.get();
    item.index = idx;
    item.listKey = listKey || container.dataset.questList || '';

    item.element.className = 'mini-row variable-row';
    item.element.dataset.index = String(idx);

    const select = document.createElement('select') as HTMLSelectElement;
    select.className = 'variable-select theme-select';
    select.dataset.questList = item.listKey;
    select.dataset.variableField = 'id';

    const opSelect = document.createElement('select') as HTMLSelectElement;
    opSelect.className = 'variable-op theme-select';
    opSelect.dataset.variableField = 'operation';
    fillSelectOptions(opSelect, VARIABLE_OPERATORS.map(op => ({ value: op, label: op })));
    opSelect.value = row.operation || '+';

    const valueInput = document.createElement('input') as HTMLInputElement;
    valueInput.type = 'number';
    valueInput.className = 'variable-value theme-input';
    valueInput.value = String(row.value ?? 0);
    valueInput.dataset.questList = item.listKey;
    valueInput.dataset.variableField = 'value';

    const removeBtn = document.createElement('button') as HTMLButtonElement;
    removeBtn.className = 'icon-btn mini-row-remove';
    removeBtn.textContent = '×';
    removeBtn.title = '删除';

    item.element.appendChild(select);
    item.element.appendChild(opSelect);
    item.element.appendChild(valueInput);
    item.element.appendChild(removeBtn);

    fillSelectOptions(select, variables.map((v, i) => ({ value: i, label: v?.name || `变量${i}` })));
    select.value = String(row.id || 0);

    (item.element as unknown as { __questVariableRow?: VariableRowItem }).__questVariableRow = item;
    frag.appendChild(item.element);
  }

  container.appendChild(frag);

  EventSystem.emit('quest:variableList:rendered', { container, count: data.length });
}

export function renderStartVariableList(): void {
  const container = document.getElementById('questStartVariableList') as HTMLElement | null;
  const quest = getCurrentQuest();
  if (container && quest) {
    renderVariableList(container, quest.startVariables || [], 'startVariables');
  }
}

export function renderFinishVariableList(): void {
  const container = document.getElementById('questFinishVariableList') as HTMLElement | null;
  const quest = getCurrentQuest();
  if (container && quest) {
    renderVariableList(container, quest.variables || [], 'variables');
  }
}

// ============ 任务列表渲染 ============

export function renderRequirementList(): void {
  const container = document.getElementById('questRequirementList') as HTMLElement | null;
  const quest = getCurrentQuest();
  if (!container || !quest) return;

  const pool = getQuestCardPool();
  const cards = container.querySelectorAll('.quest-card');
  for (const card of cards) {
    const item = card as unknown as { __questCard?: QuestCardItem };
    if (item.__questCard) pool.return(item.__questCard);
  }
  container.innerHTML = '';

  const requirements = quest.requirements || [];
  const frag = document.createDocumentFragment();

  for (let i = 0; i < requirements.length; i++) {
    const req = requirements[i];
    const item = pool.get();
    item.index = i;
    item.type = 'requirement';

    item.element.className = 'quest-card';
    item.element.dataset.index = String(i);
    item.element.innerHTML = `
      <div class="quest-card-header">
        <select class="req-type theme-select"></select>
        <button class="icon-btn remove-card" title="删除">×</button>
      </div>
      <div class="quest-card-grid req-grid">
        <div class="text-gray-500 text-sm p-2">${req.type} - ${JSON.stringify(req.value)}</div>
      </div>
    `;

    const typeSelect = item.element.querySelector('.req-type') as HTMLSelectElement;
    fillSelectOptions(typeSelect, QUEST_REQUIREMENT_TYPES);
    typeSelect.value = String(req.type ?? 0);
    typeSelect.dataset.reqField = 'type';

    (item.element as unknown as { __questCard?: QuestCardItem }).__questCard = item;
    frag.appendChild(item.element);
  }

  container.appendChild(frag);
  EventSystem.emit('quest:requirementList:rendered', { count: requirements.length });
}

export function renderObjectiveList(): void {
  const container = document.getElementById('questObjectiveList') as HTMLElement | null;
  const quest = getCurrentQuest();
  if (!container || !quest) return;

  const pool = getQuestCardPool();
  const cards = container.querySelectorAll('.quest-card');
  for (const card of cards) {
    const item = card as unknown as { __questCard?: QuestCardItem };
    if (item.__questCard) pool.return(item.__questCard);
  }
  container.innerHTML = '';

  const objectives = quest.objectives || [];
  const frag = document.createDocumentFragment();

  for (let i = 0; i < objectives.length; i++) {
    const obj = objectives[i];
    const item = pool.get();
    item.index = i;
    item.type = 'objective';

    item.element.className = 'quest-card';
    item.element.dataset.index = String(i);
    item.element.innerHTML = `
      <div class="quest-card-header">
        <select class="obj-type theme-select"></select>
        <button class="icon-btn remove-card" title="删除">×</button>
      </div>
      <div class="quest-card-grid obj-grid">
        <div class="text-gray-500 text-sm p-2">${obj.type} - ${JSON.stringify(obj.target)}</div>
      </div>
    `;

    const typeSelect = item.element.querySelector('.obj-type') as HTMLSelectElement;
    fillSelectOptions(typeSelect, QUEST_OBJECTIVE_TYPES);
    typeSelect.value = String(mapObjectiveType(obj.type));
    typeSelect.dataset.objField = 'type';

    (item.element as unknown as { __questCard?: QuestCardItem }).__questCard = item;
    frag.appendChild(item.element);
  }

  container.appendChild(frag);
  EventSystem.emit('quest:objectiveList:rendered', { count: objectives.length });
}

export function renderRewardList(): void {
  const container = document.getElementById('questRewardList') as HTMLElement | null;
  const quest = getCurrentQuest();
  if (!container || !quest) return;

  const pool = getQuestCardPool();
  const cards = container.querySelectorAll('.quest-card');
  for (const card of cards) {
    const item = card as unknown as { __questCard?: QuestCardItem };
    if (item.__questCard) pool.return(item.__questCard);
  }
  container.innerHTML = '';

  const rewards = quest.rewards || [];
  const frag = document.createDocumentFragment();

  for (let i = 0; i < rewards.length; i++) {
    const rew = rewards[i];
    const item = pool.get();
    item.index = i;
    item.type = 'reward';

    item.element.className = 'quest-card';
    item.element.dataset.index = String(i);
    item.element.innerHTML = `
      <div class="quest-card-header">
        <select class="rew-type theme-select"></select>
        <button class="icon-btn remove-card" title="删除">×</button>
      </div>
      <div class="quest-card-grid rew-grid">
        <div class="text-gray-500 text-sm p-2">${rew.type} - ${rew.amount}</div>
      </div>
    `;

    const typeSelect = item.element.querySelector('.rew-type') as HTMLSelectElement;
    fillSelectOptions(typeSelect, QUEST_REWARD_TYPES);
    typeSelect.value = String(mapRewardType(rew.type));
    typeSelect.dataset.rewField = 'type';

    (item.element as unknown as { __questCard?: QuestCardItem }).__questCard = item;
    frag.appendChild(item.element);
  }

  container.appendChild(frag);
  EventSystem.emit('quest:rewardList:rendered', { count: rewards.length });
}

function mapObjectiveType(type: QuestObjective['type']): number {
  const map: Record<string, number> = { kill: 1, collect: 2, switch: 5, variable: 6 };
  return map[type] || 1;
}

function mapRewardType(type: QuestReward['type']): number {
  const map: Record<string, number> = { item: 1, weapon: 2, armor: 3, gold: 4 };
  return map[type] || 1;
}

// ============ 添加/删除功能 ============

export function addRequirement(): void {
  const quest = getCurrentQuest();
  if (!quest) return;

  if (!quest.requirements) quest.requirements = [];
  quest.requirements.push({ type: 0, value: null });
  renderRequirementList();
  EventSystem.emit('quest:requirement:added', { index: quest.requirements.length - 1 });
}

export function addObjective(): void {
  const quest = getCurrentQuest();
  if (!quest) return;

  if (!quest.objectives) quest.objectives = [];
  quest.objectives.push({ type: 'kill', target: 1, count: 1 });
  renderObjectiveList();
  EventSystem.emit('quest:objective:added', { index: quest.objectives.length - 1 });
}

export function addReward(): void {
  const quest = getCurrentQuest();
  if (!quest) return;

  if (!quest.rewards) quest.rewards = [];
  quest.rewards.push({ type: 'gold', amount: 100 });
  renderRewardList();
  EventSystem.emit('quest:reward:added', { index: quest.rewards.length - 1 });
}

export function onAddStartSwitch(): void {
  const quest = getCurrentQuest();
  if (!quest) return;

  if (!quest.startSwitches) quest.startSwitches = [];
  quest.startSwitches.push({ id: 1, value: true });
  renderStartSwitchList();
}

export function onAddFinishSwitch(): void {
  const quest = getCurrentQuest();
  if (!quest) return;

  if (!quest.switches) quest.switches = [];
  quest.switches.push({ id: 1, value: true });
  renderFinishSwitchList();
}

export function onAddStartVariable(): void {
  const quest = getCurrentQuest();
  if (!quest) return;

  if (!quest.startVariables) quest.startVariables = [];
  quest.startVariables.push({ id: 1, operation: 'set', value: 0 });
  renderStartVariableList();
}

export function onAddFinishVariable(): void {
  const quest = getCurrentQuest();
  if (!quest) return;

  if (!quest.variables) quest.variables = [];
  quest.variables.push({ id: 1, operation: 'set', value: 0 });
  renderFinishVariableList();
}

export function removeRequirement(index: number): void {
  const quest = getCurrentQuest();
  if (!quest || !quest.requirements) return;

  quest.requirements.splice(index, 1);
  renderRequirementList();
}

export function removeObjective(index: number): void {
  const quest = getCurrentQuest();
  if (!quest || !quest.objectives) return;

  quest.objectives.splice(index, 1);
  renderObjectiveList();
}

export function removeReward(index: number): void {
  const quest = getCurrentQuest();
  if (!quest || !quest.rewards) return;

  quest.rewards.splice(index, 1);
  renderRewardList();
}

// ============ 数据文件加载 ============

export async function loadQuestDataFile(type: string, filePath: string): Promise<void> {
  try {
    const raw = await ipc.file.read(filePath);
    const data = JSON.parse(raw);

    const dataArray = Array.isArray(data) ? data : [];

    switch (type) {
      case 'system':
        state.system.switches = (dataArray as { switches?: Array<{ id: number; name: string }> })?.switches || [];
        state.system.variables = (dataArray as { variables?: Array<{ id: number; name: string }> })?.variables || [];
        break;
      case 'item':
        state.system.items = dataArray;
        break;
      case 'weapon':
        state.system.weapons = dataArray;
        break;
      case 'armor':
        state.system.armors = dataArray;
        break;
      case 'enemy':
        state.system.enemies = dataArray;
        break;
      case 'actor':
        state.system.actors = dataArray;
        break;
    }

    state.questDataPaths[type] = filePath;
    updateQuestDataStatus(type, filePath, dataArray.length - 1);
    refreshSelectSources();

    EventSystem.emit('quest:data:loaded', { type, filePath, count: dataArray.length - 1 });
  } catch (err) {
    logger.error('Failed to load quest data file', { type, filePath, error: err }, 'QuestEditor');
  }
}

function updateQuestDataStatus(type: string, filePath: string, count: number): void {
  const config: Record<string, { statusRef: string }> = {
    system: { statusRef: 'questSystemStatus' },
    item: { statusRef: 'questItemStatus' },
    weapon: { statusRef: 'questWeaponStatus' },
    armor: { statusRef: 'questArmorStatus' },
    enemy: { statusRef: 'questEnemyStatus' },
    actor: { statusRef: 'questActorStatus' }
  };

  const cfg = config[type];
  if (!cfg) return;

  const statusEl = document.getElementById(cfg.statusRef) as HTMLElement | null;
  if (statusEl) {
    const fileName = filePath.split('/').pop() || filePath;
    statusEl.textContent = `${fileName} · ${Math.max(count, 0)} 条`;
  }
}

function refreshSelectSources(): void {
  renderStartSwitchList();
  renderFinishSwitchList();
  renderStartVariableList();
  renderFinishVariableList();
}

// ============ 绑定任务到表单 ============

export function bindQuestToForm(quest: RPGQuest): void {
  const titleInput = document.getElementById('questTitleInput') as HTMLInputElement | null;
  const giverInput = document.getElementById('questGiverInput') as HTMLInputElement | null;
  const categoryInput = document.getElementById('questCategoryInput') as HTMLInputElement | null;
  const repeatableInput = document.getElementById('questRepeatableInput') as HTMLInputElement | null;
  const difficultySelect = document.getElementById('questDifficultySelect') as HTMLSelectElement | null;
  const descriptionInput = document.getElementById('questDescriptionInput') as HTMLTextAreaElement | null;

  if (titleInput) titleInput.value = quest.title || '';
  if (giverInput) giverInput.value = quest.giver || '';
  if (categoryInput) categoryInput.checked = !!quest.category;
  if (repeatableInput) repeatableInput.checked = !!quest.repeatable;
  if (difficultySelect) difficultySelect.value = String(quest.difficulty || 1);
  if (descriptionInput) descriptionInput.value = Array.isArray(quest.description) ? quest.description.join('\n') : (quest.description || '');

  renderStartSwitchList();
  renderFinishSwitchList();
  renderStartVariableList();
  renderFinishVariableList();
  renderRequirementList();
  renderObjectiveList();
  renderRewardList();

  EventSystem.emit('quest:bound:to:form', { quest });
}

// ============ 事件处理 ============

export function handleQuestPanelClick(e: Event): void {
  const target = e.target as HTMLElement;
  if (!target) return;

  const quest = getCurrentQuest();
  if (!quest) return;

  if (target.closest('#questAddRequirementBtn')) {
    addRequirement();
    return;
  }
  if (target.closest('#questAddObjectiveBtn')) {
    addObjective();
    return;
  }
  if (target.closest('#questAddRewardBtn')) {
    addReward();
    return;
  }
  if (target.closest('#questAddStartSwitchBtn')) {
    onAddStartSwitch();
    return;
  }
  if (target.closest('#questAddFinishSwitchBtn')) {
    onAddFinishSwitch();
    return;
  }
  if (target.closest('#questAddStartVariableBtn')) {
    onAddStartVariable();
    return;
  }
  if (target.closest('#questAddFinishVariableBtn')) {
    onAddFinishVariable();
    return;
  }

  const remove = target.closest('.mini-row-remove');
  if (remove) {
    const row = remove.closest('.mini-row, .variable-row');
    const container = row?.parentElement;
    const index = Number(row?.dataset.index);
    const listKey = container?.dataset.questList || '';

    if (!row || !container) return;

    if (listKey === 'startSwitches' && quest.startSwitches) {
      quest.startSwitches.splice(index, 1);
      renderStartSwitchList();
    } else if (listKey === 'switches' && quest.switches) {
      quest.switches.splice(index, 1);
      renderFinishSwitchList();
    } else if (listKey === 'startVariables' && quest.startVariables) {
      quest.startVariables.splice(index, 1);
      renderStartVariableList();
    } else if (listKey === 'variables' && quest.variables) {
      quest.variables.splice(index, 1);
      renderFinishVariableList();
    }
    return;
  }

  const removeCard = target.closest('.remove-card');
  if (removeCard) {
    const card = target.closest('.quest-card');
    const index = Number(card?.dataset.index);
    const list = card?.parentElement;

    if (list?.id === 'questRequirementList') {
      removeRequirement(index);
    } else if (list?.id === 'questObjectiveList') {
      removeObjective(index);
    } else if (list?.id === 'questRewardList') {
      removeReward(index);
    }
  }
}

export function handleQuestPanelChange(e: Event): void {
  const target = e.target as HTMLElement;
  if (!target) return;

  const quest = getCurrentQuest();
  if (!quest) return;

  collectFormToQuest();
}

export function handleQuestPanelInput(e: Event): void {
  const target = e.target as HTMLElement;
  if (!target) return;

  const quest = getCurrentQuest();
  if (!quest) return;

  if (target.id === 'questTitleInput' || target.id === 'questGiverInput' || target.id === 'questDescriptionInput') {
    collectFormToQuest();
  }
}

// ============ 填充难度下拉框 ============

export function fillQuestDifficulty(): void {
  const select = document.getElementById('questDifficultySelect') as HTMLSelectElement | null;
  if (select) {
    fillSelectOptions(select, QUEST_DIFFICULTIES);
  }
}

// ============ 初始化 ============

export function initQuestEditor(): void {
  fillQuestDifficulty();

  EventSystem.on('quest:selected', ({ quest }) => {
    if (quest) bindQuestToForm(quest);
  });

  EventSystem.on('quest:copied', ({ quest }) => {
    if (quest) bindQuestToForm(quest);
  });

  logger.info('QuestEditor initialized', undefined, 'QuestEditor');
}

export function disposeQuestEditor(): void {
  state.quests = [];
  state.currentIndex = -1;
  logger.info('QuestEditor disposed', undefined, 'QuestEditor');
}

export default {
  init: initQuestEditor,
  dispose: disposeQuestEditor,
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
  QUEST_OPERATORS
};
