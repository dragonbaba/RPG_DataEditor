/**
 * DataLoaderService - 数据加载服务
 * Requirements: 2.5, 3
 * 
 * 统一管理弹道编辑器和任务编辑器的 RPG Maker 数据文件加载
 */

import { logger } from './logger';
import { ipc } from './ipc';

const log = logger.createChild('DataLoaderService');

// ============ 类型定义 ============

/**
 * 动画数据
 */
export interface AnimationData {
  id: number;
  name: string;
}

/**
 * 角色/敌人数据
 */
export interface BattlerData {
  id: number;
  name: string;
  projectileOffset?: Record<number, { x: number; y: number }>;
}

/**
 * 武器数据
 */
export interface WeaponData {
  id: number;
  name: string;
  wtypeId?: number;
}

/**
 * 技能数据
 */
export interface SkillData {
  id: number;
  name: string;
}

/**
 * 物品数据
 */
export interface ItemData {
  id: number;
  name: string;
}

/**
 * 防具数据
 */
export interface ArmorData {
  id: number;
  name: string;
}

/**
 * 系统数据
 */
export interface SystemData {
  switches: string[];
  variables: string[];
}

/**
 * 弹道偏移配置
 */
export interface ProjectileOffset {
  [key: number]: { x: number; y: number };
}

/**
 * 数据加载状态
 */
export interface DataLoadState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  filePath: string | null;
}

/**
 * 数据加载结果
 */
export interface DataLoadResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============ 默认文件名 ============

const DEFAULT_FILES = {
  animations: 'Animations.json',
  actors: 'Actors.json',
  enemies: 'Enemies.json',
  weapons: 'Weapons.json',
  skills: 'Skills.json',
  items: 'Items.json',
  armors: 'Armors.json',
  system: 'System.json',
} as const;

// ============ DataLoaderService 类 ============

/**
 * 数据加载服务
 * 单例模式，负责加载和缓存 RPG Maker 数据文件
 */
class DataLoaderServiceImpl {
  private static _instance: DataLoaderServiceImpl | null = null;
  
  /** 数据路径 */
  private dataPath: string = '';
  
