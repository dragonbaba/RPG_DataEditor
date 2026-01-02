/**
 * PropertyPanel - 属性面板
 * 实现基础属性和自定义属性显示、属性值编辑
 * 完全还原 oldCode/main.js 的属性面板逻辑
 */

import { DOM } from '../core/DOMManager';
import { acquireCard } from '../pools/DOMPools';
import { StateManager } from '../core/StateManager';
import { EventSystem } from '../core/EventSystem';
import { logger } from '../services/logger';
import { themeManager } from '../theme/ThemeManager';
import { visualEffects } from '../theme/effects/VisualEffects';

// ============ 类型定义 ============

/** 基础属性配置 */
interface BaseAttribute {
  key: string;
  label: string;
  index: number;
}

/** 自定义属性 */
interface CustomAttribute {
  name: string;
  value: number;
  symbol: string;
  floatValue: number;
}

/** 自定义属性卡片 */
interface CustomAttributeCard {
  element: HTMLDivElement;
  nameInput: HTMLInputElement;
  valueInput: HTMLInputElement;
  symbolInput: HTMLInputElement;
  floatInput: HTMLInputElement;
}

// ============ 常量 ============

/** 基础属性配置 - 完全对应oldCode/main.js */
const BASE_ATTRIBUTES: BaseAttribute[] = [
  { key: 'mhp', label: '最大生命值', index: 0 },
  { key: 'mmp', label: '最大魔法值', index: 1 },
  { key: 'atk', label: '攻击力', index: 2 },
  { key: 'def', label: '防御力', index: 3 },
  { key: 'mat', label: '魔法攻击力', index: 4 },
  { key: 'mdf', label: '魔法防御力', index: 5 },
  { key: 'agi', label: '速度', index: 6 },
  { key: 'luk', label: '幸运', index: 7 },
];

// ============ 全局状态 ============

const attributeInputs: Record<string, HTMLInputElement | null> = {};
const attributeFloatInputs: Record<string, HTMLInputElement | null> = {};

let currentCustomCardCount = 0;
const currentCustomCards: CustomAttributeCard[] = [];
let eventsBound = false;

// ============ 工具函数 ============

/**
 * 创建自定义字段 - 完全对应oldCode/main.js的createCustomField函数
 */
function createCustomField(labelText: string, inputClass: string, type: string, value: string | number): { wrapper: HTMLDivElement; input: HTMLInputElement } {
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-field-wrapper';
  
  const label = document.createElement('span');
  label.className = 'attribute-label';
  label.textContent = labelText;
  
  const input = document.createElement('input');
  input.type = type;
  input.className = inputClass;
  input.placeholder = labelText;
  
  if (type === 'number') {
    input.step = '1';
    input.inputMode = 'numeric';
  }
  
  input.value = value != null ? String(value) : '';
  
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  
  return { wrapper, input };
}

/**
 * 更新自定义属性空状态提示 - 对应oldCode/main.js的updateCustomPlaceholder函数
 */
function updateCustomPlaceholder(): void {
  const customList = DOM.customAttributeList;
  if (!customList) return;
  
  // 移除现有的空状态提示
  const existingEmpty = customList.querySelector('.custom-empty');
  if (existingEmpty) {
    existingEmpty.remove();
  }
  
  if (currentCustomCardCount === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'custom-empty';
    emptyDiv.textContent = '暂无自定义属性，点击右上角按钮添加';
    customList.appendChild(emptyDiv);
  }
}

/**
 * 返回自定义属性卡片到对象池 - 对应oldCode/main.js的returnCustomCard函数
 */
function returnCustomCard(card: CustomAttributeCard): void {
  card.nameInput.value = '';
  card.valueInput.value = '';
  card.symbolInput.value = '';
  card.floatInput.value = '';
  card.element.dataset.index = '';
  
  const customList = DOM.customAttributeList;
  if (customList && card.element.parentNode === customList) {
    customList.removeChild(card.element);
  }
}

/**
 * 处理自定义属性删除 - 对应oldCode/main.js的handleCustomPropertyDelete函数
 */
