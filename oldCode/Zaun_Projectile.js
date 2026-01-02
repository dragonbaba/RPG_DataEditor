/*:
 * @target MZ
 * @author Zaun
 * @plugindesc [v1.00] 弹道功能实现
 */
"use strict";
Zaun.ProjectileCore = (ProjectileCore => {
    const { AnimationSystem, PoolSystem, EventSystem } = Zaun.Core;
    const { createPool, PoolCache } = PoolSystem;
    const { GlobalEvent } = EventSystem;
    const { GlobalMotion } = AnimationSystem;

    function getActorPositionOffset(actor) {
        const action = BattleManager._action;
        const weapon = action._weapon;
        if (weapon === null) {
            throw new Error(`弹道${actor.name()}的武器为空`);
        }
        const weaponType = weapon.wtypeId;
        const offset = actor.actor().projectileOffset[weaponType];
        if (offset === void 0) {
            throw new Error(`弹道${actor.name()}的武器类型${weaponType}没有偏移量`);
        }
        return offset;
    }

    function getEnemyPositionOffset(enemy) {
        const action = BattleManager._action;
        const skill = action._item;
        if (skill === null) {
            throw new Error(`弹道${enemy.name()}的技能为空`);
        }
        const skillId = skill.id;
        const offset = enemy.enemy().projectileOffset[skillId];
        if (offset === void 0) {
            throw new Error(`弹道${enemy.name()}的技能${skillId}没有偏移量`);
        }
        return offset;
    }

    function getLaunchProjectileOffset(player) {
        if (player.isEnemy()) {
            return getEnemyPositionOffset(player);
        }
        return getActorPositionOffset(player);
    }

    class Projectile {
        constructor() {
            this.reset();
        }
        setup(player, target, projectileObject, container, isEnd, isStart) {
            this.startAnimationId = projectileObject.startAnimationId;
            this.launchAnimation = projectileObject.launchAnimation;
            this.endAnimationId = projectileObject.endAnimationId;
            this.player = player;
            this.target = target;
            this.container = container;
            this.isEnd = isEnd;
            this.isStart = isStart;
            this.mirror = player.isEnemy();
            this.start();
        }
        checkStartPosition(projectSprite) {
            if (this.x === 0 && this.y === 0) {
                const player = this.player;
                const playerSprite = player.sprite();
                const startPos = playerSprite._position;
                const offset = getLaunchProjectileOffset(player);
                const offsetX = offset.x;
                const offsetY = offset.y;
                this.x = startPos._x + offsetX;
                this.y = startPos._y + offsetY;
            }
            projectSprite._position.set(this.x, this.y);
        }
        start() {
            const container = this.container;
            const spriteset = container.parent;
            if (this.startAnimationId > 0 && $dataAnimations[this.startAnimationId]) {
                const animation = $dataAnimations[this.startAnimationId];
                const projectSprite = PoolCache.AnimationPool.get();
                projectSprite.setup(animation, this.mirror, spriteset);
                projectSprite.isFullScreen = true;
                spriteset.onAnimationStart();
                this.checkStartPosition(projectSprite);
                container.addAnimation(projectSprite);
                //等待动画的时间后，执行一次launch函数
                GlobalEvent.on("prepareLaunch", this, projectSprite.duration, 1);
            } else {
                this.prepareLaunch();
            }
        }
        prepareLaunch() {
            const container = this.container;
            const spriteset = container.parent;
            const launchAnimationId = this.launchAnimation.animationId;
            if (launchAnimationId > 0 && $dataAnimations[launchAnimationId]) {
                const animation = $dataAnimations[launchAnimationId];
                const projectSprite = PoolCache.AnimationPool.get();
                projectSprite.setup(animation, this.mirror, spriteset);
                projectSprite.isFullScreen = true;
                spriteset.onAnimationStart();
                this.checkStartPosition(projectSprite);
                container.addAnimation(projectSprite);
                this.duration = projectSprite.duration;
                this.projectSprite = projectSprite;
                projectSprite.motions.bundle.onLoad(this.launch, this);
            } else {
                this.onEnd();
            }
        }
        launch() {
            const launchAnimation = this.launchAnimation;
            const segments = launchAnimation.segments;
            const motion = GlobalMotion.getMotion();
            const length = segments.length;
            this.checkTargetPosition();
            const lastIndex = length - 1;
            let previousX = this.x;
            let previousY = this.y;
            let targetX = this.tx;
            let targetY = this.ty;
            if (length === 1) {
                const segment = segments[0];
                const duration = segment.duration;
                const easingX = segment.easeX;
                const easingY = segment.easeY;
                motion.newCommand()
                    .setAnimation(this.x, this.tx, easingX)
                    .setAnimation(this.y, this.ty, easingY)
                    .setFrames(duration)
                    .onUpdate("onMove")
                    .endCommand();
            } else {
                for (let i = 0; i < length; i++) {
                    const segment = segments[i];
                    targetX = segment.targetX;
                    targetY = segment.targetY;
                    const duration = segment.duration;
                    const easingX = segment.easeX;
                    const easingY = segment.easeY;
                    const isFirst = i === 0;
                    const isLast = i === lastIndex;
                    previousX = isFirst ? this.x : segments[i - 1].targetX;
                    previousY = isFirst ? this.y : segments[i - 1].targetY;
                    targetX = isLast ? this.tx : targetX;
                    targetY = isLast ? this.ty : targetY;
                    motion.newCommand()
                        .setAnimation(previousX, targetX, easingX)
                        .setAnimation(previousY, targetY, easingY)
                        .setFrames(duration)
                        .onUpdate("onMove")
                        .endCommand();
                }
            }
            motion.onComplete("onEnd")
                .start(this);
        }
        checkTargetPosition() {
            if (this.tx !== 0 && this.ty !== 0) return;
            const target = this.target;
            const targetSprite = target.sprite();
            const targetPos = targetSprite._position;
            const targetOffsetY = targetSprite._height / 2;
            this.tx = targetPos._x;
            this.ty = targetPos._y - targetOffsetY;
        }
        onMove(arr) {
            this.projectSprite._position.set(arr[0], arr[1]);
        }
        onEnd() {
            if (this.endAnimationId > 0 && $dataAnimations[this.endAnimationId]) {
                const animation = $dataAnimations[this.endAnimationId];
                const animationSprite = PoolCache.AnimationPool.get();
                const container = this.container;
                const spriteset = container.parent;
                const target = this.target;
                const targetSprite = target.sprite();
                this.checkTargetPosition();
                animationSprite.setup(animation, this.mirror, spriteset);
                animationSprite.isFullScreen = true;
                animationSprite._position.set(this.tx, this.ty);
                this.damageDelay = animationSprite.duration;
                animationSprite.addTarget(target, targetSprite);
                spriteset.onAnimationStart();
                container.addAnimation(animationSprite);
            }
            if (this.damageDelay > 0) {
                GlobalEvent.on("onDamage", this, this.damageDelay, 1);
            } else {
                this.onDamage();
            }
        }
        onDamage() {
            const player = this.player;
            const target = this.target;
            if (this.isStart && !this.isEnd) {
                this.target.sprite().battlerSprite.freezeAnimationFrame("damage", 1);
            }
            BattleManager.invokeAction(player, target);
            if (this.isEnd) {
                const sprite = target.sprite().battlerSprite;
                const isFreeze = sprite.isFreeze;
                if (isFreeze) {
                    sprite.isFreeze = false;
                    sprite.refreshMotion();
                }
                this.container.parent.onAnimationEnd();
            }
            PoolCache.ProjectilePool.return(this);
        }
        reset() {
            this.x = 0;
            this.y = 0;
            this.mirror = false;
            this.damageDelay = 0;
            this.projectSprite = null;
            this.startAnimationId = 0;
            this.launchAnimationId = 0;
            this.endAnimationId = 0;
            this.tx = 0;
            this.ty = 0;
            this.player = null;
            this.target = null;
            this.easeType = null;
            this.container = null;
            this.isEnd = false;
            this.isStart = false;
            this.duration = 0;
        }
    }
    createPool("ProjectilePool", Projectile, 100);
    ProjectileCore.Projectile = Projectile;
    ProjectileCore.VERSION = "1.00";
    return ProjectileCore;
})(Object.create(null));