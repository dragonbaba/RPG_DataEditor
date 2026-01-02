/**
 * ThemeManager - Enhanced theme management with sci-fi effects integration
 * 
 * Integrates the existing ThemeSystem with the new SciFiThemeSystem
 * Requirements: 2.3, 2.4, 2.7
 */

import { themeSystem, type ThemeSettings } from '../core/ThemeSystem';
import { sciFiThemeSystem, type SciFiThemeConfig } from './SciFiThemeSystem';
import { accentColorHex, type AccentColor } from './types';
import { logger } from '../services/logger';

/**
 * Enhanced theme manager that coordinates both theme systems
 */
export class ThemeManager {
  private initialized = false;

  /**
   * Initialize both theme systems
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('ThemeManager already initialized', undefined, 'ThemeManager');
      return;
    }

    // Initialize legacy theme system first
    await themeSystem.init();
    
    // Initialize sci-fi theme system with settings from legacy system
    const legacySettings = themeSystem.getSettings();
    const sciFiConfig = this.convertLegacyToSciFi(legacySettings);
    
    sciFiThemeSystem.updateTheme(sciFiConfig);
    sciFiThemeSystem.initializeTheme();
    
    this.initialized = true;
    logger.info('ThemeManager initialized', undefined, 'ThemeManager');
  }

  /**
   * Apply sci-fi effects to an element
   */
  applySciFiEffects(element: HTMLElement, options: {
    variant?: 'primary' | 'secondary' | 'accent' | 'warning' | 'success' | 'error';
    glow?: boolean;
    scanlines?: boolean;
    hologram?: boolean;
  } = {}): void {
    const { variant = 'primary', glow = true, scanlines = false, hologram = false } = options;
    
    // Apply theme variant
    sciFiThemeSystem.applyThemeToElement(element, variant);
    
    // Apply effects based on options
    if (glow) {
      const config = sciFiThemeSystem.getThemeConfig();
      sciFiThemeSystem.addGlowEffect(element, config.colors.primary);
    }
    
    if (scanlines) {
      sciFiThemeSystem.addScanlineEffect(element);
    }
    
    if (hologram) {
      sciFiThemeSystem.addHologramEffect(element);
    }
  }

  /**
   * Create futuristic button with hover effects
   */
  createFuturisticButton(element: HTMLElement, variant: 'primary' | 'secondary' | 'accent' = 'primary'): void {
    // Apply base sci-fi styling
    this.applySciFiEffects(element, { variant, glow: true });
    
    // Add futuristic button classes
    element.classList.add('sci-fi-btn');
    
    // Add hover animation
    const originalTransform = element.style.transform;
    
    element.addEventListener('mouseenter', () => {
      const motion = sciFiThemeSystem.createThemeTransition(element, 200);
      motion.start();
    });
    
    element.addEventListener('mouseleave', () => {
      element.style.transform = originalTransform;
    });
  }

  /**
   * Create futuristic input with focus effects
   */
  createFuturisticInput(element: HTMLInputElement | HTMLTextAreaElement): void {
    // Apply base sci-fi styling
    this.applySciFiEffects(element, { variant: 'primary', glow: false });
    
    // Add futuristic input classes
    element.classList.add('sci-fi-input');
    
    // Add focus glow effect
    element.addEventListener('focus', () => {
      const config = sciFiThemeSystem.getThemeConfig();
      sciFiThemeSystem.addGlowEffect(element, config.colors.primary);
    });
    
    element.addEventListener('blur', () => {
      element.classList.remove('sci-fi-glow');
      element.style.boxShadow = '';
    });
  }

  /**
   * Apply futuristic panel styling
   */
  createFuturisticPanel(element: HTMLElement, options: {
    variant?: 'primary' | 'secondary' | 'accent';
    scanlines?: boolean;
    cornerAccents?: boolean;
  } = {}): void {
    const { variant = 'primary', scanlines = true, cornerAccents = true } = options;
    
    // Apply base effects
    this.applySciFiEffects(element, { variant, glow: true, scanlines });
    
    // Add panel-specific classes
    element.classList.add('sci-fi-card');
    
    if (cornerAccents) {
      element.classList.add('corner-accents');
    }
  }

  /**
   * Update theme settings and sync both systems
   */
  async updateTheme(settings: Partial<ThemeSettings>): Promise<void> {
    // Update legacy system
    if (settings.theme) await themeSystem.setTheme(settings.theme);
    if (settings.accent) await themeSystem.setAccent(settings.accent);
    if (settings.animations !== undefined) await themeSystem.setAnimations(settings.animations);
    if (settings.fontSize) await themeSystem.setFontSize(settings.fontSize);
    if (settings.compactMode !== undefined) await themeSystem.setCompactMode(settings.compactMode);
    
    // Convert and update sci-fi system
    const currentSettings = themeSystem.getSettings();
    const sciFiConfig = this.convertLegacyToSciFi(currentSettings);
    sciFiThemeSystem.updateTheme(sciFiConfig);
    
    logger.info('Theme updated', { settings }, 'ThemeManager');
  }