function handleCustomPropertyDelete(event: Event): void {
  const target = event.target as HTMLElement;
  const removeBtn = target.closest('.remove-btn');
  
  if (!removeBtn) return;

  const cardElement = removeBtn.closest('.custom-attribute-card') as HTMLDivElement;
  if (cardElement) {
    const index = parseInt(cardElement.dataset.index || '-1', 10);
    if (index >= 0 && index < currentCustomCardCount) {
      const card = currentCustomCards[index];
      if (card) {
        removeCustomAttributeCard(card);
      }
    }
  }
}

/**
 * 移除自定义属性卡片 - 对应oldCode/main.js的逻辑
 */
function removeCustomAttributeCard(card: CustomAttributeCard): void {
  returnCustomCard(card);
  
  // Remove from tracking array and adjust count
  const index = currentCustomCards.indexOf(card);
  if (index > -1) {
    currentCustomCards.splice(index, 1);
    currentCustomCardCount--;
  }

  // Update indices of remaining cards
  for (let i = 0; i < currentCustomCardCount; i++) {
    currentCustomCards[i].element.dataset.index = String(i);
  }
  
  updateCustomPlaceholder();
  EventSystem.emit('property:custom-removed');
}

/**
 * 从项目中获取自定义属性 - 对应oldCode/main.js的逻辑
 */
function getCustomParams(item: Record<string, unknown>): CustomAttribute[] {
  const result: CustomAttribute[] = [];
  
  // 优先使用 customParams
  if (item.customParams && typeof item.customParams === 'object') {
    const customParams = item.customParams as Record<string, { value?: number; symbol?: string; floatValue?: number }>;
    const entries = Object.entries(customParams);
    
    for (let i = 0; i < entries.length; i++) {
      const [name, payload] = entries[i];
      result.push({
        name,
        value: payload?.value ?? 0,
        symbol: payload?.symbol ?? '',
        floatValue: payload?.floatValue ?? 0,
      });
    }
    return result;
  }
  
  // 兼容旧格式 customAttributes
  if (Array.isArray(item.customAttributes)) {
    const customAttributes = item.customAttributes as Array<{ name?: string; value?: number; symbol?: string; floatValue?: number }>;
    
    for (let i = 0; i < customAttributes.length; i++) {
      const attr = customAttributes[i];
      if (attr && attr.name) {
        result.push({
          name: attr.name,
          value: attr.value ?? 0,
          symbol: attr.symbol ?? '',
          floatValue: attr.floatValue ?? 0,
        });
      }
    }
  }
  
  return result;
}

// ============ 核心渲染函数 ============

/**
 * 渲染自定义属性 - 完全对应oldCode/main.js的renderCustomAttributes逻辑
 */
