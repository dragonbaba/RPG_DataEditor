/**
 * ProjectilePanel - 弹道面板
 * 实现弹道模板配置、轨迹段编辑、预览播放
 * 实现数据文件加载、偏移保存、发射器/目标配置
 * 使用 PixiRenderer 进行渲染，使用 GlobalMotion 进行动画
 *
 * 弹道动画三阶段：
 * 1. Start Animation - 发射点动画
 * 2. Launch Animation - 主弹道轨迹动画（可包含多个轨迹段）
 * 3. End Animation - 目标点动画
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

import * as PIXI from 'pixi.js';
import { DOM } from '../core/DOMManager';
import { acquireSegmentItem, releaseSegmentItem, recyclePoolTree } from '../pools/DOMPools';
import { fillOptions } from '../utils/domHelpers';
import { StateManager, DataItem } from '../core/StateManager';
import { EventSystem } from '../core/EventSystem';
import { waitMs } from '../utils/delay';
import { PixiRenderer, createCanvasTexture } from '../core/PixiRenderer';
import { GlobalRunner, delay } from '../utils/runner';
import { themeManager } from '../theme/ThemeManager';
import { visualEffects } from '../theme/effects/VisualEffects';

import { EasingType } from '../utils/easing';
import { fileSystemService } from '../services/FileSystemService';
import { logger } from '../services/logger';
import { textureManager } from '../services/TextureManager';
import { TrajectoryCalculator } from '../utils/TrajectoryCalculator';
import { TrajectorySegment } from '../types';

// ============ 常量 ============

const PROJECTILE_DATA_CONFIG = {
  animation: {
    label: '动画数据',
    defaultFile: 'Animations.json',
    selectRef: 'projectileAnimationFileSelect',
    loadBtnRef: 'projectileAnimationLoadBtn',
    pickBtnRef: 'projectileAnimationPickBtn',
    statusRef: 'projectileAnimationStatus',
  },
  enemy: {
    label: '敌人数据',
    defaultFile: 'Enemies.json',
    selectRef: 'projectileEnemyFileSelect',
    loadBtnRef: 'projectileEnemyLoadBtn',
    pickBtnRef: 'projectileEnemyPickBtn',
    statusRef: 'projectileEnemyStatus',
  },
  actor: {
    label: '角色数据',
    defaultFile: 'Actors.json',
    selectRef: 'projectileActorFileSelect',
    loadBtnRef: 'projectileActorLoadBtn',
    pickBtnRef: 'projectileActorPickBtn',
    statusRef: 'projectileActorStatus',
  },
  weapon: {
    label: '武器数据',
    defaultFile: 'Weapons.json',
    selectRef: 'projectileWeaponFileSelect',
    loadBtnRef: 'projectileWeaponLoadBtn',
    pickBtnRef: 'projectileWeaponPickBtn',
    statusRef: 'projectileWeaponStatus',
  },
  skill: {
    label: '技能数据',
    defaultFile: 'Skills.json',
    selectRef: 'projectileSkillFileSelect',
    loadBtnRef: 'projectileSkillLoadBtn',
    pickBtnRef: 'projectileSkillPickBtn',
    statusRef: 'projectileSkillStatus',
  },
};



/** 轨迹段卡片 */
interface SegmentCard {
  element: HTMLDivElement;
  targetXInput: HTMLInputElement;
  targetYInput: HTMLInputElement;
  durationInput: HTMLInputElement;
  easeXSelect: HTMLSelectElement;
  easeYSelect: HTMLSelectElement;
  index: number;
}

/** 默认轨迹段 */
const DEFAULT_SEGMENT: TrajectorySegment = {
  targetX: 0,
  targetY: -120,
  duration: 60,
  easeX: 'linear',
  easeY: 'linear',
};



/** 缓动函数选项 */
const EASE_OPTIONS = [
  { value: 'linear', label: '线性移动' },
  { value: 'easeInQuad', label: '二次方缓入' },
  { value: 'easeOutQuad', label: '二次方缓出' },
  { value: 'easeInOutQuad', label: '二次方缓入缓出' },
  { value: 'easeInCubic', label: '三次方缓入' },
  { value: 'easeOutCubic', label: '三次方缓出' },
  { value: 'easeInOutCubic', label: '三次方缓入缓出' },
  { value: 'easeInQuart', label: '四次方缓入' },
  { value: 'easeOutQuart', label: '四次方缓出' },
  { value: 'easeInOutQuart', label: '四次方缓入缓出' },
  { value: 'easeInSine', label: '正弦曲线缓入' },
  { value: 'easeOutSine', label: '正弦曲线缓出' },
  { value: 'easeInOutSine', label: '正弦曲线缓入缓出' },
  { value: 'easeInExpo', label: '指数曲线缓入' },
  { value: 'easeOutExpo', label: '指数曲线缓出' },
  { value: 'easeInOutExpo', label: '指数曲线缓入缓出' },
  { value: 'easeInCirc', label: '圆形缓入' },
  { value: 'easeOutCirc', label: '圆形缓出' },
  { value: 'easeInOutCirc', label: '圆形缓入缓出' },
  { value: 'easeInElastic', label: '弹跳缓入' },
  { value: 'easeOutElastic', label: '弹跳缓出' },
  { value: 'easeInOutElastic', label: '弹跳缓入缓出' },
  { value: 'easeInBack', label: '超过缓入' },
  { value: 'easeOutBack', label: '超过缓出' },
  { value: 'easeInOutBack', label: '超过缓入缓出' },
  { value: 'easeInBounce', label: '弹跳超过缓入' },
  { value: 'easeOutBounce', label: '弹跳超过缓出' },
  { value: 'easeInOutBounce', label: '弹跳超过缓入缓出' },
];

/** 预览尺寸 */
/** 预览尺寸配置 */
let previewWidth = 360;
let previewHeight = 220;
let startOffsetX = 80;
let startOffsetY = 180;
let targetOffsetX = 340;
let targetOffsetY = 160;

// ============ 状态 ============

/** 当前轨迹段 */
let segments: TrajectorySegment[] = [];
const projectileDataCache: Record<string, unknown[]> = {};

/** 事件监听器是否已绑定 */
let eventsBound = false;

/** 预览是否已初始化 */
let previewInitialized = false;

/** 当前卡片列表 */
let currentCards: SegmentCard[] = [];
let currentCardCount = 0;

/**
 * 回收卡片
 */
function returnSegmentCard(card: SegmentCard): void {
  if (card.element) {
    releaseSegmentItem(card.element);
  }
  card.element = null as unknown as HTMLDivElement;
  card.targetXInput = null as unknown as HTMLInputElement;
  card.targetYInput = null as unknown as HTMLInputElement;
  card.durationInput = null as unknown as HTMLInputElement;
  card.easeXSelect = null as unknown as HTMLSelectElement;
  card.easeYSelect = null as unknown as HTMLSelectElement;
}

// ============ 预创建纹理 ============

// 创建炮口动画纹理（橙色闪光）
const startAnimationTexture = createCanvasTexture(24, 24, (ctx) => {
  const gradient = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
  gradient.addColorStop(0, '#FFAA00');
  gradient.addColorStop(0.5, '#FF6600');
  gradient.addColorStop(1, '#FF3300');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 24, 24);
});

// 创建弹道动画纹理（蓝色能量球）
const launchAnimationTexture = createCanvasTexture(16, 16, (ctx) => {
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, '#00AAFF');
  gradient.addColorStop(0.5, '#0066FF');
  gradient.addColorStop(1, '#003399');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(8, 8, 6, 0, Math.PI * 2);
  ctx.fill();
});

// 创建爆炸动画纹理（黄色爆炸）
const endAnimationTexture = createCanvasTexture(32, 32, (ctx) => {
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, '#FFFF00');
  gradient.addColorStop(0.3, '#FFAA00');
  gradient.addColorStop(0.6, '#FF6600');
  gradient.addColorStop(1, '#FF0000');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(16, 16, 14, 0, Math.PI * 2);
  ctx.fill();
});

// 原有的弹道轨迹纹理（用于静态显示）
const projectileTexture = createCanvasTexture(16, 16, (ctx) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(4, 4, 8, 8);
  ctx.strokeStyle = '#aaaaaa';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, 8, 8);
});

// ============ 预览精灵 ============

let startSprite: PIXI.Sprite | null = null; // 发射者精灵（角色/敌人）
let launchSprite: PIXI.Sprite | null = null; // 弹道精灵（弹道动画）
let endSprite: PIXI.Sprite | null = null; // 目标精灵（角色/敌人）
let trajectoryGraphics: PIXI.Graphics | null = null;
let effectGraphics: PIXI.Graphics | null = null;

// 弹道动画的三个阶段精灵
let startAnimationSprite: PIXI.Sprite | null = null; // 炮口动画精灵
let launchAnimationSprite: PIXI.Sprite | null = null; // 弹道动画精灵
let endAnimationSprite: PIXI.Sprite | null = null; // 爆炸动画精灵

// ============ 预览状态 ============

let isPlaying = false;
let isPaused = false;
let currentFrame = 0;
let totalFrames = 0;
let animationRunner: ReturnType<typeof GlobalRunner.on> | null = null;
let playbackRate = 1.0; // 播放速率

// ============ 弹道阶段状态 ============

interface ProjectilePhases {
  hasStartAnimation: boolean;
  hasLaunchAnimation: boolean;
  hasEndAnimation: boolean;
  startDuration: number;
  launchDuration: number;
  endDuration: number;
}

let currentPhases: ProjectilePhases = {
  hasStartAnimation: false,
  hasLaunchAnimation: false,
  hasEndAnimation: false,
  startDuration: 0,
  launchDuration: 0,
  endDuration: 0,
};

// ============ 发射位置计算 ============

/**
 * 获取角色基于武器的发射位置偏移
 */
function getActorProjectileOffset(actorId: number, weaponId: number): { x: number; y: number } {
  const actors = projectileDataCache.actor as Record<string, unknown>[] | undefined;
  const weapons = projectileDataCache.weapon as Record<string, unknown>[] | undefined;
  
  if (!actors || !weapons) return { x: 0, y: 0 };
  
  const actor = findDataEntryById(actors, actorId);
  const weapon = findDataEntryById(weapons, weaponId);
  
  if (!actor || !weapon) return { x: 0, y: 0 };
  
  const wtypeId = (weapon.wtypeId as number) || 0;
  const projectileOffset = actor.projectileOffset as Array<{ x?: number; y?: number }> | undefined;
  
  if (!projectileOffset || !projectileOffset[wtypeId]) {
    return { x: 0, y: 0 };
  }
  
  const offset = projectileOffset[wtypeId];
  return { x: offset.x || 0, y: offset.y || 0 };
}

/**
 * 获取敌人基于技能的发射位置偏移
 */
function getEnemyProjectileOffset(enemyId: number, skillId: number): { x: number; y: number } {
  const enemies = projectileDataCache.enemy as Record<string, unknown>[] | undefined;
  
  if (!enemies) return { x: 0, y: 0 };
  
  const enemy = findDataEntryById(enemies, enemyId);
  
  if (!enemy) return { x: 0, y: 0 };
  
  const projectileOffset = enemy.projectileOffset as Record<number, { x?: number; y?: number }> | undefined;
  
  if (!projectileOffset || !projectileOffset[skillId]) {
    return { x: 0, y: 0 };
  }
  
  const offset = projectileOffset[skillId];
  return { x: offset.x || 0, y: offset.y || 0 };
}

/**
 * 计算弹道阶段信息
 */
