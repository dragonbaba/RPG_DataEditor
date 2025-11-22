"use strict";
Zaun.DisintegrateEffect = (DisintegrateEffect => {
    const { createPool } = Zaun.Core.PoolSystem;
    const { ParticleContainer, Particle, Texture } = PIXI;

    class DisintegrateSprite extends Particle {
        constructor() {
            super();
            this.initProperties();
        }
        initProperties() {
            this.sx = 0;
            this.op = 0;
        }
        setup(x, y, width, height) {
            this.sx = Math.random() * 0.5 + 1;
            this.op = Math.random() * 2 + 2.5;
            this.alpha = 255;
            this.setFrame(x, y, width, height);
        }
        update() {
            if (this._alpha === 0) return;
            this.x -= this.sx;
            this.y -= this.sx;
            this.alpha -= this.op;
        }
        reset() {
            this.sharedTexture = null;
            this.sx = 0;
            this.op = 0;
            this.anchorX = 0;
            this.anchorY = 0;
            this.scaleX = 1;
            this.scaleY = 1;
        }
    }

    const DisintegrateSpritePool = createPool("DisintegrateSpritePool", DisintegrateSprite, 10000);

    class DisintegrateContainer extends ParticleContainer {
        static PARTICLE_OPTIONS = {
            dynamicProperties: {
                color: true,
                position: true,
                rotation: false,
                uvs: true,
                vertex: false
            }
        }
        constructor() {
            super(DisintegrateContainer.PARTICLE_OPTIONS);
            this.texture = Texture.EMPTY;
            this.initProperties();
        }
        initProperties() {
            this.target = null;
            this.spriteIndex = 0;
            this.duration = 0;
            this._onRemoveParticle = this.removeParticle.bind(this);
        }
        /**
         * @param {Sprite} target 
         * @param {number} particleSize 
         */
        setup(target, particleSize = 10) {
            this.target = target;
            const texture = target._texture;
            const frame = texture.frame;
            const width = frame.width;
            const height = frame.height;
            const frameWidth = width / particleSize;
            const frameHeight = height / particleSize;
            const particles = this.particleChildren;
            let minOp = 4.5;
            const anchor = target._anchor;
            const position = target._position;
            const realX = -anchor._x * width + position._x;
            const realY = -anchor._y * height + position._y;
            const baseFrameX = frame.x;
            const baseFrameY = frame.y;
            for (let i = 0; i < particleSize; i++) {
                for (let j = 0; j < particleSize; j++) {
                    const sprite = DisintegrateSpritePool.get();
                    sprite.sharedTexture = texture;
                    const baseX = frameWidth * i;
                    const baseY = frameHeight * j;
                    sprite.setup(baseX + baseFrameX, baseY + baseFrameY, frameWidth, frameHeight);
                    sprite.setPosition(baseX, baseY);
                    if (sprite.op < minOp) {
                        minOp = sprite.op;
                    }
                    particles[this.spriteIndex++] = sprite;
                }
            }
            this._position.set(realX, realY);
            this.duration = Math.ceil(255 / minOp);
            this.texture = texture;
            target.parent.replaceChild(this, target);
            this.enableUpdate();
            this.onViewUpdate();
        }
        update() {
            if (this.duration > 0) {
                this.duration--;
            } else {
                DisintegrateEffectManager.remove(this);
            }
        }
        reset() {
            const particles = this.particleChildren;
            particles.remove(particles[0], 0, this.spriteIndex, this._onRemoveParticle);
            this.spriteIndex = 0;
            const gaugeSprite = this.target.parent.parent.gaugeSprite;
            if (gaugeSprite !== null) {
                gaugeSprite.alpha = 0;
            }
            this.parent.replaceChild(this.target, this);
            this.target = null;
            this.texture = Texture.EMPTY;
            this.duration = 0;
            super.reset();
        }
        removeParticle(particle) {
            this.spriteIndex--;
            DisintegrateSpritePool.return(particle);
        }
    }

    const DisintegrateContainerPool = createPool("DisintegrateContainerPool", DisintegrateContainer, 20);

    class DisintegrateEffectAdaptor {
        constructor() {
            this.initProperties();
        }
        initProperties() {
            /**
             * @type {DisintegrateContainer[]}
             */
            this.disintegrateContainers = [];
            this.disintegrateEffectCount = 0;
            this.effectManager = null;
            this._onResetDisintegrateContainer = this.resetDisintegrateContainer.bind(this);
        }
        setup(target, particleSize = 30) {
            const disintegrateContainer = DisintegrateContainerPool.get();
            disintegrateContainer.setup(target, particleSize);
            this.disintegrateContainers[this.disintegrateEffectCount++] = disintegrateContainer;
        }
        remove(disintegrateContainer) {
            if (this.disintegrateContainers.remove(disintegrateContainer)) {
                Zaun.GeometrySystem.EffectManager.containers.remove(disintegrateContainer.target);
                DisintegrateContainerPool.return(disintegrateContainer);
                this.disintegrateEffectCount--;
                this.effectManager.effectCount--;
            }
        }
        isBusy() {
            return this.disintegrateEffectCount > 0;
        }
        reset() {
            const disintegrateContainers = this.disintegrateContainers;
            disintegrateContainers.remove(0, disintegrateContainers.length, this._onResetDisintegrateContainer);
        }
        resetDisintegrateContainer(disintegrateContainer) {
            DisintegrateContainerPool.return(disintegrateContainer);
        }
    }

    const DisintegrateEffectManager = new DisintegrateEffectAdaptor();

    DisintegrateEffect.DisintegrateEffectManager = DisintegrateEffectManager;
    DisintegrateEffect.DisintegrateEffectAdaptor = DisintegrateEffectAdaptor;
    DisintegrateEffect.DisintegrateSprite = DisintegrateSprite;
    DisintegrateEffect.DisintegrateContainer = DisintegrateContainer;
    DisintegrateEffect.VERSION = "1.00";
    return DisintegrateEffect;
})(Object.create(null));