function renderCustomAttributes(currentItem: unknown): void {
  const customList = DOM.customAttributeList;
  if (!customList) return;

  // 清空容器
  customList.innerHTML = '';

  // 回收现有卡片
  for (let i = 0; i < currentCustomCardCount; i++) {
    const card = currentCustomCards[i];
    if (card) {
      returnCustomCard(card);
    }
  }
  currentCustomCards.length = 0;
  currentCustomCardCount = 0;

  const item = currentItem as Record<string, unknown> | null;
  
  if (!item) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'custom-empty';
    emptyDiv.textContent = '选择项目后即可编辑属性';
    customList.appendChild(emptyDiv);
    return;
  }
  
  // 获取自定义属性
  const customParams = getCustomParams(item);
  
  if (customParams.length === 0) {
    updateCustomPlaceholder();
    return;
  }
  
  // 使用 Fragment 优化 DOM 插入
  const fragment = document.createDocumentFragment();
  
  for (let i = 0; i < customParams.length; i++) {
    const attr = customParams[i];
    const cardElement = acquireCard();
    cardElement.className = 'custom-attribute-card property-field';
    cardElement.dataset.index = String(i);

    // 创建字段：水平排列，所有字段在一行（完全对应oldCode/main.js的布局）
    const nameField = createCustomField('属性名', 'custom-attribute-name', 'text', attr.name);
    const symbolField = createCustomField('缩写', 'custom-attribute-symbol', 'text', attr.symbol);
    const valueField = createCustomField('值', 'custom-attribute-value', 'number', attr.value);
    const floatField = createCustomField('波动', 'custom-attribute-float', 'number', attr.floatValue);

    // Apply sci-fi styling to custom attribute card
    themeManager.applySciFiEffects(cardElement, {
      variant: 'accent',
      glow: true,
      scanlines: false,
    });

    // Add energy wave effect on hover
    cardElement.addEventListener('mouseenter', () => {
      visualEffects.createEnergyWave(cardElement, {
        color: 'rgba(0, 255, 136, 0.3)',
        duration: 800,
        direction: 'horizontal',
      });
    });

    // Add subtle holographic flicker
    visualEffects.createHolographicFlicker(cardElement, {
      intensity: 0.02,
      frequency: 0.03,
      duration: 80,
    });

    // Apply futuristic styling to inputs
    const inputs = [nameField.input, symbolField.input, valueField.input, floatField.input];
    inputs.forEach(input => {
      themeManager.createFuturisticInput(input);
      
      // Add focus effects
      input.addEventListener('focus', () => {
        visualEffects.createPulsingGlow(input, {
          color: 'rgba(0, 240, 255, 0.4)',
          intensity: 0.6,
          duration: 200,
          infinite: false,
        });
      });
    });

    // 水平排列所有字段 - 完全对应oldCode/main.js的结构
    cardElement.appendChild(nameField.wrapper);
    cardElement.appendChild(symbolField.wrapper);
    cardElement.appendChild(valueField.wrapper);
    cardElement.appendChild(floatField.wrapper);

    // 创建操作按钮
    const actions = document.createElement('div');
    actions.className = 'custom-attribute-actions';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'action-btn small remove-btn';
    removeBtn.textContent = '删除';
    
    // Apply theme to remove button
    themeManager.createFuturisticButton(removeBtn, 'secondary');
    
    // Add click effect
    removeBtn.addEventListener('click', () => {
      visualEffects.createEnergyWave(removeBtn, {
        color: 'rgba(255, 100, 100, 0.4)',
        duration: 400,
        direction: 'horizontal',
      });
    });
    
    actions.appendChild(removeBtn);
    cardElement.appendChild(actions);
    
    fragment.appendChild(cardElement);

    currentCustomCards[currentCustomCardCount++] = {
      element: cardElement,
      nameInput: nameField.input,
      valueInput: valueField.input,
      symbolInput: symbolField.input,
      floatInput: floatField.input,
    };
  }
  
  customList.appendChild(fragment);
}

/**
 * 设置属性面板事件委托 - 对应oldCode/main.js的setupPropertyPanelDelegate函数
 */
function setupPropertyPanelDelegate(): void {
  const customList = DOM.customAttributeList;
  if (!customList || eventsBound) return;
  
  customList.addEventListener('click', handleCustomPropertyDelete);
  eventsBound = true;
}

/**
 * 添加新的自定义属性 - 完全对应oldCode/main.js的addCustomPropertyRow函数
 */
export function addCustomAttribute(): void {
  const customList = DOM.customAttributeList;
  if (!customList) return;
  
  // 移除空状态提示
  const placeholder = customList.querySelector('.custom-empty');
  if (placeholder) {
    placeholder.remove();
  }

  const cardElement = acquireCard();
  cardElement.className = 'custom-attribute-card property-field';
  cardElement.dataset.index = String(currentCustomCardCount);

  // 创建字段：水平排列，所有字段在一行（完全对应oldCode/main.js的布局）
  const nameField = createCustomField('属性名', 'custom-attribute-name', 'text', '');
  const symbolField = createCustomField('缩写', 'custom-attribute-symbol', 'text', '');
  const valueField = createCustomField('值', 'custom-attribute-value', 'number', '');
  const floatField = createCustomField('波动', 'custom-attribute-float', 'number', '');

  // 水平排列所有字段 - 完全对应oldCode/main.js的结构
  cardElement.appendChild(nameField.wrapper);
  cardElement.appendChild(symbolField.wrapper);
  cardElement.appendChild(valueField.wrapper);
  cardElement.appendChild(floatField.wrapper);

  // 创建操作按钮
  const actions = document.createElement('div');
  actions.className = 'custom-attribute-actions';
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'action-btn small remove-btn';
  removeBtn.textContent = '删除';
  
  actions.appendChild(removeBtn);
  cardElement.appendChild(actions);
  
  customList.appendChild(cardElement);

  currentCustomCards[currentCustomCardCount++] = {
    element: cardElement,
    nameInput: nameField.input,
    valueInput: valueField.input,
    symbolInput: symbolField.input,
    floatInput: floatField.input,
  };
  
  // 聚焦到名称输入
  nameField.input.focus();
  
  EventSystem.emit('property:custom-added');
  logger.debug('Custom attribute added', undefined, 'PropertyPanel');
}

