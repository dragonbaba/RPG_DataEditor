/**
 * Sci-Fi Theme System - Enhanced theme system with futuristic styling
 * 
 * Enhanced for editor-modernization:
 * - Modern sci-fi color schemes with neon accents
 * - Dynamic CSS variables management
 * - Futuristic visual effects integration
 * - Global animation system integration
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { createMotion, Motion } from '../utils/animation';
import { delayFrames } from '../utils/delay';
import { logger } from '../services/logger';
import type { ThemeConfig, ThemeVariant } from './types';

// Enhanced theme configuration with sci-fi elements
export interface SciFiThemeConfig extends ThemeConfig {
  effects: {
    glowIntensity: number;
    scanlineOpacity: number;
    hologramFlicker: number;
    transitionDuration: number;
    particleBackground: boolean;
    gridBackground: boolean;
    pulseAnimation: boolean;
  };
  
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    glow: string;
    success: string;
    warning: string;
    error: string;
  };
  
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      medium: string;
      large: string;
    };
    letterSpacing: string;
    lineHeight: string;
  };
}

// Default sci-fi theme configuration
export const defaultSciFiTheme: SciFiThemeConfig = {
  mode: 'dark',
  accentColor: 'cyan',
  animationsEnabled: true,
  particleBackground: true,
  scanlineEffect: true,
  glowIntensity: 0.7,
  gridBackground: true,
  
  effects: {
    glowIntensity: 0.7,
    scanlineOpacity: 0.1,
    hologramFlicker: 0.05,
    transitionDuration: 300,
    particleBackground: true,
    gridBackground: true,
    pulseAnimation: true,
  },
  
  colors: {
    primary: '#00f0ff',      // Cyan
    secondary: '#7000ff',    // Purple
    accent: '#00ff88',       // Green
    background: '#050a10',   // Dark blue-black
    surface: 'rgba(16, 24, 39, 0.85)',
    text: '#e0f2ff',         // Light cyan-white
    textSecondary: '#64748b', // Muted blue-gray
    border: 'rgba(0, 240, 255, 0.15)',
    glow: 'rgba(0, 240, 255, 0.3)',
    success: '#00ff9d',
    warning: '#ffb800',
    error: '#ff3366',
  },
  
  typography: {
    fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
    fontSize: {
      small: '0.75rem',
      medium: '0.875rem',
      large: '1rem',
    },
    letterSpacing: '0.025em',
    lineHeight: '1.5',
  },
};

// Theme variants for different UI elements
export const themeVariants: Record<ThemeVariant, Partial<SciFiThemeConfig['colors']>> = {
  primary: {
    primary: '#00f0ff',
    glow: 'rgba(0, 240, 255, 0.3)',
  },
  secondary: {
    primary: '#7000ff',
    glow: 'rgba(112, 0, 255, 0.3)',
  },
  accent: {
    primary: '#00ff88',
    glow: 'rgba(0, 255, 136, 0.3)',
  },
  warning: {
    primary: '#ffb800',
    glow: 'rgba(255, 184, 0, 0.3)',
  },
  success: {
    primary: '#00ff9d',
    glow: 'rgba(0, 255, 157, 0.3)',
  },
  error: {
    primary: '#ff3366',
    glow: 'rgba(255, 51, 102, 0.3)',
  },
};

/**
 * Enhanced Sci-Fi Theme System
 */
export class SciFiThemeSystem {
  private config: SciFiThemeConfig = { ...defaultSciFiTheme };
  private root: HTMLElement = document.documentElement;
  private initialized = false;
  
  // Pre-created animations for performance
  private glowAnimation: Motion | null = null;
  private pulseAnimation: Motion | null = null;
  
  /**
   * Initialize the theme system
   */
  initializeTheme(): void {
    if (this.initialized) {
      logger.warn('SciFiThemeSystem already initialized', undefined, 'SciFiThemeSystem');
      return;
    }
    
    this.setupCSSVariables();
    this.applyBaseTheme();
    this.initializeAnimations();
    this.setupResponsiveHandlers();
    
    this.initialized = true;
    logger.info('SciFiThemeSystem initialized', undefined, 'SciFiThemeSystem');
  }
  