  /**
   * Set theme preset with enhanced sci-fi effects
   */
  async setPreset(preset: 'cyberpunk' | 'minimal' | 'high-contrast'): Promise<void> {
    await themeSystem.setPreset(preset);
    
    // Apply preset-specific sci-fi enhancements
    const sciFiEnhancements = this.getPresetEnhancements(preset);
    sciFiThemeSystem.updateTheme(sciFiEnhancements);
    
    logger.info('Theme preset applied', { preset }, 'ThemeManager');
  }

  /**
   * Get current theme configuration
   */
  getCurrentTheme(): {
    legacy: ThemeSettings;
    sciFi: SciFiThemeConfig;
  } {
    return {
      legacy: themeSystem.getSettings(),
      sciFi: sciFiThemeSystem.getThemeConfig(),
    };
  }

  /**
   * Convert legacy theme settings to sci-fi configuration
   */
  private convertLegacyToSciFi(settings: ThemeSettings): Partial<SciFiThemeConfig> {
    const accentColor = accentColorHex[settings.accent as AccentColor];
    
    return {
      mode: settings.theme,
      accentColor: settings.accent as AccentColor,
      animationsEnabled: settings.animations,
      colors: {
        primary: accentColor,
        secondary: settings.theme === 'dark' ? '#7000ff' : '#64748b',
        accent: accentColor,
        background: settings.theme === 'dark' ? '#050a10' : '#f8fafc',
        surface: settings.theme === 'dark' ? 'rgba(16, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        text: settings.theme === 'dark' ? '#e0f2ff' : '#1e293b',
        textSecondary: '#64748b',
        border: settings.theme === 'dark' ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 240, 255, 0.25)',
        glow: this.hexToRgba(accentColor, 0.3),
        success: '#00ff9d',
        warning: '#ffb800',
        error: '#ff3366',
      },
      effects: {
        glowIntensity: settings.animations ? 0.7 : 0.3,
        scanlineOpacity: settings.preset === 'cyberpunk' ? 0.1 : 0.05,
        hologramFlicker: settings.preset === 'cyberpunk' ? 0.05 : 0.02,
        transitionDuration: settings.animations ? 300 : 150,
        particleBackground: settings.preset === 'cyberpunk',
        gridBackground: true,
        pulseAnimation: settings.animations,
      },
    };
  }

  /**
   * Get preset-specific sci-fi enhancements
   */
  private getPresetEnhancements(preset: string): Partial<SciFiThemeConfig> {
    switch (preset) {
      case 'cyberpunk':
        return {
          effects: {
            glowIntensity: 0.8,
            scanlineOpacity: 0.15,
            hologramFlicker: 0.08,
            particleBackground: true,
            gridBackground: true,
            pulseAnimation: true,
            transitionDuration: 300,
          },
          colors: {
            primary: '#00f0ff',
            secondary: '#7000ff',
            accent: '#00ff88',
            background: '#050a10',
            surface: 'rgba(16, 24, 39, 0.85)',
            text: '#e0f2ff',
            textSecondary: '#64748b',
            border: 'rgba(0, 240, 255, 0.15)',
            glow: 'rgba(0, 240, 255, 0.4)',
            success: '#00ff9d',
            warning: '#ffb800',
            error: '#ff3366',
          },
        };
      
      case 'minimal':
        return {
          effects: {
            glowIntensity: 0.3,
            scanlineOpacity: 0.02,
            hologramFlicker: 0.01,
            particleBackground: false,
            gridBackground: false,
            pulseAnimation: false,
            transitionDuration: 200,
          },
          colors: {
            primary: '#00ff88',
            secondary: '#64748b',
            accent: '#0ea5e9',
            background: '#050a10',
            surface: 'rgba(16, 24, 39, 0.85)',
            text: '#e0f2ff',
            textSecondary: '#64748b',
            border: 'rgba(0, 240, 255, 0.15)',
            glow: 'rgba(0, 255, 136, 0.2)',
            success: '#00ff9d',
            warning: '#ffb800',
            error: '#ff3366',
          },
        };
      
      case 'high-contrast':
        return {
          effects: {
            glowIntensity: 0.9,
            scanlineOpacity: 0.05,
            hologramFlicker: 0.02,
            particleBackground: false,
            gridBackground: true,
            pulseAnimation: true,
            transitionDuration: 250,
          },
          colors: {
            primary: '#ff8800',
            secondary: '#ffffff',
            accent: '#ffff00',
            background: '#000000',
            surface: 'rgba(0, 0, 0, 0.85)',
            text: '#ffffff',
            textSecondary: '#cccccc',
            border: '#ffffff',
            glow: 'rgba(255, 136, 0, 0.5)',
            success: '#00ff00',
            warning: '#ffff00',
            error: '#ff0000',
          },
        };
      
      default:
        return {};
    }
  }

  /**
   * Convert hex color to rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    sciFiThemeSystem.dispose();
    this.initialized = false;
    logger.info('ThemeManager disposed', undefined, 'ThemeManager');
  }
}

// Export singleton instance
export const themeManager = new ThemeManager();