/**
 * 收集基础属性值
 */
export function collectBaseParams(): { params: number[]; floatParams: number[] } | null {
  const params: number[] = [];
  const floatParams: number[] = [];
  
  for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
    const attr = BASE_ATTRIBUTES[i];
    const input = attributeInputs[attr.key];
    const floatInput = attributeFloatInputs[attr.key];
    
    // 解析基础值
    const rawValue = input?.value.trim() ?? '';
    const parsedValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
    if (rawValue !== '' && Number.isNaN(parsedValue)) {
      EventSystem.emit('error:show', `${attr.label} 必须是整数`);
      return null;
    }
    params[attr.index] = parsedValue;
    
    // 解析波动值
    const rawFloat = floatInput?.value.trim() ?? '';
    const parsedFloat = rawFloat === '' ? 0 : parseFloat(rawFloat);
    if (rawFloat !== '' && Number.isNaN(parsedFloat)) {
      EventSystem.emit('error:show', `${attr.label} 的波动值必须是数字`);
      return null;
    }
    floatParams[attr.index] = parsedFloat;
  }
  
  return { params, floatParams };
}

/**
 * 收集自定义属性值 - 完全对应oldCode/main.js的collectCustomParams函数
 */
export function collectCustomParams(): Record<string, CustomAttribute> | null {
  const customParams: Record<string, CustomAttribute> = {};

  // 使用 currentCustomCards 而不是查询 DOM
  for (let i = 0; i < currentCustomCardCount; i++) {
    const card = currentCustomCards[i];
    if (!card) continue;

    const name = card.nameInput?.value.trim();
    if (!name) continue;
    
    // 解析值
    const rawValue = card.valueInput?.value.trim() ?? '';
    const parsedValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
    if (rawValue !== '' && Number.isNaN(parsedValue)) {
      EventSystem.emit('error:show', '自定义属性值必须是整数');
      return null;
    }
    
    // 解析波动值
    const rawFloat = card.floatInput?.value.trim() ?? '';
    const parsedFloat = rawFloat === '' ? 0 : parseFloat(rawFloat);
    if (rawFloat !== '' && Number.isNaN(parsedFloat)) {
      EventSystem.emit('error:show', '自定义属性的波动值必须是数字');
      return null;
    }
    
    customParams[name] = {
      name,
      value: parsedValue,
      symbol: card.symbolInput?.value.trim() ?? '',
      floatValue: parsedFloat,
    };
  }
  
  return customParams;
}

// ============ 持久化函数 ============

/**
 * 持久化当前项目 - 对应oldCode/main.js的persistCurrentItem函数
 */
async function persistCurrentItem(saveMessage: string, successMessage: string): Promise<void> {
  const state = StateManager.getState();
  const { currentItem, currentData, currentItemIndex, currentFilePath } = state;
  
  if (!currentItem || !currentData || currentItemIndex === null || !currentFilePath) {
    EventSystem.emit('error:show', '请先选择文件和项目');
    return;
  }

  EventSystem.emit('loading:show', saveMessage);
  
  try {
    // 更新数据数组
    const newData = [...currentData];
    newData[currentItemIndex] = currentItem;
    
    // 写入文件
    await window.electronAPI.writeFile(currentFilePath, JSON.stringify(newData, null, 2), 'utf-8');
    
    // 更新状态
    StateManager.setState({ currentData: newData });
    
    EventSystem.emit('status:update', successMessage);
    renderPropertyPanel();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    EventSystem.emit('error:show', successMessage.replace('成功', '失败') + ' ' + errorMessage);
  } finally {
    EventSystem.emit('loading:hide');
  }
}