  /** 缓存的数据 */
  private cache: Map<string, unknown> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): DataLoaderServiceImpl {
    if (!DataLoaderServiceImpl._instance) {
      DataLoaderServiceImpl._instance = new DataLoaderServiceImpl();
    }
    return DataLoaderServiceImpl._instance;
  }

  /**
   * 设置数据路径
   */
  setDataPath(path: string): void {
    this.dataPath = path;
    log.info(`Data path set to: ${path}`);
  }

  /**
   * 获取数据路径
   */
  getDataPath(): string {
    return this.dataPath;
  }

  /**
   * 获取默认文件路径
   */
  getDefaultPath(dataType: keyof typeof DEFAULT_FILES): string {
    const fileName = DEFAULT_FILES[dataType];
    return this.dataPath ? `${this.dataPath}/${fileName}` : fileName;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    log.debug('Cache cleared');
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache<T>(key: string): T | null {
    return this.cache.get(key) as T | null;
  }

  /**
   * 设置缓存
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, data);
  }

  // ============ 通用加载方法 ============

  /**
   * 加载 JSON 文件
   */
  private async loadJsonFile<T>(filePath: string): Promise<DataLoadResult<T>> {
    try {
      log.debug(`Loading file: ${filePath}`);
      
      const content = await ipc.invoke('file:read', filePath);
      const data = JSON.parse(content) as T;
      
      log.debug(`File loaded successfully: ${filePath}`);
      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Failed to load file: ${filePath}`, { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 提取有效数据项（过滤 null 项）
   */
  private extractValidItems<T extends { id: number; name: string }>(
    rawData: (T | null)[]
  ): T[] {
    const results: T[] = [];
    for (let i = 0; i < rawData.length; i++) {
      const item = rawData[i];
      if (item && item.id > 0 && item.name) {
        results.push(item);
      }
    }
    return results;
  }

  // ============ 弹道编辑器数据加载 ============

  /**
   * 加载动画数据
   * Requirements: 2.5.1, 2.5.2
   */
  async loadAnimations(path?: string): Promise<DataLoadResult<AnimationData[]>> {
    const filePath = path || this.getDefaultPath('animations');
    const cacheKey = `animations:${filePath}`;
    
    // 检查缓存
    const cached = this.getFromCache<AnimationData[]>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const result = await this.loadJsonFile<(AnimationData | null)[]>(filePath);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const animations = this.extractValidItems(result.data);
    this.setCache(cacheKey, animations);
    
    log.info(`Loaded ${animations.length} animations`);
    return { success: true, data: animations };
  }

  /**
   * 加载角色数据
   * Requirements: 2.5.1, 2.5.3
   */
  async loadActors(path?: string): Promise<DataLoadResult<BattlerData[]>> {
    const filePath = path || this.getDefaultPath('actors');
    const cacheKey = `actors:${filePath}`;
    
    const cached = this.getFromCache<BattlerData[]>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const result = await this.loadJsonFile<(BattlerData | null)[]>(filePath);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const actors = this.extractValidItems(result.data);
    this.setCache(cacheKey, actors);
    
    log.info(`Loaded ${actors.length} actors`);
    return { success: true, data: actors };
  }

  /**
   * 加载敌人数据
   * Requirements: 2.5.1, 2.5.4
   */
  async loadEnemies(path?: string): Promise<DataLoadResult<BattlerData[]>> {
    const filePath = path || this.getDefaultPath('enemies');
    const cacheKey = `enemies:${filePath}`;
    
    const cached = this.getFromCache<BattlerData[]>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const result = await this.loadJsonFile<(BattlerData | null)[]>(filePath);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const enemies = this.extractValidItems(result.data);
    this.setCache(cacheKey, enemies);
    
    log.info(`Loaded ${enemies.length} enemies`);
    return { success: true, data: enemies };
  }

  /**
   * 加载武器数据
   * Requirements: 2.5.1
   */
  async loadWeapons(path?: string): Promise<DataLoadResult<WeaponData[]>> {
    const filePath = path || this.getDefaultPath('weapons');
    const cacheKey = `weapons:${filePath}`;
    
    const cached = this.getFromCache<WeaponData[]>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const result = await this.loadJsonFile<(WeaponData | null)[]>(filePath);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const weapons = this.extractValidItems(result.data);
    this.setCache(cacheKey, weapons);
    
    log.info(`Loaded ${weapons.length} weapons`);
    return { success: true, data: weapons };
  }

  /**
   * 加载技能数据
   * Requirements: 2.5.1
   */
  async loadSkills(path?: string): Promise<DataLoadResult<SkillData[]>> {
    const filePath = path || this.getDefaultPath('skills');
    const cacheKey = `skills:${filePath}`;
    
    const cached = this.getFromCache<SkillData[]>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const result = await this.loadJsonFile<(SkillData | null)[]>(filePath);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const skills = this.extractValidItems(result.data);
    this.setCache(cacheKey, skills);
    
    log.info(`Loaded ${skills.length} skills`);
    return { success: true, data: skills };
  }

  // ============ 任务编辑器数据加载 ============

  /**
   * 加载系统数据
   * Requirements: 3.1, 3.2
   */
  async loadSystem(path?: string): Promise<DataLoadResult<SystemData>> {
    const filePath = path || this.getDefaultPath('system');
    const cacheKey = `system:${filePath}`;
    
    const cached = this.getFromCache<SystemData>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const result = await this.loadJsonFile<{ switches: string[]; variables: string[] }>(filePath);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const systemData: SystemData = {
      switches: result.data.switches || [],
      variables: result.data.variables || [],
    };
    
    this.setCache(cacheKey, systemData);
    
    log.info(`Loaded system data: ${systemData.switches.length} switches, ${systemData.variables.length} variables`);
    return { success: true, data: systemData };
  }

  /**
   * 加载物品数据
   * Requirements: 3.1
   */
  async loadItems(path?: string): Promise<DataLoadResult<ItemData[]>> {
    const filePath = path || this.getDefaultPath('items');
    const cacheKey = `items:${filePath}`;
    
    const cached = this.getFromCache<ItemData[]>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const result = await this.loadJsonFile<(ItemData | null)[]>(filePath);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const items = this.extractValidItems(result.data);
    this.setCache(cacheKey, items);
    
    log.info(`Loaded ${items.length} items`);
    return { success: true, data: items };
  }

  /**
   * 加载防具数据
   * Requirements: 3.1
   */
  async loadArmors(path?: string): Promise<DataLoadResult<ArmorData[]>> {
    const filePath = path || this.getDefaultPath('armors');
    const cacheKey = `armors:${filePath}`;
    
    const cached = this.getFromCache<ArmorData[]>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const result = await this.loadJsonFile<(ArmorData | null)[]>(filePath);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const armors = this.extractValidItems(result.data);
    this.setCache(cacheKey, armors);
    
    log.info(`Loaded ${armors.length} armors`);
    return { success: true, data: armors };
  }

  // ============ 辅助方法 ============

  /**
   * 提取弹道偏移配置
   * Requirements: 2.5.3, 2.5.4
   */
  extractProjectileOffset(battler: BattlerData): ProjectileOffset {
    return battler.projectileOffset || {};
  }

  /**
   * 批量加载弹道编辑器所需数据
   * Requirements: 2.5
   */
  async loadProjectileEditorData(): Promise<{
    animations: DataLoadResult<AnimationData[]>;
    actors: DataLoadResult<BattlerData[]>;
    enemies: DataLoadResult<BattlerData[]>;
    weapons: DataLoadResult<WeaponData[]>;
    skills: DataLoadResult<SkillData[]>;
  }> {
    const [animations, actors, enemies, weapons, skills] = await Promise.all([
      this.loadAnimations(),
      this.loadActors(),
      this.loadEnemies(),
      this.loadWeapons(),
      this.loadSkills(),
    ]);

    return { animations, actors, enemies, weapons, skills };
  }

  /**
   * 批量加载任务编辑器所需数据
   * Requirements: 3
   */
  async loadQuestEditorData(): Promise<{
    system: DataLoadResult<SystemData>;
    items: DataLoadResult<ItemData[]>;
    weapons: DataLoadResult<WeaponData[]>;
    armors: DataLoadResult<ArmorData[]>;
    enemies: DataLoadResult<BattlerData[]>;
    actors: DataLoadResult<BattlerData[]>;
  }> {
    const [system, items, weapons, armors, enemies, actors] = await Promise.all([
      this.loadSystem(),
      this.loadItems(),
      this.loadWeapons(),
      this.loadArmors(),
      this.loadEnemies(),
      this.loadActors(),
    ]);

    return { system, items, weapons, armors, enemies, actors };
  }
}

// ============ 导出 ============

/**
 * 数据加载服务单例
 */
export const DataLoaderService = DataLoaderServiceImpl.getInstance();

/**
 * 重置单例（仅用于测试）
 */
export function resetDataLoaderService(): void {
  (DataLoaderServiceImpl as unknown as { _instance: null })._instance = null;
}

export default DataLoaderService;