  /**
   * Apply theme to a specific element
   * Enhanced with error handling and fallback mechanisms
   */
  applyThemeToElement(element: HTMLElement, variant: ThemeVariant = 'primary'): void {
    try {
      const variantColors = themeVariants[variant];
      
      // Apply variant-specific CSS custom properties
      Object.entries(variantColors).forEach(([key, value]) => {
        if (value) {
          try {
            element.style.setProperty(`--theme-${key}`, value);
          } catch (error) {
            logger.warn('Failed to set CSS property', { key, value, error }, 'SciFiThemeSystem');
            // Fallback: apply basic styling
            this.applyFallbackStyling(element, key, value);
          }
        }
      });
      
      // Add theme classes with error handling
      try {
        element.classList.add('sci-fi-themed', `theme-variant-${variant}`);
      } catch (error) {
        logger.warn('Failed to add theme classes', { variant, error }, 'SciFiThemeSystem');
        // Fallback: apply inline styles
        this.applyFallbackTheme(element, variant);
      }
      
      // Apply accessibility attributes with error handling
      try {
        this.ensureAccessibility(element);
      } catch (error) {
        logger.warn('Failed to apply accessibility attributes', { error }, 'SciFiThemeSystem');
        // Continue without accessibility enhancements
      }
      
      logger.debug('Applied theme to element', { variant }, 'SciFiThemeSystem');
    } catch (error) {
      logger.error('Failed to apply theme to element', { variant, error }, 'SciFiThemeSystem');
      // Fallback to basic theme
      this.applyBasicTheme(element);
    }
  }
  
  /**
   * Add glow effect to element
   * Enhanced with error handling and fallback
   */
  addGlowEffect(element: HTMLElement, color: string = this.config.colors.primary): void {
    try {
      const glowIntensity = this.config.effects.glowIntensity;
      const glowColor = this.hexToRgba(color, glowIntensity * 0.3);
      
      element.style.setProperty('--glow-color', glowColor);
      element.style.boxShadow = `0 0 ${10 * glowIntensity}px ${glowColor}`;
      element.classList.add('sci-fi-glow');
      
      // Add pulsing animation if enabled
      if (this.config.effects.pulseAnimation && this.config.animationsEnabled) {
        try {
          this.addPulseAnimation(element);
        } catch (error) {
          logger.warn('Failed to add pulse animation', { error }, 'SciFiThemeSystem');
          // Continue without animation
        }
      }
    } catch (error) {
      logger.warn('Failed to add glow effect', { color, error }, 'SciFiThemeSystem');
      // Fallback: add basic border
      element.style.border = `1px solid ${color}`;
      element.classList.add('sci-fi-glow-fallback');
    }
  }

  /**
   * Add scanline effect to element
   * Enhanced with error handling
   */
  addScanlineEffect(element: HTMLElement): void {
    if (!this.config.scanlineEffect) return;
    
    try {
      const scanlineOpacity = this.config.effects.scanlineOpacity;
      element.classList.add('sci-fi-scanlines');
      element.style.setProperty('--scanline-opacity', scanlineOpacity.toString());
    } catch (error) {
      logger.warn('Failed to add scanline effect', { error }, 'SciFiThemeSystem');
      // Fallback: add subtle background pattern
      element.style.backgroundImage = 'linear-gradient(transparent 50%, rgba(0, 240, 255, 0.03) 50%)';
      element.style.backgroundSize = '100% 2px';
    }
  }

  /**
   * Add hologram effect to element
   * Enhanced with error handling
   */
  addHologramEffect(element: HTMLElement): void {
    try {
      const flickerIntensity = this.config.effects.hologramFlicker;
      element.classList.add('sci-fi-hologram');
      element.style.setProperty('--flicker-intensity', flickerIntensity.toString());
      
      if (this.config.animationsEnabled) {
        try {
          this.addHologramAnimation(element);
        } catch (error) {
          logger.warn('Failed to add hologram animation', { error }, 'SciFiThemeSystem');
          // Continue without animation
        }
      }
    } catch (error) {
      logger.warn('Failed to add hologram effect', { error }, 'SciFiThemeSystem');
      // Fallback: add subtle opacity variation
      element.style.opacity = '0.95';
      element.classList.add('sci-fi-hologram-fallback');
    }
  }
  
  /**
   * Create theme transition animation
   */
  createThemeTransition(element: HTMLElement, duration: number = this.config.effects.transitionDuration): Motion {
    return createMotion()
      .setAnimation(0, 1, 'easeOutQuad')
      .setFrames(Math.floor(duration / 16)) // Convert ms to frames (60fps)
      .onUpdate((values) => {
        const progress = values[0];
        element.style.opacity = progress.toString();
        element.style.transform = `scale(${0.95 + progress * 0.05})`;
      })
      .onComplete(() => {
        element.style.opacity = '1';
        element.style.transform = 'scale(1)';
      });
  }
  
