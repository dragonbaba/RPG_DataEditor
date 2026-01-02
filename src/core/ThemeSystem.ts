/**
 * ThemeSystem - Manages the application's visual theme and settings.
 * 
 * - Applies and manages theme-related data attributes on the DOM.
 * - Handles theme presets (Cyberpunk, Minimal, High-Contrast).
 * - Persists user's theme settings to a configuration file.
 * 
 * Requirements: 1.2, 1.3, 9.1, 9.2, 9.3
 */
import { fileSystemService } from '../services/FileSystemService';

// Define the shape of our theme settings
export interface ThemeSettings {
  theme: 'light' | 'dark';
  accent: 'cyan' | 'magenta' | 'green' | 'orange';
  animations: boolean;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  preset: 'cyberpunk' | 'minimal' | 'high-contrast' | 'custom';
}

const SETTINGS_FILE_NAME = 'theme-settings.json';

const defaultSettings: ThemeSettings = {
  theme: 'dark',
  accent: 'cyan',
  animations: true,
  fontSize: 'medium',
  compactMode: false,
  preset: 'cyberpunk',
};

class ThemeSystem {
  private settings: ThemeSettings = { ...defaultSettings };
  private readonly root = document.documentElement;

  /**
   * Initializes the theme system by loading settings and applying them.
   */
  async init(): Promise<void> {
    await this.loadSettings();
    this.applyAllSettings();
  }

  /**
   * Loads theme settings from the configuration file.
   * If the file doesn't exist, it saves and uses the default settings.
   */
  private async loadSettings(): Promise<void> {
    const result = await fileSystemService.readJSON<ThemeSettings>(SETTINGS_FILE_NAME);
    if (result.success && result.data) {
      this.settings = { ...defaultSettings, ...result.data };
    } else {
      // File likely doesn't exist, so save the defaults
      this.settings = { ...defaultSettings };
      await this.saveSettings();
    }
  }

  /**
   * Saves the current theme settings to the configuration file.
   */
  private async saveSettings(): Promise<void> {
    await fileSystemService.writeJSON(SETTINGS_FILE_NAME, this.settings);
  }

  /**
   * Applies all current settings to the DOM.
   */
  private applyAllSettings(): void {
    this.applyTheme();
    this.applyAccent();
    this.applyAnimations();
    this.applyFontSize();
    this.applyCompactMode();
    this.applyPresetClasses();
  }

  // ============ Individual Setters ============

  public async setTheme(theme: 'light' | 'dark'): Promise<void> {
    this.settings.theme = theme;
    this.settings.preset = 'custom';
    this.applyTheme();
    await this.saveSettings();
  }

  public async setAccent(accent: 'cyan' | 'magenta' | 'green' | 'orange'): Promise<void> {
    this.settings.accent = accent;
    this.settings.preset = 'custom';
    this.applyAccent();
    await this.saveSettings();
  }

  public async setAnimations(enabled: boolean): Promise<void> {
    this.settings.animations = enabled;
    this.settings.preset = 'custom';
    this.applyAnimations();
    await this.saveSettings();
  }

  public async setFontSize(size: 'small' | 'medium' | 'large'): Promise<void> {
    this.settings.fontSize = size;
    this.settings.preset = 'custom';
    this.applyFontSize();
    await this.saveSettings();
  }

  public async setCompactMode(enabled: boolean): Promise<void> {
    this.settings.compactMode = enabled;
    this.settings.preset = 'custom';
    this.applyCompactMode();
    await this.saveSettings();
  }
  
  public async setPreset(preset: 'cyberpunk' | 'minimal' | 'high-contrast'): Promise<void> {
    this.settings.preset = preset;
    // Apply specific settings for the preset
    switch (preset) {
      case 'cyberpunk':
        this.settings.theme = 'dark';
        this.settings.accent = 'cyan';
        this.settings.animations = true;
        break;
      case 'minimal':
        this.settings.theme = 'dark';
        this.settings.accent = 'green';
        this.settings.animations = false;
        break;
      case 'high-contrast':
        this.settings.theme = 'light';
        this.settings.accent = 'orange';
        this.settings.animations = true;
        break;
    }
    this.applyAllSettings();
    await this.saveSettings();
  }


  // ============ DOM Applicators ============

  private applyTheme(): void {
    this.root.setAttribute('data-theme', this.settings.theme);
  }

  private applyAccent(): void {
    this.root.setAttribute('data-accent', this.settings.accent);
  }

  private applyAnimations(): void {
    this.root.setAttribute('data-animations', String(this.settings.animations));
  }

  private applyFontSize(): void {
    this.root.setAttribute('data-font-size', this.settings.fontSize);
  }



  private applyCompactMode(): void {
    if (this.settings.compactMode) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
  }

  private applyPresetClasses(): void {
    this.root.classList.remove('preset-cyberpunk', 'preset-minimal', 'preset-high-contrast');
    if (this.settings.preset !== 'custom') {
      this.root.classList.add(`preset-${this.settings.preset}`);
    }
  }

  // ============ Getters ============

  public getSettings(): Readonly<ThemeSettings> {
    return this.settings;
  }
}

export const themeSystem = new ThemeSystem();