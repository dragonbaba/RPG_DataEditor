import { DOM } from '../core/DOMManager';
import { StateManager, DataItem } from '../core/StateManager';
import { EventSystem } from '../core/EventSystem';
import { logger } from '../services/logger';
import { fillOptions } from '../utils/domHelpers';
import { themeManager } from '../theme/ThemeManager';
import { visualEffects } from '../theme/effects/VisualEffects';
import type {
  RPGQuest,
  QuestRequirement,
  QuestObjective,
  QuestReward,
  SwitchAction,
  VariableAction,
} from '../types';
import {
  acquireQuestCard,
  recyclePoolTree,
  acquireSelectOption,
  acquireInput,
  acquireSelect,
  acquireLabel,
  acquireDiv,
  releaseDiv,
  releaseInput,
  releaseSelect,
  acquireObjectiveCard,
  acquireRewardCard,
} from '../pools/DOMPools';

const PATH_SPLIT_REGEXP = /[\/]/;
const TRAILING_SEP_REGEXP = /[\/]+$/;
const NL_REGEXP = /\r?\n/;

const QUEST_REQUIREMENT_TYPES = [
  { value: 0, label: '无要求' },
  { value: 1, label: '等级要求' },
  { value: 2, label: '前置任务' },
  { value: 3, label: '物品' },
  { value: 4, label: '武器' },
  { value: 5, label: '防具' },
  { value: 6, label: '开关' },
  { value: 7, label: '变量' },
  { value: 8, label: '金币' },
];

const QUEST_OBJECTIVE_TYPES = [
  { value: 1, label: '击杀敌人' },
  { value: 2, label: '收集物品' },
  { value: 3, label: '收集武器' },
  { value: 4, label: '收集防具' },
  { value: 5, label: '开关值' },
  { value: 6, label: '变量值' },
  { value: 7, label: '收集金币' },
];

const QUEST_REWARD_TYPES = [
  { value: 1, label: '物品' },
  { value: 2, label: '武器' },
  { value: 3, label: '防具' },
  { value: 4, label: '金币' },
  { value: 5, label: '经验值' },
  { value: 6, label: '开关' },
  { value: 7, label: '变量' },
];

const QUEST_DIFFICULTIES = [
  { value: 1, label: '易' },
  { value: 2, label: '普通' },
  { value: 3, label: '困难' },
  { value: 4, label: '专家' },
  { value: 5, label: '大师' },
];

const QUEST_OPERATORS = ['>', '>=', '<', '<=', '===', '!=='];
const VARIABLE_OPS = ['+', '-', '*', '/', '='];

const QUEST_DATA_CONFIG = {
  system: {
    label: '系统数据',
    defaultFile: 'System.json',
    selectRef: 'questSystemFileSelect',
    loadBtnRef: 'questSystemLoadBtn',
    pickBtnRef: 'questSystemPickBtn',
    statusRef: 'questSystemStatus',
  },
  item: {
    label: '物品数据',
    defaultFile: 'Items.json',
    selectRef: 'questItemFileSelect',
    loadBtnRef: 'questItemLoadBtn',
    pickBtnRef: 'questItemPickBtn',
    statusRef: 'questItemStatus',
  },
  weapon: {
    label: '武器数据',
    defaultFile: 'Weapons.json',
    selectRef: 'questWeaponFileSelect',
    loadBtnRef: 'questWeaponLoadBtn',
    pickBtnRef: 'questWeaponPickBtn',
    statusRef: 'questWeaponStatus',
  },
  armor: {
    label: '防具数据',
    defaultFile: 'Armors.json',
    selectRef: 'questArmorFileSelect',
    loadBtnRef: 'questArmorLoadBtn',
    pickBtnRef: 'questArmorPickBtn',
    statusRef: 'questArmorStatus',
  },
  enemy: {
    label: '敌人数据',
    defaultFile: 'Enemies.json',
    selectRef: 'questEnemyFileSelect',
    loadBtnRef: 'questEnemyLoadBtn',
    pickBtnRef: 'questEnemyPickBtn',
    statusRef: 'questEnemyStatus',
  },
  actor: {
    label: '角色数据',
    defaultFile: 'Actors.json',
    selectRef: 'questActorFileSelect',
    loadBtnRef: 'questActorLoadBtn',
    pickBtnRef: 'questActorPickBtn',
    statusRef: 'questActorStatus',
  },
};

let currentQuestIndex = -1;
let currentQuest: RPGQuest | null = null;
let eventsBound = false;
let dataLoadersBound = false;
let buttonsBound = false;

const requirementTemplate = document.getElementById('quest-requirement-card') as HTMLTemplateElement | null;
const objectiveTemplate = document.getElementById('quest-objective-card') as HTMLTemplateElement | null;
const rewardTemplate = document.getElementById('quest-reward-card') as HTMLTemplateElement | null;



function createDefaultQuest(): RPGQuest {
  return {
    title: '新任务',
    giver: 'NPC',
    category: true,
    repeatable: false,
    startSwitches: [],
    startVariables: [],
    switches: [],
    variables: [],
    difficulty: 1,
    description: ['描述'],
    requirements: [],
    objectives: [
      {
        type: 1,
        enemyId: 1,
        targetValue: 1,
        calculateType: true,
        operator: '>=',
        description: '击杀1个敌人',
        switches: [],
        variables: [],
      },
    ],
    rewards: [{ type: 4, targetValue: 100, description: '获100金币' }],
  };
}



function createNumberInput(value: number, field: string, datasetKey: string): HTMLInputElement {
  const input = acquireInput();
  input.type = 'number';
  input.className = 'theme-input';
  input.value = String(value);
  input.dataset[datasetKey] = field;
  return input;
}

function createTextInput(value: string, field: string, datasetKey: string): HTMLInputElement {
  const input = acquireInput();
  input.type = 'text';
  input.className = 'theme-input';
  input.value = value;
  input.dataset[datasetKey] = field;
  return input;
}

function createBoolSelect(current: boolean, datasetKey: string, field: string): HTMLSelectElement {
  const select = acquireSelect();
  select.className = 'theme-select';
  fillOptions(select, [
    { value: 'true', label: '开启' },
    { value: 'false', label: '关闭' }
  ]);
  select.value = current ? 'true' : 'false';
  select.dataset[datasetKey] = field;
  return select;
}

function createOperatorSelect(value: string, datasetKey: string, field: string): HTMLSelectElement {
  const select = acquireSelect();
  select.className = 'theme-select';
  fillOptions(select, VARIABLE_OPS);
  select.value = value || '=';
  select.dataset[datasetKey] = field;
  return select;
}

function createDataSelect<T extends { id?: number; name?: string; label?: string }>(
  data: (T | null)[] | undefined,
  value: number,
  field: string,
  datasetKey: string,
  fallbackLabel: string,
): HTMLSelectElement {
  const select = acquireSelect();
  select.className = 'theme-select';
  select.dataset[datasetKey] = field;

  if (!data || data.length <= 1) {
    fillOptions(select, [{ value: '0', label: `未加载${fallbackLabel}` }]);
    return select;
  }

  const options = data.slice(1).map((entry, index) => {
    const id = entry?.id ?? index + 1;
    return { value: String(id), label: `${id} : ${entry?.name || entry?.label || fallbackLabel}` };
  });

  fillOptions(select, options);
  select.value = String(value);
  return select;
}

function appendQuestField(
  container: HTMLElement | null,
  label: string,
  node: HTMLElement,
): void {
  if (!container) return;
  const wrapper = acquireDiv();
  wrapper.className = 'quest-field';
  const labelEl = acquireLabel();
  labelEl.className = 'quest-field-label';
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);
  wrapper.appendChild(node);
  container.appendChild(wrapper);
}

function getQuestListKeyFromElement(el: HTMLElement | null): string | null {
  if (!el) return null;
  const list = el.closest('[data-quest-list]') as HTMLElement | null;
  return list ? list.dataset.questList || null : null;
}