function calculateProjectilePhases(template: Record<string, unknown>): ProjectilePhases {
  const startAnimationId = Number(template.startAnimationId || 0);
  const launchAnimation = template.launchAnimation as Record<string, unknown> | undefined;
  const endAnimationId = Number(template.endAnimationId || 0);
  
  const launchAnimationId = Number(launchAnimation?.animationId || 0);
  const segments = launchAnimation?.segments as TrajectorySegment[] | undefined;
  
  // 检查动画数据是否存在
  const animations = projectileDataCache.animation as Record<string, unknown>[] | undefined;
  
  const hasStartAnimation = !!(startAnimationId > 0 && animations && animations[startAnimationId]);
  const hasLaunchAnimation = !!(launchAnimationId > 0 && animations && animations[launchAnimationId] && segments && segments.length > 0);
  const hasEndAnimation = !!(endAnimationId > 0 && animations && animations[endAnimationId]);
  
  // 计算各阶段持续时间
  let startDuration = 0;
  let launchDuration = 0;
  let endDuration = 0;
  
  if (hasStartAnimation && animations) {
    const startAnim = animations[startAnimationId] as Record<string, unknown>;
    startDuration = Number(startAnim.duration || 60); // 默认60帧
  }
  
  if (hasLaunchAnimation && segments) {
    launchDuration = TrajectoryCalculator.getTotalDuration(segments);
  }
  
  if (hasEndAnimation && animations) {
    const endAnim = animations[endAnimationId] as Record<string, unknown>;
    endDuration = Number(endAnim.duration || 30); // 默认30帧
  }
  
  return {
    hasStartAnimation,
    hasLaunchAnimation,
    hasEndAnimation,
    startDuration,
    launchDuration,
    endDuration,
  };
}

// ============ 预览初始化 ============

async function initializePreview(): Promise<void> {
  const container = DOM.projectilePreviewContainer;
  if (!container) {
    logger.warn('Projectile preview container not found', undefined, 'ProjectilePanel');
    return;
  }

  if (previewInitialized) {
    // 如果已经初始化，只需要调整尺寸
    resizePreview();
    return;
  }

  // Wait for container to have dimensions (retry mechanism)
  let retries = 0;
  const maxRetries = 10;

  while ((container.clientWidth === 0 || container.clientHeight === 0) && retries < maxRetries) {
    await waitMs(100);
    retries++;
  }

  if (container.clientWidth === 0 || container.clientHeight === 0) {
    logger.warn('Projectile preview container has zero dimensions after retries', {
      width: container.clientWidth,
      height: container.clientHeight,
      retries
    }, 'ProjectilePanel');

    previewWidth = 360;
    previewHeight = 220;
  } else {
    previewWidth = container.clientWidth;
    previewHeight = container.clientHeight;
  }

  try {
    container.innerHTML = '';

    // Dynamic offsets: Centered vertically, spread horizontally
    updatePreviewOffsets();

    await PixiRenderer.initialize(container, previewWidth, previewHeight);

    const scene = PixiRenderer.createScene('projectile');
    PixiRenderer.setScene('projectile');

    // Trajectory Graphics (for both static line and dynamic trail)
    trajectoryGraphics = new PIXI.Graphics();
    scene.addChild(trajectoryGraphics);

    // Effect Graphics (for explosions etc)
    effectGraphics = new PIXI.Graphics();
    scene.addChild(effectGraphics);

    // 初始化时创建空纹理精灵，后续根据发射者和目标设置纹理
    // Start sprite: 发射者精灵 (初始为空纹理)
    startSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    startSprite.anchor.set(0.5);
    startSprite.position.set(startOffsetX, startOffsetY);
    startSprite.visible = true;
    scene.addChild(startSprite);

    // Launch sprite: 弹道精灵 (使用默认弹道纹理，用于静态显示)
    launchSprite = new PIXI.Sprite(projectileTexture);
    launchSprite.anchor.set(0.5);
    launchSprite.position.set(startOffsetX, startOffsetY);
    launchSprite.visible = false;
    scene.addChild(launchSprite);

    // End sprite: 目标精灵 (初始为空纹理)
    endSprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    endSprite.anchor.set(0.5);
    endSprite.position.set(targetOffsetX, targetOffsetY);
    endSprite.visible = true;
    scene.addChild(endSprite);

    // 弹道动画的三个阶段精灵
    // Start Animation sprite: 炮口动画精灵
    startAnimationSprite = new PIXI.Sprite(startAnimationTexture);
    startAnimationSprite.anchor.set(0.5);
    startAnimationSprite.position.set(startOffsetX, startOffsetY);
    startAnimationSprite.visible = false;
    scene.addChild(startAnimationSprite);

    // Launch Animation sprite: 弹道动画精灵
    launchAnimationSprite = new PIXI.Sprite(launchAnimationTexture);
    launchAnimationSprite.anchor.set(0.5);
    launchAnimationSprite.position.set(startOffsetX, startOffsetY);
    launchAnimationSprite.visible = false;
    scene.addChild(launchAnimationSprite);

    // End Animation sprite: 爆炸动画精灵
    endAnimationSprite = new PIXI.Sprite(endAnimationTexture);
    endAnimationSprite.anchor.set(0.5);
    endAnimationSprite.position.set(targetOffsetX, targetOffsetY);
    endAnimationSprite.visible = false;
    scene.addChild(endAnimationSprite);

    previewInitialized = true;

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      handlePreviewResize();
      handleMaximizedModeResize();
    });

    // Force a render to ensure something appears
    PixiRenderer.render();

    logger.info('Projectile preview initialized', undefined, 'ProjectilePanel');
  } catch (error) {
    logger.error('Failed to initialize projectile preview', { error }, 'ProjectilePanel');
  }
}

/**
 * 更新预览偏移位置
 */
function updatePreviewOffsets(): void {
  startOffsetY = previewHeight / 2 + 20;
  targetOffsetY = previewHeight / 2;
  startOffsetX = Math.max(80, previewWidth * 0.15);
  targetOffsetX = Math.min(previewWidth - 80, previewWidth * 0.85);
}

/**
 * 调整预览尺寸
 */
function resizePreview(): void {
  const container = DOM.projectilePreviewContainer;
  if (!container || !previewInitialized) return;

  const newWidth = container.clientWidth;
  const newHeight = container.clientHeight;

  if (newWidth === previewWidth && newHeight === previewHeight) return;

  previewWidth = newWidth;
  previewHeight = newHeight;

  // 更新偏移位置
  updatePreviewOffsets();

  // 调整PixiJS渲染器尺寸
  PixiRenderer.resize(previewWidth, previewHeight);

  // 更新精灵位置
  if (startSprite) {
    startSprite.position.set(startOffsetX, startOffsetY);
  }
  if (endSprite) {
    endSprite.position.set(targetOffsetX, targetOffsetY);
  }
  if (launchSprite) {
    launchSprite.position.set(startOffsetX, startOffsetY);
  }

  // 重新绘制轨迹
  drawTrajectoryTexture();

  logger.debug('Preview resized', { width: previewWidth, height: previewHeight }, 'ProjectilePanel');
}

/**
 * 检测是否为最大化模式
 */
function isMaximizedMode(): boolean {
  const projectilePanel = DOM.projectileModePanel;
  if (!projectilePanel) return false;
  
  // 检查面板是否占据了大部分屏幕空间
  const rect = projectilePanel.getBoundingClientRect();
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  return rect.width > screenWidth * 0.8 && rect.height > screenHeight * 0.8;
}

/**
 * 处理最大化模式下的预览调整
 */
function handleMaximizedModeResize(): void {
  if (!isMaximizedMode()) return;
  
  const container = DOM.projectilePreviewContainer;
  if (!container) return;
  
  // 在最大化模式下，给预览容器更大的尺寸
  const parentRect = container.parentElement?.getBoundingClientRect();
  if (parentRect) {
    const maxWidth = Math.min(parentRect.width - 40, 800); // 留出边距，最大800px
    const maxHeight = Math.min(parentRect.height - 40, 500); // 留出边距，最大500px
    
    container.style.width = `${maxWidth}px`;
    container.style.height = `${maxHeight}px`;
    
    // 触发重新调整
    setTimeout(() => resizePreview(), 50);
  }
}

/**
 * 处理预览尺寸变化
 */
function handlePreviewResize(): void {
  // 使用防抖避免频繁调整
  if ((handlePreviewResize as any).timeout) {
    clearTimeout((handlePreviewResize as any).timeout);
  }
  (handlePreviewResize as any).timeout = setTimeout(() => {
    resizePreview();
  }, 100);
}

// 为函数添加timeout属性
(handlePreviewResize as any).timeout = null;

function drawTrajectoryTexture(): void {
  if (!trajectoryGraphics) return;

  // Clear previous drawing
  trajectoryGraphics.clear();

  const totalDuration = TrajectoryCalculator.getTotalDuration(segments);
  const startPos = { x: startOffsetX, y: startOffsetY };
  const endPos = { x: targetOffsetX, y: targetOffsetY };

  const points: Array<{ x: number; y: number }> = [];

  // Calculate points for every frame
  for (let f = 0; f <= totalDuration; f++) {
    const pos = TrajectoryCalculator.calculatePosition(segments, f, startPos, endPos);
    points.push(pos);
  }

  if (points.length > 1) {
    // Glow effect
    trajectoryGraphics.lineStyle(3, 0x4da6ff, 0.8);
    trajectoryGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      trajectoryGraphics.lineTo(points[i].x, points[i].y);
    }

    // Inner core
    trajectoryGraphics.lineStyle(1, 0xffffff, 1.0);
    trajectoryGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      trajectoryGraphics.lineTo(points[i].x, points[i].y);
    }
  }
}

function resetPreview(): void {
  stopAnimation();

  // 重置发射者和目标精灵
  if (startSprite) {
    startSprite.position.set(startOffsetX, startOffsetY);
    startSprite.visible = true;
    startSprite.alpha = 1;
    startSprite.tint = 0xFFFFFF;
  }
  if (launchSprite) {
    launchSprite.position.set(startOffsetX, startOffsetY);
    launchSprite.visible = false;
  }
  if (endSprite) {
    endSprite.position.set(targetOffsetX, targetOffsetY);
    endSprite.visible = true;
    endSprite.alpha = 1;
    endSprite.tint = 0xFFFFFF;
  }

  // 重置弹道动画精灵
  if (startAnimationSprite) {
    startAnimationSprite.position.set(startOffsetX, startOffsetY);
    startAnimationSprite.visible = false;
    startAnimationSprite.alpha = 1;
    startAnimationSprite.tint = 0xFFFFFF;
    startAnimationSprite.scale.set(1, 1);
  }
  if (launchAnimationSprite) {
    launchAnimationSprite.position.set(startOffsetX, startOffsetY);
    launchAnimationSprite.visible = false;
    launchAnimationSprite.alpha = 1;
    launchAnimationSprite.tint = 0xFFFFFF;
    launchAnimationSprite.scale.set(1, 1);
  }
  if (endAnimationSprite) {
    endAnimationSprite.position.set(targetOffsetX, targetOffsetY);
    endAnimationSprite.visible = false;
    endAnimationSprite.alpha = 1;
    endAnimationSprite.tint = 0xFFFFFF;
    endAnimationSprite.scale.set(1, 1);
  }

  // 重置图形
  if (trajectoryGraphics) {
    trajectoryGraphics.clear();
    drawTrajectoryTexture();
  }
  if (effectGraphics) {
    effectGraphics.clear();
  }

  isPlaying = false;
  isPaused = false;
  currentFrame = 0;
  totalFrames = 0;

  updateControlButtons();
  PixiRenderer.render();
}

function stopAnimation(): void {
  if (animationRunner) {
    GlobalRunner.off(animationRunner);
    animationRunner = null;
  }
  isPlaying = false;
  isPaused = false;
}