/**
 * 处理保存基础属性 - 完全对应oldCode/main.js的savePropertyDefinition函数
 */
async function handleSaveBaseProperties(): Promise<void> {
  const state = StateManager.getState();
  const { currentItem, currentItemIndex, currentFilePath } = state;
  
  if (!currentItem || currentItemIndex === null || !currentFilePath) {
    EventSystem.emit('error:show', '请先选择文件和项目');
    return;
  }
  
  if (!Object.hasOwn(currentItem, 'params')) {
    EventSystem.emit('error:show', '该项目没有 params，基础属性不可编辑');
    return;
  }
  
  const item = { ...currentItem } as any;
  const params = item.params ?? [];
  
  // 收集基础属性值
  for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
    const attr = BASE_ATTRIBUTES[i];
    const input = attributeInputs[attr.key];
    if (!input) {
      params[i] = 0;
      continue;
    }
    const raw = input.value.trim();
    const parsed = raw === '' ? 0 : parseInt(raw, 10);
    if (raw !== '' && Number.isNaN(parsed)) {
      EventSystem.emit('error:show', `${attr.label} 必须是整数`);
      return;
    }
    params[i] = parsed;
  }

  const floatParams = item.floatParams ?? [];
  for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
    const attr = BASE_ATTRIBUTES[i];
    const input = attributeFloatInputs[attr.key];
    if (!input) {
      floatParams[i] = 0;
      continue;
    }
    const raw = input.value.trim();
    const parsed = raw === '' ? 0 : parseFloat(raw);
    if (raw !== '' && Number.isNaN(parsed)) {
      EventSystem.emit('error:show', `${attr.label} 的波动值必须是数字`);
      return;
    }
    floatParams[i] = parsed;
  }

  item.params = params;
  item.floatParams = floatParams;
  
  // 更新状态
  StateManager.setState({ currentItem: item });
  
  await persistCurrentItem('保存属性定义中...', '✔ 属性定义已保存');
}

/**
 * 处理保存自定义属性 - 完全对应oldCode/main.js的saveCustomProperties函数
 */
async function handleSaveCustomProperties(): Promise<void> {
  const state = StateManager.getState();
  const { currentItem, currentItemIndex, currentFilePath } = state;
  
  if (!currentItem || currentItemIndex === null || !currentFilePath) {
    EventSystem.emit('error:show', '请先选择文件和项目');
    return;
  }
  
  const customParams = collectCustomParams();
  if (customParams === null) return;
  
  const item = { ...currentItem } as any;
  item.customParams = customParams;
  
  // 删除旧格式
  if (item.customAttributes) {
    delete item.customAttributes;
  }
  
  // 更新状态
  StateManager.setState({ currentItem: item });
  
  await persistCurrentItem('保存自定义属性中...', '✔ 自定义属性已保存');
}

// ============ 初始化函数 ============

/**
 * 初始化属性面板 - 完全对应oldCode/main.js的initializePropertyPanel函数
 */