function getObjectiveListKeyFromElement(el: HTMLElement | null): string | null {
  if (!el) return null;
  const list = el.closest('[data-obj-list]') as HTMLElement | null;
  return list ? list.dataset.objList || null : null;
}

function getQuestListByKey(quest: RPGQuest, key: string | null): SwitchAction[] | VariableAction[] | null {
  if (!quest || !key) return null;
  if (key === 'startSwitches') return quest.startSwitches;
  if (key === 'switches') return quest.switches;
  if (key === 'startVariables') return quest.startVariables;
  if (key === 'variables') return quest.variables;
  return null;
}
function renderSwitchList(container: HTMLElement | null, list: SwitchAction[] | null, listKey: string): void {
  if (!container) return;
  recyclePoolTree(container);

  container.dataset.questList = listKey;
  if (!list || list.length === 0) return;

  const state = StateManager.getState();
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < list.length; i += 1) {
    const row = list[i];
    const node = acquireDiv();
    node.className = 'mini-row';
    node.dataset.index = String(i);

    const select = acquireSelect();
    select.className = 'switch-select theme-select';
    select.dataset.switchField = 'switchId';
    fillDataSelect(select, state.questSystem.switches, row.switchId, '开关');

    const valueSelect = acquireSelect();
    valueSelect.className = 'switch-value theme-select';
    valueSelect.dataset.switchField = 'value';
    fillOptions(valueSelect, [{ value: 'true', label: '开启' }, { value: 'false', label: '关闭' }]);
    valueSelect.value = row.value ? 'true' : 'false';

    const removeBtn = document.createElement('button'); // TODO: Pool this button
    removeBtn.className = 'icon-btn mini-row-remove';
    removeBtn.title = '删除';
    removeBtn.textContent = '×';

    node.appendChild(select);
    node.appendChild(valueSelect);
    node.appendChild(removeBtn);
    fragment.appendChild(node);
  }
  container.appendChild(fragment);
}

function renderVariableList(container: HTMLElement | null, list: VariableAction[] | null, listKey: string): void {
  if (!container) return;
  recyclePoolTree(container);

  container.dataset.questList = listKey;
  if (!list || list.length === 0) return;

  const state = StateManager.getState();
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < list.length; i += 1) {
    const row = list[i];
    const node = acquireDiv();
    node.className = 'mini-row variable-row';
    node.dataset.index = String(i);

    const select = acquireSelect();
    select.className = 'variable-select theme-select';
    select.dataset.variableField = 'variableId';
    fillDataSelect(select, state.questSystem.variables, row.variableId, '变量');

    const opSelect = createOperatorSelect(row.op || '+', 'variableField', 'op');

    const valueInput = acquireInput();
    valueInput.className = 'variable-value theme-input';
    valueInput.type = 'number';
    valueInput.dataset.variableField = 'value';
    valueInput.value = String(row.value ?? 0);

    const removeBtn = document.createElement('button'); // TODO: Pool this button
    removeBtn.className = 'icon-btn mini-row-remove';
    removeBtn.title = '删除';
    removeBtn.textContent = '×';

    node.appendChild(select);
    node.appendChild(opSelect);
    node.appendChild(valueInput);
    node.appendChild(removeBtn);
    fragment.appendChild(node);
  }
  container.appendChild(fragment);
}

function renderObjectiveSwitchList(container: HTMLElement | null, obj: QuestObjective, objIdx: number): void {
  if (!container) return;
  recyclePoolTree(container);

  container.dataset.objList = 'switches';
  container.dataset.objIndex = String(objIdx);
  const list = obj.switches || [];
  if (list.length === 0) return;

  const state = StateManager.getState();
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < list.length; i += 1) {
    const row = list[i];
    const node = acquireDiv();
    node.className = 'mini-row';
    node.dataset.index = String(i);

    const select = acquireSelect();
    select.className = 'switch-select theme-select';
    select.dataset.objSwitchField = 'switchId';
    fillDataSelect(select, state.questSystem.switches, row.switchId, '开关');

    const valueSelect = createBoolSelect(row.value, 'objSwitchField', 'value');

    const removeBtn = document.createElement('button'); // TODO: Pool this button
    removeBtn.className = 'icon-btn mini-row-remove';
    removeBtn.title = '删除';
    removeBtn.textContent = '×';

    node.appendChild(select);
    node.appendChild(valueSelect);
    node.appendChild(removeBtn);
    fragment.appendChild(node);
  }
  container.appendChild(fragment);
}

function renderObjectiveVariableList(container: HTMLElement | null, obj: QuestObjective, objIdx: number): void {
  if (!container) return;
  recyclePoolTree(container);

  container.dataset.objList = 'variables';
  container.dataset.objIndex = String(objIdx);
  const list = obj.variables || [];
  if (list.length === 0) return;

  const state = StateManager.getState();
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < list.length; i += 1) {
    const row = list[i];
    const node = acquireDiv();
    node.className = 'mini-row variable-row';
    node.dataset.index = String(i);

    const select = acquireSelect();
    select.className = 'variable-select theme-select';
    select.dataset.objVariableField = 'variableId';
    fillDataSelect(select, state.questSystem.variables, row.variableId, '变量');

    const opSelect = createOperatorSelect(row.op || '+', 'objVariableField', 'op');

    const valueInput = acquireInput();
    valueInput.className = 'variable-value theme-input';
    valueInput.type = 'number';
    valueInput.dataset.objVariableField = 'value';
    valueInput.value = String(row.value ?? 0);

    const removeBtn = document.createElement('button'); // TODO: Pool this button
    removeBtn.className = 'icon-btn mini-row-remove';
    removeBtn.title = '删除';
    removeBtn.textContent = '×';

    node.appendChild(select);
    node.appendChild(opSelect);
    node.appendChild(valueInput);
    node.appendChild(removeBtn);
    fragment.appendChild(node);
  }
  container.appendChild(fragment);
}

function renderObjectiveActions(card: HTMLElement | null, obj: QuestObjective, objIdx: number): void {
  if (!card) return;
  renderObjectiveSwitchList(card.querySelector('.obj-switch-list') as HTMLElement | null, obj, objIdx);
  renderObjectiveVariableList(card.querySelector('.obj-variable-list') as HTMLElement | null, obj, objIdx);
}

function fillDataSelect(select: HTMLSelectElement | null, data: Array<{ id?: number; name?: string; label?: string } | string | null> | undefined, value: number | undefined, fallback: string): void {
  if (!select) return;
  select.innerHTML = '';
  if (!data || data.length <= 1) {
    const option = document.createElement('option');
    option.value = '0';
    option.textContent = `未加载${fallback}`;
    select.appendChild(option);
    return;
  }
  for (let i = 1; i < data.length; i += 1) {
    const entry = data[i];
    if (!entry) continue;

    let id = i;
    let name = fallback;

    if (typeof entry === 'string') {
      name = entry;
    } else {
      id = entry.id ?? i;
      name = entry.name || entry.label || fallback;
    }

    const option = document.createElement('option');
    option.value = String(id);
    option.textContent = `${id} : ${name}`;
    select.appendChild(option);
  }
  select.value = String(value ?? 1);
}

function recycleGrid(grid: HTMLElement | null): void {
  if (!grid) return;

  const children = Array.from(grid.children);
  for (const fieldWrapper of children) {
    if (fieldWrapper instanceof HTMLElement) {
      const inputOrSelect = fieldWrapper.querySelector('input, select');
      if (inputOrSelect) {
        if (inputOrSelect.tagName === 'INPUT') {
          releaseInput(inputOrSelect as HTMLInputElement);
        } else {
          releaseSelect(inputOrSelect as HTMLSelectElement);
        }
      }
      const label = fieldWrapper.querySelector('span');
      if (label) {
        // Assuming labels are spans for now, if they are labels:
        // releaseLabel(label as HTMLLabelElement);
      }
      releaseDiv(fieldWrapper as HTMLDivElement);
    }
  }
  grid.innerHTML = '';
}