function pauseAnimation(): void {
  if (isPlaying) {
    isPaused = !isPaused;
    if (isPaused) {
      stopAnimation();
      isPaused = true; // 保持暂停状态
    } else {
      continueAnimation();
    }
    updateControlButtons();
  }
}

function stepFrame(direction: 1 | -1): void {
  if (!isPaused) return;

  currentFrame = Math.max(0, Math.min(totalFrames, currentFrame + direction));
  updateFrameDisplay();
  updateControlButtons();
}

function continueAnimation(): void {
  if (!isPaused) return;
  isPaused = false;
  isPlaying = true;

  const animationLoop = () => {
    if (!isPlaying || isPaused) return;

    currentFrame++;
    updateFrameDisplay();
    updateControlButtons();

    if (currentFrame < totalFrames) {
      animationRunner = requestAnimationFrame(animationLoop) as unknown as ReturnType<typeof GlobalRunner.on>;
    } else {
      onAnimationComplete();
    }
  };

  animationLoop();
}

function updateFrameDisplay(): void {
  if (!currentPhases) return;

  let currentPhaseFrame = currentFrame;
  let currentPhase = 'none';

  // 确定当前处于哪个阶段
  if (currentPhases.hasStartAnimation && currentPhaseFrame < currentPhases.startDuration) {
    currentPhase = 'start';
  } else {
    if (currentPhases.hasStartAnimation) {
      currentPhaseFrame -= currentPhases.startDuration;
    }
    
    if (currentPhases.hasLaunchAnimation && currentPhaseFrame < currentPhases.launchDuration) {
      currentPhase = 'launch';
    } else {
      if (currentPhases.hasLaunchAnimation) {
        currentPhaseFrame -= currentPhases.launchDuration;
      }
      
      if (currentPhases.hasEndAnimation && currentPhaseFrame < currentPhases.endDuration) {
        currentPhase = 'end';
      }
    }
  }

  // 根据当前阶段更新显示
  switch (currentPhase) {
    case 'start':
      updateStartPhase(currentPhaseFrame);
      break;
    case 'launch':
      updateLaunchPhase(currentPhaseFrame);
      break;
    case 'end':
      updateEndPhase(currentPhaseFrame);
      break;
  }

  PixiRenderer.render();
}

function updateStartPhase(frame: number): void {
  // 开始阶段：显示炮口动画
  if (startAnimationSprite) {
    startAnimationSprite.visible = true;
    
    // 炮口动画效果 - 基于动画进度的透明度和效果
    const progress = frame / currentPhases.startDuration;
    startAnimationSprite.alpha = 0.8 + progress * 0.2;
    startAnimationSprite.tint = 0xFFFFFF;
    
    // 位置设置在发射者位置
    if (startSprite) {
      startAnimationSprite.position.set(startSprite.x, startSprite.y);
    }
  }

  // 发射者精灵保持正常显示，不做特殊效果
  if (startSprite) {
    startSprite.visible = true;
    startSprite.alpha = 1;
    startSprite.tint = 0xFFFFFF;
  }

  // 隐藏弹道动画精灵
  if (launchAnimationSprite) {
    launchAnimationSprite.visible = false;
  }
  
  // 隐藏爆炸动画精灵
  if (endAnimationSprite) {
    endAnimationSprite.visible = false;
  }
}

function updateLaunchPhase(frame: number): void {
  // 弹道阶段：显示弹道动画精灵移动
  const startPos = { x: startOffsetX, y: startOffsetY };
  const endPos = { x: targetOffsetX, y: targetOffsetY };

  const pos = TrajectoryCalculator.calculatePosition(segments, frame, startPos, endPos);

  // 更新弹道动画精灵位置
  if (launchAnimationSprite) {
    launchAnimationSprite.position.set(pos.x, pos.y);
    launchAnimationSprite.visible = true;
    launchAnimationSprite.alpha = 1;
    launchAnimationSprite.tint = 0xFFFFFF;
  }

  // 发射者保持可见，正常状态
  if (startSprite) {
    startSprite.visible = true;
    startSprite.alpha = 1;
    startSprite.tint = 0xFFFFFF;
  }
  
  // 隐藏炮口动画精灵
  if (startAnimationSprite) {
    startAnimationSprite.visible = false;
  }
  
  // 隐藏爆炸动画精灵
  if (endAnimationSprite) {
    endAnimationSprite.visible = false;
  }

  // 更新轨迹显示
  if (trajectoryGraphics) {
    trajectoryGraphics.clear();

    // 绘制已走过的轨迹
    const points: Array<{ x: number; y: number }> = [];
    for (let f = 0; f <= frame; f++) {
      const framePos = TrajectoryCalculator.calculatePosition(segments, f, startPos, endPos);
      points.push(framePos);
    }

    if (points.length > 1) {
      trajectoryGraphics.lineStyle(2, 0x4da6ff, 0.6);
      trajectoryGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        trajectoryGraphics.lineTo(points[i].x, points[i].y);
      }

      trajectoryGraphics.lineStyle(1, 0xffffff, 0.9);
      trajectoryGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        trajectoryGraphics.lineTo(points[i].x, points[i].y);
      }
    }
  }
}

function updateEndPhase(frame: number): void {
  // 结束阶段：显示爆炸动画精灵
  if (endAnimationSprite) {
    endAnimationSprite.visible = true;
    endAnimationSprite.position.set(targetOffsetX, targetOffsetY);
    
    const progress = frame / currentPhases.endDuration;
    
    // 爆炸动画效果
    endAnimationSprite.alpha = 1;
    endAnimationSprite.tint = 0xFFFFFF;
    
    // 爆炸扩散效果
    const scaleEffect = 0.5 + progress * 0.5; // 从0.5倍到1倍
    endAnimationSprite.scale.set(scaleEffect, scaleEffect);
  }

  // 隐藏弹道动画精灵
  if (launchAnimationSprite) {
    launchAnimationSprite.visible = false;
  }
  
  // 隐藏炮口动画精灵
  if (startAnimationSprite) {
    startAnimationSprite.visible = false;
  }

  // 目标精灵可能受到震动效果
  if (endSprite) {
    endSprite.visible = true;
    const progress = frame / currentPhases.endDuration;
    
    // 目标震动效果
    const shakeAmt = (1 - progress) * 3;
    endSprite.position.x = targetOffsetX + (Math.random() - 0.5) * shakeAmt;
    endSprite.position.y = targetOffsetY + (Math.random() - 0.5) * shakeAmt;
    endSprite.tint = 0xFFAAAA; // 轻微红色受击效果
  }

  // 爆炸环效果（使用effectGraphics）
  if (effectGraphics) {
    effectGraphics.clear();
    const progress = frame / currentPhases.endDuration;
    effectGraphics.lineStyle(2, 0xFFCC00, 1 - progress);
    effectGraphics.drawCircle(targetOffsetX, targetOffsetY, progress * 40);
  }
}

function onAnimationComplete(): void {
  // 清理
  if (endSprite) {
    endSprite.position.set(targetOffsetX, targetOffsetY);
    endSprite.tint = 0xFFFFFF;
  }
  if (effectGraphics) effectGraphics.clear();

  isPlaying = false;
  isPaused = false;
  updateControlButtons();

  EventSystem.emit('projectile:preview-complete');
  logger.debug('Preview animation complete', undefined, 'ProjectilePanel');

  // 延迟后重置为静态轨迹显示
  delay(() => {
    if (!isPlaying) resetPreview();
  }, 500);
}

function playAnimation(): void {
  if (isPlaying) return;

  // 获取当前模板和播放速率
  const state = StateManager.getState();
  const currentItem = state.currentItem as Record<string, unknown> | null;
  if (!currentItem) return;

  // 计算弹道阶段
  currentPhases = calculateProjectilePhases(currentItem);
  
  // 检查是否有可播放的阶段
  if (!currentPhases.hasStartAnimation && !currentPhases.hasLaunchAnimation && !currentPhases.hasEndAnimation) {
    EventSystem.emit('error:show', '当前弹道模板没有可播放的阶段');
    return;
  }

  // 获取播放速率
  const playbackRateSelect = DOM.projectilePlaybackRate;
  playbackRate = playbackRateSelect ? parseFloat(playbackRateSelect.value) : 1.0;

  isPlaying = true;
  isPaused = false;
  currentFrame = 0;
  
  // 计算总帧数（只包含存在的阶段）
  totalFrames = 0;
  if (currentPhases.hasStartAnimation) totalFrames += currentPhases.startDuration;
  if (currentPhases.hasLaunchAnimation) totalFrames += currentPhases.launchDuration;
  if (currentPhases.hasEndAnimation) totalFrames += currentPhases.endDuration;

  // 清空静态轨迹
  if (trajectoryGraphics) {
    trajectoryGraphics.clear();
  }
  if (effectGraphics) {
    effectGraphics.clear();
  }

  // 确保发射者可见
  if (startSprite) {
    startSprite.visible = true;
    startSprite.alpha = 1;
    startSprite.tint = 0xFFFFFF;
  }

  // 隐藏弹道精灵直到开始移动
  if (launchSprite) {
    launchSprite.visible = false;
    launchSprite.position.set(startOffsetX, startOffsetY);
  }

  // 确保目标可见
  if (endSprite) {
    endSprite.visible = true;
    endSprite.alpha = 1;
    endSprite.tint = 0xFFFFFF;
  }

  updateControlButtons();

  // 开始动画循环
  const animationLoop = () => {
    if (!isPlaying || isPaused) return;

    currentFrame++;
    updateFrameDisplay();
    updateControlButtons();

    if (currentFrame < totalFrames) {
      // 根据播放速率调整帧间隔
      const frameDelay = Math.max(1, Math.round(16 / playbackRate)); // 基础16ms间隔
      setTimeout(() => {
        animationRunner = requestAnimationFrame(animationLoop) as unknown as ReturnType<typeof GlobalRunner.on>;
      }, frameDelay);
    } else {
      onAnimationComplete();
    }
  };

  animationLoop();
}


// ============ 轨迹段渲染 ============

/**
 * 渲染轨迹段列表
 * Enhanced with sci-fi styling and visual effects
 */
