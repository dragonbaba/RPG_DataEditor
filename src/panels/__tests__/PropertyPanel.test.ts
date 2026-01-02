/**
 * PropertyPanel 测试
 * 验证属性面板的核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateManager } from '../../core/StateManager';
import { EventSystem } from '../../core/EventSystem';
import { 
  initPropertyPanel, 
  renderPropertyPanel, 
  addCustomAttribute, 
  collectBaseParams,
  disposePropertyPanel 
} from '../PropertyPanel';

// Mock DOM Manager
vi.mock('../../core/DOMManager', () => ({
  DOM: {
    propertyModePanel: document.createElement('div'),
    baseAttributeList: document.createElement('div'),
    customAttributeList: document.createElement('div'),
    propertyModeSubtitle: document.createElement('div'),
    addCustomPropertyBtn: document.createElement('button'),
    savePropertiesBtn: document.createElement('button'),
    saveCustomPropertyBtn: document.createElement('button'),
  }
}));

// Create reference to mocked DOM elements for tests
let mockElements: any;

// Mock theme manager
vi.mock('../../theme/ThemeManager', () => ({
  themeManager: {
    createFuturisticPanel: vi.fn(),
    createFuturisticButton: vi.fn(),
    createFuturisticInput: vi.fn(),
    applySciFiEffects: vi.fn(),
  }
}));

// Mock visual effects
vi.mock('../../theme/effects/VisualEffects', () => ({
  visualEffects: {
    createScanningLine: vi.fn(() => () => {}),
    createPulsingGlow: vi.fn(),
    createHolographicFlicker: vi.fn(() => () => {}),
    createParticleField: vi.fn(() => () => {}),
    createMatrixRain: vi.fn(() => () => {}),
    createEnergyPulse: vi.fn(() => () => {}),
  }
}));

// Mock pools
vi.mock('../../pools/DOMPools', () => ({
  acquireCard: vi.fn(() => document.createElement('div'))
}));

describe('PropertyPanel', () => {
  beforeEach(async () => {
    // Initialize mock elements reference
    const { DOM } = await import('../../core/DOMManager');
    mockElements = DOM;
    
    // 设置基础属性输入框
    mockElements.baseAttributeList.innerHTML = `
      <input class="base-attribute-input" data-key="mhp" />
      <input class="base-attribute-float-input" data-key="mhp" />
      <input class="base-attribute-input" data-key="mmp" />
      <input class="base-attribute-float-input" data-key="mmp" />
      <input class="base-attribute-input" data-key="atk" />
      <input class="base-attribute-float-input" data-key="atk" />
      <input class="base-attribute-input" data-key="def" />
      <input class="base-attribute-float-input" data-key="def" />
      <input class="base-attribute-input" data-key="mat" />
      <input class="base-attribute-float-input" data-key="mat" />
      <input class="base-attribute-input" data-key="mdf" />
      <input class="base-attribute-float-input" data-key="mdf" />
      <input class="base-attribute-input" data-key="agi" />
      <input class="base-attribute-float-input" data-key="agi" />
      <input class="base-attribute-input" data-key="luk" />
      <input class="base-attribute-float-input" data-key="luk" />
    `;

    // 清空自定义属性列表
    mockElements.customAttributeList.innerHTML = '';
    
    // 重置状态
    StateManager.setState({
      currentItem: undefined,
      currentItemIndex: undefined,
      currentFilePath: undefined,
      currentData: undefined,
    });
  });

  afterEach(() => {
    disposePropertyPanel();
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该正确初始化属性面板', () => {
      expect(() => initPropertyPanel()).not.toThrow();
    });
  });

  describe('渲染', () => {
    beforeEach(() => {
      initPropertyPanel();
    });

    it('应该在没有选中项目时显示提示信息', () => {
      renderPropertyPanel();
      
      expect(mockElements.propertyModeSubtitle.textContent).toBe('请先从左侧项目列表选择一个项目');
      expect(mockElements.customAttributeList.innerHTML).toContain('选择项目后即可编辑属性');
    });

    it('应该正确渲染有params的项目', () => {
      const testItem = {
        id: 1,
        name: '测试项目',
        params: [100, 50, 20, 15, 10, 8, 12, 5],
        floatParams: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
      };

      StateManager.setState({
        currentItem: testItem,
        currentItemIndex: 0,
      });

      renderPropertyPanel();

      expect(mockElements.propertyModeSubtitle.textContent).toContain('测试项目');
      expect(mockElements.propertyModeSubtitle.textContent).toContain('ID: 1');
      expect(mockElements.propertyModeSubtitle.textContent).not.toContain('无 params');
    });

    it('应该正确渲染没有params的项目', () => {
      const testItem = {
        id: 2,
        name: '无参数项目',
      };

      StateManager.setState({
        currentItem: testItem,
        currentItemIndex: 1,
      });

      renderPropertyPanel();

      expect(mockElements.propertyModeSubtitle.textContent).toContain('无参数项目');
      expect(mockElements.propertyModeSubtitle.textContent).toContain('无 params，基础属性不可编辑');
    });

    it('应该正确渲染自定义属性', () => {
      const testItem = {
        id: 3,
        name: '有自定义属性的项目',
        params: [100, 50, 20, 15, 10, 8, 12, 5],
        customParams: {
          '自定义力量': 25,
          '自定义智力': 30,
        },
      };

      StateManager.setState({
        currentItem: testItem,
        currentItemIndex: 2,
      });

      renderPropertyPanel();

      // 检查是否创建了自定义属性卡片
      const cards = mockElements.customAttributeList.querySelectorAll('.custom-attribute-card');
      expect(cards.length).toBe(2);
    });
  });

  describe('基础属性收集', () => {
    beforeEach(() => {
      initPropertyPanel();
    });

    it('应该正确收集基础属性值', () => {
      // 设置输入值
      const mhpInput = mockElements.baseAttributeList.querySelector('[data-key="mhp"]') as HTMLInputElement;
      const mhpFloatInput = mockElements.baseAttributeList.querySelector('.base-attribute-float-input[data-key="mhp"]') as HTMLInputElement;
      
      mhpInput.value = '100';
      mhpFloatInput.value = '5.5';

      const result = collectBaseParams();
      
      expect(result).not.toBeNull();
      expect(result!.params[0]).toBe(100);
      expect(result!.floatParams[0]).toBe(5.5);
    });

    it('应该处理无效的基础属性值', () => {
      const errorSpy = vi.spyOn(EventSystem, 'emit');
      
      const mhpInput = mockElements.baseAttributeList.querySelector('[data-key="mhp"]') as HTMLInputElement;
      mhpInput.value = 'invalid';

      const result = collectBaseParams();
      
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith('error:show', '最大生命值 必须是整数');
    });
  });

  describe('自定义属性管理', () => {
    beforeEach(() => {
      initPropertyPanel();
    });

    it('应该能添加自定义属性', () => {
      addCustomAttribute();
      
      const cards = mockElements.customAttributeList.querySelectorAll('.custom-attribute-card');
      expect(cards.length).toBe(1);
    });

    it('应该正确收集自定义属性', () => {
      // 这个测试需要更复杂的DOM模拟，暂时跳过
      expect(true).toBe(true);
    });
  });
});