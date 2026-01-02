/**
 * ScriptPathManager - 脚本路径管理器
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 * 
 * 负责解析和生成脚本路径格式，支持格式：
 * {"scriptKey": "/scripts/timestamp_scriptKey_uniqueId.js"}
 */

import { logger } from './logger';

const log = logger.createChild('ScriptPathManager');

// ============ 正则表达式常量 ============
/** 脚本路径解析正则 - 匹配 /scripts/{timestamp}_{name}_{uniqueId}.js */
const SCRIPT_PATH_REGEXP = /^\/scripts\/(\d+)_([^_]+)_(\d+)\.js$/;
/** 反斜杠替换正则 */
const BACKSLASH_REGEXP = /\\/g;
/** 前导斜杠正则 */
const LEADING_SLASH_REGEXP = /^\/+/;
/** 尾部斜杠正则 */
const TRAILING_SLASH_REGEXP = /\/+$/;

// ============ 类型定义 ============

/**
 * 脚本路径信息
 */
export interface ScriptPathInfo {
  /** 脚本键名，如 "skillUtils" */
  scriptKey: string;
  /** 完整文件路径 */
  filePath: string;
  /** 时间戳 */
  timestamp: number;
  /** 唯一标识 */
  uniqueId: string;
}

/**
 * 脚本路径解析结果
 */
export interface ParseResult {
  success: boolean;
  data?: ScriptPathInfo;
  error?: string;
}

// ============ ScriptPathManager 类 ============

/**
 * 脚本路径管理器
 * 单例模式，负责解析和生成脚本路径
 */
class ScriptPathManagerImpl {
  private static _instance: ScriptPathManagerImpl | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ScriptPathManagerImpl {
    if (!ScriptPathManagerImpl._instance) {
      ScriptPathManagerImpl._instance = new ScriptPathManagerImpl();
    }
    return ScriptPathManagerImpl._instance;
  }

  /**
   * 解析脚本路径对象
   * @param scripts 脚本路径对象 { scriptKey: filePath }
   * @returns 解析后的脚本信息数组
   */
  parseScripts(scripts: Record<string, string>): ScriptPathInfo[] {
    const results: ScriptPathInfo[] = [];
    
    if (!scripts || typeof scripts !== 'object') {
      log.warn('Invalid scripts object provided');
      return results;
    }

    const keys = Object.keys(scripts);
    for (let i = 0; i < keys.length; i++) {
      const scriptKey = keys[i];
      const filePath = scripts[scriptKey];
      
      const parseResult = this.parsePath(filePath, scriptKey);
      if (parseResult.success && parseResult.data) {
        results.push(parseResult.data);
      } else {
        log.warn(`Failed to parse script path for key "${scriptKey}": ${parseResult.error}`);
      }
    }

    return results;
  }

  /**
   * 解析单个脚本路径
   * @param filePath 文件路径
   * @param scriptKey 脚本键名（可选，用于回退）
   * @returns 解析结果
   */
  parsePath(filePath: string, scriptKey?: string): ParseResult {
    if (!filePath || typeof filePath !== 'string') {
      return { success: false, error: 'Invalid file path' };
    }

    // 规范化路径
    const normalizedPath = this.normalizePath(filePath);
    
    // 尝试匹配标准格式
    const match = normalizedPath.match(SCRIPT_PATH_REGEXP);
    
    if (match) {
      return {
        success: true,
        data: {
          scriptKey: match[2],
          filePath: normalizedPath,
          timestamp: parseInt(match[1], 10),
          uniqueId: match[3],
        },
      };
    }

    // 如果提供了 scriptKey，尝试从路径中提取信息
    if (scriptKey) {
      // 尝试匹配简单格式 /scripts/name.js
      const simpleMatch = normalizedPath.match(/^\/scripts\/([^/]+)\.js$/);
      if (simpleMatch) {
        return {
          success: true,
          data: {
            scriptKey,
            filePath: normalizedPath,
            timestamp: 0,
            uniqueId: '0',
          },
        };
      }
    }

    return { success: false, error: 'Path does not match expected format' };
  }

  /**
   * 生成脚本路径
   * @param scriptKey 脚本键名
   * @param timestamp 时间戳（可选，默认当前时间）
   * @returns 生成的路径
   */
  generatePath(scriptKey: string, timestamp?: number): string {
    if (!scriptKey || typeof scriptKey !== 'string') {
      log.warn('Invalid scriptKey provided');
      return '';
    }

    const ts = timestamp ?? Date.now();
    const uniqueId = this.generateUniqueId();
    
    return `/scripts/${ts}_${scriptKey}_${uniqueId}.js`;
  }

  /**
   * 规范化路径
   * - 将反斜杠转换为正斜杠
   * - 确保以单个正斜杠开头
   * - 移除尾部斜杠
   * @param path 原始路径
   * @returns 规范化后的路径
   */
  normalizePath(path: string): string {
    if (!path || typeof path !== 'string') {
      return '';
    }

    // 替换反斜杠为正斜杠
    let normalized = path.replace(BACKSLASH_REGEXP, '/');
    
    // 移除尾部斜杠
    normalized = normalized.replace(TRAILING_SLASH_REGEXP, '');
    
    // 确保以单个正斜杠开头（如果原本有斜杠）
    if (normalized.startsWith('/')) {
      normalized = '/' + normalized.replace(LEADING_SLASH_REGEXP, '');
    }

    return normalized;
  }

  /**
   * 验证路径是否有效
   * @param path 路径
   * @returns 是否有效
   */
  isValidPath(path: string): boolean {
    if (!path || typeof path !== 'string') {
      return false;
    }

    const normalized = this.normalizePath(path);
    return SCRIPT_PATH_REGEXP.test(normalized);
  }

  /**
   * 从路径中提取脚本键名
   * @param path 路径
   * @returns 脚本键名或 null
   */
  extractScriptKey(path: string): string | null {
    const normalized = this.normalizePath(path);
    const match = normalized.match(SCRIPT_PATH_REGEXP);
    return match ? match[2] : null;
  }

  /**
   * 生成唯一ID
   * @returns 唯一ID字符串
   */
  private generateUniqueId(): string {
    return Math.floor(Math.random() * 1000000000000).toString();
  }
}

// ============ 导出 ============

/**
 * 脚本路径管理器单例
 */
export const ScriptPathManager = ScriptPathManagerImpl.getInstance();

/**
 * 重置单例（仅用于测试）
 */
export function resetScriptPathManager(): void {
  (ScriptPathManagerImpl as unknown as { _instance: null })._instance = null;
}

export default ScriptPathManager;