export function initPropertyPanel(): void {
  // Apply sci-fi theme to property panel
  const propertyModePanel = DOM.propertyModePanel;
  if (propertyModePanel) {
    themeManager.createFuturisticPanel(propertyModePanel, {
      variant: 'primary',
      scanlines: true,
      cornerAccents: true,
    });

    // Add particle field background
    visualEffects.createParticleField(propertyModePanel, {
      particleCount: 20,
      colors: ['rgba(0, 240, 255, 0.2)', 'rgba(0, 255, 136, 0.1)'],
      speed: 30000,
      size: 1,
    });
  }

  // Apply theme to base attribute grid
  const baseAttributeList = DOM.baseAttributeList;
  if (baseAttributeList) {
    themeManager.applySciFiEffects(baseAttributeList, {
      variant: 'secondary',
      glow: true,
      scanlines: false,
    });

    // Add energy wave effect on hover
    baseAttributeList.addEventListener('mouseenter', () => {
      visualEffects.createEnergyWave(baseAttributeList, {
        color: 'rgba(0, 240, 255, 0.2)',
        duration: 1000,
        direction: 'vertical',
      });
    });
  }

  // Apply theme to custom attribute list
  const customAttributeList = DOM.customAttributeList;
  if (customAttributeList) {
    themeManager.createFuturisticPanel(customAttributeList, {
      variant: 'accent',
      scanlines: false,
      cornerAccents: true,
    });

    // Add holographic flicker effect
    visualEffects.createHolographicFlicker(customAttributeList, {
      intensity: 0.03,
      frequency: 0.04,
      duration: 120,
    });
  }

  // Apply theme to control buttons
  const controlButtons = [
    DOM.savePropertiesBtn,
    DOM.saveCustomPropertyBtn,
    DOM.addCustomPropertyBtn,
  ];

  controlButtons.forEach((btn, index) => {
    if (btn) {
      const variants = ['primary', 'secondary', 'accent'] as const;
      themeManager.createFuturisticButton(btn, variants[index]);

      // Add energy wave effect on click
      btn.addEventListener('click', () => {
        visualEffects.createEnergyWave(btn, {
          color: 'rgba(255, 255, 255, 0.4)',
          duration: 600,
          direction: 'horizontal',
        });
      });

      // Add hover effects
      btn.addEventListener('mouseenter', () => {
        visualEffects.createPulsingGlow(btn, {
          color: 'rgba(0, 240, 255, 0.3)',
          intensity: 0.5,
          duration: 300,
          infinite: false,
        });
      });

      // Special effects for add button
      if (btn === DOM.addCustomPropertyBtn) {
        visualEffects.createPulsingGlow(btn, {
          color: 'rgba(0, 255, 136, 0.3)',
          intensity: 0.6,
          duration: 2500,
          infinite: true,
        });
      }
    }
  });

  // 初始化基础属性输入框
  if (DOM.baseAttributeList) {
    for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
      const attr = BASE_ATTRIBUTES[i];
      const input = DOM.baseAttributeList.querySelector(`.base-attribute-input[data-key="${attr.key}"]`) as HTMLInputElement | null;
      const floatInput = DOM.baseAttributeList.querySelector(`.base-attribute-float-input[data-key="${attr.key}"]`) as HTMLInputElement | null;
      
      attributeInputs[attr.key] = input;
      attributeFloatInputs[attr.key] = floatInput;

      // Apply futuristic input styling
      if (input) {
        themeManager.createFuturisticInput(input);
        
        // Add focus effects
        input.addEventListener('focus', () => {
          visualEffects.createPulsingGlow(input, {
            color: 'rgba(0, 240, 255, 0.4)',
            intensity: 0.6,
            duration: 200,
            infinite: false,
          });
        });
      }

      if (floatInput) {
        themeManager.createFuturisticInput(floatInput);
        
        // Add focus effects
        floatInput.addEventListener('focus', () => {
          visualEffects.createPulsingGlow(floatInput, {
            color: 'rgba(0, 240, 255, 0.4)',
            intensity: 0.6,
            duration: 200,
            infinite: false,
          });
        });
      }
    }
  }

  // 订阅状态变更
  StateManager.subscribe((_state, changedKeys) => {
    if (changedKeys.includes('currentItem') || changedKeys.includes('currentItemIndex')) {
      renderPropertyPanel();
    }
  });

  // 监听添加自定义属性按钮
  if (DOM.addCustomPropertyBtn) {
    DOM.addCustomPropertyBtn.addEventListener('click', addCustomAttribute);
  }

  // 绑定保存基础属性按钮
  if (DOM.savePropertiesBtn) {
    DOM.savePropertiesBtn.onclick = handleSaveBaseProperties;
  }

  // 绑定保存自定义属性按钮
  if (DOM.saveCustomPropertyBtn) {
    DOM.saveCustomPropertyBtn.onclick = handleSaveCustomProperties;
  }

  // 监听保存事件
  EventSystem.on('property:save-base', handleSaveBaseProperties);
  EventSystem.on('property:save-custom', handleSaveCustomProperties);

  logger.info('PropertyPanel initialized with sci-fi theme', undefined, 'PropertyPanel');
}

