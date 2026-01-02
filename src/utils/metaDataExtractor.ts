/**
 * MetaDataExtractor - 元数据解析工具
 * 
 * 从 note 字段中解析标签格式的元数据
 * 
 * Requirements: 2.1, 2.4, 2.5, 2.6
 */

/**
 * 元数据标签接口
 */
export interface MetaTag {
  name: string;
  value: string | number | boolean | object | unknown[];
}

/**
 * 元数据对象类型
 */
export type MetaData = Record<string, MetaTag['value']>;

/**
 * 解析结果接口
 */
export interface ParseResult {
  meta: MetaData;
  tags: MetaTag[];
}

// 预编译正则表达式，避免运行时重复创建
const META_REGEXP = /<([^<>:]+)(:?)([^>]*)>/g;
const INT_REGEXP = /^-?\d+$/;
const FLOAT_REGEXP = /^-?\d+\.\d+$/;

/**
 * 检查字符串是否为数字
 */
function isNumber(str: string): boolean {
  if (typeof str !== 'string') return false;
  return INT_REGEXP.test(str) || FLOAT_REGEXP.test(str);
}

/**
 * 检查字符串是否为布尔值
 */
function isBooleanString(str: string): boolean {
  return str === 'true' || str === 'false';
}

/**
 * 安全解析 JSON
 */
function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/**
 * 检查值是否为普通对象
 */
function isObject(obj: unknown): obj is Record<string, unknown> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * 解析值为合适的类型
 * 复用原有 ParseSystem.toParse 逻辑
 */
export function parseValue(value: unknown): MetaTag['value'] {
  if (typeof value === 'string') {
    if (isNumber(value)) {
      return Number(value);
    }
    if (isBooleanString(value)) {
      return value === 'true';
    }
    value = safeJsonParse(value);
  }
  
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = parseValue(value[i]);
    }
    return value;
  }
  
  if (isObject(value)) {
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      value[key] = parseValue(value[key]);
    }
    return value as MetaTag['value'];
  }
  
  return value as MetaTag['value'];
}

/**
 * 从 note 字符串中解析元数据标签
 * 
 * 标签格式:
 * - 布尔标签: <tagName> -> { name: 'tagName', value: true }
 * - 值标签: <tagName:value> -> { name: 'tagName', value: parsedValue }
 * 
 * @param note - 包含元数据标签的字符串
 * @returns 解析后的标签数组
 */
export function parseMetaTags(note: string): MetaTag[] {
  if (!note || typeof note !== 'string') {
    return [];
  }
  
  const tags: MetaTag[] = [];
  
  // 使用 matchAll 遍历所有匹配的标签
  for (const match of note.matchAll(META_REGEXP)) {
    const tagName = match[1];
    const hasColon = match[2] === ':';
    const tagValue = match[3];
    
    // 如果有冒号，解析值；否则设为 true
    const value = hasColon ? parseValue(tagValue) : true;
    
    tags.push({
      name: tagName,
      value
    });
  }
  
  return tags;
}

/**
 * 从 note 字符串中提取元数据对象
 * 
 * @param note - 包含元数据标签的字符串
 * @returns 元数据对象，键为标签名，值为解析后的值
 */
export function extractMetaData(note: string): MetaData {
  if (!note || typeof note !== 'string') {
    return {};
  }
  
  const meta: MetaData = {};
  
  // 使用 matchAll 遍历所有匹配的标签
  for (const match of note.matchAll(META_REGEXP)) {
    const tagName = match[1];
    const hasColon = match[2] === ':';
    const tagValue = match[3];
    
    // 如果有冒号，解析值；否则设为 true
    meta[tagName] = hasColon ? parseValue(tagValue) : true;
  }
  
  return meta;
}

/**
 * 将单个标签序列化为字符串
 */