export function renderSegments(): void {
  const segmentList = DOM.projectileSegmentList;
  if (!segmentList) return;

  recyclePoolTree(segmentList);

  const template = document.getElementById('projectile-segment-card') as HTMLTemplateElement;
  if (!template) {
    logger.error('projectile-segment-card template not found');
    return;
  }

  // 确保至少有一个轨迹段
  if (segments.length === 0) {
    segments.push({ ...DEFAULT_SEGMENT });
  }

  const fragment = document.createDocumentFragment();

  currentCards = [];
  currentCardCount = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const card = acquireSegmentItem();
    card.innerHTML = template.innerHTML;

    card.dataset.index = String(i);
    card.className = 'segment-card pool-segment-item relative';

    // Apply sci-fi styling to segment card with enhanced effects
    themeManager.applySciFiEffects(card, {
      variant: 'accent',
      glow: true,
      scanlines: false,
    });

    // Add energy wave effect on hover
    card.addEventListener('mouseenter', () => {
      visualEffects.createEnergyWave(card, {
        color: 'rgba(0, 255, 136, 0.3)',
        duration: 800,
        direction: 'horizontal',
      });
    });

    // Add subtle holographic flicker
    visualEffects.createHolographicFlicker(card, {
      intensity: 0.02,
      frequency: 0.03,
      duration: 80,
    });

    // Get input elements first
    const targetXInput = card.querySelector('.segment-target-x') as HTMLInputElement;
    const targetYInput = card.querySelector('.segment-target-y') as HTMLInputElement;
    const durationInput = card.querySelector('.segment-duration') as HTMLInputElement;
    const easeXSelect = card.querySelector('.segment-ease-x') as HTMLSelectElement;
    const easeYSelect = card.querySelector('.segment-ease-y') as HTMLSelectElement;

    // Add pulsing glow on focus for inputs
    const inputs = [targetXInput, targetYInput, durationInput];
    inputs.forEach(input => {
      if (input) {
        input.addEventListener('focus', () => {
          visualEffects.createPulsingGlow(input, {
            color: 'rgba(0, 240, 255, 0.4)',
            intensity: 0.6,
            duration: 200,
            infinite: false,
          });
        });
      }
    });

    if (targetXInput) {
      targetXInput.value = String(segment.targetX);
      themeManager.createFuturisticInput(targetXInput);
    }
    if (targetYInput) {
      targetYInput.value = String(segment.targetY);
      themeManager.createFuturisticInput(targetYInput);
    }
    if (durationInput) {
      durationInput.value = String(segment.duration);
      themeManager.createFuturisticInput(durationInput);
    }

    if (easeXSelect) {
      fillOptions(easeXSelect, EASE_OPTIONS);
      easeXSelect.value = segment.easeX || 'linear';
      themeManager.createFuturisticInput(easeXSelect as any);
    }
    if (easeYSelect) {
      fillOptions(easeYSelect, EASE_OPTIONS);
      easeYSelect.value = segment.easeY || 'linear';
      themeManager.createFuturisticInput(easeYSelect as any);
    }

    // Apply glow to remove button
    const removeBtn = card.querySelector('.remove-segment-btn');
    if (removeBtn) {
      themeManager.applySciFiEffects(removeBtn as HTMLElement, {
        variant: 'error',
        glow: true,
      });
    }

    currentCards.push({
      element: card,
      targetXInput,
      targetYInput,
      durationInput,
      easeXSelect,
      easeYSelect,
      index: i
    });
    currentCardCount++;

    fragment.appendChild(card);
  }

  segmentList.appendChild(fragment);

  // 设置事件委托
  setupSegmentListDelegate();

  logger.debug('Segments rendered with sci-fi styling', { count: segments.length }, 'ProjectilePanel');
}

/**
 * 设置轨迹段列表事件委托
 */
function setupSegmentListDelegate(): void {
  const segmentList = DOM.projectileSegmentList;
  if (!segmentList || eventsBound) return;

  segmentList.addEventListener('click', handleSegmentListClick);
  segmentList.addEventListener('change', handleSegmentListChange);
  segmentList.addEventListener('input', handleSegmentListInput);
  eventsBound = true;
}

/**
 * 处理轨迹段列表点击
 */
function handleSegmentListClick(e: Event): void {
  const target = e.target as HTMLElement;
  const removeBtn = target.closest('.remove-segment-btn');

  if (removeBtn) {
    const card = removeBtn.closest('.segment-card') as HTMLElement;
    if (card && card.dataset.index) {
      const index = parseInt(card.dataset.index, 10);
      removeSegment(index);
    }
  }
}

/**
 * 处理轨迹段列表变更
 */
function handleSegmentListChange(e: Event): void {
  const target = e.target as HTMLElement;
  const card = target.closest('.segment-card') as HTMLElement;

  if (card && card.dataset.index) {
    const index = parseInt(card.dataset.index, 10);
    updateSegmentFromCard(index);
  }
}

/**
 * 处理轨迹段列表输入
 */
function handleSegmentListInput(e: Event): void {
  const target = e.target as HTMLElement;
  const card = target.closest('.segment-card') as HTMLElement;

  if (card && card.dataset.index) {
    const index = parseInt(card.dataset.index, 10);
    updateSegmentFromCard(index);
  }
}

/**
 * 从卡片更新轨迹段
 */
function updateSegmentFromCard(index: number): void {
  if (index < 0 || index >= currentCardCount) return;

  const card = currentCards[index];
  const segment = segments[index];

  if (!segment) return;

  segment.targetX = parseInt(card.targetXInput.value, 10) || 0;
  segment.targetY = parseInt(card.targetYInput.value, 10) || 0;
  segment.duration = parseInt(card.durationInput.value, 10) || 60;
  segment.easeX = card.easeXSelect.value as EasingType;
  segment.easeY = card.easeYSelect.value as EasingType;

  EventSystem.emit('projectile:segment-changed', { index, segment });
  drawTrajectoryTexture();
}

/**
 * 添加轨迹段
 */
export function addSegment(): void {
  segments.push({ ...DEFAULT_SEGMENT });
  renderSegments();

  EventSystem.emit('projectile:segment-added');
  logger.debug('Segment added', { count: segments.length }, 'ProjectilePanel');
  drawTrajectoryTexture();
}

/**
 * 移除轨迹段
 */
export function removeSegment(index: number): void {
  if (index < 0 || index >= segments.length) return;

  // 至少保留一个轨迹段
  if (segments.length <= 1) {
    logger.warn('Cannot remove last segment', undefined, 'ProjectilePanel');
    return;
  }

  segments.splice(index, 1);
  renderSegments();

  EventSystem.emit('projectile:segment-removed', { index });
  logger.debug('Segment removed', { index }, 'ProjectilePanel');
  drawTrajectoryTexture();
}

/**
 * 清空所有轨迹段
 */
export function clearSegments(): void {
  segments = [{ ...DEFAULT_SEGMENT }];
  renderSegments();

  EventSystem.emit('projectile:segments-cleared');
  logger.debug('Segments cleared', undefined, 'ProjectilePanel');
  drawTrajectoryTexture();
}

/**
 * 获取当前轨迹段
 */
export function getSegments(): TrajectorySegment[] {
  return segments;
}

/**
 * 设置轨迹段
 */
export function setSegments(newSegments: TrajectorySegment[]): void {
  segments = newSegments.length > 0 ? [...newSegments] : [{ ...DEFAULT_SEGMENT }];
  renderSegments();
  drawTrajectoryTexture();
}

// ============ 模板操作 ============

/**
 * 加载弹道模板
 */
export function loadTemplate(template: Record<string, unknown>): void {
  // 加载轨迹段
  const launchAnimation = template.launchAnimation as Record<string, unknown> | undefined;
  const templateSegments = launchAnimation?.segments as TrajectorySegment[] | undefined;

  if (Array.isArray(templateSegments) && templateSegments.length > 0) {
    segments = templateSegments.map(s => ({ ...s }));
  } else {
    segments = [{ ...DEFAULT_SEGMENT }];
  }

  renderSegments();
  drawTrajectoryTexture();

  // 更新模板名称
  if (DOM.projectileTemplateName && template.name) {
    DOM.projectileTemplateName.value = template.name as string;
  }

  const startAnimationId = Number(template.startAnimationId || 0);
  const launchAnimationId = Number(launchAnimation?.animationId || 0);
  const endAnimationId = Number(template.endAnimationId || 0);

  if (DOM.projectileStartAnimationSelect) {
    DOM.projectileStartAnimationSelect.value = String(startAnimationId);
  }
  if (DOM.projectileLaunchAnimationSelect) {
    DOM.projectileLaunchAnimationSelect.value = String(launchAnimationId);
  }
  if (DOM.projectileEndAnimationSelect) {
    DOM.projectileEndAnimationSelect.value = String(endAnimationId);
  }


  logger.debug('Template loaded', { name: template.name }, 'ProjectilePanel');
}

/**
 * 保存弹道模板
 */
export function saveTemplate(): Record<string, unknown> | null {
  const templateName = DOM.projectileTemplateName?.value.trim();

  if (!templateName) {
    EventSystem.emit('error:show', '请输入模板名称');
    return null;
  }

  const template = {
    name: templateName,
    startAnimationId: Number(DOM.projectileStartAnimationSelect?.value || 0),
    launchAnimation: {
      animationId: Number(DOM.projectileLaunchAnimationSelect?.value || 0),
      segments: segments.map(s => ({ ...s })),
    },
    endAnimationId: Number(DOM.projectileEndAnimationSelect?.value || 0),
  };

  EventSystem.emit('projectile:template-saved', template);
  logger.info('Template saved', { name: templateName }, 'ProjectilePanel');

  return template;
}

// ============ 数据管理功能 ============

/** 当前弹道索引 */
let currentProjectileIndex = -1;

/**
 * 创建默认弹道数据
 */
function createDefaultProjectile(): Record<string, unknown> {
  return {
    name: '新弹道',
    startAnimationId: 0,
    launchAnimation: {
      animationId: 0,
      segments: [{ ...DEFAULT_SEGMENT }],
    },
    endAnimationId: 0,
  };
}

/**
 * 新建弹道数据
 */
export function newProjectile(): void {
  const state = StateManager.getState();
  const currentData = state.currentData as Array<Record<string, unknown> | null>;
  
  if (!currentData) {
    EventSystem.emit('error:show', '请先加载弹道数据文件');
    return;
  }
  
  const newEntry = createDefaultProjectile();
  currentData.push(newEntry);
  currentProjectileIndex = currentData.length - 1;
  
  StateManager.setState({ currentData: [...currentData] as DataItem[] });
  StateManager.selectItem(currentProjectileIndex);
  loadTemplate(newEntry);
  
  EventSystem.emit('projectile:created', { projectile: newEntry, index: currentProjectileIndex });
  logger.info('New projectile created', { index: currentProjectileIndex }, 'ProjectilePanel');
}

/**
 * 保存弹道数据到文件
 */
export async function saveProjectileFile(): Promise<void> {
  const state = StateManager.getState();
  const filePath = state.currentFilePath;
  
  if (!filePath) {
    EventSystem.emit('error:show', '没有打开的弹道文件');
    return;
  }
  
  // 先收集当前编辑的数据
  const template = saveTemplate();
  if (!template && currentProjectileIndex >= 0) {
    // 如果没有名称但有选中项，使用当前数据
    const currentData = state.currentData as Array<Record<string, unknown> | null>;
    if (currentData && currentData[currentProjectileIndex]) {
      const currentItem = currentData[currentProjectileIndex] as Record<string, unknown>;
      currentItem.name = DOM.projectileTemplateName?.value.trim() || currentItem.name || '未命名';
      currentItem.startAnimationId = Number(DOM.projectileStartAnimationSelect?.value || 0);
      currentItem.launchAnimation = {
        animationId: Number(DOM.projectileLaunchAnimationSelect?.value || 0),
        segments: segments.map(s => ({ ...s })),
      };
      currentItem.endAnimationId = Number(DOM.projectileEndAnimationSelect?.value || 0);
    }
  } else if (template && currentProjectileIndex >= 0) {
    // 更新当前数据
    const currentData = state.currentData as Array<Record<string, unknown> | null>;
    if (currentData) {
      currentData[currentProjectileIndex] = template;
      StateManager.setState({ currentData: [...currentData] as DataItem[] });
    }
  }
  
  const currentData = StateManager.getState().currentData;
  const result = await fileSystemService.writeJSON(filePath, currentData);
  
  if (result.success) {
    EventSystem.emit('projectile:saved', { filePath, count: currentData?.length || 0 });
    EventSystem.emit('success:show', '弹道数据已保存');
    logger.info('Projectile file saved', { filePath }, 'ProjectilePanel');
  } else {
    EventSystem.emit('error:show', '保存弹道数据失败');
    logger.error('Failed to save projectile file', { error: result.error }, 'ProjectilePanel');
  }
}

/**
 * 删除当前弹道数据
 */
