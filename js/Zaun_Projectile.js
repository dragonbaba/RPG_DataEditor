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
    const { EventEmitter } = PIXI;

    function getActorPositionOffset(actor) {
        const action = BattleManager._action;
        const weapon = action._weapon;
        if (weapon === null) {
            throw new Error(`弹道${actor.name()}的武器为空`);
        }
        const id = weapon.id;
        const offset = actor.projectileOffset[id];
        if (offset === void 0) {
            throw new Error(`弹道${actor.name()}的武器${id}没有偏移量`);
        }
        return offset;
    }

    function getEnemyPositionOffset(enemy) {
        const action = BattleManager._action;
        const skill = action._item;
        if (skill === null) {
            throw new Error(`弹道${enemy.name()}的技能为空`);
        }
        const id = skill.id;
        const offset = enemy.projectileOffset[id];
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


    class Projectile extends EventEmitter {
        constructor() {
            super();
            this.reset();
        }
        setup(player, target, projectileObject, container, isEnd, isStart) {
            this.startAnimationId = projectileObject.startAnimationId;
            const launchAnimation = projectileObject.launchAnimation;
            this.launchAnimationId = launchAnimation.animationId;
            this.segments = launchAnimation.segments;
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
            if (this.launchAnimationId > 0 && $dataAnimations[this.launchAnimationId]) {
                const animation = $dataAnimations[this.launchAnimationId];
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
            const duration = this.duration;
            const easingType = this.easeType;
            this.checkTargetPosition();
            GlobalMotion.setAnimation(this.x, this.tx, easingType.x)
                .setAnimation(this.y, this.ty, easingType.y)
                .onUpdate("onMove")
                .onComplete("onEnd")
                .setFrames(duration)
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
            this.removeAllListeners();
        }
    }
    createPool("ProjectilePool", Projectile, 100);

    ProjectileCore.Projectile = Projectile;
    ProjectileCore.VERSION = "1.00";
    return ProjectileCore;
})(Object.create(null));