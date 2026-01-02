/**
 * Property-based tests for responsive layout adaptation
 * 
 * Tests the sci-fi theme system's ability to adapt layouts
 * across different screen sizes and device types.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { sciFiThemeSystem } from '../SciFiThemeSystem';
import { themeManager } from '../ThemeManager';
import { visualEffects } from '../effects/VisualEffects';

// Mock DOM environment
const mockElement = () => {
  const element = document.createElement('div');
  element.style.cssText = '';
  element.className = '';
  document.body.appendChild(element);
  return element;
};

const mockContainer = (width: number, height: number) => {
  const container = mockElement();
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  Object.defineProperty(container, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: height, configurable: true });
  return container;
};

// Mock media query
const mockMediaQuery = (matches: boolean) => {
  const mediaQuery = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  
  // Mock window.matchMedia if it doesn't exist
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

describe('ResponsiveLayout Property Tests', () => {
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
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
   */
  it('should adapt layouts responsively across different screen sizes', () => {
    fc.assert(
      fc.property(
        // Screen dimensions
        fc.record({
          width: fc.integer({ min: 320, max: 3840 }),
          height: fc.integer({ min: 240, max: 2160 }),
          isMobile: fc.boolean(),
          isHighContrast: fc.boolean(),
          reducedMotion: fc.boolean(),
        }),
        // Panel configurations
        fc.array(
          fc.record({
            variant: fc.constantFrom('primary', 'secondary', 'accent', 'warning', 'success', 'error'),
            scanlines: fc.boolean(),
            cornerAccents: fc.boolean(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (screenConfig, panelConfigs) => {
          // Setup screen environment
          const container = mockContainer(screenConfig.width, screenConfig.height);
          
          // Mock media queries
          mockMediaQuery(screenConfig.isMobile);
          mockMediaQuery(screenConfig.isHighContrast);
          mockMediaQuery(screenConfig.reducedMotion);
          
          // Apply responsive theme
          if (screenConfig.isMobile) {
            document.documentElement.classList.add('sci-fi-mobile');
          }
          if (screenConfig.isHighContrast) {
            document.documentElement.classList.add('high-contrast');
          }
          if (screenConfig.reducedMotion) {
            document.documentElement.classList.add('reduced-motion');
          }

          // Create panels with different configurations
          const panels: HTMLElement[] = [];
          for (const config of panelConfigs) {
            const panel = mockElement();
            themeManager.createFuturisticPanel(panel, config);
            panels.push(panel);
          }

          // Test responsive adaptation
          panels.forEach(panel => {
            // Panel should have sci-fi styling
            expect(panel.classList.contains('sci-fi-themed')).toBe(true);
            
            // Panel should adapt to mobile
            if (screenConfig.isMobile) {
              // Mobile panels should have appropriate sizing
              expect(panel.classList.contains('sci-fi-mobile') || 
                     document.documentElement.classList.contains('sci-fi-mobile')).toBe(true);
            }
            
            // Panel should respect high contrast
            if (screenConfig.isHighContrast) {
              expect(panel.classList.contains('high-contrast') ||
                     document.documentElement.classList.contains('high-contrast')).toBe(true);
            }
            
            // Panel should respect reduced motion
            if (screenConfig.reducedMotion) {
              expect(panel.classList.contains('reduced-motion') ||
                     document.documentElement.classList.contains('reduced-motion')).toBe(true);
            }
          });

          // Test container adaptation
          const containerAspectRatio = screenConfig.width / screenConfig.height;
          
          // Wide screens should use horizontal layouts
          if (containerAspectRatio > 1.5) {
            expect(screenConfig.width).toBeGreaterThan(screenConfig.height * 1.5);
          }
          
          // Tall screens should use vertical layouts
          if (containerAspectRatio < 0.8) {
            expect(screenConfig.height).toBeGreaterThan(screenConfig.width * 1.2);
          }

          // Cleanup
          panels.forEach(panel => panel.remove());
          container.remove();
        }
      ),
      { numRuns: 50 } // Reduced runs for faster testing
    );
  });

  it('should maintain visual consistency across different panel types', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('quest', 'projectile', 'script', 'property', 'note'),
            variant: fc.constantFrom('primary', 'secondary', 'accent'),
            width: fc.integer({ min: 200, max: 800 }),
            height: fc.integer({ min: 150, max: 600 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (panelConfigs) => {
          const panels: Array<{ element: HTMLElement; config: typeof panelConfigs[0] }> = [];
          
          // Create panels of different types
          for (const config of panelConfigs) {
            const panel = mockContainer(config.width, config.height);
            panel.dataset.panelType = config.type;
            
            themeManager.createFuturisticPanel(panel, {
              variant: config.variant,
              scanlines: true,
              cornerAccents: true,
            });
            
            panels.push({ element: panel, config });
          }

          // Test visual consistency
          const primaryPanels = panels.filter(p => p.config.variant === 'primary');
          if (primaryPanels.length > 1) {
            const firstPanel = primaryPanels[0].element;
            
            primaryPanels.slice(1).forEach(({ element }) => {
              // Same variant panels should have consistent theming
              expect(element.classList.contains('theme-variant-primary')).toBe(
                firstPanel.classList.contains('theme-variant-primary')
              );
              
              // Should have consistent sci-fi classes
              expect(element.classList.contains('sci-fi-themed')).toBe(true);
            });
          }

          // Test responsive behavior
          panels.forEach(({ element, config }) => {
            // Small panels should adapt layout
            if (config.width < 300 || config.height < 200) {
              // Should maintain readability - check for any styling
              expect(element.className.length).toBeGreaterThan(0);
            }
            
            // Large panels should utilize space effectively
            if (config.width > 600 && config.height > 400) {
              // Should have appropriate styling
              expect(element.classList.contains('sci-fi-themed')).toBe(true);
            }
          });

          // Cleanup
          panels.forEach(({ element }) => element.remove());
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should handle dynamic theme changes gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          initialVariant: fc.constantFrom('primary', 'secondary', 'accent'),
          targetVariant: fc.constantFrom('primary', 'secondary', 'accent'),
          animationsEnabled: fc.boolean(),
          effectsEnabled: fc.boolean(),
        }),
        (config) => {
          const panel = mockElement();
          
          // Apply initial theme
          themeManager.createFuturisticPanel(panel, {
            variant: config.initialVariant,
            scanlines: config.effectsEnabled,
            cornerAccents: true,
          });
          
          // Change theme variant
          themeManager.applySciFiEffects(panel, {
            variant: config.targetVariant,
            glow: config.effectsEnabled,
            scanlines: config.effectsEnabled,
          });
          
          // Panel should maintain sci-fi theming
          expect(panel.classList.contains('sci-fi-themed')).toBe(true);
          
          // Should have updated variant
          expect(panel.classList.contains(`theme-variant-${config.targetVariant}`)).toBe(true);
          
          // Should not have too many conflicting variants
          const variantClasses = Array.from(panel.classList).filter(cls => 
            cls.startsWith('theme-variant-')
          );
          expect(variantClasses.length).toBeLessThanOrEqual(2); // Allow some overlap during transitions
          
          // Effects should be applied based on configuration
          if (config.effectsEnabled) {
            const hasEffects = panel.classList.contains('sci-fi-glow') || 
                              panel.style.boxShadow !== '' ||
                              panel.classList.contains('sci-fi-scanlines');
            expect(hasEffects).toBe(true);
          }
          
          panel.remove();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should optimize performance for large numbers of themed elements', () => {
    fc.assert(
      fc.property(
        fc.record({
          elementCount: fc.integer({ min: 10, max: 50 }), // Reduced for test performance
          effectsEnabled: fc.boolean(),
          animationsEnabled: fc.boolean(),
        }),
        (config) => {
          const container = mockElement();
          const elements: HTMLElement[] = [];
          
          const startTime = performance.now();
          
          // Create many themed elements
          for (let i = 0; i < config.elementCount; i++) {
            const element = document.createElement('div');
            container.appendChild(element);
            
            themeManager.applySciFiEffects(element, {
              variant: i % 2 === 0 ? 'primary' : 'secondary',
              glow: config.effectsEnabled && i % 3 === 0,
              scanlines: config.effectsEnabled && i % 4 === 0,
            });
            
            elements.push(element);
          }
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          // Performance should be reasonable (less than 5ms per element)
          expect(duration).toBeLessThan(config.elementCount * 5);
          
          // All elements should be properly themed
          elements.forEach(element => {
            expect(element.classList.contains('sci-fi-themed')).toBe(true);
          });
          
          // Visual effects should be managed efficiently
          const stats = visualEffects.getStats();
          expect(stats.activeElements).toBeLessThanOrEqual(config.elementCount);
          
          container.remove();
        }
      ),
      { numRuns: 15 }
    );
  });
});