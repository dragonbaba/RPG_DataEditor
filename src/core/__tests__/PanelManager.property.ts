/**
 * Property-based tests for PanelManager
 * Feature: editor-modernization, Property 1: Panel switching consistency
 * 
 * Tests the universal property that for any sequence of panel switches,
 * only the target panel should be visible and properly initialized while
 * all other panels are hidden and cleaned up.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { PanelManager } from '../PanelManager';
import { DOM } from '../DOMManager';
import type { EditorMode } from '../../types';

// Mock the PanelAnimator to avoid animation delays in tests
vi.mock('../PanelAnimator', () => ({
  PanelAnimator: class MockPanelAnimator {
    private currentPanel: HTMLElement | null = null;
    
    getCurrentPanel() {
      return this.currentPanel;
    }
    
    forceSetCurrentPanel(panel: HTMLElement | null) {
      this.currentPanel = panel;
    }
    
    async switchPanel(newPanel: HTMLElement) {
      // Hide ALL panels first (to match the real behavior)
      const allPanelIds = ['codeEditorContainer', 'propertyModePanel', 'noteModePanel', 'projectileModePanel', 'questModePanel'];
      allPanelIds.forEach(id => {
        const element = document.getElementById(id);
        if (element && element !== newPanel) {
          element.classList.add('hidden');
          element.style.display = 'none';
          element.style.opacity = '0';
          element.style.visibility = 'hidden';
          element.style.pointerEvents = 'none';
        }
      });
      
      // Show new panel
      this.currentPanel = newPanel;
      newPanel.classList.remove('hidden');
      newPanel.style.display = '';
      newPanel.style.opacity = '1';
      newPanel.style.visibility = 'visible';
      newPanel.style.pointerEvents = '';
      
      return Promise.resolve();
    }
    
    isCurrentlyAnimating() {
      return false;
    }
  },
}));

// Mock dependencies
vi.mock('../DOMManager', () => ({
  DOM: {
    scriptPanel: null,
    metaDataPanel: null,
    emptyStatePanel: null,
    codeEditorContainer: null,
    propertyModePanel: null,
    noteModePanel: null,
    projectileModePanel: null,
    questModePanel: null,
  },
  setVisible: vi.fn(),
}));

vi.mock('../StateManager', () => ({
  StateManager: {
    subscribe: vi.fn(),
    getState: vi.fn(() => ({ currentFileType: 'quest' })),
  },
}));

vi.mock('../EventSystem', () => ({
  EventSystem: {
    emit: vi.fn(),
  },
}));

vi.mock('../../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../EditorManager', () => ({
  EditorManager: {
    isInitialized: vi.fn(() => true),
    layout: vi.fn(),
  },
}));

// Mock DOM elements with proper behavior simulation
const createMockElement = (id: string): HTMLElement => {
  const element = document.createElement('div');
  element.id = id;
  element.classList.add('hidden');
  element.style.display = 'none';
  element.style.opacity = '0';
  
  // Override classList methods to track state changes
  const originalAdd = element.classList.add.bind(element.classList);
  const originalRemove = element.classList.remove.bind(element.classList);
  
  element.classList.add = (...tokens: string[]) => {
    originalAdd(...tokens);
    return element.classList;
  };
  
  element.classList.remove = (...tokens: string[]) => {
    originalRemove(...tokens);
    return element.classList;
  };
  
  return element;
};

describe('PanelManager Property Tests', () => {
  let mockElements: Record<string, HTMLElement>;

  beforeEach(() => {
    // Create mock DOM elements first
    mockElements = {
      codeEditorContainer: createMockElement('codeEditorContainer'),
      propertyModePanel: createMockElement('propertyModePanel'),
      noteModePanel: createMockElement('noteModePanel'),
      projectileModePanel: createMockElement('projectileModePanel'),
      questModePanel: createMockElement('questModePanel'),
      scriptPanel: createMockElement('scriptPanel'),
      metaDataPanel: createMockElement('metaDataPanel'),
      emptyStatePanel: createMockElement('emptyStatePanel'),
    };

    // Mock DOM cache - assign before PanelManager operations
    Object.assign(DOM, mockElements);

    // Mock document.getElementById to return our mock elements
    vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      return mockElements[id] || null;
    });

    // Clear PanelManager state and initialize
    PanelManager.clear();
    PanelManager.init();
    
    // Reset all elements to hidden state after initialization
    Object.values(mockElements).forEach(element => {
      element.classList.add('hidden');
      element.style.display = 'none';
      element.style.opacity = '0';
      element.style.visibility = 'hidden';
      element.style.pointerEvents = 'none';
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    PanelManager.clear();
    
    // Reset all elements to hidden state
    Object.values(mockElements).forEach(element => {
      element.classList.add('hidden');
      element.style.display = 'none';
      element.style.opacity = '0';
      element.style.visibility = 'hidden';
      element.style.pointerEvents = 'none';
    });
  });

  /**
   * Property 1: Panel switching consistency
   * For any sequence of panel switches between editor modes, only the target panel 
   * should be visible and properly initialized while all other panels are hidden and cleaned up
   */
  it('should maintain panel switching consistency across all mode sequences', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate sequences of panel switches
        fc.array(
          fc.constantFrom<EditorMode>('script', 'property', 'note', 'projectile', 'quest'),
          { minLength: 1, maxLength: 5 } // Reduced for faster testing
        ),
        async (panelSequence) => {
          // Execute the sequence of panel switches
          for (const mode of panelSequence) {
            await PanelManager.showPanel(mode);
            
            // Verify only the target panel is visible
            const targetElement = getElementForMode(mode);
            const otherElements = getAllOtherElements(mode);
            
            // Target panel should be visible (not hidden)
            expect(targetElement.classList.contains('hidden')).toBe(false);
            
            // All other panels should be hidden
            otherElements.forEach(element => {
              expect(element.classList.contains('hidden')).toBe(true);
            });
            
            // Current mode should be updated
            expect(PanelManager.getCurrentMode()).toBe(mode);
            
            // Panel should be marked as initialized
            expect(PanelManager.isPanelInitialized(mode)).toBe(true);
          }
        }
      ),
      { 
        numRuns: 20, // Reduced for faster testing
        timeout: 5000,
      }
    );
  }, 10000); // Increased test timeout

  /**
   * Property 2: Race condition protection
   * For any rapid sequence of panel switches, the system should handle them gracefully
   * without leaving panels in inconsistent states
   */
  it('should handle rapid panel switching without race conditions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate rapid sequences with potential duplicates
        fc.array(
          fc.constantFrom<EditorMode>('script', 'property', 'note', 'projectile', 'quest'),
          { minLength: 2, maxLength: 4 } // Reduced for faster testing
        ),
        async (rapidSequence) => {
          // Execute rapid switches (don't await each one)
          const promises = rapidSequence.map(mode => PanelManager.showPanel(mode));
          
          // Wait for all to complete
          await Promise.all(promises);
          
          // Final state should be consistent
          const finalMode = rapidSequence[rapidSequence.length - 1];
          const targetElement = getElementForMode(finalMode);
          const otherElements = getAllOtherElements(finalMode);
          
          // Only the final target panel should be visible
          expect(targetElement.classList.contains('hidden')).toBe(false);
          
          // All other panels should be hidden
          otherElements.forEach(element => {
            expect(element.classList.contains('hidden')).toBe(true);
          });
          
          // Current mode should match the final mode
          expect(PanelManager.getCurrentMode()).toBe(finalMode);
        }
      ),
      { 
        numRuns: 10, // Reduced for faster testing
        timeout: 5000,
      }
    );
  }, 10000);

  /**
   * Property 3: State validation consistency
   * For any panel mode, the validation should correctly identify the panel state
   */
  it('should validate panel state correctly for all modes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<EditorMode>('script', 'property', 'note', 'projectile', 'quest'),
        async (mode) => {
          await PanelManager.showPanel(mode);
          
          // State validation should pass
          const isValid = PanelManager.validatePanelState();
          if (!isValid) {
            console.error('Panel state validation failed for mode:', mode);
          }
          expect(isValid).toBe(true);
          
          // Manually corrupt state by showing another panel
          const otherMode = getRandomOtherMode(mode);
          const otherElement = getElementForMode(otherMode);
          
          // Make sure the other element is actually different and visible
          otherElement.classList.remove('hidden');
          otherElement.style.display = '';
          otherElement.style.opacity = '1';
          
          // Now we should have 2 visible panels, so validation should fail
          expect(PanelManager.validatePanelState()).toBe(false);
          
          // Clean up the corrupted state
          otherElement.classList.add('hidden');
          otherElement.style.display = 'none';
          otherElement.style.opacity = '0';
        }
      ),
      { 
        numRuns: 10, // Reduced for faster testing
        timeout: 3000,
      }
    );
  }, 5000);

  // Helper functions
  function getElementForMode(mode: EditorMode): HTMLElement {
    const elementMap: Record<EditorMode, string> = {
      script: 'codeEditorContainer',
      property: 'propertyModePanel',
      note: 'noteModePanel',
      projectile: 'projectileModePanel',
      quest: 'questModePanel',
    };
    return mockElements[elementMap[mode]];
  }

  function getAllOtherElements(excludeMode: EditorMode): HTMLElement[] {
    const allModes: EditorMode[] = ['script', 'property', 'note', 'projectile', 'quest'];
    return allModes
      .filter(mode => mode !== excludeMode)
      .map(mode => getElementForMode(mode));
  }

  function getRandomOtherMode(excludeMode: EditorMode): EditorMode {
    const allModes: EditorMode[] = ['script', 'property', 'note', 'projectile', 'quest'];
    const otherModes = allModes.filter(mode => mode !== excludeMode);
    return otherModes[Math.floor(Math.random() * otherModes.length)];
  }
});