function buildRequirementFields(grid: HTMLElement | null, req: QuestRequirement): void {
  if (!grid) return;
  recycleGrid(grid);
  const type = req.type ?? 0;
  const opSelect = createSelectFromOperators(req.operator || '>=', 'reqField', 'operator');

  if (type === 1) {
    appendQuestField(grid, '目标等级', createNumberInput((req.targetValue as number) ?? 1, 'targetValue', 'reqField'));
    appendQuestField(grid, '角色ID', createNumberInput(req.actorId ?? 1, 'actorId', 'reqField'));
    appendQuestField(grid, '比较符', opSelect);
  } else if (type === 2) {
    const questSelect = createQuestSelect(req.questId ?? 0, 'reqField', 'questId');
    appendQuestField(grid, '前置任务', questSelect);
  } else if (type === 3) {
    appendQuestField(grid, '物品', createDataSelect(StateManager.getState().questSystem.items, req.itemId ?? 1, 'itemId', 'reqField', '物品'));
    appendQuestField(grid, '数量/值', createNumberInput((req.targetValue as number) ?? 1, 'targetValue', 'reqField'));
    appendQuestField(grid, '比较符', opSelect);
  } else if (type === 4) {
    appendQuestField(grid, '武器', createDataSelect(StateManager.getState().questSystem.weapons, req.weaponId ?? 1, 'weaponId', 'reqField', '武器'));
    appendQuestField(grid, '数量/值', createNumberInput((req.targetValue as number) ?? 1, 'targetValue', 'reqField'));
    appendQuestField(grid, '比较符', opSelect);
  } else if (type === 5) {
    appendQuestField(grid, '防具', createDataSelect(StateManager.getState().questSystem.armors, req.armorId ?? 1, 'armorId', 'reqField', '防具'));
    appendQuestField(grid, '数量/值', createNumberInput((req.targetValue as number) ?? 1, 'targetValue', 'reqField'));
    appendQuestField(grid, '比较符', opSelect);
  } else if (type === 6) {
    appendQuestField(grid, '开关', createDataSelect(StateManager.getState().questSystem.switches, req.switchId ?? 1, 'switchId', 'reqField', '开关'));
    appendQuestField(grid, '目标值', createBoolSelect(!!req.targetValue, 'reqField', 'targetValue'));
  } else if (type === 7) {
    appendQuestField(grid, '变量', createDataSelect(StateManager.getState().questSystem.variables, req.variableId ?? 1, 'variableId', 'reqField', '变量'));
    appendQuestField(grid, '目标值', createNumberInput((req.targetValue as number) ?? 1, 'targetValue', 'reqField'));
    appendQuestField(grid, '比较符', opSelect);
  } else if (type === 8) {
    appendQuestField(grid, '金币', createNumberInput((req.targetValue as number) ?? 1, 'targetValue', 'reqField'));
    appendQuestField(grid, '比较符', opSelect);
  }

  appendQuestField(grid, '描述', createTextInput(req.description || '', 'description', 'reqField'));
}

function buildObjectiveFields(grid: HTMLElement | null, obj: QuestObjective): void {
  if (!grid) return;
  recycleGrid(grid);
  const type = obj.type ?? 1;
  const opSelect = createSelectFromOperators(obj.operator || '>=', 'objField', 'operator');

  if (type === 1) {
    appendQuestField(grid, '敌人', createDataSelect(StateManager.getState().questSystem.enemies, obj.enemyId ?? 1, 'enemyId', 'objField', '敌人'));
  } else if (type === 2) {
    appendQuestField(grid, '物品', createDataSelect(StateManager.getState().questSystem.items, obj.itemId ?? 1, 'itemId', 'objField', '物品'));
  } else if (type === 3) {
    appendQuestField(grid, '武器', createDataSelect(StateManager.getState().questSystem.weapons, obj.weaponId ?? 1, 'weaponId', 'objField', '武器'));
  } else if (type === 4) {
    appendQuestField(grid, '防具', createDataSelect(StateManager.getState().questSystem.armors, obj.armorId ?? 1, 'armorId', 'objField', '防具'));
  } else if (type === 5) {
    appendQuestField(grid, '开关', createDataSelect(StateManager.getState().questSystem.switches, obj.switchId ?? 1, 'switchId', 'objField', '开关'));
    appendQuestField(grid, '目标值', createBoolSelect(!!obj.targetValue, 'objField', 'targetValue'));
  } else if (type === 6) {
    appendQuestField(grid, '变量', createDataSelect(StateManager.getState().questSystem.variables, obj.variableId ?? 1, 'variableId', 'objField', '变量'));
  }

  if (type !== 5) {
    appendQuestField(grid, '目标值', createNumberInput((obj.targetValue as number) ?? 1, 'targetValue', 'objField'));
  }
  appendQuestField(grid, '比较符', opSelect);
  appendQuestField(grid, '描述', createTextInput(obj.description || '', 'description', 'objField'));
}

function buildRewardFields(grid: HTMLElement | null, rew: QuestReward): void {
  if (!grid) return;
  recycleGrid(grid);
  const type = rew.type ?? 1;
  const state = StateManager.getState();

  if (type === 1) {
    appendQuestField(grid, '物品', createDataSelect(state.questSystem.items, rew.itemId ?? 1, 'itemId', 'rewField', '物品'));
  } else if (type === 2) {
    appendQuestField(grid, '武器', createDataSelect(state.questSystem.weapons, rew.weaponId ?? 1, 'weaponId', 'rewField', '武器'));
  } else if (type === 3) {
    appendQuestField(grid, '防具', createDataSelect(state.questSystem.armors, rew.armorId ?? 1, 'armorId', 'rewField', '防具'));
  } else if (type === 6) {
    // 开关类型：使用 fillDataSelect 正确处理字符串数组
    const switchSelect = acquireSelect();
    switchSelect.className = 'theme-select';
    switchSelect.dataset.rewField = 'switchId';
    fillDataSelect(switchSelect, state.questSystem.switches, rew.switchId ?? 1, '开关');
    appendQuestField(grid, '开关', switchSelect);
    appendQuestField(grid, '值', createBoolSelect(!!rew.targetValue, 'rewField', 'targetValue'));
  } else if (type === 7) {
    // 变量类型：使用 fillDataSelect 正确处理字符串数组
    const variableSelect = acquireSelect();
    variableSelect.className = 'theme-select';
    variableSelect.dataset.rewField = 'variableId';
    fillDataSelect(variableSelect, state.questSystem.variables, rew.variableId ?? 1, '变量');
    appendQuestField(grid, '变量', variableSelect);
    appendQuestField(grid, '运算', createOperatorSelect(rew.op || '=', 'rewField', 'op'));
  }

  if (type !== 6) {
    appendQuestField(grid, '数量/值', createNumberInput((rew.targetValue as number) ?? 1, 'targetValue', 'rewField'));
  }
  appendQuestField(grid, '描述', createTextInput(rew.description || '', 'description', 'rewField'));
}

function createQuestSelect(value: number, datasetKey: string, field: string): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'theme-select';
  select.dataset[datasetKey] = field;
  const state = StateManager.getState();
  const quests = state.quests;
  for (let i = 0; i < quests.length; i += 1) {
    const quest = quests[i];
    const option = document.createElement('option');
    option.value = String(i + 1);
    option.textContent = `${i + 1} : ${quest?.title || '未命名'}`;
    select.appendChild(option);
  }
  select.value = String(value);
  return select;
}