export async function deleteProjectile(): Promise<void> {
  const state = StateManager.getState();
  const currentData = state.currentData as Array<Record<string, unknown> | null>;
  
  if (!currentData || currentProjectileIndex < 0 || currentProjectileIndex >= currentData.length) {
    EventSystem.emit('error:show', '请先选择要删除的弹道');
    return;
  }
  
  // 将当前索引位置设为 null
  currentData[currentProjectileIndex] = null;
  StateManager.setState({ currentData: [...currentData] as DataItem[] });
  
  // 保存到文件
  await saveProjectileFile();
  
  // 选择下一个有效项
  let nextIndex = -1;
  for (let i = currentProjectileIndex + 1; i < currentData.length; i++) {
    if (currentData[i] !== null) {
      nextIndex = i;
      break;
    }
  }
  if (nextIndex < 0) {
    for (let i = currentProjectileIndex - 1; i >= 1; i--) {
      if (currentData[i] !== null) {
        nextIndex = i;
        break;
      }
    }
  }
  
  if (nextIndex >= 0) {
    currentProjectileIndex = nextIndex;
    StateManager.selectItem(nextIndex);
    loadTemplate(currentData[nextIndex] as Record<string, unknown>);
  } else {
    currentProjectileIndex = -1;
    // 清空编辑器
    if (DOM.projectileTemplateName) DOM.projectileTemplateName.value = '';
    segments = [{ ...DEFAULT_SEGMENT }];
    renderSegments();
  }
  
  EventSystem.emit('projectile:deleted', { index: currentProjectileIndex });
  logger.info('Projectile deleted', { index: currentProjectileIndex }, 'ProjectilePanel');
}

/**
 * 处理弹道名称变更，同步到数据列表
 */
function handleProjectileNameChange(): void {
  const state = StateManager.getState();
  const currentData = state.currentData as Array<Record<string, unknown> | null>;
  
  if (!currentData || currentProjectileIndex < 0) return;
  
  const newName = DOM.projectileTemplateName?.value.trim() || '';
  const currentItem = currentData[currentProjectileIndex];
  
  if (currentItem && currentItem.name !== newName) {
    currentItem.name = newName;
    // 触发列表刷新
    StateManager.setState({ currentData: [...currentData] as DataItem[] });
  }
}

// ============ 初始化 ============

/**
 * 初始化弹道面板
 * Enhanced with sci-fi theme and futuristic PixiJS container styling
 */
export function initProjectilePanel(): void {
  // Apply sci-fi theme to main projectile panel
  const projectileModePanel = DOM.projectileModePanel;
  if (projectileModePanel) {
    themeManager.createFuturisticPanel(projectileModePanel, {
      variant: 'primary',
      scanlines: true,
      cornerAccents: true,
    });
  }

  // Apply futuristic styling to PixiJS preview container
  const previewContainer = DOM.projectilePreviewContainer;
  if (previewContainer) {
    themeManager.applySciFiEffects(previewContainer, {
      variant: 'accent',
      glow: true,
      scanlines: true,
    });

    // Add particle field background to preview
    visualEffects.createParticleField(previewContainer, {
      particleCount: 30,
      colors: ['rgba(0, 240, 255, 0.3)', 'rgba(0, 255, 136, 0.2)'],
      speed: 25000,
      size: 1,
    });

    // Add energy wave effect on hover
    previewContainer.addEventListener('mouseenter', () => {
      visualEffects.createEnergyWave(previewContainer, {
        color: 'rgba(0, 240, 255, 0.3)',
        duration: 800,
        direction: 'horizontal',
      });
    });

    // Add holographic flicker effect
    visualEffects.createHolographicFlicker(previewContainer, {
      intensity: 0.03,
      frequency: 0.05,
      duration: 100,
    });
  }

  // Apply theme to segment list container
  const segmentList = DOM.projectileSegmentList;
  if (segmentList) {
    themeManager.createFuturisticPanel(segmentList, {
      variant: 'secondary',
      scanlines: false,
    });
  }

  // Apply theme to control buttons with enhanced effects
  const controlButtons = [
    DOM.projectileAddSegmentBtn,
    DOM.projectileClearSegmentsBtn,
    DOM.projectileSaveTemplateBtn,
    DOM.projectilePlayTestBtn,
    DOM.projectilePauseBtn,
    DOM.projectileStopBtn,
    DOM.projectileStepBackBtn,
    DOM.projectileStepForwardBtn,
  ];
  const variants = ['accent', 'secondary', 'secondary', 'primary', 'secondary', 'secondary', 'accent', 'accent'] as const;
  controlButtons.forEach((btn, index) => {
    if (btn) {
      themeManager.createFuturisticButton(btn, variants[index]);

      // Add energy wave effect on click
      btn.addEventListener('click', () => {
        if (!btn.disabled) {
          visualEffects.createEnergyWave(btn, {
            color: 'rgba(255, 255, 255, 0.4)',
            duration: 600,
            direction: 'horizontal',
          });
        }
      });

      // Special styling for play test button
      if (btn === DOM.projectilePlayTestBtn) {
        visualEffects.createPulsingGlow(btn, {
          color: 'rgba(0, 240, 255, 0.4)',
          intensity: 0.8,
          duration: 2000,
          infinite: true,
        });

        // Add scanning line effect
        visualEffects.createScanningLine(btn, {
          color: 'rgba(0, 240, 255, 0.3)',
          speed: 2000,
          opacity: 0.2,
        });
      }

      // Add hover effects for all buttons
      btn.addEventListener('mouseenter', () => {
        if (!btn.disabled) {
          visualEffects.createPulsingGlow(btn, {
            color: 'rgba(0, 240, 255, 0.3)',
            intensity: 0.5,
            duration: 300,
            infinite: false,
          });
        }
      });
    }
  });

  // Apply theme to data file controls
  const dataSection = projectileModePanel?.querySelector('.projectile-data-section');
  if (dataSection) {
    themeManager.applySciFiEffects(dataSection as HTMLElement, {
      variant: 'secondary',
      glow: false,
      scanlines: true,
    });
  }

  // 绑定添加轨迹段按钮
  if (DOM.projectileAddSegmentBtn) {
    DOM.projectileAddSegmentBtn.addEventListener('click', addSegment);
  }

  // 绑定清空轨迹段按钮
  if (DOM.projectileClearSegmentsBtn) {
    DOM.projectileClearSegmentsBtn.addEventListener('click', clearSegments);
  }

  // 绑定保存模板按钮
  if (DOM.projectileSaveTemplateBtn) {
    DOM.projectileSaveTemplateBtn.addEventListener('click', () => saveProjectileFile());
  }

  // 绑定新建弹道按钮
  if (DOM.projectileCreateTemplateBtn) {
    DOM.projectileCreateTemplateBtn.addEventListener('click', newProjectile);
  }

  // 绑定删除弹道按钮
  if (DOM.projectileDeleteTemplateBtn) {
    DOM.projectileDeleteTemplateBtn.addEventListener('click', () => deleteProjectile());
  }

  // 绑定弹道名称输入框变更事件
  if (DOM.projectileTemplateName) {
    DOM.projectileTemplateName.addEventListener('input', handleProjectileNameChange);
  }

  // 绑定播放测试按钮
  if (DOM.projectilePlayTestBtn) {
    DOM.projectilePlayTestBtn.addEventListener('click', handlePlayTest);
  }

  // 绑定暂停按钮
  if (DOM.projectilePauseBtn) {
    DOM.projectilePauseBtn.addEventListener('click', handlePauseTest);
  }

  // 绑定停止按钮
  if (DOM.projectileStopBtn) {
    DOM.projectileStopBtn.addEventListener('click', handleStopTest);
  }

  // 绑定逐帧控制按钮
  if (DOM.projectileStepBackBtn) {
    DOM.projectileStepBackBtn.addEventListener('click', () => stepFrame(-1));
  }
  if (DOM.projectileStepForwardBtn) {
    DOM.projectileStepForwardBtn.addEventListener('click', () => stepFrame(1));
  }

  // 绑定播放速率控制
  if (DOM.projectilePlaybackRate) {
    themeManager.createFuturisticInput(DOM.projectilePlaybackRate as any);
  }

  // 初始化数据选择器
  initProjectileDataSelect();

  // 绑定数据加载器
  bindDataLoaders();

  // 绑定偏移保存按钮
  bindOffsetSaveButtons();

  // 绑定预览同步控件
  bindPreviewSyncControls();

  // 订阅状态变更
  StateManager.subscribe((_state, changedKeys) => {
    if (changedKeys.includes('currentItem')) {
      const state = StateManager.getState();
      if (state.currentItem && state.currentFileType === 'projectile') {
        loadTemplate(state.currentItem as unknown as Record<string, unknown>);
      }
    }
  });

  logger.info('ProjectilePanel initialized with sci-fi theme', undefined, 'ProjectilePanel');
}

/**
 * 处理播放测试
 */
async function handlePlayTest(): Promise<void> {
  try {
    await initializePreview();
    if (isPlaying) {
      resetPreview();
    }
    playAnimation();
    updateControlButtons();
    logger.info('Play test requested', undefined, 'ProjectilePanel');
  } catch (error) {
    logger.error('Play test failed', { error }, 'ProjectilePanel');
    EventSystem.emit('error:show', '播放测试失败');
  }
}

/**
 * 处理暂停测试
 */
function handlePauseTest(): void {
  pauseAnimation();
  updateControlButtons();
  logger.info('Pause test requested', undefined, 'ProjectilePanel');
}

/**
 * 处理停止测试
 */
function handleStopTest(): void {
  resetPreview();
  updateControlButtons();
  logger.info('Stop test requested', undefined, 'ProjectilePanel');
}

/**
 * 更新控制按钮状态
 */
function updateControlButtons(): void {
  if (DOM.projectilePlayTestBtn) {
    DOM.projectilePlayTestBtn.disabled = isPlaying && !isPaused;
    DOM.projectilePlayTestBtn.innerHTML = isPlaying && !isPaused
      ? '<span class="text-lg">⏸</span> 播放中...'
      : '<span class="text-lg">▶</span> 播放预览';
  }

  if (DOM.projectilePauseBtn) {
    DOM.projectilePauseBtn.disabled = !isPlaying;
    DOM.projectilePauseBtn.innerHTML = isPaused
      ? '<span class="text-sm">▶</span> 继续'
      : '<span class="text-sm">⏸</span> 暂停';
  }

  if (DOM.projectileStopBtn) {
    DOM.projectileStopBtn.disabled = !isPlaying && !isPaused;
  }

  if (DOM.projectileStepBackBtn) {
    DOM.projectileStepBackBtn.disabled = !isPaused || currentFrame <= 0;
  }

  if (DOM.projectileStepForwardBtn) {
    DOM.projectileStepForwardBtn.disabled = !isPaused || currentFrame >= totalFrames;
  }

  if (DOM.projectileFrameInfo) {
    DOM.projectileFrameInfo.textContent = `${currentFrame}/${totalFrames}`;
  }
}

// ============ 清理 ============

/**
 * 清理弹道面板
 */