  /**
   * Update theme configuration
   * Enhanced with input validation
   */
  updateTheme(newConfig: Partial<SciFiThemeConfig>): void {
    // Validate and sanitize input configuration
    const sanitizedConfig = this.sanitizeConfig(newConfig);
    
    // Deep merge configuration to handle nested objects properly
    this.config = {
      ...this.config,
      ...sanitizedConfig,
      effects: {
        ...this.config.effects,
        ...(sanitizedConfig.effects || {}),
      },
      colors: {
        ...this.config.colors,
        ...(sanitizedConfig.colors || {}),
      },
      typography: {
        ...this.config.typography,
        ...(sanitizedConfig.typography || {}),
        fontSize: {
          ...this.config.typography.fontSize,
          ...(sanitizedConfig.typography?.fontSize || {}),
        },
      },
    };
    
    this.setupCSSVariables();
    this.applyBaseTheme();
    
    logger.info('Theme configuration updated', { config: sanitizedConfig }, 'SciFiThemeSystem');
  }
  
  /**
   * Get current theme configuration
   */
  getThemeConfig(): Readonly<SciFiThemeConfig> {
    return this.config;
  }
  
  /**
   * Setup CSS custom properties
   */
  private setupCSSVariables(): void {
    const { colors, typography, effects } = this.config;
    
    // Color variables
    Object.entries(colors).forEach(([key, value]) => {
      this.root.style.setProperty(`--sci-fi-${key}`, value);
    });
    
    // Typography variables
    this.root.style.setProperty('--sci-fi-font-family', typography.fontFamily);
    this.root.style.setProperty('--sci-fi-letter-spacing', typography.letterSpacing);
    this.root.style.setProperty('--sci-fi-line-height', typography.lineHeight);
    
    Object.entries(typography.fontSize).forEach(([key, value]) => {
      this.root.style.setProperty(`--sci-fi-font-${key}`, value);
    });
    
    // Effect variables
    this.root.style.setProperty('--sci-fi-glow-intensity', effects.glowIntensity.toString());
    this.root.style.setProperty('--sci-fi-scanline-opacity', effects.scanlineOpacity.toString());
    this.root.style.setProperty('--sci-fi-transition-duration', `${effects.transitionDuration}ms`);
  }
  
  /**
   * Apply base theme classes and attributes
   */
  private applyBaseTheme(): void {
    // Remove existing theme classes
    this.root.classList.remove('sci-fi-light', 'sci-fi-dark');
    
    // Apply theme mode
    this.root.classList.add(`sci-fi-${this.config.mode}`);
    
    // Apply accent color
    this.root.setAttribute('data-accent-color', this.config.accentColor);
    
    // Apply effect toggles
    this.root.classList.toggle('sci-fi-animations', this.config.animationsEnabled);
    this.root.classList.toggle('sci-fi-particles', this.config.effects.particleBackground);
    this.root.classList.toggle('sci-fi-grid', this.config.effects.gridBackground);
    this.root.classList.toggle('sci-fi-scanlines-global', this.config.scanlineEffect);
  }
  
  /**
   * Initialize pre-built animations for performance
   */
  private initializeAnimations(): void {
    if (!this.config.animationsEnabled) return;
    
    // Pre-create glow animation
    this.glowAnimation = createMotion()
      .setAnimation(0.5, 1, 'easeInOutSine')
      .setFrames(60)
      .reserve(true)
      .repeat(-1) // Infinite
      .autoReturn(false);
    
    // Pre-create pulse animation
    this.pulseAnimation = createMotion()
      .setAnimation(1, 1.05, 'easeInOutQuad')
      .setFrames(30)
      .reserve(true)
      .repeat(-1)
      .autoReturn(false);
  }
  
  /**
   * Add pulse animation to element
   */
  private addPulseAnimation(element: HTMLElement): void {
    if (!this.pulseAnimation) return;
    
    createMotion()
      .setAnimation(1, 1.02, 'easeInOutSine')
      .setFrames(45)
      .reserve(true)
      .repeat(-1)
      .onUpdate((values) => {
        const scale = values[0];
        element.style.transform = `scale(${scale})`;
      })
      .start(element);
  }
  
