/**
 * Theme Settings Tests
 * 验证主题设置功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { themeSystem } from '../../core/ThemeSystem';

describe('Theme Settings', () => {
  beforeEach(async () => {
    // Mock file system
    vi.mock('../../services/FileSystemService', () => ({
      fileSystemService: {
        readJSON: vi.fn().mockResolvedValue({ success: true, data: null }),
        writeJSON: vi.fn().mockResolvedValue(undefined),
      }
    }));

    await themeSystem.init();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Theme Mode', () => {
    it('should set dark theme', async () => {
      await themeSystem.setTheme('dark');
      const settings = themeSystem.getSettings();
      expect(settings.theme).toBe('dark');
    });

    it('should set light theme', async () => {
      await themeSystem.setTheme('light');
      const settings = themeSystem.getSettings();
      expect(settings.theme).toBe('light');
    });
  });

  describe('Accent Colors', () => {
    it('should set cyan accent', async () => {
      await themeSystem.setAccent('cyan');
      const settings = themeSystem.getSettings();
      expect(settings.accent).toBe('cyan');
    });

    it('should set magenta accent', async () => {
      await themeSystem.setAccent('magenta');
      const settings = themeSystem.getSettings();
      expect(settings.accent).toBe('magenta');
    });

    it('should set green accent', async () => {
      await themeSystem.setAccent('green');
      const settings = themeSystem.getSettings();
      expect(settings.accent).toBe('green');
    });

    it('should set orange accent', async () => {
      await themeSystem.setAccent('orange');
      const settings = themeSystem.getSettings();
      expect(settings.accent).toBe('orange');
    });
  });

  describe('Font Size', () => {
    it('should set small font size', async () => {
      await themeSystem.setFontSize('small');
      const settings = themeSystem.getSettings();
      expect(settings.fontSize).toBe('small');
    });

    it('should set medium font size', async () => {
      await themeSystem.setFontSize('medium');
      const settings = themeSystem.getSettings();
      expect(settings.fontSize).toBe('medium');
    });

    it('should set large font size', async () => {
      await themeSystem.setFontSize('large');
      const settings = themeSystem.getSettings();
      expect(settings.fontSize).toBe('large');
    });
  });

  describe('Animations', () => {
    it('should enable animations', async () => {
      await themeSystem.setAnimations(true);
      const settings = themeSystem.getSettings();
      expect(settings.animations).toBe(true);
    });

    it('should disable animations', async () => {
      await themeSystem.setAnimations(false);
      const settings = themeSystem.getSettings();
      expect(settings.animations).toBe(false);
    });
  });

  describe('Compact Mode', () => {
    it('should enable compact mode', async () => {
      await themeSystem.setCompactMode(true);
      const settings = themeSystem.getSettings();
      expect(settings.compactMode).toBe(true);
    });

    it('should disable compact mode', async () => {
      await themeSystem.setCompactMode(false);
      const settings = themeSystem.getSettings();
      expect(settings.compactMode).toBe(false);
    });
  });

  describe('Theme Presets', () => {
    it('should apply cyberpunk preset', async () => {
      await themeSystem.setPreset('cyberpunk');
      const settings = themeSystem.getSettings();
      expect(settings.preset).toBe('cyberpunk');
      expect(settings.theme).toBe('dark');
      expect(settings.accent).toBe('cyan');
      expect(settings.animations).toBe(true);
    });

    it('should apply minimal preset', async () => {
      await themeSystem.setPreset('minimal');
      const settings = themeSystem.getSettings();
      expect(settings.preset).toBe('minimal');
      expect(settings.theme).toBe('dark');
      expect(settings.accent).toBe('green');
      expect(settings.animations).toBe(false);
    });

    it('should apply high-contrast preset', async () => {
      await themeSystem.setPreset('high-contrast');
      const settings = themeSystem.getSettings();
      expect(settings.preset).toBe('high-contrast');
      expect(settings.theme).toBe('light');
      expect(settings.accent).toBe('orange');
      expect(settings.animations).toBe(true);
    });
  });

  describe('DOM Attributes', () => {
    it('should apply theme attributes to document root', async () => {
      const root = document.documentElement;
      
      await themeSystem.setTheme('dark');
      expect(root.getAttribute('data-theme')).toBe('dark');
      
      await themeSystem.setAccent('cyan');
      expect(root.getAttribute('data-accent')).toBe('cyan');
      
      await themeSystem.setAnimations(true);
      expect(root.getAttribute('data-animations')).toBe('true');
      
      await themeSystem.setFontSize('large');
      expect(root.getAttribute('data-font-size')).toBe('large');
    });

    it('should apply compact mode class to body', async () => {
      const body = document.body;
      
      await themeSystem.setCompactMode(true);
      expect(body.classList.contains('compact-mode')).toBe(true);
      
      await themeSystem.setCompactMode(false);
      expect(body.classList.contains('compact-mode')).toBe(false);
    });
  });
});