export function disposeProjectilePanel(): void {
  // 回收所有卡片
  for (let i = 0; i < currentCardCount; i++) {
    returnSegmentCard(currentCards[i]);
  }
  currentCardCount = 0;
  segments = [];

  // 移除事件监听
  const segmentList = DOM.projectileSegmentList;
  if (segmentList && eventsBound) {
    segmentList.removeEventListener('click', handleSegmentListClick);
    segmentList.removeEventListener('change', handleSegmentListChange);
    segmentList.removeEventListener('input', handleSegmentListInput);
    eventsBound = false;
  }

  // 移除按钮监听
  if (DOM.projectileAddSegmentBtn) {
    DOM.projectileAddSegmentBtn.removeEventListener('click', addSegment);
  }
  if (DOM.projectileClearSegmentsBtn) {
    DOM.projectileClearSegmentsBtn.removeEventListener('click', clearSegments);
  }
  if (DOM.projectileSaveTemplateBtn) {
    DOM.projectileSaveTemplateBtn.removeEventListener('click', saveTemplate);
  }
  if (DOM.projectilePlayTestBtn) {
    DOM.projectilePlayTestBtn.removeEventListener('click', handlePlayTest);
  }
  if (DOM.projectilePauseBtn) {
    DOM.projectilePauseBtn.removeEventListener('click', handlePauseTest);
  }
  if (DOM.projectileStopBtn) {
    DOM.projectileStopBtn.removeEventListener('click', handleStopTest);
  }
  if (DOM.projectileStepBackBtn) {
    DOM.projectileStepBackBtn.removeEventListener('click', () => stepFrame(-1));
  }
  if (DOM.projectileStepForwardBtn) {
    DOM.projectileStepForwardBtn.removeEventListener('click', () => stepFrame(1));
  }

  // 销毁预览
  if (previewInitialized) {
    PixiRenderer.destroyScene('projectile');
    startSprite = null;
    launchSprite = null;
    endSprite = null;
    trajectoryGraphics = null;
    effectGraphics = null;
    startAnimationSprite = null;
    launchAnimationSprite = null;
    endAnimationSprite = null;
    previewInitialized = false;
  }

  logger.info('ProjectilePanel disposed', undefined, 'ProjectilePanel');
}

// ============ 渲染函数 ============

/**
 * 渲染弹道面板
 * 从当前状态获取弹道模板并加载
 */
export function renderProjectilePanel(): void {
  const state = StateManager.getState();
  const currentItem = state.currentItem;
  const currentData = state.currentData;

  // 确保预览已初始化
  initializePreview();

  if (!currentItem) {
    logger.warn('No current item to render in ProjectilePanel', undefined, 'ProjectilePanel');
    return;
  }

  // 更新当前弹道索引
  if (currentData) {
    currentProjectileIndex = currentData.indexOf(currentItem);
  }

  // 将当前项目作为弹道模板加载
  loadTemplate(currentItem as unknown as Record<string, unknown>);
}

// ============ 数据加载 ============



/**
 * 检查路径是否为绝对路径
 */
function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[a-zA-Z]:/.test(path);
}

/**
 * 规范化路径斜杠
 */
function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

/**
 * 获取数据目录
 */
function getDataDirectory(): string {
  const state = StateManager.getState();
  return state.config.dataPath || '';
}

/**
 * 解析弹道文件路径
 */
function resolveProjectileFilePath(value: string): string | null {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return null;

  if (isAbsolutePath(normalizedValue)) {
    return normalizeSlashes(normalizedValue);
  }

  const dataDir = getDataDirectory();
  if (!dataDir) return null;

  return normalizeSlashes(`${dataDir}/${normalizedValue}`);
}

/**
 * 获取角色偏移
 */
function getRoleOffset(role: 'actor' | 'enemy', id: number, offsetId: number): { x: number; y: number } {
  if (role === 'actor') {
    const actors = projectileDataCache.actor as Record<string, unknown>[] | undefined;
    const weapons = projectileDataCache.weapon as Record<string, unknown>[] | undefined;
    const actor = actors ? findDataEntryById(actors, id) : null;
    const weapon = weapons ? findDataEntryById(weapons, offsetId) : null;
    const wtypeId = (weapon?.wtypeId as number) || 0;
    const offset = (actor?.projectileOffset as Array<{ x?: number; y?: number }> | undefined)?.[wtypeId] || { x: 0, y: 0 };
    return { x: offset.x || 0, y: offset.y || 0 };
  }

  const enemies = projectileDataCache.enemy as Record<string, unknown>[] | undefined;
  const enemy = enemies ? findDataEntryById(enemies, id) : null;
  const offset = (enemy?.projectileOffset as Record<number, { x?: number; y?: number }> | undefined)?.[offsetId] || { x: 0, y: 0 };
  return { x: offset.x || 0, y: offset.y || 0 };
}



/**
 * 查找数据项
 */
function findDataEntryById<T extends Record<string, unknown>>(dataArray: T[], id: number): T | null {
  if (!Array.isArray(dataArray)) return null;
  const numId = Number(id);
  if (!numId || numId < 1 || numId >= dataArray.length) return null;
  return dataArray[numId] || null;
}

/**
 * 刷新角色偏移输入框
 */
function refreshActorOffsetInputs(): void {
  const actorSelect = DOM.projectileActorSelect;
  const weaponSelect = DOM.projectileWeaponOffsetSelect;
  const offsetX = DOM.projectileActorOffsetX;
  const offsetY = DOM.projectileActorOffsetY;

  if (!actorSelect || !weaponSelect || !offsetX || !offsetY) return;

  const actorId = parseInt(actorSelect.value, 10) || 0;
  const weaponId = parseInt(weaponSelect.value, 10) || 0;
  const offset = getRoleOffset('actor', actorId, weaponId);

  offsetX.value = String(offset.x);
  offsetY.value = String(offset.y);

  logger.debug('Actor offset inputs refreshed', { actorId, offset }, 'ProjectilePanel');
}

/**
 * 刷新敌人偏移输入框
 */
function refreshEnemyOffsetInputs(): void {
  const enemySelect = DOM.projectileEnemySelect;
  const skillSelect = DOM.projectileSkillSelect;
  const offsetX = DOM.projectileEnemyOffsetX;
  const offsetY = DOM.projectileEnemyOffsetY;

  if (!enemySelect || !skillSelect || !offsetX || !offsetY) return;

  const enemyId = parseInt(enemySelect.value, 10) || 0;
  const skillId = parseInt(skillSelect.value, 10) || 0;
  const offset = getRoleOffset('enemy', enemyId, skillId);

  offsetX.value = String(offset.x);
  offsetY.value = String(offset.y);

  logger.debug('Enemy offset inputs refreshed', { enemyId, offset }, 'ProjectilePanel');
}




async function loadProjectileData(type: keyof typeof PROJECTILE_DATA_CONFIG, fileValue: string): Promise<void> {
  const config = PROJECTILE_DATA_CONFIG[type];
  if (!config) return;

  const fullPath = resolveProjectileFilePath(fileValue);
  if (!fullPath) return;

  const result = await fileSystemService.readJSON<any[]>(fullPath);
  if (result.success && result.data) {
    const parsed = result.data;
    const fileName = fullPath.split(/[\\/]/).pop() || fullPath;

    applyLoadedProjectileData(type, parsed);

    const statusEl = DOM.getById(config.statusRef);
    if (statusEl) {
      const count = Math.max((parsed?.length ?? 0) - 1, 0);
      statusEl.textContent = `${fileName} · ${count} 条`;
    }

    const state = StateManager.getState();
    const projectileDataPaths = { ...state.projectileDataPaths, [type]: fullPath };
    StateManager.setState({ projectileDataPaths });

    logger.info('Projectile data loaded', { type, filePath: fullPath, count: parsed?.length }, 'ProjectilePanel');
  } else {
    logger.error('Failed to load projectile data', { type, filePath: fullPath, error: result.error }, 'ProjectilePanel');
  }
}

function applyLoadedProjectileData(type: string, data: unknown): void {
  if (!data || !Array.isArray(data)) return;
  projectileDataCache[type] = data;

  switch (type) {
    case 'animation':
      updateAnimationSelects(data);
      break;
    case 'enemy':
      updateEnemySelect(data);
      // 自动选择第一个敌人
      autoSelectFirstData('enemy');
      break;
    case 'actor':
      updateActorSelect(data);
      // 自动选择第一个角色
      autoSelectFirstData('actor');
      break;
    case 'weapon':
      updateWeaponSelect(data);
      // 自动选择第一个武器
      autoSelectFirstWeapon();
      break;
    case 'skill':
      updateSkillSelect(data);
      // 自动选择第一个技能
      autoSelectFirstSkill();
      break;
  }
}

/**
 * 自动选择第一个数据项
 */
function autoSelectFirstData(type: 'actor' | 'enemy'): void {
  const data = projectileDataCache[type] as Record<string, unknown>[];
  if (!data || data.length <= 1) return;

  // 更新预览同步UI中的选择
  const emitterTypeSelect = document.getElementById('projectileEmitterTypeSelect') as HTMLSelectElement;
  const targetTypeSelect = document.getElementById('projectileTargetTypeSelect') as HTMLSelectElement;
  
  // 如果发射者类型匹配，自动选择第一个
  if (emitterTypeSelect && emitterTypeSelect.value === type) {
    const emitterIdSelect = document.getElementById('projectileEmitterIdSelect') as HTMLSelectElement;
    if (emitterIdSelect && emitterIdSelect.children.length > 1) {
      emitterIdSelect.value = '1';
      updatePreviewSprite('emitter');
    }
  }
  
  // 如果目标类型匹配，自动选择第一个
  if (targetTypeSelect && targetTypeSelect.value === type) {
    const targetIdSelect = document.getElementById('projectileTargetIdSelect') as HTMLSelectElement;
    if (targetIdSelect && targetIdSelect.children.length > 1) {
      targetIdSelect.value = '1';
      updatePreviewSprite('target');
    }
  }
}

/**
 * 自动选择第一个武器
 */
function autoSelectFirstWeapon(): void {
  const weaponSelect = document.getElementById('projectileEmitterWeaponSelect') as HTMLSelectElement;
  const data = projectileDataCache.weapon as Record<string, unknown>[];
  
  if (weaponSelect && data && data.length > 1) {
    // 选择第一个武器
    for (let i = 1; i < data.length; i++) {
      const weapon = data[i];
      if (weapon) {
        weaponSelect.value = String(weapon.id || i);
        updatePreviewSprite('emitter');
        break;
      }
    }
  }
}

/**
 * 自动选择第一个技能
 */
function autoSelectFirstSkill(): void {
  const skillSelect = document.getElementById('projectileEmitterSkillSelect') as HTMLSelectElement;
  const data = projectileDataCache.skill as Record<string, unknown>[];
  
  if (skillSelect && data && data.length > 1) {
    // 选择第一个技能
    for (let i = 1; i < data.length; i++) {
      const skill = data[i];
      if (skill) {
        skillSelect.value = String(skill.id || i);
        updatePreviewSprite('emitter');
        break;
      }
    }
  }
}

function updateAnimationSelects(data: unknown[]): void {
  const selects = [
    DOM.projectileStartAnimationSelect,
    DOM.projectileLaunchAnimationSelect,
    DOM.projectileEndAnimationSelect,
  ];

  for (const select of selects) {
    if (!select) continue;

    const currentValue = select.value;
    select.innerHTML = '<option value="0">无</option>';

    for (let i = 1; i < data.length; i++) {
      const anim = data[i];
      const animObj = anim as Record<string, unknown>;
      const name = typeof anim === 'string' ? anim : (animObj.name as string) || `动画${i}`;
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = name;
      select.appendChild(option);
    }

    if (currentValue) {
      select.value = currentValue;
    }
  }
}

function updateEnemySelect(data: unknown[]): void {
  const select = DOM.projectileEnemySelect;
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '<option value="0">无</option>';

  for (let i = 1; i < data.length; i++) {
    const enemy = data[i];
    const enemyObj = enemy as Record<string, unknown>;
    const name = typeof enemy === 'string' ? enemy : (enemyObj.name as string) || `敌人${i}`;
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = name;
    select.appendChild(option);
  }

  if (currentValue) {
    select.value = currentValue;
  }
}