function createSelectFromOperators(value: string, datasetKey: string, field: string): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'theme-select';
  for (let i = 0; i < QUEST_OPERATORS.length; i += 1) {
    const option = document.createElement('option');
    option.value = QUEST_OPERATORS[i];
    option.textContent = QUEST_OPERATORS[i];
    select.appendChild(option);
  }
  select.value = value;
  select.dataset[datasetKey] = field;
  return select;
}

function renderRequirementList(list: QuestRequirement[]): void {
  const container = DOM.questRequirementList;
  if (!container) return;

  recyclePoolTree(container);

  if (!requirementTemplate) return;

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < list.length; i += 1) {
    const req = list[i];

    const card = acquireQuestCard();
    card.innerHTML = requirementTemplate.innerHTML;

    card.dataset.index = String(i);
    card.classList.add('pool-quest-card', 'quest-card');

    // Apply sci-fi styling to the card
    themeManager.applySciFiEffects(card, {
      variant: 'secondary',
      glow: true,
      scanlines: false,
    });

    // Add pulsing glow effect
    visualEffects.createPulsingGlow(card, {
      color: 'rgba(112, 0, 255, 0.2)',
      intensity: 0.3,
      duration: 3000,
      infinite: true,
    });

    const typeSelect = card.querySelector('.req-type') as HTMLSelectElement | null;
    if (typeSelect) {
      fillOptions(typeSelect, QUEST_REQUIREMENT_TYPES);
      typeSelect.value = String(req.type ?? 0);
      typeSelect.dataset.index = String(i);
      typeSelect.dataset.reqField = 'type';
      
      // Apply futuristic input styling
      themeManager.createFuturisticInput(typeSelect as any);
    }
    buildRequirementFields(card.querySelector('.req-grid') as HTMLElement | null, req);
    fragment.appendChild(card);
  }
  container.appendChild(fragment);
}

function renderObjectiveList(list: QuestObjective[]): void {
  const container = DOM.questObjectiveList;
  if (!container) return;

  recyclePoolTree(container);
  if (!objectiveTemplate) return;

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < list.length; i += 1) {
    const obj = list[i];
    if (!Array.isArray(obj.switches)) obj.switches = [];
    if (!Array.isArray(obj.variables)) obj.variables = [];

    const card = acquireObjectiveCard();
    card.innerHTML = objectiveTemplate.innerHTML;
    card.dataset.index = String(i);
    card.classList.add('pool-objective-card', 'quest-card');

    // Apply sci-fi styling to the card
    themeManager.applySciFiEffects(card, {
      variant: 'accent',
      glow: true,
      scanlines: false,
    });

    // Add energy wave effect
    visualEffects.createEnergyWave(card, {
      color: 'rgba(0, 255, 136, 0.3)',
      duration: 1500,
      direction: 'horizontal',
    });

    const typeSelect = card.querySelector('.obj-type') as HTMLSelectElement | null;
    const calcCheckbox = card.querySelector('.obj-calc-type') as HTMLInputElement | null;
    if (typeSelect) {
      fillOptions(typeSelect, QUEST_OBJECTIVE_TYPES);
      typeSelect.value = String(obj.type ?? 1);
      typeSelect.dataset.index = String(i);
      typeSelect.dataset.objField = 'type';
      
      // Apply futuristic input styling
      themeManager.createFuturisticInput(typeSelect as any);
    }
    if (calcCheckbox) {
      calcCheckbox.checked = obj.calculateType !== false;
      calcCheckbox.dataset.index = String(i);
      calcCheckbox.dataset.objField = 'calculateType';
    }
    buildObjectiveFields(card.querySelector('.obj-grid') as HTMLElement | null, obj);
    renderObjectiveActions(card, obj, i);
    fragment.appendChild(card);
  }
  container.appendChild(fragment);
}

function renderRewardList(list: QuestReward[]): void {
  const container = DOM.questRewardList;
  if (!container) return;

  recyclePoolTree(container);
  if (!rewardTemplate) return;

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < list.length; i += 1) {
    const rew = list[i];
    const card = acquireRewardCard();
    card.innerHTML = rewardTemplate.innerHTML;
    card.dataset.index = String(i);
    card.classList.add('pool-reward-card', 'quest-card');

    // Apply sci-fi styling to the card
    themeManager.applySciFiEffects(card, {
      variant: 'success',
      glow: true,
      scanlines: false,
    });

    // Add holographic flicker effect
    visualEffects.createHolographicFlicker(card, {
      intensity: 0.03,
      frequency: 0.08,
      duration: 120,
    });

    const typeSelect = card.querySelector('.rew-type') as HTMLSelectElement | null;
    if (typeSelect) {
      fillOptions(typeSelect, QUEST_REWARD_TYPES);
      typeSelect.value = String(rew.type ?? 1);
      typeSelect.dataset.index = String(i);
      typeSelect.dataset.rewField = 'type';
      
      // Apply futuristic input styling
      themeManager.createFuturisticInput(typeSelect as any);
    }
    buildRewardFields(card.querySelector('.rew-grid') as HTMLElement | null, rew);
    fragment.appendChild(card);
  }
  container.appendChild(fragment);
}