  /**
   * Add hologram flicker animation
   */
  private addHologramAnimation(element: HTMLElement): void {
    createMotion()
      .setAnimation(1, 0.95, 'linear')
      .setFrames(3)
      .onUpdate((values) => {
        const opacity = values[0];
        element.style.opacity = opacity.toString();
      })
      .onComplete(() => {
        element.style.opacity = '1';
        // Random delay before next flicker using global animation system
        if (Math.random() < this.config.effects.hologramFlicker) {
          // Schedule next flicker through global loop instead of setTimeout
          const delayFrameCount = Math.floor(60 + Math.random() * 180); // 1-3 seconds at 60fps
          delayFrames(() => this.addHologramAnimation(element), delayFrameCount);
        }
      })
      .start();
  }
  
  /**
   * Setup responsive design handlers
   */
  private setupResponsiveHandlers(): void {
    // Check if matchMedia is available (not available in some test environments)
    if (typeof window === 'undefined' || !window.matchMedia) {
      logger.debug('matchMedia not available, skipping responsive handlers', undefined, 'SciFiThemeSystem');
      return;
    }

    // Handle screen size changes
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleScreenChange = (e: MediaQueryListEvent) => {
      this.root.classList.toggle('sci-fi-mobile', e.matches);
    };
    
    // Use modern addEventListener instead of deprecated addListener
    mediaQuery.addEventListener('change', handleScreenChange);
    handleScreenChange(mediaQuery as any);
  }
  