/**
 * 渲染属性面板 - 完全对应oldCode/main.js的renderPropertyPanel函数
 */
export function renderPropertyPanel(): void {
  const state = StateManager.getState();
  const currentItem = state.currentItem as Record<string, unknown> | null;

  if (!currentItem) {
    // 清空所有输入框
    for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
      const attr = BASE_ATTRIBUTES[i];
      if (attributeInputs[attr.key]) {
        attributeInputs[attr.key]!.value = '';
      }
      if (attributeFloatInputs[attr.key]) {
        attributeFloatInputs[attr.key]!.value = '';
      }
    }
    
    // 更新状态文本
    if (DOM.propertyModeSubtitle) {
      DOM.propertyModeSubtitle.textContent = '请先从左侧项目列表选择一个项目';
    }
    
    // 清空自定义属性
    renderCustomAttributes(null);
    return;
  }

  const hasParams = Object.hasOwn(currentItem, 'params');
  
  // 更新状态文本
  if (DOM.propertyModeSubtitle) {
    const itemName = (currentItem as any)?.name || '未命名';
    const itemId = (currentItem as any)?.id || state.currentItemIndex || '-';
    DOM.propertyModeSubtitle.textContent = `当前项目: ${itemName} (ID: ${itemId})${hasParams ? '' : ' - 无 params，基础属性不可编辑'}`;
  }

  // 填充基础属性
  const params = (currentItem as any).params as number[] | undefined;
  const floatParams = (currentItem as any).floatParams as number[] | undefined;

  for (let i = 0; i < BASE_ATTRIBUTES.length; i++) {
    const attr = BASE_ATTRIBUTES[i];
    if (attributeInputs[attr.key]) {
      attributeInputs[attr.key]!.value = hasParams ? String(params?.[attr.index] ?? '') : '';
    }
    if (attributeFloatInputs[attr.key]) {
      attributeFloatInputs[attr.key]!.value = hasParams ? String(floatParams?.[attr.index] ?? '') : '';
    }
  }

  // 渲染自定义属性
  renderCustomAttributes(currentItem);
  setupPropertyPanelDelegate(); // 确保事件委托已设置
}

// ============ 清理函数 ============

/**
 * 清理属性面板 - 对应oldCode/main.js的清理逻辑
 */
export function disposePropertyPanel(): void {
  // 回收所有自定义属性卡片
  for (let i = 0; i < currentCustomCardCount; i++) {
    const card = currentCustomCards[i];
    if (card) {
      returnCustomCard(card);
    }
  }
  currentCustomCards.length = 0;
  currentCustomCardCount = 0;

  // 移除事件监听
  const customList = DOM.customAttributeList;
  if (customList && eventsBound) {
    customList.removeEventListener('click', handleCustomPropertyDelete);
    eventsBound = false;
  }

  if (DOM.addCustomPropertyBtn) {
    DOM.addCustomPropertyBtn.removeEventListener('click', addCustomAttribute);
  }

  // 移除按钮事件
  if (DOM.savePropertiesBtn) {
    DOM.savePropertiesBtn.onclick = null;
  }
  if (DOM.saveCustomPropertyBtn) {
    DOM.saveCustomPropertyBtn.onclick = null;
  }

  logger.info('PropertyPanel disposed', undefined, 'PropertyPanel');
}

// ============ 导出 ============

export default {
  init: initPropertyPanel,
  render: renderPropertyPanel,
  addCustom: addCustomAttribute,
  collectBase: collectBaseParams,
  collectCustom: collectCustomParams,
  dispose: disposePropertyPanel,
};