function updateActorSelect(data: unknown[]): void {
  const selects = [
    DOM.projectileActorSelect,
    DOM.projectileEmitterCharacterSelect,
    DOM.projectileTargetCharacterSelect,
  ];

  for (const select of selects) {
    if (!select) continue;

    const currentValue = select.value;
    select.innerHTML = '<option value="0">无</option>';

    for (let i = 1; i < data.length; i++) {
      const actor = data[i];
      const actorObj = actor as Record<string, unknown>;
      const name = typeof actor === 'string' ? actor : (actorObj.name as string) || `角色${i}`;
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = name;
      select.appendChild(option);
    }

    if (currentValue) {
      select.value = currentValue;
    }
  }
}

function updateWeaponSelect(data: unknown[]): void {
  const select = DOM.projectileWeaponOffsetSelect;
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '';

  if (data.length <= 1) {
    select.innerHTML = '<option value="0">未加载</option>';
    return;
  }

  for (let i = 1; i < data.length; i++) {
    const weapon = data[i];
    const weaponObj = weapon as Record<string, unknown>;
    const id = (weaponObj.id as number) || i;
    const name = (weaponObj.name as string) || `武器${i}`;
    const option = document.createElement('option');
    option.value = String(id);
    option.textContent = `${id} · ${name}`;
    select.appendChild(option);
  }

  if (currentValue) {
    select.value = currentValue;
  }

  logger.debug('Weapon data loaded', { count: data.length }, 'ProjectilePanel');
}

function updateSkillSelect(data: unknown[]): void {
  const select = DOM.projectileSkillSelect;
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '';

  if (data.length <= 1) {
    select.innerHTML = '<option value="0">未加载</option>';
    return;
  }

  for (let i = 1; i < data.length; i++) {
    const skill = data[i];
    const skillObj = skill as Record<string, unknown>;
    const id = (skillObj.id as number) || i;
    const name = (skillObj.name as string) || `技能${i}`;
    const option = document.createElement('option');
    option.value = String(id);
    option.textContent = `${id} · ${name}`;
    select.appendChild(option);
  }

  if (currentValue) {
    select.value = currentValue;
  }

  logger.debug('Skill data loaded', { count: data.length }, 'ProjectilePanel');
}

async function handlePickProjectileDataFile(type: keyof typeof PROJECTILE_DATA_CONFIG): Promise<void> {
  const config = PROJECTILE_DATA_CONFIG[type];
  if (!config) return;

  try {
    const filePath = await fileSystemService.selectFile([{ name: 'JSON 文件', extensions: ['json'] }]);
    if (!filePath) return;

    const select = DOM.getById<HTMLSelectElement>(config.selectRef);
    if (select) {
      let option = select.querySelector<HTMLOptionElement>(`[value="${filePath}"]`);
      if (!option) {
        option = document.createElement('option');
        option.value = filePath;
        option.textContent = filePath.split(/[\\/]/).pop() || filePath;
        select.appendChild(option);
      }
      select.value = filePath;
    }

    await loadProjectileData(type, filePath);
  } catch (error) {
    logger.error('Failed to pick projectile data file', error, 'ProjectilePanel');
  }
}

function initProjectileDataSelect(): void {
  for (const [type, config] of Object.entries(PROJECTILE_DATA_CONFIG)) {
    const select = DOM.getById<HTMLSelectElement>(config.selectRef);
    if (!select) continue;

    select.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = config.defaultFile;
    defaultOpt.textContent = config.defaultFile;
    select.appendChild(defaultOpt);

    const state = StateManager.getState();
    const savedPath = state.projectileDataPaths[type];
    if (savedPath) {
      const customOpt = document.createElement('option');
      customOpt.value = savedPath;
      customOpt.textContent = savedPath.split(/[\\/]/).pop() || savedPath;
      select.appendChild(customOpt);
      select.value = savedPath;
    } else {
      select.value = config.defaultFile;
    }
  }
}

function bindDataLoaders(): void {
  for (const [type, config] of Object.entries(PROJECTILE_DATA_CONFIG)) {
    const loadBtn = DOM.getById<HTMLElement>(config.loadBtnRef);
    const pickBtn = DOM.getById<HTMLElement>(config.pickBtnRef);

    if (loadBtn) {
      loadBtn.dataset.projectileResource = type;
      loadBtn.dataset.projectileAction = 'load';
    }
    if (pickBtn) {
      pickBtn.dataset.projectileResource = type;
      pickBtn.dataset.projectileAction = 'pick';
    }
  }

  document.addEventListener('click', handleProjectileDataLoaderClick);
  document.addEventListener('change', handleProjectileDataLoaderChange);
}

function handleProjectileDataLoaderClick(e: Event): void {
  const target = e.target as HTMLElement;
  const resourceBtn = target.closest('[data-projectile-resource][data-projectile-action]') as HTMLElement;

  if (resourceBtn) {
    const type = resourceBtn.dataset.projectileResource as keyof typeof PROJECTILE_DATA_CONFIG;
    const action = resourceBtn.dataset.projectileAction;

    if (action === 'load') {
      const config = PROJECTILE_DATA_CONFIG[type];
      const select = DOM.getById<HTMLSelectElement>(config.selectRef);
      loadProjectileData(type, select?.value || config.defaultFile);
    } else if (action === 'pick') {
      handlePickProjectileDataFile(type);
    }
  }
}

function handleProjectileDataLoaderChange(e: Event): void {
  const target = e.target as HTMLSelectElement | HTMLInputElement;

  if (target.dataset.projectileResource && target.dataset.projectileAction === 'load') {
    const type = target.dataset.projectileResource as keyof typeof PROJECTILE_DATA_CONFIG;
    loadProjectileData(type, target.value);
  }
}

// ============ 偏移保存 ============

export function saveActorOffset(): void {
  const actorSelect = DOM.projectileActorSelect;
  const weaponSelect = DOM.projectileWeaponOffsetSelect;
  const offsetX = DOM.projectileActorOffsetX;
  const offsetY = DOM.projectileActorOffsetY;

  if (!actorSelect || !weaponSelect || !offsetX || !offsetY) return;

  const actorId = parseInt(actorSelect.value, 10) || 0;
  const weaponId = parseInt(weaponSelect.value, 10) || 0;
  const x = parseInt(offsetX.value, 10) || 0;
  const y = parseInt(offsetY.value, 10) || 0;

  if (actorId === 0 || weaponId === 0) {
    EventSystem.emit('error:show', 'Please select actor and weapon');
    return;
  }

  const state = StateManager.getState();
  const projectileDataPaths = state.projectileDataPaths;

  let actorFilePath = projectileDataPaths.actor;
  if (!actorFilePath) {
    actorFilePath = state.config.dataPath ? `${state.config.dataPath}/Actors.json` : '';
  }

  if (actorFilePath) {
    EventSystem.emit('projectile:actor-offset-saved', {
      actorId,
      weaponId,
      offset: { x, y },
      filePath: actorFilePath,
    });

    logger.info('Actor offset saved', { actorId, x, y }, 'ProjectilePanel');
    EventSystem.emit('toast:show', '角色偏移已保存');
  } else {
    EventSystem.emit('error:show', '未加载角色数据文件');
  }
}

export function saveEnemyOffset(): void {
  const enemySelect = DOM.projectileEnemySelect;
  const skillSelect = DOM.projectileSkillSelect;
  const offsetX = DOM.projectileEnemyOffsetX;
  const offsetY = DOM.projectileEnemyOffsetY;

  if (!enemySelect || !skillSelect || !offsetX || !offsetY) return;

  const enemyId = parseInt(enemySelect.value, 10) || 0;
  const skillId = parseInt(skillSelect.value, 10) || 0;
  const x = parseInt(offsetX.value, 10) || 0;
  const y = parseInt(offsetY.value, 10) || 0;

  if (enemyId === 0 || skillId === 0) {
    EventSystem.emit('error:show', 'Please select enemy and skill');
    return;
  }

  const state = StateManager.getState();
  const projectileDataPaths = state.projectileDataPaths;

  let enemyFilePath = projectileDataPaths.enemy;
  if (!enemyFilePath) {
    enemyFilePath = state.config.dataPath ? `${state.config.dataPath}/Enemies.json` : '';
  }

  if (enemyFilePath) {
    EventSystem.emit('projectile:enemy-offset-saved', {
      enemyId,
      skillId,
      offset: { x, y },
      filePath: enemyFilePath,
    });

    logger.info('Enemy offset saved', { enemyId, x, y }, 'ProjectilePanel');
    EventSystem.emit('toast:show', '敌人偏移已保存');
  } else {
    EventSystem.emit('error:show', '未加载敌人数据文件');
  }
}

function bindOffsetSaveButtons(): void {
  const actorSaveBtn = DOM.projectileActorOffsetSaveBtn;
  const enemySaveBtn = DOM.projectileEnemyOffsetSaveBtn;
  const actorSelect = DOM.projectileActorSelect;
  const enemySelect = DOM.projectileEnemySelect;
  const weaponSelect = DOM.projectileWeaponOffsetSelect;
  const skillSelect = DOM.projectileSkillSelect;

  if (actorSaveBtn) {
    actorSaveBtn.addEventListener('click', saveActorOffset);
  }

  if (enemySaveBtn) {
    enemySaveBtn.addEventListener('click', saveEnemyOffset);
  }

  if (actorSelect) {
    actorSelect.addEventListener('change', refreshActorOffsetInputs);
  }

  if (enemySelect) {
    enemySelect.addEventListener('change', refreshEnemyOffsetInputs);
  }

  if (weaponSelect) {
    weaponSelect.addEventListener('change', refreshActorOffsetInputs);
  }

  if (skillSelect) {
    skillSelect.addEventListener('change', refreshEnemyOffsetInputs);
  }

  if (actorSelect) {
    actorSelect.addEventListener('change', updatePreviewTextures);
  }
  if (enemySelect) {
    enemySelect.addEventListener('change', updatePreviewTextures);
  }


}

async function updatePreviewTextures(): Promise<void> {
  // Existing offset section update (keep it or specific logic? 
  // User wants the separate "Preview Sync" section to control preview textures.
  // We should consolidate execution or let them coexist but they might conflict if both try to set texture.
  // Prioritize the new "Preview Sync" section for the main preview sprites.
}

// ============ Preview Sync ============

function bindPreviewSyncControls(): void {
  const emitterType = document.getElementById('projectileEmitterTypeSelect') as HTMLSelectElement;
  const emitterId = document.getElementById('projectileEmitterIdSelect') as HTMLSelectElement;
  const emitterWeapon = document.getElementById('projectileEmitterWeaponSelect') as HTMLSelectElement;
  const emitterSkill = document.getElementById('projectileEmitterSkillSelect') as HTMLSelectElement;
  const targetType = document.getElementById('projectileTargetTypeSelect') as HTMLSelectElement;
  const targetId = document.getElementById('projectileTargetIdSelect') as HTMLSelectElement;
  const targetSkill = document.getElementById('projectileTargetSkillSelect') as HTMLSelectElement;

  if (emitterType && emitterId) {
    emitterType.addEventListener('change', () => updatePreviewSyncUI('emitter'));
    emitterId.addEventListener('change', () => updatePreviewSprite('emitter'));
  }

  if (emitterWeapon) {
    emitterWeapon.addEventListener('change', () => updatePreviewSprite('emitter'));
  }

  if (emitterSkill) {
    emitterSkill.addEventListener('change', () => updatePreviewSprite('emitter'));
  }

  if (targetType && targetId) {
    targetType.addEventListener('change', () => updatePreviewSyncUI('target'));
    targetId.addEventListener('change', () => updatePreviewSprite('target'));
  }
  
  if (targetSkill) {
    targetSkill.addEventListener('change', () => updatePreviewSprite('target'));
  }
}

