// Editor mode types
export type EditorMode = 'script' | 'property' | 'note' | 'projectile' | 'quest';

// RPG Data types
export interface RPGItem {
  id: number;
  name: string;
  description?: string[];
  note?: string;
  meta?: Record<string, unknown>;
  params?: number[];
  customParams?: Record<string, number>;
}

export interface QuestRequirement {
  type: number;
  description?: string;
  operator?: string;
  targetValue?: number | boolean;
  questId?: number;
  actorId?: number;
  itemId?: number;
  weaponId?: number;
  armorId?: number;
  switchId?: number;
  variableId?: number;
  [key: string]: unknown;
}

export interface QuestObjective {
  type: number;
  enemyId?: number;
  itemId?: number;
  weaponId?: number;
  armorId?: number;
  switchId?: number;
  variableId?: number;
  targetValue?: number | boolean;
  calculateType?: boolean;
  operator?: string;
  description?: string;
  switches?: Array<{ switchId: number; value: boolean }>;
  variables?: Array<{ variableId: number; value: number; op: string }>;
  [key: string]: unknown;
}

export interface QuestReward {
  type: number;
  itemId?: number;
  weaponId?: number;
  armorId?: number;
  switchId?: number;
  variableId?: number;
  targetValue?: number | boolean;
  op?: string;
  description?: string;
  [key: string]: unknown;
}

export interface SwitchAction {
  switchId: number;
  value: boolean;
}

export interface VariableAction {
  variableId: number;
  value: number;
  op: string;
}

export interface RPGQuest {
  id?: number;
  title: string;
  giver: string;
  category: boolean;
  repeatable: boolean;
  difficulty: number;
  description: string[];
  requirements: QuestRequirement[];
  objectives: QuestObjective[];
  rewards: QuestReward[];
  startSwitches: SwitchAction[];
  switches: SwitchAction[];
  startVariables: VariableAction[];
  variables: VariableAction[];
}

export type EasingType =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | 'easeInSine'
  | 'easeOutSine'
  | 'easeInOutSine'
  | 'easeInExpo'
  | 'easeOutExpo'
  | 'easeInOutExpo'
  | 'easeInCirc'
  | 'easeOutCirc'
  | 'easeInOutCirc'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInOutElastic'
  | 'easeInBack'
  | 'easeOutBack'
  | 'easeInOutBack'
  | 'easeInBounce'
  | 'easeOutBounce'
  | 'easeInOutBounce';

export interface TrajectorySegment {
  targetX: number;
  targetY: number;
  duration: number;
  easeX: EasingType;
  easeY: EasingType;
}

export interface ProjectileTemplate {
  id?: number;
  name: string;
  startAnimationId: number;
  launchAnimation: {
    animationId: number;
    segments: TrajectorySegment[];
  };
  endAnimationId: number;
}

// History entry for undo/redo
export interface HistoryEntry {
  id: string;
  timestamp: number;
  type: 'update' | 'create' | 'delete';
  target: string;
  previousValue: unknown;
  newValue: unknown;
}

// Editor config
export interface EditorConfig {
  dataPath: string;
  scriptSavePath: string;
  scriptPath?: string;
  imagePath?: string;
  workspacePath?: string;

  workspaceRoot: string;
  recentFiles: string[];
  theme: 'dark' | 'light';
  accentColor: 'cyan' | 'magenta' | 'green' | 'orange';
  animationsEnabled: boolean;
  themePreset: 'cyberpunk' | 'minimal' | 'high-contrast';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  updateCheckFrequency: 'startup' | 'daily' | 'weekly' | 'manual';
}

// Theme config
export interface ThemeConfig {
  mode: 'dark' | 'light';
  accentColor: 'cyan' | 'magenta' | 'green' | 'orange';
  animationsEnabled: boolean;
  particleBackground: boolean;
  scanlineEffect: boolean;
  glowIntensity: number;
}