function applyRequirementField(target: HTMLElement): boolean {
  const quest = currentQuest;
  if (!quest || !quest.requirements) return false;
  const cardIdx = Number((target.closest('.quest-card') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(cardIdx) || cardIdx < 0 || cardIdx >= quest.requirements.length) return false;
  const req = quest.requirements[cardIdx];
  const field = (target as HTMLInputElement).dataset.reqField || (target.classList.contains('req-type') ? 'type' : null);
  if (!field) return false;
  if (field === 'type') {
    const newType = Number((target as HTMLSelectElement).value || 0);
    if (req.type !== newType) {
      req.type = newType;
      buildRequirementFields(((target.closest('.quest-card') as HTMLElement).querySelector('.req-grid') as HTMLElement), req);
    }
    return true;
  }
  if (field === 'operator' || field === 'description') {
    (req as Record<string, string>)[field] = (target as HTMLInputElement).value;
    return true;
  }
  if (field === 'targetValue' && (target as HTMLSelectElement).tagName === 'SELECT') {
    req.targetValue = (target as HTMLSelectElement).value === 'true';
    return true;
  }
  const num = Number((target as HTMLInputElement).value || 0);
  (req as Record<string, number>)[field] = Number.isNaN(num) ? 0 : num;
  return true;
}

function applyObjectiveField(target: HTMLElement): boolean {
  const quest = currentQuest;
  if (!quest || !quest.objectives) return false;
  const cardIdx = Number((target.closest('.quest-card') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(cardIdx) || cardIdx < 0 || cardIdx >= quest.objectives.length) return false;
  const obj = quest.objectives[cardIdx];
  const field = (target as HTMLInputElement).dataset.objField || (target.classList.contains('obj-type') ? 'type' : null);
  if (!field) return false;
  if (field === 'type') {
    const newType = Number((target as HTMLSelectElement).value || 1);
    if (obj.type !== newType) {
      obj.type = newType;
      buildObjectiveFields(((target.closest('.quest-card') as HTMLElement).querySelector('.obj-grid') as HTMLElement), obj);
    }
    return true;
  }
  if (field === 'calculateType') {
    obj.calculateType = (target as HTMLInputElement).checked;
    return true;
  }
  if (field === 'operator' || field === 'description') {
    (obj as Record<string, string>)[field] = (target as HTMLInputElement).value;
    return true;
  }
  if (field === 'targetValue' && (target as HTMLSelectElement).tagName === 'SELECT') {
    obj.targetValue = (target as HTMLSelectElement).value === 'true';
    return true;
  }
  const num = Number((target as HTMLInputElement).value || 0);
  (obj as Record<string, number>)[field] = Number.isNaN(num) ? 0 : num;
  return true;
}

function applyRewardField(target: HTMLElement): boolean {
  const quest = currentQuest;
  if (!quest || !quest.rewards) return false;
  const cardIdx = Number((target.closest('.quest-card') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(cardIdx) || cardIdx < 0 || cardIdx >= quest.rewards.length) return false;
  const rew = quest.rewards[cardIdx];
  const field = (target as HTMLInputElement).dataset.rewField || (target.classList.contains('rew-type') ? 'type' : null);
  if (!field) return false;
  if (field === 'type') {
    const newType = Number((target as HTMLSelectElement).value || 1);
    if (rew.type !== newType) {
      rew.type = newType;
      buildRewardFields((target.closest('.quest-card') as HTMLElement).querySelector('.rew-grid') as HTMLElement | null, rew);
    }
    return true;
  }
  if (field === 'description') {
    rew.description = (target as HTMLInputElement).value;
    return true;
  }
  if (field === 'op') {
    rew.op = (target as HTMLSelectElement).value || '=';
    return true;
  }
  if (field === 'targetValue' && (target as HTMLSelectElement).tagName === 'SELECT') {
    rew.targetValue = (target as HTMLSelectElement).value === 'true';
    return true;
  }
  const num = Number((target as HTMLInputElement).value || 0);
  (rew as Record<string, number>)[field] = Number.isNaN(num) ? 0 : num;
  return true;
}

function applySwitchField(target: HTMLElement): boolean {
  const quest = currentQuest;
  if (!quest) return false;
  const key = getQuestListKeyFromElement(target);
  const list = getQuestListByKey(quest, key);
  if (!Array.isArray(list)) return false;
  const idx = Number((target.closest('[data-index]') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return false;
  const row = list[idx] as SwitchAction;
  const field = (target as HTMLInputElement).dataset.switchField;
  if (!field) return false;
  if (field === 'value') {
    row.value = (target as HTMLSelectElement).value === 'true';
    return true;
  }
  row.switchId = Number((target as HTMLSelectElement).value || 0);
  return true;
}

function applyVariableField(target: HTMLElement): boolean {
  const quest = currentQuest;
  if (!quest) return false;
  const key = getQuestListKeyFromElement(target);
  const list = getQuestListByKey(quest, key);
  if (!Array.isArray(list)) return false;
  const idx = Number((target.closest('[data-index]') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return false;
  const row = list[idx] as VariableAction;
  const field = (target as HTMLInputElement).dataset.variableField;
  if (!field) return false;
  if (field === 'op') {
    row.op = (target as HTMLSelectElement).value || '+';
    return true;
  }
  if (field === 'value') {
    row.value = Number((target as HTMLInputElement).value || 0);
    return true;
  }
  row.variableId = Number((target as HTMLSelectElement).value || 0);
  return true;
}

function applyObjectiveSwitchField(target: HTMLElement): boolean {
  const quest = currentQuest;
  if (!quest || !quest.objectives) return false;
  const cardIdx = Number((target.closest('.quest-card') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(cardIdx) || cardIdx < 0 || cardIdx >= quest.objectives.length) return false;
  const obj = quest.objectives[cardIdx];
  if (!Array.isArray(obj.switches)) obj.switches = [];
  const idx = Number((target.closest('[data-index]') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= obj.switches.length) return false;
  const row = obj.switches[idx];
  const field = (target as HTMLInputElement).dataset.objSwitchField;
  if (!field) return false;
  if (field === 'value') {
    row.value = (target as HTMLSelectElement).value === 'true';
    return true;
  }
  row.switchId = Number((target as HTMLSelectElement).value || 0);
  return true;
}

function applyObjectiveVariableField(target: HTMLElement): boolean {
  const quest = currentQuest;
  if (!quest || !quest.objectives) return false;
  const cardIdx = Number((target.closest('.quest-card') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(cardIdx) || cardIdx < 0 || cardIdx >= quest.objectives.length) return false;
  const obj = quest.objectives[cardIdx];
  if (!Array.isArray(obj.variables)) obj.variables = [];
  const idx = Number((target.closest('[data-index]') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= obj.variables.length) return false;
  const row = obj.variables[idx];
  const field = (target as HTMLInputElement).dataset.objVariableField;
  if (!field) return false;
  if (field === 'op') {
    row.op = (target as HTMLSelectElement).value || '+';
    return true;
  }
  if (field === 'value') {
    row.value = Number((target as HTMLInputElement).value || 0);
    return true;
  }
  row.variableId = Number((target as HTMLInputElement).value || 0);
  return true;
}
function addSwitch(listKey: 'startSwitches' | 'switches'): void {
  if (!currentQuest) return;
  const list = currentQuest[listKey];
  const state = StateManager.getState();
  const defaultId = state.questSystem.switches.length > 1 ? 1 : 0;
  list.push({ switchId: defaultId, value: true });
  renderSwitchList(listKey === 'startSwitches' ? DOM.questStartSwitchList : DOM.questFinishSwitchList, list, listKey);
}

function addVariable(listKey: 'startVariables' | 'variables'): void {
  if (!currentQuest) return;
  const list = currentQuest[listKey];
  const state = StateManager.getState();
  const defaultId = state.questSystem.variables.length > 1 ? 1 : 0;
  list.push({ variableId: defaultId, value: 0, op: '+' });
  renderVariableList(listKey === 'startVariables' ? DOM.questStartVariableList : DOM.questFinishVariableList, list, listKey);
}

function addObjectiveAction(objIdx: number, listKey: 'switches' | 'variables'): void {
  if (!currentQuest || !currentQuest.objectives) return;
  if (!Number.isInteger(objIdx) || objIdx < 0 || objIdx >= currentQuest.objectives.length) return;
  const obj = currentQuest.objectives[objIdx];
  if (!Array.isArray(obj.switches)) obj.switches = [];
  if (!Array.isArray(obj.variables)) obj.variables = [];
  const state = StateManager.getState();
  if (listKey === 'switches') {
    const defaultId = state.questSystem.switches.length > 1 ? 1 : 0;
    obj.switches.push({ switchId: defaultId, value: true });
  } else {
    const defaultId = state.questSystem.variables.length > 1 ? 1 : 0;
    obj.variables.push({ variableId: defaultId, value: 0, op: '+' });
  }
  const card = DOM.questObjectiveList?.querySelector(`.quest-card[data-index="${objIdx}"]`) as HTMLElement | null;
  if (card) {
    renderObjectiveActions(card, obj, objIdx);
  }
}

function removeMiniRow(target: HTMLElement): void {
  const quest = currentQuest;
  if (!quest) return;
  const key = getQuestListKeyFromElement(target);
  const list = getQuestListByKey(quest, key);
  if (!Array.isArray(list)) return;
  const idx = Number((target.closest('[data-index]') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return;
  list.splice(idx, 1);
  if (key === 'startSwitches') {
    renderSwitchList(DOM.questStartSwitchList, quest.startSwitches, 'startSwitches');
  } else if (key === 'switches') {
    renderSwitchList(DOM.questFinishSwitchList, quest.switches, 'switches');
  } else if (key === 'startVariables') {
    renderVariableList(DOM.questStartVariableList, quest.startVariables, 'startVariables');
  } else if (key === 'variables') {
    renderVariableList(DOM.questFinishVariableList, quest.variables, 'variables');
  }
}

function removeObjectiveActionRow(target: HTMLElement): boolean {
  const quest = currentQuest;
  if (!quest || !quest.objectives) return false;
  const listKey = getObjectiveListKeyFromElement(target);
  if (!listKey) return false;
  const objIdx = Number((target.closest('.quest-card') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(objIdx) || objIdx < 0 || objIdx >= quest.objectives.length) return false;
  const obj = quest.objectives[objIdx];
  const list = listKey === 'switches' ? obj.switches : obj.variables;
  if (!Array.isArray(list)) return false;
  const idx = Number((target.closest('[data-index]') as HTMLElement)?.dataset.index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return false;
  list.splice(idx, 1);
  const card = DOM.questObjectiveList?.querySelector(`.quest-card[data-index="${objIdx}"]`) as HTMLElement | null;
  if (card) {
    renderObjectiveActions(card, obj, objIdx);
  }
  return true;
}

function collectFormToQuest(): void {
  if (!currentQuest) return;
  currentQuest.title = DOM.questTitleInput?.value.trim() || '未命名任务';
  currentQuest.giver = DOM.questGiverInput?.value.trim() || 'NPC';
  currentQuest.category = !!DOM.questCategoryInput?.checked;
  currentQuest.repeatable = !!DOM.questRepeatableInput?.checked;
  currentQuest.difficulty = Number(DOM.questDifficultySelect?.value || 1);
  const descText = DOM.questDescriptionInput?.value || '';
  const parts = descText ? descText.split(NL_REGEXP) : [];
  const lines: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const text = parts[i].trim();
    if (text) lines.push(text);
  }
  currentQuest.description = lines.length > 0 ? lines : ['描述'];
}

function updateQuestDataStatus(): void {
  const state = StateManager.getState();
  const fileName = state.questFilePath?.split(PATH_SPLIT_REGEXP).pop() || '未选择';
  const count = state.quests.length;
  if (DOM.questDataStatus) {
    DOM.questDataStatus.textContent = `${fileName} · ${count} 条`;
  }
}

function initDifficultySelect(): void {
  const select = DOM.questDifficultySelect;
  if (!select) return;
  fillOptions(select, QUEST_DIFFICULTIES);
}

function handlePanelClick(e: Event): void {
  const target = e.target as HTMLElement;
  if (target.closest('#questAddObjectiveBtn')) {
    if (!currentQuest) return;
    currentQuest.objectives.push({
      type: 1,
      enemyId: 1,
      targetValue: 1,
      calculateType: true,
      operator: '>=',
      description: '',
      switches: [],
      variables: [],
    });
    renderObjectiveList(currentQuest.objectives);
    return;
  }

  if (target.closest('#questAddRewardBtn')) {
    if (!currentQuest) return;
    currentQuest.rewards.push({ type: 4, targetValue: 100, description: '' });
    renderRewardList(currentQuest.rewards);
    return;
  }

  if (target.closest('#questAddRequirementBtn')) {
    if (!currentQuest) return;
    currentQuest.requirements.push({ type: 0, description: '' });
    renderRequirementList(currentQuest.requirements);
    return;
  }

  if (target.closest('#questAddStartSwitchBtn')) {
    addSwitch('startSwitches');
    return;
  }

  if (target.closest('#questAddFinishSwitchBtn')) {
    addSwitch('switches');
    return;
  }

  if (target.closest('#questAddStartVariableBtn')) {
    addVariable('startVariables');
    return;
  }

  if (target.closest('#questAddFinishVariableBtn')) {
    addVariable('variables');
    return;
  }

  if (target.closest('.obj-switch-add')) {
    const cardIdx = Number((target.closest('.quest-card') as HTMLElement)?.dataset.index);
    if (Number.isInteger(cardIdx)) {
      addObjectiveAction(cardIdx, 'switches');
    }
    return;
  }

  if (target.closest('.obj-variable-add')) {
    const cardIdx = Number((target.closest('.quest-card') as HTMLElement)?.dataset.index);
    if (Number.isInteger(cardIdx)) {
      addObjectiveAction(cardIdx, 'variables');
    }
    return;
  }

  if (target.closest('.mini-row-remove')) {
    if (!removeObjectiveActionRow(target)) {
      removeMiniRow(target);
    }
    return;
  }

  if (target.closest('.remove-card')) {
    const card = target.closest('.quest-card') as HTMLElement | null;
    const idx = Number(card?.dataset.index);
    if (!Number.isInteger(idx)) return;
    const container = card?.parentElement;
    if (!currentQuest || !container) return;
    if (container === DOM.questRequirementList) {
      currentQuest.requirements.splice(idx, 1);
      renderRequirementList(currentQuest.requirements);
    } else if (container === DOM.questObjectiveList) {
      currentQuest.objectives.splice(idx, 1);
      renderObjectiveList(currentQuest.objectives);
    } else if (container === DOM.questRewardList) {
      currentQuest.rewards.splice(idx, 1);
      renderRewardList(currentQuest.rewards);
    }
  }
}

function handlePanelChange(e: Event): void {
  const target = e.target as HTMLElement;
  if (applyRequirementField(target)) return;
  if (applyObjectiveField(target)) return;
  if (applyRewardField(target)) return;
  if (applySwitchField(target)) return;
  if (applyVariableField(target)) return;
  if (applyObjectiveSwitchField(target)) return;
  if (applyObjectiveVariableField(target)) return;
  collectFormToQuest();
}

function handlePanelInput(e: Event): void {
  const target = e.target as HTMLElement;
  if (applyRequirementField(target)) return;
  if (applyObjectiveField(target)) return;
  if (applyRewardField(target)) return;
  if (applySwitchField(target)) return;
  if (applyVariableField(target)) return;
  if (applyObjectiveSwitchField(target)) return;
  if (applyObjectiveVariableField(target)) return;
  collectFormToQuest();
}

function setupEventDelegates(): void {
  if (eventsBound) return;
  if (!DOM.questModePanel) return;
  DOM.questModePanel.addEventListener('click', handlePanelClick);
  DOM.questModePanel.addEventListener('change', handlePanelChange);
  DOM.questModePanel.addEventListener('input', handlePanelInput);
  eventsBound = true;
}

function updateQuestForm(quest: RPGQuest): void {
  currentQuest = quest;
  if (DOM.questTitleInput) DOM.questTitleInput.value = quest.title || '';
  if (DOM.questGiverInput) DOM.questGiverInput.value = quest.giver || '';
  if (DOM.questCategoryInput) DOM.questCategoryInput.checked = !!quest.category;
  if (DOM.questRepeatableInput) DOM.questRepeatableInput.checked = !!quest.repeatable;
  if (DOM.questDifficultySelect) DOM.questDifficultySelect.value = String(quest.difficulty || 1);
  if (DOM.questDescriptionInput) DOM.questDescriptionInput.value = Array.isArray(quest.description) ? quest.description.join('\n') : '';

  renderSwitchList(DOM.questStartSwitchList, quest.startSwitches, 'startSwitches');
  renderSwitchList(DOM.questFinishSwitchList, quest.switches, 'switches');
  renderVariableList(DOM.questStartVariableList, quest.startVariables, 'startVariables');
  renderVariableList(DOM.questFinishVariableList, quest.variables, 'variables');
  renderRequirementList(quest.requirements || []);
  renderObjectiveList(quest.objectives || []);
  renderRewardList(quest.rewards || []);
}

/**
 * 处理任务标题变更，同步到数据列表
 */
function handleQuestTitleChange(): void {
  const state = StateManager.getState();
  const currentData = state.currentData as Array<Record<string, unknown> | null>;
  
  if (!currentData || currentQuestIndex < 0) return;
  
  const newTitle = DOM.questTitleInput?.value.trim() || '';
  // currentData[0] 是 null，实际数据从索引 1 开始
  const dataIndex = currentQuestIndex + 1;
  const currentItem = currentData[dataIndex];
  
  if (currentItem && currentItem.title !== newTitle) {
    currentItem.title = newTitle;
    
    // 同时更新 quests 数组中的数据
    const quests = state.quests;
    if (quests[currentQuestIndex]) {
      quests[currentQuestIndex].title = newTitle;
    }
    
    // 触发列表刷新
    StateManager.setState({ currentData: [...currentData] as DataItem[] });
  }
}

export function newQuest(): void {
  collectFormToQuest();
  const state = StateManager.getState();
  const newQuestEntry = createDefaultQuest();
  
  // 创建新的 quests 数组（避免直接修改原数组）
  const newQuests = [...state.quests, newQuestEntry];
  currentQuestIndex = newQuests.length - 1;
  
  // 同步更新 currentData（用于 ItemList 渲染）
  // currentData[0] 是 null，后面是实际数据
  const currentData = state.currentData ? [...state.currentData] : [null];
  currentData.push(newQuestEntry as DataItem);
  
  StateManager.setState({ quests: newQuests, currentData });
  updateQuestForm(newQuestEntry);
  renderQuestList();
  EventSystem.emit('quest:created', { quest: newQuestEntry, index: currentQuestIndex });
  logger.info('New quest created', { index: currentQuestIndex }, 'QuestPanel');
}

export async function deleteQuest(): Promise<void> {
  if (currentQuestIndex < 0) return;
  const state = StateManager.getState();
  const quests = state.quests;
  const currentData = state.currentData as Array<Record<string, unknown> | null>;
  
  // 将当前索引位置设为 null（保持索引不变）
  (quests as Array<RPGQuest | null>)[currentQuestIndex] = null;
  
  // 同步更新 currentData（currentData[0] 是 null，实际数据从索引 1 开始）
  if (currentData && currentData[currentQuestIndex + 1] !== undefined) {
    currentData[currentQuestIndex + 1] = null;
  }
  
  StateManager.setState({ quests: [...quests], currentData: currentData ? [...currentData] as DataItem[] : undefined });
  
  // 选择下一个有效项
  let nextIndex = -1;
  for (let i = currentQuestIndex + 1; i < quests.length; i++) {
    if (quests[i] !== null) {
      nextIndex = i;
      break;
    }
  }
  if (nextIndex < 0) {
    for (let i = currentQuestIndex - 1; i >= 0; i--) {
      if (quests[i] !== null) {
        nextIndex = i;
        break;
      }
    }
  }
  
  if (nextIndex >= 0) {
    currentQuestIndex = nextIndex;
    updateQuestForm(quests[nextIndex] as RPGQuest);
  } else {
    currentQuestIndex = -1;
    currentQuest = null;
  }
  
  renderQuestList();
  await saveQuestFile();
  
  EventSystem.emit('quest:deleted', { index: currentQuestIndex });
  logger.info('Quest deleted', { index: currentQuestIndex }, 'QuestPanel');
}

export async function saveQuestFile(): Promise<void> {
  const state = StateManager.getState();
  if (!state.questFilePath) {
    logger.warn('No quest file path, skip save', undefined, 'QuestPanel');
    return;
  }
  collectFormToQuest();
  const payload: Array<RPGQuest | null> = [null, ...state.quests];

  const result = await fileSystemService.writeJSON(state.questFilePath, payload);
  if (result.success) {
    updateQuestDataStatus();
    EventSystem.emit('quest:saved', { filePath: state.questFilePath, count: state.quests.length });
  } else {
    logger.error('Failed to save quest file', { error: result.error }, 'QuestPanel');
  }
}

export async function loadQuestFile(filePath: string): Promise<void> {
  if (!filePath) return;
  const result = await fileSystemService.readJSON<any[]>(filePath);

  if (result.success && result.data) {
    const data = result.data;
    const quests = Array.isArray(data) ? (data.slice(1) as RPGQuest[]) : [];
    const normalized = quests.length > 0 ? quests : [createDefaultQuest()];
    const fileName = filePath.split(PATH_SPLIT_REGEXP).pop() || '';

    StateManager.loadData(data, filePath, 'quest');
    StateManager.setState({ quests: normalized, questFilePath: filePath, currentFile: fileName });

    // 选择第一个有效项目并渲染
    currentQuestIndex = 0;
    if (normalized.length > 0) {
      // 同步选择 StateManager 中的项目（索引+1因为data[0]是null）
      StateManager.selectItem(1);
      updateQuestForm(normalized[0]);
      // 触发 item:selected 事件以确保面板正确渲染
      EventSystem.emit('item:selected', 1);
    }
    renderQuestList();
    updateQuestDataStatus();
    EventSystem.emit('quest:loaded', { filePath, count: normalized.length });
  } else {
    logger.error('Failed to load quest file', { error: result.error }, 'QuestPanel');
  }
}

import { fileSystemService } from '../services/FileSystemService';

async function loadQuestData(type: keyof typeof QUEST_DATA_CONFIG, fileValue: string): Promise<void> {
  const config = QUEST_DATA_CONFIG[type];
  if (!config) return;
  const state = StateManager.getState();
  const dataPath = state.config.dataPath;
  const filePath = fileValue || config.defaultFile;
  const cleaned = filePath.replace(TRAILING_SEP_REGEXP, '');
  const fullPath = cleaned.startsWith('/') || /^[a-zA-Z]:/.test(cleaned)
    ? cleaned
    : dataPath
      ? `${dataPath}/${cleaned}`.replace(TRAILING_SEP_REGEXP, '')
      : cleaned;
  if (!fullPath) return;
  try {
    const result = await fileSystemService.readJSON<any[]>(fullPath);
    if (!result.success || !result.data) {
      logger.error('Failed to load quest data', { type, filePath: fullPath, error: result.error }, 'QuestPanel');
      return;
    }

    const parsed = result.data;
    applyLoadedQuestData(type, parsed);
    const statusEl = DOM.getById(config.statusRef);
    if (statusEl) {
      const fileName = fullPath.split(PATH_SPLIT_REGEXP).pop() || fullPath;
      const count = Math.max((parsed?.length ?? 0) - 1, 0);
      statusEl.textContent = `${fileName} · ${count} 条`;
    }
    const questDataPaths = { ...state.questDataPaths, [type]: fullPath };
    StateManager.setState({ questDataPaths });
    updateQuestDataStatus();
  } catch (error) {
    logger.error('Failed to load quest data', { type, filePath: fullPath, error }, 'QuestPanel');
  }
}

function applyLoadedQuestData(type: string, data: unknown): void {
  if (!data) return;
  const state = StateManager.getState();
  const questSystem = { ...state.questSystem };
  if (type === 'system') {
    const sys = data as { switches?: Array<string | { id: number; name: string }>; variables?: Array<string | { id: number; name: string }> };
    if (sys.switches) questSystem.switches = sys.switches as any[];
    if (sys.variables) questSystem.variables = sys.variables as any[];
  } else if (type === 'item') {
    questSystem.items = data as [];
  } else if (type === 'weapon') {
    questSystem.weapons = data as [];
  } else if (type === 'armor') {
    questSystem.armors = data as [];
  } else if (type === 'enemy') {
    questSystem.enemies = data as [];
  } else if (type === 'actor') {
    questSystem.actors = data as [];
  }
  StateManager.setState({ questSystem });
  if (currentQuest) updateQuestForm(currentQuest);
}

async function handlePickDataFile(type: keyof typeof QUEST_DATA_CONFIG): Promise<void> {
  const config = QUEST_DATA_CONFIG[type];
  if (!config) return;
  try {
    const filePath = await fileSystemService.selectFile([{ name: 'JSON 文件', extensions: ['json'] }]);
    if (!filePath) return;

    const select = DOM.getById<HTMLSelectElement>(config.selectRef);
    if (select) {
      // Check if this option already exists
      let option = select.querySelector<HTMLOptionElement>(`[value="${filePath}"]`);
      if (!option) {
        option = acquireSelectOption();
        option.value = filePath;
        option.textContent = filePath.split(PATH_SPLIT_REGEXP).pop() || filePath;
        select.appendChild(option);
      }
      select.value = filePath;
    }
    await loadQuestData(type, filePath);
  } catch (error) {
    logger.error('Failed to pick data file', error, 'QuestPanel');
  }
}

function initQuestDataSelect(): void {
  const state = StateManager.getState();
  for (const [type, config] of Object.entries(QUEST_DATA_CONFIG)) {
    const select = DOM.getById<HTMLSelectElement>(config.selectRef);
    if (!select) continue;
    select.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = config.defaultFile;
    defaultOpt.textContent = config.defaultFile;
    select.appendChild(defaultOpt);
    const savedPath = state.questDataPaths[type];
    if (savedPath) {
      const customOpt = document.createElement('option');
      customOpt.value = savedPath;
      customOpt.textContent = savedPath.split(PATH_SPLIT_REGEXP).pop() || savedPath;
      select.appendChild(customOpt);
      select.value = savedPath;
    } else {
      select.value = config.defaultFile;
    }
  }
  updateQuestDataStatus();
}

function bindDataLoaders(): void {
  if (dataLoadersBound) return;
  for (const [type, config] of Object.entries(QUEST_DATA_CONFIG)) {
    const loadBtn = DOM.getById<HTMLElement>(config.loadBtnRef);
    const pickBtn = DOM.getById<HTMLElement>(config.pickBtnRef);
    if (loadBtn) {
      loadBtn.dataset.questResource = type;
      loadBtn.dataset.questAction = 'load';
    }
    if (pickBtn) {
      pickBtn.dataset.questResource = type;
      pickBtn.dataset.questAction = 'pick';
    }
    const statusEl = DOM.getById<HTMLElement>(config.statusRef);
    if (statusEl) statusEl.textContent = '未加载';
  }
  document.addEventListener('click', handleDataLoaderClick);
  document.addEventListener('change', handleDataLoaderChange);
  dataLoadersBound = true;
}

function handleDataLoaderClick(e: Event): void {
  const target = e.target as HTMLElement;
  const resourceBtn = target.closest('[data-quest-resource][data-quest-action]') as HTMLElement | null;
  if (!resourceBtn) return;
  const type = resourceBtn.dataset.questResource as keyof typeof QUEST_DATA_CONFIG;
  const action = resourceBtn.dataset.questAction;
  if (action === 'load') {
    const config = QUEST_DATA_CONFIG[type];
    const select = DOM.getById<HTMLSelectElement>(config.selectRef);
    loadQuestData(type, select?.value || config.defaultFile);
  } else if (action === 'pick') {
    handlePickDataFile(type);
  }
}

function handleDataLoaderChange(e: Event): void {
  const target = e.target as HTMLSelectElement;
  if (target.dataset.questResource && target.dataset.questAction === 'load') {
    const type = target.dataset.questResource as keyof typeof QUEST_DATA_CONFIG;
    loadQuestData(type, target.value);
  }
}

function renderQuestList(): void {
  const state = StateManager.getState();
  const items: Array<RPGQuest | null> = [null];
  for (let i = 0; i < state.quests.length; i += 1) {
    items.push(state.quests[i]);
  }
  EventSystem.emit('item-list:render', {
    items,
    fileType: 'quest',
    activeIndex: currentQuestIndex + 1,
  });
}

export function initQuestPanel(): void {
  initDifficultySelect();
  setupEventDelegates();
  bindDataLoaders();
  initQuestDataSelect();

  // Apply sci-fi theme to main quest panel
  const questModePanel = DOM.questModePanel;
  if (questModePanel) {
    themeManager.createFuturisticPanel(questModePanel, {
      variant: 'primary',
      scanlines: true,
      cornerAccents: true,
    });
    
    // Add hologram effect to the panel header
    const panelHeader = questModePanel.querySelector('.panel-header');
    if (panelHeader) {
      themeManager.applySciFiEffects(panelHeader as HTMLElement, {
        variant: 'primary',
        glow: true,
        hologram: true,
      });
    }
  }

  // Apply theme to quest lists
  const questRequirementList = DOM.questRequirementList;
  const questObjectiveList = DOM.questObjectiveList;
  const questRewardList = DOM.questRewardList;

  if (questRequirementList) {
    themeManager.createFuturisticPanel(questRequirementList, {
      variant: 'secondary',
      scanlines: false,
    });
  }

  if (questObjectiveList) {
    themeManager.createFuturisticPanel(questObjectiveList, {
      variant: 'accent',
      scanlines: false,
    });
  }

  if (questRewardList) {
    themeManager.createFuturisticPanel(questRewardList, {
      variant: 'primary',
      scanlines: false,
    });
  }

  // Apply theme to action buttons
  const addButtons = [
    DOM.questAddRequirementBtn,
    DOM.questAddObjectiveBtn,
    DOM.questAddRewardBtn,
  ];

  addButtons.forEach((btn, index) => {
    if (btn) {
      const variants = ['secondary', 'accent', 'primary'] as const;
      themeManager.createFuturisticButton(btn, variants[index]);
    }
  });

  // Apply visual effects to quest template controls
  const templateControls = questModePanel?.querySelector('.quest-template-controls');
  if (templateControls) {
    visualEffects.createEnergyWave(templateControls as HTMLElement, {
      color: 'rgba(0, 240, 255, 0.2)',
      duration: 2000,
      direction: 'horizontal',
    });
  }

  StateManager.subscribe((state, changedKeys) => {
    if (changedKeys.includes('currentItem') || changedKeys.includes('currentFileType')) {
      if (state.currentFileType === 'quest' && state.currentItem) {
        const questIndex = state.currentData?.indexOf(state.currentItem) ?? -1;
        if (questIndex >= 1) {
          currentQuestIndex = questIndex - 1;
          updateQuestForm(state.currentItem as RPGQuest);
        }
      }
    }
    if (changedKeys.includes('quests')) {
      renderQuestList();
      updateQuestDataStatus();
    }
  });

  // 绑定新建任务按钮（只绑定一次）
  if (!buttonsBound) {
    if (DOM.questCreateBtn) {
      DOM.questCreateBtn.addEventListener('click', newQuest);
    }

    // 绑定保存任务按钮
    if (DOM.questSaveBtn) {
      DOM.questSaveBtn.addEventListener('click', () => saveQuestFile());
    }

    // 绑定删除任务按钮
    if (DOM.questDeleteBtn) {
      DOM.questDeleteBtn.addEventListener('click', () => deleteQuest());
    }

    // 绑定任务标题输入框变更事件
    if (DOM.questTitleInput) {
      DOM.questTitleInput.addEventListener('input', handleQuestTitleChange);
    }
    buttonsBound = true;
  }
  logger.info('QuestPanel initialized with sci-fi theme', undefined, 'QuestPanel');
}

export function disposeQuestPanel(): void {
  currentQuest = null;
  currentQuestIndex = -1;
  if (DOM.questModePanel && eventsBound) {
    DOM.questModePanel.removeEventListener('click', handlePanelClick);
    DOM.questModePanel.removeEventListener('change', handlePanelChange);
    DOM.questModePanel.removeEventListener('input', handlePanelInput);
    eventsBound = false;
  }
  if (dataLoadersBound) {
    document.removeEventListener('click', handleDataLoaderClick);
    document.removeEventListener('change', handleDataLoaderChange);
    dataLoadersBound = false;
  }
}

export function renderQuestPanel(): void {
  const state = StateManager.getState();
  if (state.currentFileType === 'quest' && state.currentItem) {
    const questIndex = state.currentData?.indexOf(state.currentItem) ?? -1;
    if (questIndex >= 1) {
      currentQuestIndex = questIndex - 1;
      updateQuestForm(state.currentItem as RPGQuest);
      return;
    }
  }
  if (state.quests.length > 0 && currentQuestIndex >= 0) {
    updateQuestForm(state.quests[currentQuestIndex]);
  }
}

export function handleQuestListSelect(index: number): void {
  const questIndex = index - 1;
  const state = StateManager.getState();
  if (questIndex < 0 || questIndex >= state.quests.length) return;
  currentQuestIndex = questIndex;
  updateQuestForm(state.quests[questIndex]);
}

export default {
  init: initQuestPanel,
  render: renderQuestPanel,
  newQuest,
  deleteQuest,
  saveQuestFile,
  loadQuestFile,
  dispose: disposeQuestPanel,
  handleQuestListSelect,
};