  /**
   * Ensure accessibility compliance
   * Enhanced with comprehensive accessibility checks
   */
  private ensureAccessibility(element: HTMLElement): void {
    // Check if matchMedia is available
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    // Add high contrast mode support
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      element.classList.add('high-contrast');
      element.setAttribute('data-high-contrast', 'true');
    }
    
    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.classList.add('reduced-motion');
      element.setAttribute('data-reduced-motion', 'true');
    }

    // Ensure proper ARIA attributes for themed elements
    this.ensureAriaAttributes(element);
    
    // Ensure keyboard accessibility
    this.ensureKeyboardAccessibility(element);
    
    // Ensure color contrast compliance
    this.ensureColorContrast(element);
  }

  /**
   * Ensure proper ARIA attributes
   */
  private ensureAriaAttributes(element: HTMLElement): void {
    // Add role if not present for interactive elements
    if (this.isInteractiveElement(element) && !element.getAttribute('role')) {
      element.setAttribute('role', 'button');
    }

    // Ensure aria-label for elements with only visual content
    if (this.needsAriaLabel(element) && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
      const label = this.generateAriaLabel(element);
      if (label) {
        element.setAttribute('aria-label', label);
      }
    }

    // Add aria-describedby for elements with glow effects
    if (element.classList.contains('sci-fi-glow')) {
      element.setAttribute('aria-describedby', 'sci-fi-glow-description');
      this.ensureGlowDescription();
    }
  }

  /**
   * Ensure keyboard accessibility
   */
  private ensureKeyboardAccessibility(element: HTMLElement): void {
    // Make interactive elements keyboard accessible
    if (this.isInteractiveElement(element) && !element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }

    // Add keyboard event handlers for custom interactive elements
    if (this.isInteractiveElement(element) && !element.dataset.keyboardHandlerAdded) {
      element.addEventListener('keydown', this.handleKeyboardInteraction.bind(this));
      element.dataset.keyboardHandlerAdded = 'true';
    }
  }

  /**
   * Ensure color contrast compliance
   */
  private ensureColorContrast(element: HTMLElement): void {
    // Add high contrast class if needed
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
      element.classList.add('high-contrast-mode');
      
      // Override theme colors for better contrast
      element.style.setProperty('--theme-text', '#ffffff');
      element.style.setProperty('--theme-background', '#000000');
      element.style.setProperty('--theme-border', '#ffffff');
    }
  }

  /**
   * Check if element is interactive
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem'];
    
    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           interactiveRoles.includes(element.getAttribute('role') || '') ||
           element.classList.contains('clickable') ||
           element.onclick !== null;
  }

  /**
   * Check if element needs aria-label
   */
  private needsAriaLabel(element: HTMLElement): boolean {
    return this.isInteractiveElement(element) && 
           !element.textContent?.trim() &&
           !element.querySelector('img[alt], [aria-label]');
  }

  /**
   * Generate appropriate aria-label
   */
  private generateAriaLabel(element: HTMLElement): string | null {
    // Try to get label from class names
    if (element.classList.contains('sci-fi-glow')) {
      return 'Glowing interactive element';
    }
    if (element.classList.contains('sci-fi-hologram')) {
      return 'Holographic interface element';
    }
    if (element.classList.contains('sci-fi-scanlines')) {
      return 'Futuristic interface panel';
    }
    
    // Try to get label from data attributes
    const label = element.dataset.ariaLabel || element.dataset.label;
    if (label) {
      return label;
    }
    
    return null;
  }

  /**
   * Handle keyboard interactions for themed elements
   */
  private handleKeyboardInteraction(event: KeyboardEvent): void {
    const element = event.target as HTMLElement;
    
    // Handle Enter and Space as click for custom interactive elements
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      
      // Add visual feedback
      element.classList.add('keyboard-activated');
      delayFrames(() => {
        element.classList.remove('keyboard-activated');
      }, 9); // 9 frames ≈ 150ms at 60fps
      
      // Trigger click event
      element.click();
    }
  }

  /**
   * Ensure glow effect description exists
   */
  private ensureGlowDescription(): void {
    if (!document.getElementById('sci-fi-glow-description')) {
      const description = document.createElement('div');
      description.id = 'sci-fi-glow-description';
      description.className = 'sr-only';
      description.textContent = 'This element has a futuristic glow effect for visual enhancement';
      document.body.appendChild(description);
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
   * Cleanup and dispose
   */
  dispose(): void {
    if (this.glowAnimation) {
      this.glowAnimation.stop();
    }
    if (this.pulseAnimation) {
      this.pulseAnimation.stop();
    }
    
    this.initialized = false;
    logger.info('SciFiThemeSystem disposed', undefined, 'SciFiThemeSystem');
  }

  /**
   * Apply fallback styling when CSS properties fail
   */
  private applyFallbackStyling(element: HTMLElement, property: string, value: string): void {
    try {
      switch (property) {
        case 'primary':
          element.style.color = value;
          break;
        case 'background':
          element.style.backgroundColor = value;
          break;
        case 'border':
          element.style.borderColor = value;
          break;
        default:
          // Generic fallback
          element.style.setProperty(property, value);
      }
    } catch (error) {
      logger.warn('Fallback styling also failed', { property, value, error }, 'SciFiThemeSystem');
    }
  }

  /**
   * Apply fallback theme when class addition fails
   */
  private applyFallbackTheme(element: HTMLElement, variant: ThemeVariant): void {
    const colors = themeVariants[variant];
    if (colors.primary) {
      element.style.color = colors.primary;
    }
    if (colors.glow) {
      element.style.boxShadow = `0 0 5px ${colors.glow}`;
    }
  }

  /**
   * Apply basic theme as last resort
   */
  private applyBasicTheme(element: HTMLElement): void {
    element.style.color = '#e0f2ff';
    element.style.backgroundColor = 'rgba(16, 24, 39, 0.85)';
    element.style.border = '1px solid rgba(0, 240, 255, 0.15)';
  }

  /**
   * Sanitize configuration input to prevent invalid values
   */
  private sanitizeConfig(config: Partial<SciFiThemeConfig>): Partial<SciFiThemeConfig> {
    const sanitized: Partial<SciFiThemeConfig> = { ...config };
    
    // Sanitize effects
    if (sanitized.effects) {
      const effects = sanitized.effects;
      if (typeof effects.glowIntensity === 'number') {
        effects.glowIntensity = Number.isNaN(effects.glowIntensity) ? 0.7 : 
                               Math.max(0, Math.min(1, effects.glowIntensity));
      }
      if (typeof effects.scanlineOpacity === 'number') {
        effects.scanlineOpacity = Number.isNaN(effects.scanlineOpacity) ? 0.1 : 
                                  Math.max(0, Math.min(1, effects.scanlineOpacity));
      }
      if (typeof effects.hologramFlicker === 'number') {
        effects.hologramFlicker = Number.isNaN(effects.hologramFlicker) ? 0.05 : 
                                  Math.max(0, Math.min(1, effects.hologramFlicker));
      }
      if (typeof effects.transitionDuration === 'number') {
        effects.transitionDuration = Number.isNaN(effects.transitionDuration) ? 300 : 
                                     Math.max(0, effects.transitionDuration);
      }
    }
    
    // Sanitize top-level numeric properties
    if (typeof sanitized.glowIntensity === 'number') {
      sanitized.glowIntensity = Number.isNaN(sanitized.glowIntensity) ? 0.7 : 
                               Math.max(0, Math.min(1, sanitized.glowIntensity));
    }
    
    return sanitized;
  }
}

// Export singleton instance
export const sciFiThemeSystem = new SciFiThemeSystem();