function serializeTag(tag: MetaTag): string {
  const { name, value } = tag;
  
  if (value === true) {
    return `<${name}>`;
  }
  
  // 序列化值
  let serializedValue: string;
  if (typeof value === 'string') {
    serializedValue = value;
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    serializedValue = String(value);
  } else {
    // 对象或数组使用 JSON 序列化
    serializedValue = JSON.stringify(value);
  }
  
  return `<${name}:${serializedValue}>`;
}

/**
 * 将元数据标签数组序列化为字符串
 * 
 * @param tags - 元数据标签数组
 * @returns 序列化后的字符串
 */
export function serializeMetaTags(tags: MetaTag[]): string {
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return '';
  }
  
  return tags.map(serializeTag).join('');
}

/**
 * 将元数据对象序列化为字符串
 * 
 * @param meta - 元数据对象
 * @returns 序列化后的字符串
 */
export function serializeMetaData(meta: MetaData): string {
  if (!meta || typeof meta !== 'object') {
    return '';
  }
  
  const keys = Object.keys(meta);
  if (keys.length === 0) {
    return '';
  }
  
  const parts: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const name = keys[i];
    const value = meta[name];
    parts.push(serializeTag({ name, value }));
  }
  
  return parts.join('');
}

/**
 * 更新 note 字符串中的特定标签值
 * 
 * @param note - 原始 note 字符串
 * @param tagName - 要更新的标签名
 * @param newValue - 新的值
 * @returns 更新后的 note 字符串
 */
export function updateMetaTag(
  note: string,
  tagName: string,
  newValue: MetaTag['value']
): string {
  if (!note || typeof note !== 'string') {
    // 如果没有原始内容，直接创建新标签
    return serializeTag({ name: tagName, value: newValue });
  }
  
  // 构建匹配特定标签的正则
  const tagRegex = new RegExp(`<${escapeRegExp(tagName)}(:?)([^>]*)>`, 'g');
  const newTag = serializeTag({ name: tagName, value: newValue });
  
  // 检查标签是否存在
  if (tagRegex.test(note)) {
    // 重置正则状态
    tagRegex.lastIndex = 0;
    return note.replace(tagRegex, newTag);
  }
  
  // 标签不存在，追加到末尾
  return note + newTag;
}

/**
 * 从 note 字符串中移除特定标签
 * 
 * @param note - 原始 note 字符串
 * @param tagName - 要移除的标签名
 * @returns 移除标签后的 note 字符串
 */
export function removeMetaTag(note: string, tagName: string): string {
  if (!note || typeof note !== 'string') {
    return '';
  }
  
  const tagRegex = new RegExp(`<${escapeRegExp(tagName)}(:?)([^>]*)>`, 'g');
  return note.replace(tagRegex, '');
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * MetaDataExtractor 类 - 提供带缓存的元数据提取
 * 
 * 复用对象，避免频繁创建造成 GC 压力
 */
export class MetaDataExtractor {
  private readonly metaRegexp = META_REGEXP;
  
  /**
   * 从数据项中提取元数据
   * 
   * @param data - 包含 note 字段的数据项
   * @param force - 是否强制重新解析（忽略缓存）
   */
  extractMetadata<T extends { note?: string; meta?: MetaData; noteDirty?: boolean }>(
    data: T,
    force = false
  ): void {
    const note = data.note;
    
    if (!note) {
      // 备注被清空时清理元数据
      data.meta = {};
      data.noteDirty = false;
      return;
    }
    
    // 性能优化：如果元数据已存在且未标记为 dirty，直接返回
    if (!force && data.meta && typeof data.meta === 'object' && data.noteDirty === false) {
      return;
    }
    
    data.meta = extractMetaData(note);
    data.noteDirty = false;
  }
  
  /**
   * 标记数据项的 note 为已修改
   */
  markDirty<T extends { note?: string; noteDirty?: boolean }>(data: T): void {
    if (data && data.note) {
      data.noteDirty = true;
    }
  }
}

// 导出单例实例
export const metaDataExtractor = new MetaDataExtractor();

// 导出正则表达式常量（用于测试）
export { META_REGEXP };