function updatePreviewSyncUI(role: 'emitter' | 'target'): void {
  const typeSelect = document.getElementById(role === 'emitter' ? 'projectileEmitterTypeSelect' : 'projectileTargetTypeSelect') as HTMLSelectElement;
  const idSelect = document.getElementById(role === 'emitter' ? 'projectileEmitterIdSelect' : 'projectileTargetIdSelect') as HTMLSelectElement;
  const weaponSelect = document.getElementById('projectileEmitterWeaponSelect') as HTMLSelectElement;
  const skillSelect = document.getElementById('projectileEmitterSkillSelect') as HTMLSelectElement;
  
  // 为目标敌人添加技能选择器
  const targetSkillSelect = document.getElementById('projectileTargetSkillSelect') as HTMLSelectElement;

  if (!typeSelect || !idSelect) return;

  const type = typeSelect.value as 'none' | 'actor' | 'enemy';
  idSelect.innerHTML = '<option value="">选择数据...</option>';
  idSelect.disabled = type === 'none';

  // 显示/隐藏武器和技能选择
  if (role === 'emitter') {
    if (weaponSelect) {
      weaponSelect.style.display = type === 'actor' ? 'block' : 'none';
      if (type === 'actor') {
        // 清空并重新填充武器选择
        weaponSelect.innerHTML = '<option value="">选择武器...</option>';
        const weapons = projectileDataCache.weapon as Record<string, unknown>[] || [];
        if (weapons.length > 1) {
          for (let i = 1; i < weapons.length; i++) {
            const weapon = weapons[i];
            if (weapon) {
              const weaponObj = weapon as Record<string, unknown>;
              const id = (weaponObj.id as number) || i;
              const name = (weaponObj.name as string) || `武器${i}`;
              const option = document.createElement('option');
              option.value = String(id);
              option.textContent = `${id} · ${name}`;
              weaponSelect.appendChild(option);
            }
          }
          // 自动选择第一个武器
          if (weapons.length > 1) {
            const firstWeapon = weapons[1] as Record<string, unknown>;
            weaponSelect.value = String(firstWeapon.id || 1);
          }
        }
      }
    }
    
    if (skillSelect) {
      skillSelect.style.display = type === 'enemy' ? 'block' : 'none';
      if (type === 'enemy') {
        // 清空并重新填充技能选择
        skillSelect.innerHTML = '<option value="">选择技能...</option>';
        const skills = projectileDataCache.skill as Record<string, unknown>[] || [];
        if (skills.length > 1) {
          for (let i = 1; i < skills.length; i++) {
            const skill = skills[i];
            if (skill) {
              const skillObj = skill as Record<string, unknown>;
              const id = (skillObj.id as number) || i;
              const name = (skillObj.name as string) || `技能${i}`;
              const option = document.createElement('option');
              option.value = String(id);
              option.textContent = `${id} · ${name}`;
              skillSelect.appendChild(option);
            }
          }
          // 自动选择第一个技能
          if (skills.length > 1) {
            const firstSkill = skills[1] as Record<string, unknown>;
            skillSelect.value = String(firstSkill.id || 1);
          }
        }
      }
    }
  } else if (role === 'target') {
    // 目标敌人也需要技能选择（用于计算偏移）
    if (targetSkillSelect) {
      targetSkillSelect.style.display = type === 'enemy' ? 'block' : 'none';
      if (type === 'enemy') {
        // 清空并重新填充技能选择
        targetSkillSelect.innerHTML = '<option value="">选择技能...</option>';
        const skills = projectileDataCache.skill as Record<string, unknown>[] || [];
        if (skills.length > 1) {
          for (let i = 1; i < skills.length; i++) {
            const skill = skills[i];
            if (skill) {
              const skillObj = skill as Record<string, unknown>;
              const id = (skillObj.id as number) || i;
              const name = (skillObj.name as string) || `技能${i}`;
              const option = document.createElement('option');
              option.value = String(id);
              option.textContent = `${id} · ${name}`;
              targetSkillSelect.appendChild(option);
            }
          }
          // 自动选择第一个技能
          if (skills.length > 1) {
            const firstSkill = skills[1] as Record<string, unknown>;
            targetSkillSelect.value = String(firstSkill.id || 1);
          }
        }
      }
    }
  }

  if (type === 'none') {
    updatePreviewSprite(role); // Reset
    return;
  }

  // Check if data is loaded
  const data = projectileDataCache[type] as Record<string, unknown>[];
  if (!data || !Array.isArray(data)) {
    const opt = document.createElement('option');
    opt.textContent = '(数据未加载 - 请先在左侧加载)';
    idSelect.appendChild(opt);
    return;
  }

  // Populate character/enemy list
  for (let i = 1; i < data.length; i++) {
    const item = data[i];
    const itemObj = item as Record<string, unknown>;
    const name = typeof item === 'string' ? item : (itemObj.name as string) || `${type === 'actor' ? '角色' : '敌人'}${i}`;
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = name;
    idSelect.appendChild(option);
  }

  // 自动选择第一个
  if (data.length > 1) {
    idSelect.value = '1';
    updatePreviewSprite(role);
  }

  // Enable
  idSelect.disabled = false;
}

async function updatePreviewSprite(role: 'emitter' | 'target'): Promise<void> {
  const typeSelect = document.getElementById(role === 'emitter' ? 'projectileEmitterTypeSelect' : 'projectileTargetTypeSelect') as HTMLSelectElement;
  const idSelect = document.getElementById(role === 'emitter' ? 'projectileEmitterIdSelect' : 'projectileTargetIdSelect') as HTMLSelectElement;
  const weaponSelect = document.getElementById('projectileEmitterWeaponSelect') as HTMLSelectElement;
  const skillSelect = document.getElementById('projectileEmitterSkillSelect') as HTMLSelectElement;
  const targetSkillSelect = document.getElementById('projectileTargetSkillSelect') as HTMLSelectElement;
  const statusEl = document.getElementById('projectilePreviewStatus');

  if (!typeSelect || !idSelect) return;

  const type = typeSelect.value;
  const id = parseInt(idSelect.value, 10);

  let texture: PIXI.Texture | null = null;

  // 获取对应的精灵
  const sprite = role === 'emitter' ? startSprite : endSprite;
  if (!sprite) return;
  
  // 重置缩放
  sprite.scale.set(1, 1);
  
  if (type === 'none' || !id) {
    // 恢复到默认纹理
    sprite.texture = PIXI.Texture.EMPTY;
    if (statusEl) statusEl.textContent = '准备就绪';
    PixiRenderer.render();
    return;
  }
  
  const dataList = projectileDataCache[type as 'actor' | 'enemy'] as Record<string, unknown>[];
  const item = findDataEntryById(dataList, id);
  if (statusEl) statusEl.textContent = '加载中...';
  
  if (item && item.battlerName) {
    const battlerName = item.battlerName as string;
    try {
      if (type === 'actor') {
        texture = await textureManager.loadActorTexture(battlerName);
      } else if (type === 'enemy') {
        texture = await textureManager.loadEnemyTexture(battlerName);
      }
    } catch (error) {
      logger.error('Failed to load texture for preview', { role, type, battlerName, error }, 'ProjectilePanel');
      if (statusEl) statusEl.textContent = '纹理加载失败';
      return;
    }
  }
  
  if (texture && texture.valid) {
    sprite.texture = texture;
    
    // 根据角色类型和角色设置缩放和朝向
    const maxSize = type === 'actor' ? 64 : 100;
    const textureWidth = texture.width;
    const textureHeight = texture.height;
    
    if (type === 'actor') {
      // SV_Actors 通常是 9列6行
      const frameWidth = textureWidth / 9;
      const frameHeight = textureHeight / 6;
      const baseScale = Math.min(maxSize / frameWidth, maxSize / frameHeight, 1);
      const actorScale = baseScale * 2;
      // 角色固定2倍放大，且朝向与敌人相反
      if (role === 'emitter') {
        sprite.scale.set(-actorScale, actorScale);
      } else {
        sprite.scale.set(actorScale, actorScale);
      }
    } else if (type === 'enemy') {
      // 敌人处理：标准缩放，朝向与角色相反
      const baseScale = Math.min(maxSize / textureWidth, maxSize / textureHeight, 1);
      if (role === 'emitter') {
        // 发射者敌人：朝向右侧（面向目标）
        sprite.scale.set(baseScale, baseScale);
      } else {
        // 目标敌人：朝向左侧（面向发射者）
        sprite.scale.set(-baseScale, baseScale);
      }
    }

    // 计算位置偏移
    let offset = { x: 0, y: 0 };
    
    if (role === 'emitter') {
      // 发射者偏移计算
      if (type === 'actor' && weaponSelect) {
        const weaponId = parseInt(weaponSelect.value, 10);
        if (weaponId > 0) {
          offset = getActorProjectileOffset(id, weaponId);
        }
      } else if (type === 'enemy' && skillSelect) {
        const skillId = parseInt(skillSelect.value, 10);
        if (skillId > 0) {
          offset = getEnemyProjectileOffset(id, skillId);
        }
      }
      
      // 应用偏移
      sprite.position.set(startOffsetX + offset.x, startOffsetY + offset.y);
    } else if (role === 'target') {
      // 目标偏移计算（主要用于敌人技能偏移）
      if (type === 'enemy' && targetSkillSelect) {
        const skillId = parseInt(targetSkillSelect.value, 10);
        if (skillId > 0) {
          offset = getEnemyProjectileOffset(id, skillId);
        }
      }
      
      // 应用偏移
      sprite.position.set(targetOffsetX + offset.x, targetOffsetY + offset.y);
    }

    const itemName = (item?.name as string) || `${type === 'actor' ? '角色' : '敌人'}${id}`;
    if (statusEl) {
      let statusText = `${role === 'emitter' ? '发射者' : '目标'}: ${itemName}`;
      
      // 显示武器或技能信息
      if (role === 'emitter') {
        if (type === 'actor' && weaponSelect && weaponSelect.value) {
          const weaponId = parseInt(weaponSelect.value, 10);
          const weapons = projectileDataCache.weapon as Record<string, unknown>[] || [];
          const weapon = findDataEntryById(weapons, weaponId);
          if (weapon) {
            statusText += ` | 武器: ${weapon.name}`;
          }
        } else if (type === 'enemy' && skillSelect && skillSelect.value) {
          const skillId = parseInt(skillSelect.value, 10);
          const skills = projectileDataCache.skill as Record<string, unknown>[] || [];
          const skill = findDataEntryById(skills, skillId);
          if (skill) {
            statusText += ` | 技能: ${skill.name}`;
          }
        }
      } else if (role === 'target') {
        if (type === 'enemy' && targetSkillSelect && targetSkillSelect.value) {
          const skillId = parseInt(targetSkillSelect.value, 10);
          const skills = projectileDataCache.skill as Record<string, unknown>[] || [];
          const skill = findDataEntryById(skills, skillId);
          if (skill) {
            statusText += ` | 技能: ${skill.name}`;
          }
        }
      }
      
      statusEl.textContent = statusText;
    }
  } else {
    if (statusEl) statusEl.textContent = '无纹理';
  }

  PixiRenderer.render();
}

export default {
  init: initProjectilePanel,
  render: renderProjectilePanel,
  renderSegments,
  addSegment,
  removeSegment,
  clearSegments,
  getSegments,
  setSegments,
  loadTemplate,
  saveTemplate,
  saveActorOffset,
  saveEnemyOffset,
  newProjectile,
  saveProjectileFile,
  deleteProjectile,
  dispose: disposeProjectilePanel,
};
