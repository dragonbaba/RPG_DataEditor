/**
 * DOM Pools Tests - DOM元素池验证
 * Checkpoint 6: 验证DOM对象池正常复用
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPoolRegistry,
  resetPoolRegistry,
  acquireListItem,
  releaseListItem,
  acquireSelectOption,
  releaseSelectOption,
  acquireCard,
  releaseCard,
  getAllPoolStats,
  clearAllPools,
} from './DOMPools';

describe('DOM Pools', () => {
  beforeEach(() => {
    resetPoolRegistry();
  });

  describe('Pool Registry', () => {
    it('should create pool registry singleton', () => {
      const registry1 = getPoolRegistry();
      const registry2 = getPoolRegistry();
      
      expect(registry1).toBe(registry2);
    });

    it('should have all required pools', () => {
      const registry = getPoolRegistry();
      
      expect(registry.listItem).toBeDefined();
      expect(registry.selectOption).toBeDefined();
      expect(registry.card).toBeDefined();
    });
  });

  describe('List Item Pool', () => {
    it('should acquire and release list items', () => {
      const item = acquireListItem();
      
      expect(item).toBeInstanceOf(HTMLDivElement);
      
      releaseListItem(item);
      
      const stats = getPoolRegistry().listItem.getStats();
      expect(stats.available).toBe(1);
    });

    it('should reuse list items', () => {
      const item1 = acquireListItem();
      item1.textContent = 'Test';
      item1.className = 'test-class';
      
      releaseListItem(item1);
      
      const item2 = acquireListItem();
      
      expect(item2).toBe(item1);
      // Should be reset
      expect(item2.textContent).toBe('');
      expect(item2.className).toBe('');
    });
  });

  describe('Select Option Pool', () => {
    it('should acquire and release select options', () => {
      const option = acquireSelectOption();
      
      expect(option).toBeInstanceOf(HTMLOptionElement);
      
      releaseSelectOption(option);
      
      const stats = getPoolRegistry().selectOption.getStats();
      expect(stats.available).toBe(1);
    });

    it('should reset option properties on release', () => {
      const option = acquireSelectOption();
      option.value = 'test-value';
      option.textContent = 'Test Option';
      option.selected = true;
      option.disabled = true;
      
      releaseSelectOption(option);
      
      const option2 = acquireSelectOption();
      
      expect(option2).toBe(option);
      expect(option2.value).toBe('');
      expect(option2.textContent).toBe('');
      expect(option2.selected).toBe(false);
      expect(option2.disabled).toBe(false);
    });
  });

  describe('Card Pool', () => {
    it('should acquire and release cards', () => {
      const card = acquireCard();
      
      expect(card).toBeInstanceOf(HTMLDivElement);
      
      releaseCard(card);
      
      const stats = getPoolRegistry().card.getStats();
      expect(stats.available).toBe(1);
    });
  });

  describe('Pool Statistics', () => {
    it('should get all pool stats', () => {
      // Initialize pools
      getPoolRegistry();
      
      const stats = getAllPoolStats();
      
      expect(stats).toHaveProperty('listItem');
      expect(stats).toHaveProperty('selectOption');
      expect(stats).toHaveProperty('card');
    });

    it('should track usage correctly', () => {
      const items: HTMLDivElement[] = [];
      
      for (let i = 0; i < 5; i++) {
        items.push(acquireListItem());
      }
      
      let stats = getPoolRegistry().listItem.getStats();
      expect(stats.totalCreated).toBe(5);
      expect(stats.available).toBe(0);
      
      for (const item of items) {
        releaseListItem(item);
      }
      
      stats = getPoolRegistry().listItem.getStats();
      expect(stats.totalReturned).toBe(5);
      expect(stats.available).toBe(5);
    });
  });

  describe('Clear All Pools', () => {
    it('should clear all pools', () => {
      // Create and return many items
      const items: HTMLDivElement[] = [];
      for (let i = 0; i < 150; i++) {
        items.push(acquireListItem());
      }
      for (const item of items) {
        releaseListItem(item);
      }
      
      let stats = getPoolRegistry().listItem.getStats();
      expect(stats.available).toBe(150);
      
      clearAllPools();
      
      stats = getPoolRegistry().listItem.getStats();
      expect(stats.available).toBe(150); // Pool size limit
    });
  });
});
