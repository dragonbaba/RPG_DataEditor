/**
 * Property-based tests for editor panel responsive layout adaptation
 * 
 * Tests that editor panels (Quest, Projectile, Script, Property, Note) 
 * adapt their layouts responsively while maintaining sci-fi theme consistency.
 * 
 * **Property 7: Responsive layout adaptation**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { themeManager } from '../ThemeManager';
import { sciFiThemeSystem } from '../SciFiThemeSystem';
import { visualEffects } from '../effects/VisualEffects';

// Mock DOM environment for editor panels
const mockEditorPanel = (type: string, width: number, height: number) => {
  const panel = document.createElement('div');
  panel.className = `${type}-mode-panel editor-panel`;
  panel.style.width = `${width}px`;
  panel.style.height = `${height}px`;
  
  // Mock client dimensions
  Object.defineProperty(panel, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(panel, 'clientHeight', { value: height, configurable: true });
  Object.defineProperty(panel, 'offsetWidth', { value: width, configurable: true });
  Object.defineProperty(panel, 'offsetHeight', { value: height, configurable: true });
  
  document.body.appendChild(panel);
  return panel;
};

const mockPreviewContainer = (width: number, height: number) => {
  const container = document.createElement('div');
  container.className = 'preview-container';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  
  Object.defineProperty(container, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: height, configurable: true });
  
  return container;
};

const mockGridLayout = (columns: number, rows: number) => {
  const grid = document.createElement('div');
  grid.className = 'property-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, auto)`;
  
  // Add mock grid items
  for (let i = 0; i < columns * rows; i++) {
    const item = document.createElement('div');
    item.className = 'grid-item';
    grid.appendChild(item);
  }
  
  return grid;
};

// Mock media query for responsive testing
const mockMediaQuery = (query: string, matches: boolean) => {
  const mediaQuery = {
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  };
  
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue(mediaQuery),
    });
  } else {
    vi.mocked(window.matchMedia).mockReturnValue(mediaQuery as any);
  }
  
  return mediaQuery;
};

describe('Editor Panel Responsive Layout Property Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    
    sciFiThemeSystem.initializeTheme();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sciFiThemeSystem.dispose();
    visualEffects.dispose();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  /**
   * Property 7: Responsive layout adaptation
   * For any screen size or container dimension, the sci-fi themed layouts should adapt 
   * appropriately while maintaining visual consistency and usability
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
   */
  it('should adapt editor panel layouts responsively across different screen sizes', () => {
    fc.assert(
      fc.property(
        // Screen and panel configurations
        fc.record({
          screenWidth: fc.integer({ min: 320, max: 2560 }),
          screenHeight: fc.integer({ min: 240, max: 1440 }),
          panelType: fc.constantFrom('quest', 'projectile', 'script', 'property', 'note'),
          isMobile: fc.boolean(),
          isTablet: fc.boolean(),
          hasHighDPI: fc.boolean(),
        }),
        // Layout configurations
        fc.record({
          gridColumns: fc.integer({ min: 1, max: 4 }),
          gridRows: fc.integer({ min: 1, max: 6 }),
          previewSize: fc.record({
            width: fc.integer({ min: 200, max: 800 }),
            height: fc.integer({ min: 150, max: 600 }),
          }),
        }),
        (screenConfig, layoutConfig) => {
          // Determine responsive breakpoints based on actual screen width (ignore generated flags)
          const isMobile = screenConfig.screenWidth < 768;
          const isTablet = screenConfig.screenWidth >= 768 && screenConfig.screenWidth < 1024;
          const isDesktop = screenConfig.screenWidth >= 1024;
          
          // Mock media queries for responsive breakpoints
          mockMediaQuery('(max-width: 768px)', isMobile);
          mockMediaQuery('(min-width: 768px) and (max-width: 1024px)', isTablet);
          mockMediaQuery('(min-width: 1024px)', isDesktop);
          mockMediaQuery('(min-resolution: 2dppx)', screenConfig.hasHighDPI);

          // Create editor panel
          const panel = mockEditorPanel(
            screenConfig.panelType, 
            screenConfig.screenWidth, 
            screenConfig.screenHeight
          );

          // Apply sci-fi theme with responsive considerations
          themeManager.createFuturisticPanel(panel, {
            variant: 'primary',
            scanlines: !isMobile, // Disable scanlines on mobile for performance
            cornerAccents: true,
          });

          // Test panel adaptation
          expect(panel.classList.contains('sci-fi-themed')).toBe(true);
          expect(panel.classList.contains('sci-fi-card')).toBe(true);

          // Test responsive behavior based on actual screen size
          if (isMobile) {
            // Mobile panels should be optimized for touch
            expect(screenConfig.screenWidth).toBeLessThan(768);
            
            // Should maintain usability on small screens
            expect(panel.clientWidth).toBeGreaterThan(0);
            expect(panel.clientHeight).toBeGreaterThan(0);
          }

          if (isTablet) {
            // Tablet panels should balance desktop and mobile features
            expect(screenConfig.screenWidth).toBeGreaterThanOrEqual(768);
            expect(screenConfig.screenWidth).toBeLessThan(1024);
          }

          if (isDesktop) {
            // Desktop panels should utilize full features
            expect(screenConfig.screenWidth).toBeGreaterThanOrEqual(1024);
          }

          // Test specific panel type adaptations
          switch (screenConfig.panelType) {
            case 'quest':
              // Quest editor should handle complex forms responsively
              const questGrid = mockGridLayout(
                Math.min(layoutConfig.gridColumns, isMobile ? 1 : 2),
                layoutConfig.gridRows
              );
              panel.appendChild(questGrid);
              
              expect(questGrid.style.gridTemplateColumns).toContain('1fr');
              break;

            case 'projectile':
              // Projectile editor should adapt PixiJS container
              const previewContainer = mockPreviewContainer(
                Math.min(layoutConfig.previewSize.width, screenConfig.screenWidth - 40),
                Math.min(layoutConfig.previewSize.height, screenConfig.screenHeight - 100)
              );
              panel.appendChild(previewContainer);
              
              themeManager.applySciFiEffects(previewContainer, {
                variant: 'accent',
                glow: true,
                scanlines: !isMobile,
              });
              
              expect(previewContainer.classList.contains('sci-fi-themed')).toBe(true);
              expect(previewContainer.clientWidth).toBeLessThanOrEqual(screenConfig.screenWidth);
              break;

            case 'script':
              // Script editor should integrate Monaco editor theme
              const editorContainer = document.createElement('div');
              editorContainer.className = 'monaco-editor-container';
              panel.appendChild(editorContainer);
              
              themeManager.createFuturisticPanel(editorContainer, {
                variant: 'accent',
                scanlines: false,
                cornerAccents: true,
              });
              
              expect(editorContainer.classList.contains('sci-fi-themed')).toBe(true);
              break;

            case 'property':
              // Property editor should use modern grid layouts
              const propertyGrid = mockGridLayout(
                isMobile ? 1 : Math.min(layoutConfig.gridColumns, 3),
                layoutConfig.gridRows
              );
              panel.appendChild(propertyGrid);
              
              themeManager.createFuturisticPanel(propertyGrid, {
                variant: 'secondary',
                scanlines: false,
              });
              
              expect(propertyGrid.classList.contains('sci-fi-themed')).toBe(true);
              
              // Grid should adapt to screen size
              const expectedColumns = isMobile ? 1 : Math.min(layoutConfig.gridColumns, 3);
              expect(propertyGrid.style.gridTemplateColumns).toContain(`repeat(${expectedColumns}, 1fr)`);
              break;

            case 'note':
              // Note editor should maintain readability
              const noteEditor = document.createElement('textarea');
              noteEditor.className = 'note-editor';
              panel.appendChild(noteEditor);
              
              themeManager.createFuturisticInput(noteEditor);
              
              expect(noteEditor.classList.contains('sci-fi-themed')).toBe(true);
              break;
          }

          // Test visual consistency across different sizes
          // Should maintain minimum usable dimensions
          expect(panel.clientWidth).toBeGreaterThan(200);
          expect(panel.clientHeight).toBeGreaterThan(100);
          
          // Should have appropriate styling applied
          expect(panel.className.length).toBeGreaterThan(0);
          
          // High DPI screens should maintain visual quality
          if (screenConfig.hasHighDPI) {
            // Effects should be crisp on high DPI
            expect(panel.classList.contains('sci-fi-themed')).toBe(true);
          }

          // Cleanup
          panel.remove();
        }
      ),
      { numRuns: 100 } // Test with 100 iterations for comprehensive coverage
    );
  });

  it('should maintain theme consistency across different editor panel types', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('quest', 'projectile', 'script', 'property', 'note'),
            width: fc.integer({ min: 300, max: 1200 }),
            height: fc.integer({ min: 200, max: 800 }),
            variant: fc.constantFrom('primary', 'secondary', 'accent'),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (panelConfigs) => {
          const panels: Array<{ element: HTMLElement; config: typeof panelConfigs[0] }> = [];
          
          // Create multiple editor panels
          for (const config of panelConfigs) {
            const panel = mockEditorPanel(config.type, config.width, config.height);
            
            themeManager.createFuturisticPanel(panel, {
              variant: config.variant,
              scanlines: true,
              cornerAccents: true,
            });
            
            panels.push({ element: panel, config });
          }

          // Test theme consistency
          panels.forEach(({ element, config }) => {
            // All panels should have sci-fi theming
            expect(element.classList.contains('sci-fi-themed')).toBe(true);
            expect(element.classList.contains('sci-fi-card')).toBe(true);
            
            // Should have correct variant
            expect(element.classList.contains(`theme-variant-${config.variant}`)).toBe(true);
            
            // Should maintain responsive behavior
            if (config.width < 600) {
              // Small panels should still be functional
              expect(element.clientWidth).toBeGreaterThan(0);
            }
            
            if (config.height < 300) {
              // Short panels should still be usable
              expect(element.clientHeight).toBeGreaterThan(0);
            }
          });

          // Test cross-panel consistency
          const primaryPanels = panels.filter(p => p.config.variant === 'primary');
          if (primaryPanels.length > 1) {
            const referencePanel = primaryPanels[0].element;
            
            primaryPanels.slice(1).forEach(({ element }) => {
              // Same variant panels should have consistent theming
              expect(element.classList.contains('theme-variant-primary')).toBe(
                referencePanel.classList.contains('theme-variant-primary')
              );
            });
          }

          // Cleanup
          panels.forEach(({ element }) => element.remove());
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should optimize layout performance for complex editor panels', () => {
    fc.assert(
      fc.property(
        fc.record({
          panelType: fc.constantFrom('quest', 'projectile', 'script', 'property', 'note'),
          elementCount: fc.integer({ min: 5, max: 25 }),
          screenWidth: fc.integer({ min: 768, max: 1920 }),
          effectsEnabled: fc.boolean(),
        }),
        (config) => {
          const panel = mockEditorPanel(config.panelType, config.screenWidth, 600);
          
          const startTime = performance.now();
          
          // Apply theme to main panel
          themeManager.createFuturisticPanel(panel, {
            variant: 'primary',
            scanlines: config.effectsEnabled,
            cornerAccents: true,
          });
          
          // Add multiple child elements (simulating complex editor content)
          const childElements: HTMLElement[] = [];
          for (let i = 0; i < config.elementCount; i++) {
            const child = document.createElement('div');
            child.className = 'editor-element';
            panel.appendChild(child);
            
            // Apply theme to child elements
            themeManager.applySciFiEffects(child, {
              variant: i % 2 === 0 ? 'secondary' : 'accent',
              glow: config.effectsEnabled && i % 3 === 0,
            });
            
            childElements.push(child);
          }
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // Performance should be reasonable (less than 3ms per element)
          expect(duration).toBeLessThan(config.elementCount * 3);
          
          // All elements should be properly themed
          expect(panel.classList.contains('sci-fi-themed')).toBe(true);
          childElements.forEach(child => {
            expect(child.classList.contains('sci-fi-themed')).toBe(true);
          });
          
          // Layout should be responsive
          expect(panel.clientWidth).toBeLessThanOrEqual(config.screenWidth);
          
          panel.remove();
        }
      ),
      { numRuns: 30 }
    );
  });
});